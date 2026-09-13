import { Request, Response } from "express";

import { ITransaction, Transaction } from "../models/transaction.model";
import ApiResponse from "../utils/apiResponse";
import apiError from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

type TransactionFilter = {
  date?: { $gte?: Date; $lt?: Date };
  amount?: { $gte?: number; $lte?: number };
  category?: ITransaction["category"] | string;
  status?: ITransaction["status"] | string;
  user_id?: string | { $regex: string; $options: string };
  id?: number;
  $or?: TransactionFilter[];
};

export const getTransactions = asyncHandler(
  async (req: Request, res: Response) => {
    try {
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
        page = "1",
        limit = "20",
      } = req.query as Record<string, string>;

      // FILTER
      const filter: TransactionFilter = {};

      // DATE RANGE FILTER
      if (startDate || endDate) {
        const parsedStartDate = startDate ? new Date(startDate) : undefined;
        const parsedEndDate = endDate ? new Date(endDate) : undefined;

        if (
          (parsedStartDate && Number.isNaN(parsedStartDate.getTime())) ||
          (parsedEndDate && Number.isNaN(parsedEndDate.getTime()))
        ) {
          res.status(400).json({
            success: false,
            message: "startDate and endDate must be valid dates",
          });
          return;
        }

        filter.date = {};

        if (parsedStartDate) {
          filter.date.$gte = parsedStartDate;
        }

        if (parsedEndDate) {
          parsedEndDate.setHours(23, 59, 59, 999);

          filter.date.$lt = parsedEndDate;
        }
      }

      // EXACT FILTER
      if (category) filter.category = category;
      if (status) filter.status = status;
      if (user_id) filter.user_id = user_id;

      // AMOUNT FILTER
      if (minAmount || maxAmount) {
        filter.amount = {};

        if (minAmount) {
          filter.amount.$gte = Number(minAmount);
        }

        if (maxAmount) {
          filter.amount.$lte = Number(maxAmount);
        }
      }

      // TEXT SEARCH
      if (search) {
        const orConditions: TransactionFilter[] = [
          {
            user_id: {
              $regex: search,
              $options: "i",
            },
          },
        ];

        if (!isNaN(Number(search))) {
          orConditions.push({
            id: Number(search),
          });
        }

        filter.$or = orConditions;
      }

      // SORT
      const allowedSortFields = [
        "date",
        "amount",
        "id",
        "createdAt",
      ];

      const sortField = allowedSortFields.includes(sortBy)
        ? sortBy
        : "date";

      const sortOrder = order === "asc" ? 1 : -1;

      const sort: Record<string, 1 | -1> = {
        [sortField]: sortOrder,
      };

      // PAGINATION
      const pageNum = Math.max(1, Number(page));
      const limitNum = Math.min(
        100,
        Math.max(1, Number(limit))
      );

      const skip = (pageNum - 1) * limitNum;

      // QUERY
      const [data, total] = await Promise.all([
        Transaction.find(filter as any)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .lean(),

        Transaction.countDocuments(filter as any),
      ]);
      res.status(200).json({
        success: true,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
        data,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

