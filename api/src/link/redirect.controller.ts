import { Controller, Get, Param, Res } from '@nestjs/common';
import { LinkService } from './link.service.js';
import type { FastifyReply } from 'fastify';

@Controller()
export class RedirectController {
  constructor(private readonly linkService: LinkService) {}

  @Get(':code')
  async redirect(@Param('code') code: string, @Res() res: FastifyReply) {
    const url = await this.linkService.resolve(code);

    return res.status(302).redirect(url);
  }
}
