import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfMonth, startOfDay, subDays } from 'date-fns';

@Injectable()
export class UsageService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const todayStart = startOfDay(now);
    const last30Start = subDays(now, 30);

    const [month, today, last30, allTime] = await Promise.all([
      this.prisma.usageLog.aggregate({
        where: { userId, createdAt: { gte: monthStart } },
        _sum: { inputTokens: true, outputTokens: true, cachedTokens: true, costUsd: true },
        _count: true,
      }),
      this.prisma.usageLog.aggregate({
        where: { userId, createdAt: { gte: todayStart } },
        _sum: { inputTokens: true, outputTokens: true, costUsd: true },
        _count: true,
      }),
      this.prisma.usageLog.aggregate({
        where: { userId, createdAt: { gte: last30Start } },
        _sum: { costUsd: true },
        _count: true,
      }),
      this.prisma.usageLog.aggregate({
        where: { userId },
        _sum: { inputTokens: true, outputTokens: true, costUsd: true },
        _count: true,
      }),
    ]);

    return {
      thisMonth: {
        notes:        month._count,
        inputTokens:  month._sum.inputTokens  ?? 0,
        outputTokens: month._sum.outputTokens ?? 0,
        cachedTokens: month._sum.cachedTokens ?? 0,
        costUsd:      Number(month._sum.costUsd ?? 0).toFixed(4),
      },
      today: {
        notes:        today._count,
        inputTokens:  today._sum.inputTokens  ?? 0,
        outputTokens: today._sum.outputTokens ?? 0,
        costUsd:      Number(today._sum.costUsd ?? 0).toFixed(4),
      },
      last30Days: {
        notes:   last30._count,
        costUsd: Number(last30._sum.costUsd ?? 0).toFixed(4),
      },
      allTime: {
        notes:        allTime._count,
        inputTokens:  allTime._sum.inputTokens  ?? 0,
        outputTokens: allTime._sum.outputTokens ?? 0,
        costUsd:      Number(allTime._sum.costUsd ?? 0).toFixed(4),
      },
    };
  }

  async getHistory(userId: string, limit = 20) {
    return this.prisma.usageLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        noteType: true,
        model: true,
        inputTokens: true,
        outputTokens: true,
        cachedTokens: true,
        costUsd: true,
        createdAt: true,
      },
    });
  }
}
