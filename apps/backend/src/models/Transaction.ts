import mongoose, {Schema, Document} from "mongoose";
export type ITransacions = {
  id: number,
  user_id: string,
  user_profile: string,
  date: Date,
  amount: number,
  category: "Revenue" | "Expense",
  status: "Paid" | "Pending" | "Failed"
}

const transactionSchema: Schema<ITransacions> = new Schema({
  id: {
    type: Number,
    required: true,
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
  default:"Pending"
}
},{timestamps:true});

export const Transaction = mongoose.model<ITransacions>("Transaction", transactionSchema);