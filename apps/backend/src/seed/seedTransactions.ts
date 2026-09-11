import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs/promises";
import path from "path";

import { connectDB } from "../config/db";
import { Transaction } from "../models/Transaction";

async function seedTransactions() {
  try {
    await connectDB();

    const filePath = path.join(__dirname, "transactions.json");

    const fileContent = await fs.readFile(filePath, "utf-8");

    const transactions = JSON.parse(fileContent);

    const formattedData = transactions.map((transaction: any) => ({
      ...transaction,
      user_id: String(transaction.user_id),
      date: new Date(transaction.date),
    }));

    await Transaction.deleteMany({});

    await Transaction.insertMany(formattedData);

    console.log(
      `${formattedData.length} transactions inserted successfully`
    );
  } catch (error) {
    console.error("Error while seeding transactions:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

seedTransactions();