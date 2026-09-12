import { Transaction } from "../models/transaction.model";
import ApiResponse from "../utils/apiResponse";
import apiError from "../utils/apiError";
import { asyncHandler } from "../utils/asyncHandler";

export const getAllTransactions = asyncHandler(async (req, res) => {
  const allTransactions = await Transaction.find();
  if (!allTransactions || allTransactions.length === 0)
    throw new apiError(404, "Unable to retrieve the transactions");
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        allTransactions,
        "Successfully retrieved data from DB",
      ),
    );
});
