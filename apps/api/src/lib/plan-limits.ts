import type { PlanType, PrismaClient } from '@cafe/db';

export type PlanLimits = {
  dailyOrders: number | null;
  members: number | null;
  advancedReports: boolean;
};

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    dailyOrders: 50,
    members: 2,
    advancedReports: false,
  },
  pro: {
    dailyOrders: null,
    members: null,
    advancedReports: true,
  },
};

export type PlanUsage = {
  ordersToday: number;
  members: number;
};

function startOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function endOfDayUTC(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

export async function getPlanUsage(
  prisma: PrismaClient,
  organizationId: string,
  now: Date = new Date(),
): Promise<PlanUsage> {
  const [ordersToday, members] = await Promise.all([
    prisma.order.count({
      where: {
        organizationId,
        createdAt: {
          gte: startOfDayUTC(now),
          lte: endOfDayUTC(now),
        },
      },
    }),
    prisma.member.count({
      where: { organizationId },
    }),
  ]);

  return { ordersToday, members };
}

export type LimitCheck =
  | { ok: true }
  | { ok: false; code: string; message: string; limit: number };

export function checkDailyOrderLimit(plan: PlanType, ordersToday: number): LimitCheck {
  const limit = PLAN_LIMITS[plan].dailyOrders;
  if (limit === null) return { ok: true };
  if (ordersToday >= limit) {
    return {
      ok: false,
      code: 'plan_limit_reached',
      message: `Limite de ${limit} pedidos por dia atingido no plano ${plan}. Faça upgrade para o Pro.`,
      limit,
    };
  }
  return { ok: true };
}

export function checkMemberLimit(plan: PlanType, currentMembers: number): LimitCheck {
  const limit = PLAN_LIMITS[plan].members;
  if (limit === null) return { ok: true };
  if (currentMembers >= limit) {
    return {
      ok: false,
      code: 'plan_limit_reached',
      message: `Limite de ${limit} usuários atingido no plano ${plan}. Faça upgrade para o Pro.`,
      limit,
    };
  }
  return { ok: true };
}

export function isAdvancedReportAllowed(plan: PlanType): boolean {
  return PLAN_LIMITS[plan].advancedReports;
}
