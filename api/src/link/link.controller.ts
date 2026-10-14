import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { LinkService } from './link.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { Link } from '../generated/prisma/client.js';
import { ListLinksDto } from './dto/list-links.dto.js';

@Controller('api/links')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post()
  async create(@Body() dto: CreateLinkDto): Promise<Link> {
    return this.linkService.create(dto);
  }

  @Get()
  async listLinks(@Query() query: ListLinksDto) {
    return this.linkService.listLinks(query);
  }
}
