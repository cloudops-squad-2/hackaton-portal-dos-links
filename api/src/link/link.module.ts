import { Module } from '@nestjs/common';
import { PrismaModule } from '../database/prisma.module.js';
import { LinkController } from './link.controller.js';
import { LinkService } from './link.service.js';
import { RedirectController } from './redirect.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [LinkController, RedirectController],
  providers: [LinkService],
})
export class LinkModule {}
