import { GoneException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { nanoid } from 'nanoid';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Link } from '../generated/prisma/client.js';
import { ListLinksDto } from './dto/list-links.dto.js';

@Injectable()
export class LinkService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(dto: CreateLinkDto): Promise<Link> {
    const expiresAt = dto.expiresIn
      ? new Date(Date.now() + dto.expiresIn * 1000)
      : null;

    for (let attempts = 0; attempts < 3; attempts++) {
      try {
        return await this.prismaService.link.create({
          data: {
            code: nanoid(7),
            originalUrl: dto.url,
            expiresAt,
          },
        });
      } catch (error) {
        const isUniqueConstraintError =
          error instanceof PrismaClientKnownRequestError &&
          error.code === 'P2002';

        if (!isUniqueConstraintError || attempts === 2) {
          throw error;
        }
      }
    }

    throw new Error('Failed to create link after maximum attempts');
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
    const link = await this.prismaService.link.findUnique({ where: { code } });

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (link.expiresAt && link.expiresAt <= new Date()) {
      throw new GoneException('Link has expired');
    }

    await this.prismaService.link.update({
      where: { code },
      data: { clickCount: { increment: 1 } },
    });

    return link.originalUrl;
  }
}
