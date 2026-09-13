import { Request, Response } from "express";
import { Transaction } from "../models/transaction.model";
import { asyncHandler } from "../utils/asyncHandler";
import apiError from "../utils/apiError";
import { buildCSV, buildFilename } from "../utils/csvBuilder";
import { validColumns } from "../utils/exportColumns";

const MAX_EXPORT_ROWS = 50_000; // safety cap

export const exportTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    // ---------- 1. PARSE QUERY ----------
    const {
      search,
      startDate,
      endDate,
      category,
      status,
      minAmount,
      maxAmount,
      user_id,
      sortBy = "date",
      order = "desc",
      columns,
    } = req.query as Record<string, string>;

    // ---------- 2. VALIDATE COLUMNS ----------
    const requestedCols = columns ? columns.split(",").map((c) => c.trim()).filter(Boolean): [];
    const selectedCols = validColumns(requestedCols);

    if (selectedCols.length === 0) {
      throw new apiError(400, "No valid columns selected");
    }

    // ---------- 3. BUILD FILTER (same as GET /transactions) ----------
    const filter: Record<string, any> = {};

    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.date.$lte = end;
      }
    }

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (user_id) filter.user_id = user_id;

    if (minAmount || maxAmount) {
      filter.amount = {};
      if (minAmount) filter.amount.$gte = Number(minAmount);
      if (maxAmount) filter.amount.$lte = Number(maxAmount);
    }

    if (search) {
      const or: any[] = [{ user_id: { $regex: search, $options: "i" } }];
      if (!isNaN(Number(search))) or.push({ id: Number(search) });
      filter.$or = or;
    }

    // ---------- 4. SORT ----------
    const allowedSortFields = ["date", "amount", "id", "createdAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "date";
    const sort: Record<string, 1 | -1> = { [sortField]: order === "asc" ? 1 : -1 };

    // ---------- 5. FETCH (capped) ----------
    const rows = await Transaction.find(filter)
      .sort(sort)
      .limit(MAX_EXPORT_ROWS)
      .select(selectedCols.map((c) => c.field).join(" "))
      .lean();

    if (rows.length === 0) {
      throw new apiError(404, "No transactions match the selected filters");
    }

    // ---------- 6. BUILD CSV ----------
    const csv = buildCSV(rows as any[], selectedCols);

    // ---------- 7. STREAM TO CLIENT (auto-download) ----------
    const filename = buildFilename(startDate, endDate);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`,
    );
    res.setHeader("Content-Length", Buffer.byteLength(csv, "utf8"));
    res.setHeader("Cache-Control", "no-store");
    
    return res.status(200).send(csv);
  },
);