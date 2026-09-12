import mongoose, { Schema, Document } from "mongoose";

export interface ITransaction extends Document {
  id: number;
  user_id: string;
  user_profile: string;
  date: Date;
  amount: number;
  category: "Revenue" | "Expense";
  status: "Paid" | "Pending" | "Failed";
}

const transactionSchema: Schema<ITransaction> = new Schema(
  {
    id: {
      type: Number,
      required: true,
      unique: true,
    },
    user_id: {
      type: String,
      required: true,
    },
    user_profile: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: ["Revenue", "Expense"] as const,
      required: true,
    },
    status: {
      type: String,
      enum: ["Paid", "Pending", "Failed"] as const,
      default: "Pending",
    },
  },
  { timestamps: true },
);

transactionSchema.index({ date: -1 });
transactionSchema.index({ category: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ user_id: 1, date: -1 });


export const Transaction = mongoose.model<ITransaction>(
  "Transaction",
  transactionSchema,
);
