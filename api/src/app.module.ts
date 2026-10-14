import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module.js';
import { ConfigModule } from '@nestjs/config';
import { LinkModule } from './link/link.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), HealthModule, LinkModule],
})
export class AppModule {}
