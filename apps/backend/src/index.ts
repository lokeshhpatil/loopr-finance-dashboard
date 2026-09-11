import express, {Express} from "express"
import cors from "cors"
import dotenv from "dotenv"
import { connectDB } from "./config/db"

dotenv.config()

const app: Express = express();

app.use(cors());
app.use(express.json())

app.get("/health", (req, res) => {
  res.json({
    message: "Financial Dashboard API is running",
  })
})

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  connectDB();
  console.log(`Server running on http://localhost:${PORT}`);
})