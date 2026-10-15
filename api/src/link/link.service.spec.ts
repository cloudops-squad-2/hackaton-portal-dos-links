import {
  ConflictException,
  BadRequestException,
  GoneException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import { PrismaService } from '../database/prisma.service.js';
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

    it('should create a link with a custom code and title', async () => {
      prismaMock.link.create.mockResolvedValue({
        code: 'my-link',
        title: 'My Link',
        originalUrl: 'https://example.com',
      });

      const result = await linkService.create({
        url: 'https://example.com',
        customCode: 'my-link',
        title: 'My Link',
      });

      expect(result.code).toBe('my-link');
      expect(prismaMock.link.create).toHaveBeenCalledWith({
        data: {
          code: 'my-link',
          title: 'My Link',
          originalUrl: 'https://example.com',
          clickLimit: null,
          expiresAt: null,
        },
      });
    });

    it('should throw ConflictException when custom code is already taken', async () => {
      prismaMock.link.create.mockRejectedValue(
        new PrismaClientKnownRequestError('Unique constraint failed', {
          code: 'P2002',
          clientVersion: 'test',
        }),
      );

      await expect(
        linkService.create({
          url: 'https://example.com',
          customCode: 'my-link',
        }),
      ).rejects.toThrow(ConflictException);

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

    it('should use the requested code size', async () => {
      prismaMock.link.create.mockImplementation(({ data }) =>
        Promise.resolve({
          ...data,
        }),
      );

      const result = await linkService.create({
        url: 'https://example.com',
        codeSize: 10,
      });

      expect(result.code).toHaveLength(10);
    });

    it('should set expiration from expiresIn', async () => {
      prismaMock.link.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...data }),
      );

      const before = Date.now();

      await linkService.create({
        url: 'https://example.com',
        expiresIn: 3600,
      });

      const { expiresAt } = prismaMock.link.create.mock.calls[0][0].data;

      expect(expiresAt).toBeInstanceOf(Date);
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 3600 * 1000);
    });

    it('should set expiration from expiresAt', async () => {
      prismaMock.link.create.mockImplementation(({ data }) =>
        Promise.resolve({ ...data }),
      );

      const expiresAt = new Date(Date.now() + 60_000).toISOString();

      await linkService.create({
        url: 'https://example.com',
        expiresAt,
      });

      expect(prismaMock.link.create.mock.calls[0][0].data.expiresAt).toEqual(
        new Date(expiresAt),
      );
    });

    it('should reject an expiration date in the past', async () => {
      await expect(
        linkService.create({
          url: 'https://example.com',
          expiresAt: '2020-01-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.link.create).not.toHaveBeenCalled();
    });

    it('should reject expiresIn and expiresAt together', async () => {
      await expect(
        linkService.create({
          url: 'https://example.com',
          expiresIn: 3600,
          expiresAt: new Date(Date.now() + 60_000).toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);

      expect(prismaMock.link.create).not.toHaveBeenCalled();
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
        clickLimit: null,
        clickCount: 0,
      });

      await expect(linkService.resolve('abc1234')).rejects.toThrow(
        GoneException,
      );

      expect(prismaMock.link.update).not.toHaveBeenCalled();
    });

    it('should throw when the click limit has been reached', async () => {
      prismaMock.link.findUnique.mockResolvedValue({
        code: 'abc1234',
        originalUrl: 'https://example.com',
        expiresAt: null,
        clickLimit: 5,
        clickCount: 5,
      });

      await expect(linkService.resolve('abc1234')).rejects.toThrow(
        GoneException,
      );

      expect(prismaMock.link.update).not.toHaveBeenCalled();
    });

    it('should redirect to the original URL and increment clicks', async () => {
      prismaMock.link.findUnique.mockResolvedValue({
        code: 'abc1234',
        originalUrl: 'https://example.com',
        expiresAt: null,
        clickLimit: null,
        clickCount: 0,
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
