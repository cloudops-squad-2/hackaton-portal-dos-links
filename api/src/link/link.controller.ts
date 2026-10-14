import { Body, Controller, Post } from '@nestjs/common';
import { LinkService } from './link.service.js';
import { CreateLinkDto } from './dto/create-link.dto.js';
import { Link } from '../generated/prisma/client.js';

@Controller('links')
export class LinkController {
  constructor(private readonly linkService: LinkService) {}

  @Post()
  async create(@Body() dto: CreateLinkDto): Promise<Link> {
    return this.linkService.create(dto);
  }
}
