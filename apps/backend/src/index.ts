import express, {Express} from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from "dotenv"
import { connectDB } from "./config/db"

import authRouter from "./routes/auth.routes";
import transRouter from "./routes/transaction.routes"
import analyticsRoute from "./routes/analytics.routes"

dotenv.config()

const app: Express = express();

app.use(cors());
app.use(express.json())
app.use(cookieParser())

app.get("/health", (req, res) => {
  res.json({
    message: "Financial Dashboard API is running",
  })
})

app.use("/api/v0/transactions", transRouter);
app.use("/api/v0/auth", authRouter);

app.use("/api/v0/analytics", analyticsRoute);


const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
};

startServer();