import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('usage')
export class UsageController {
  constructor(private usage: UsageService) {}

  // GET /usage/summary  → tokens + cost breakdown (today / this month / last 30 / all-time)
  @Get('summary')
  summary(@Request() req: any) {
    return this.usage.getSummary(req.user.sub);
  }

  // GET /usage/history?limit=20  → last N generation events
  @Get('history')
  history(@Request() req: any, @Query('limit') limit?: string) {
    return this.usage.getHistory(req.user.sub, limit ? parseInt(limit, 10) : 20);
  }
}
