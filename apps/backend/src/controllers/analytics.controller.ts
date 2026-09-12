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