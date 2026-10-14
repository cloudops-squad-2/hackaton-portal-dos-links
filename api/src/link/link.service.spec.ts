import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../database/prisma.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { LinkService } from './link.service.js';
import { Test } from '@nestjs/testing';

describe('LinkService', () => {
  let linkService: LinkService;
  const prismaMock = {
    link: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        LinkService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    linkService = moduleRef.get(LinkService);
  });

  describe('create', () => {
    it('should create a link', async () => {
      prismaMock.link.create.mockResolvedValue({
        code: 'abc1234',
        originalUrl: 'https://example.com',
      });

      const result = await linkService.create({
        url: 'https://example.com',
      });

      expect(result.code).toBe('abc1234');
      expect(prismaMock.link.create).toHaveBeenCalledOnce();
    });

    it('should stop after 3 failed attempts', async () => {
      prismaMock.link.create.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        linkService.create({ url: 'https://example.com' }),
      ).rejects.toThrow('Unique constraint failed');

      expect(prismaMock.link.create).toHaveBeenCalledTimes(3);
    });
  });

  describe('listLinks', () => {
    it('should return an empty list when no links exist', async () => {
      prismaMock.$transaction.mockResolvedValue([[], 0]);

      const result = await linkService.listLinks({
        page: 1,
        limit: 10,
        sortBy: 'createdAt',
        order: 'desc',
      });

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('resolve', () => {
    it('should throw when the link does not exist', async () => {
      prismaMock.link.findUnique.mockResolvedValue(null);

      await expect(linkService.resolve('unknown')).rejects.toThrow(
        'Link not found',
      );

      expect(prismaMock.link.update).not.toHaveBeenCalled();
    });

    it('should throw when the link has expired', async () => {
      prismaMock.link.findUnique.mockResolvedValue({
        code: 'abc1234',
        originalUrl: 'https://example.com',
        expiresAt: new Date('2020-01-01'),
      });

      await expect(linkService.resolve('abc1234')).rejects.toThrow(
        'Link has expired',
      );

      expect(prismaMock.link.update).not.toHaveBeenCalled();
    });

    it('should redirect to the original URL and increment clicks', async () => {
      prismaMock.link.findUnique.mockResolvedValue({
        code: 'abc1234',
        originalUrl: 'https://example.com',
        expiresAt: null,
      });

      prismaMock.link.update.mockResolvedValue({});

      const result = await linkService.resolve('abc1234');

      expect(result).toBe('https://example.com');
      expect(prismaMock.link.update).toHaveBeenCalledWith({
        where: { code: 'abc1234' },
        data: { clickCount: { increment: 1 } },
      });
    });
  });
});
