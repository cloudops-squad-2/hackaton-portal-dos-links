import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { nanoid } from 'nanoid';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Link } from '../generated/prisma/client.js';
import { ListLinksDto } from './dto/list-links.dto.js';
import { trace, SpanStatusCode } from '@opentelemetry/api';
import {
  linksCreatedCounter,
  linksExpiredCounter,
  linksRedirectedCounter,
} from './metrics.js';
import { timestamp } from 'rxjs';

const tracer = trace.getTracer('portal-dos-links');

@Injectable()
export class LinkService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateLinkDto): Promise<Link> {
    const span = tracer.startSpan('link.create');

    try {
      if (dto.expiresIn !== undefined && dto.expiresAt !== undefined) {
        throw new BadRequestException(
          'expiresIn and expiresAt cannot be provided together',
        );
      }

      let expiresAt: Date | null = null;

      if (dto.expiresAt !== undefined) {
        expiresAt = new Date(dto.expiresAt);

        if (expiresAt.getTime() <= Date.now()) {
          throw new BadRequestException('expiresAt must be in the future');
        }
        span.setAttribute('link.expires_at_date', dto.expiresAt);
      } else if (dto.expiresIn !== undefined) {
        expiresAt = new Date(Date.now() + dto.expiresIn * 1000);

        span.setAttribute('link.expires_in_seconds', dto.expiresIn);
      }

      span.setAttribute('link.has_ttl', expiresAt != null);
      span.setAttribute('link.has_click_limit', dto.clicksLimit != null);

      if (dto.clicksLimit) {
        span.setAttribute('link.max_click_limit', dto.clicksLimit);
      }

      let lastError: unknown;

      if (dto.customCode) {
        try {
          const link = await this.prismaService.link.create({
            data: {
              code: dto.customCode,
              title: dto.title ?? null,
              originalUrl: dto.url,
              clickLimit: dto.clicksLimit ?? null,
              expiresAt,
            },
          });

          span.setAttribute('link.code', link.code);
          span.setStatus({ code: SpanStatusCode.OK });
          linksCreatedCounter.add(1);

          return link;
        } catch (error) {
          lastError = error;
          const isUniqueConstraintError =
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2002';

          if (!isUniqueConstraintError) {
            throw error;
          }

          throw new ConflictException('Link code already taken');
        }
      }

      for (let attempts = 0; attempts < 3; attempts++) {
        try {
          const code = nanoid(dto.codeSize);
          const link = await this.prismaService.link.create({
            data: {
              code,
              title: dto.title ?? null,
              originalUrl: dto.url,
              clickLimit: dto.clicksLimit ?? null,
              expiresAt,
            },
          });

          span.setAttribute('link.code', link.code);
          span.setAttribute('link.retry_count', attempts);
          span.setStatus({ code: SpanStatusCode.OK });

          linksCreatedCounter.add(1);

          return link;
        } catch (error) {
          lastError = error;
          const isUniqueConstraintError =
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2002';

          if (!isUniqueConstraintError || attempts === 2) {
            throw error;
          }
        }
      }

      throw (
        lastError ?? new Error('Failed to create link after maximum attempts')
      );
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  }

  async listLinks(query: ListLinksDto) {
    const { sortBy, limit, order, page } = query;
    const orderBy = { [sortBy]: order };

    const [links, total] = await this.prismaService.$transaction([
      this.prismaService.link.findMany({
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
      }),
      this.prismaService.link.count(),
    ]);

    return {
      data: links,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getLinkStats(code: string) {
    const span = tracer.startSpan('link.stats');
    span.setAttribute('link.code', code);

    try {
      const link = await this.prismaService.link.findUnique({
        where: { code },
        include: {
          clicks: {
            select: {
              timestamp: true,
            },
            orderBy: {
              timestamp: 'desc',
            },
          },
        },
      });

      if (!link) {
        span.setAttribute('link.found', false);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Link not found',
        });

        throw new NotFoundException('Link not found');
      }

      span.setAttribute('link.found', true);
      span.setAttribute('link.click_count', link.clickCount);
      span.setStatus({ code: SpanStatusCode.OK });

      return link;
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        span.recordException(
          error instanceof Error ? error : new Error(String(error)),
        );
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message:
            error instanceof Error
              ? error.message
              : 'Failed to retrieve link stats',
        });
      }

      throw error;
    } finally {
      span.end();
    }
  }

  async resolve(code: string): Promise<string> {
    const span = tracer.startSpan('link.resolve');
    span.setAttribute('link.code', code);

    try {
      const link = await this.prismaService.link.findUnique({
        where: { code },
      });

      if (!link) {
        span.setAttribute('link.found', false);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Link not found',
        });
        throw new NotFoundException('Link not found');
      }

      span.setAttribute('link.found', true);

      if (link.expiresAt && link.expiresAt <= new Date()) {
        span.setAttribute('link.expired', true);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Link has expired',
        });
        linksExpiredCounter.add(1);
        throw new GoneException('Link has expired');
      }

      if (link.clickLimit && link.clickCount >= link.clickLimit) {
        span.setAttribute('link.click_limit_reached', true);
        span.setAttribute('link.click_limit', link.clickLimit);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: 'Link click limit reached',
        });

        throw new GoneException('Link click limit reached');
      }

      span.setAttribute('link.expired', false);

      await this.prismaService.$transaction([
        this.prismaService.link.update({
          where: { code },
          data: { clickCount: { increment: 1 } },
        }),
        this.prismaService.linkClick.create({ data: { linkId: link.id } }),
      ]);

      linksRedirectedCounter.add(1);

      span.setAttribute('link.original_url', link.originalUrl);
      span.setAttribute('link.click_count', link.clickCount + 1);
      span.setStatus({ code: SpanStatusCode.OK });

      return link.originalUrl;
    } catch (error) {
      // Only record as exception if not already handled above (NestJS HTTP exceptions are expected)
      if (
        !(error instanceof NotFoundException) &&
        !(error instanceof GoneException)
      ) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
      }
      throw error;
    } finally {
      span.end();
    }
  }
}
