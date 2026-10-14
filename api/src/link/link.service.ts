import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { nanoid } from 'nanoid';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { Link } from '../generated/prisma/client.js';

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
}
