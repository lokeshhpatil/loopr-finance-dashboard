import { Request, Response } from "express";
import { Transaction } from "../models/transaction.model";
import ApiResponse from "../utils/apiResponse";
import { asyncHandler } from "../utils/asyncHandler";

const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export const getAnalyticsSummary = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query as Record<string, string>;

        // ---------- 1. BUILD CACHE KEY ----------
    const cacheKey = `summary:${startDate ?? "all"}:${endDate ?? "all"}`;

    // ---------- 2. CHECK CACHE ----------
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res
        .status(200)
        .json(new ApiResponse(200, cached.data, "Analytics summary (cached)"));
    }


    // ---------- BUILD MATCH FILTER ----------
    const match: Record<string, any> = {};
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.date.$lte = end;
      }
    }

    // ---------- RUN AGGREGATIONS IN PARALLEL ----------
    const [categoryAgg, statusAgg] = await Promise.all([
      // Group by category → totals, counts, averages
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$category",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            avg: { $avg: "$amount" },
          },
        },
      ]),

      // Group by status → counts + sums
      Transaction.aggregate([
        { $match: match },
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
            total: { $sum: "$amount" },
          },
        },
      ]),
    ]);

    // ---------- SHAPE THE DATA ----------
    const revenueAgg = categoryAgg.find((c) => c._id === "Revenue") ?? {
      total: 0,
      count: 0,
      avg: 0,
    };
    const expenseAgg = categoryAgg.find((c) => c._id === "Expense") ?? {
      total: 0,
      count: 0,
      avg: 0,
    };

    const byStatus = { Paid: 0, Pending: 0, Failed: 0 } as Record<string, number>;
    const amountByStatus = { Paid: 0, Pending: 0, Failed: 0 } as Record<string, number>;
    statusAgg.forEach((s) => {
      byStatus[s._id] = s.count;
      amountByStatus[s._id] = Number(s.total.toFixed(2));
    });

    const totalCount = revenueAgg.count + expenseAgg.count;
    const totalAmount = revenueAgg.total + expenseAgg.total;

    const data = {
      totals: {
        revenue: Number(revenueAgg.total.toFixed(2)),
        expense: Number(expenseAgg.total.toFixed(2)),
        net: Number((revenueAgg.total - expenseAgg.total).toFixed(2)),
        transactionCount: totalCount,
        revenueCount: revenueAgg.count,
        expenseCount: expenseAgg.count,
      },
      byStatus,
      amountByStatus,
      average: {
        revenue: Number((revenueAgg.avg ?? 0).toFixed(2)),
        expense: Number((expenseAgg.avg ?? 0).toFixed(2)),
        transaction: Number(
          ((totalAmount / (totalCount || 1)) || 0).toFixed(2),
        ),
      },
      topCategories: categoryAgg.map((c) => ({
        category: c._id,
        total: Number(c.total.toFixed(2)),
      })),
      period: {
        from: startDate ? new Date(startDate) : null,
        to: endDate ? new Date(endDate) : null,
      },
    };

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Analytics summary fetched successfully"));
  },
);

// Helper: build date match
const buildDateMatch = (startDate?: string, endDate?: string) => {
  const match: Record<string, any> = {};
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      match.date.$lte = end;
    }
  }
  return match;
};

// Helper: Mongo date format string per interval
const dateFormatFor = (interval: string) => {
  switch (interval) {
    case "day":   return "%Y-%m-%d";
    case "week":  return "%G-W%V";
    case "year":  return "%Y";
    case "month":
    default:      return "%Y-%m";
  }
};

