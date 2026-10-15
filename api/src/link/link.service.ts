import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
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

const tracer = trace.getTracer('portal-dos-links');

@Injectable()
export class LinkService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateLinkDto): Promise<Link> {
    const span = tracer.startSpan('link.create');

    try {
      const expiresAt = dto.expiresIn
        ? new Date(Date.now() + dto.expiresIn * 1000)
        : null;

      span.setAttribute('link.has_ttl', dto.expiresIn != null);
      if (dto.expiresIn != null) {
        span.setAttribute('link.expires_in_seconds', dto.expiresIn);
      }

      let lastError: unknown;

      for (let attempts = 0; attempts < 3; attempts++) {
        try {
          const code = nanoid(7);
          const link = await this.prismaService.link.create({
            data: {
              code,
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

      await this.prismaService.link.update({
        where: { code },
        data: { clickCount: { increment: 1 } },
      });

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
