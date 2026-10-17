import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  ValidationPipe,
} from '@nestjs/common';
import { LinkService } from './link.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { Link } from '../generated/prisma/client.js';
import { ListLinksDto } from './dto/list-links.dto.js';
import { LinkStatsParamsDto } from './dto/link-stat-param.dto.js';

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

  @Get(':code/stats')
  async getLinkStats(
    @Param(new ValidationPipe({ transform: true })) params: LinkStatsParamsDto,
  ) {
    return this.linkService.getLinkStats(params.code);
  }
}