// ============================================================
// GET /api/v1/analytics/trends
// ============================================================
export const getAnalyticsTrends = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      interval = "month",
      startDate,
      endDate,
      category,
      fill = "true",
    } = req.query as Record<string, string>;

    const allowedIntervals = ["day", "week", "month", "year"];
    const safeInterval = allowedIntervals.includes(interval) ? interval : "month";

    const cacheKey = `trends:${safeInterval}:${startDate ?? "all"}:${endDate ?? "all"}:${category ?? "all"}:${fill}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res
        .status(200)
        .json(new ApiResponse(200, cached.data, "Trends fetched successfully (cached)"));
    }

    const match = buildDateMatch(startDate, endDate);
    if (category) match.category = category;

    const format = dateFormatFor(safeInterval);

    const raw = await Transaction.aggregate([
      { $match: match },
      {
        $group: {
          _id: {
            period: { $dateToString: { format, date: "$date" } },
            category: "$category",
          },
          total: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.period": 1 } },
    ]);

    // Pivot: one row per period with revenue/expense/net/count
    const periodMap = new Map<string, any>();
    for (const row of raw) {
      const p = row._id.period;
      if (!periodMap.has(p)) {
        periodMap.set(p, { period: p, revenue: 0, expense: 0, net: 0, count: 0 });
      }
      const entry = periodMap.get(p);
      if (row._id.category === "Revenue") entry.revenue = Number(row.total.toFixed(2));
      if (row._id.category === "Expense") entry.expense = Number(row.total.toFixed(2));
      entry.count += row.count;
    }

    // Optional: fill gaps between startDate & endDate
    const shouldFill = fill === "true" && startDate && endDate;
    let trends = Array.from(periodMap.values());

    if (shouldFill) {
      trends = fillGaps(trends, new Date(startDate!), new Date(endDate!), safeInterval);
    }

    // Recompute net after any pivot/fill
    trends.forEach((t) => (t.net = Number((t.revenue - t.expense).toFixed(2))));

    const totals = trends.reduce(
      (acc, t) => ({
        revenue: acc.revenue + t.revenue,
        expense: acc.expense + t.expense,
        net: acc.net + t.net,
      }),
      { revenue: 0, expense: 0, net: 0 },
    );

    const data = {
      interval: safeInterval,
      period: {
        from: startDate ? new Date(startDate) : null,
        to: endDate ? new Date(endDate) : null,
      },
      totals: {
        revenue: Number(totals.revenue.toFixed(2)),
        expense: Number(totals.expense.toFixed(2)),
        net: Number(totals.net.toFixed(2)),
      },
      trends,
    };

    cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL_MS });

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Trends fetched successfully"));
  },
);

// ============================================================
// GET /api/v1/analytics/categories
// ============================================================
export const getAnalyticsCategories = asyncHandler(
  async (req: Request, res: Response) => {
    const { startDate, endDate, groupBy = "both" } = req.query as Record<string, string>;

    const allowedGroups = ["category", "status", "both"];
    const safeGroup = allowedGroups.includes(groupBy) ? groupBy : "both";

    const cacheKey = `categories:${startDate ?? "all"}:${endDate ?? "all"}:${safeGroup}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return res
        .status(200)
        .json(new ApiResponse(200, cached.data, "Category breakdown (cached)"));
    }

    const match = buildDateMatch(startDate, endDate);

    const [byCategoryRaw, byStatusRaw] = await Promise.all([
      safeGroup !== "status"
        ? Transaction.aggregate([
            { $match: match },
            {
              $group: {
                _id: "$category",
                total: { $sum: "$amount" },
                count: { $sum: 1 },
                average: { $avg: "$amount" },
              },
            },
          ])
        : Promise.resolve([]),

      safeGroup !== "category"
        ? Transaction.aggregate([
            { $match: match },
            {
              $group: {
                _id: "$status",
                total: { $sum: "$amount" },
                count: { $sum: 1 },
                average: { $avg: "$amount" },
              },
            },
          ])
        : Promise.resolve([]),
    ]);

    const totalAmount = [...byCategoryRaw, ...byStatusRaw].reduce((s, r) => s + r.total, 0);
    const totalCount = [...byCategoryRaw, ...byStatusRaw].reduce((s, r) => s + r.count, 0);

    const withPercent = (arr: any[], key: string) =>
      arr
        .map((r) => ({
          [key]: r._id,
          total: Number(r.total.toFixed(2)),
          count: r.count,
          average: Number((r.average ?? 0).toFixed(2)),
          percentage: Number(((r.total / (totalAmount || 1)) * 100).toFixed(2)),
        }))
        .sort((a, b) => b.total - a.total);

    const data: any = {
      period: {
        from: startDate ? new Date(startDate) : null,
        to: endDate ? new Date(endDate) : null,
      },
      summary: {
        totalAmount: Number(totalAmount.toFixed(2)),
        totalCount,
      },
    };

    if (safeGroup !== "status") data.byCategory = withPercent(byCategoryRaw, "category");
    if (safeGroup !== "category") data.byStatus = withPercent(byStatusRaw, "status");

    cache.set(cacheKey, { data, expiry: Date.now() + CACHE_TTL_MS });

    return res
      .status(200)
      .json(new ApiResponse(200, data, "Category breakdown fetched successfully"));
  },
);

// ============================================================
// Helper: fill missing periods with zero rows
// ============================================================
function fillGaps(
  existing: any[],
  from: Date,
  to: Date,
  interval: string,
): any[] {
  const map = new Map(existing.map((e) => [e.period, e]));
  const result: any[] = [];
  const cursor = new Date(from);

  while (cursor <= to) {
    let key: string;
    if (interval === "day") {
      key = cursor.toISOString().slice(0, 10);
      cursor.setDate(cursor.getDate() + 1);
    } else if (interval === "week") {
      // ISO week
      const y = cursor.getUTCFullYear();
      const w = getISOWeek(cursor);
      key = `${y}-W${String(w).padStart(2, "0")}`;
      cursor.setDate(cursor.getDate() + 7);
    } else if (interval === "year") {
      key = String(cursor.getUTCFullYear());
      cursor.setFullYear(cursor.getFullYear() + 1);
    } else {
      key = `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`;
      cursor.setMonth(cursor.getMonth() + 1);
    }

    result.push(map.get(key) ?? { period: key, revenue: 0, expense: 0, net: 0, count: 0 });
  }

  return result;
}

function getISOWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}