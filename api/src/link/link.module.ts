import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { LinkController } from './link.controller.js';
import { LinkService } from './link.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [LinkController],
  providers: [LinkService],
})
export class LinkModule {}
