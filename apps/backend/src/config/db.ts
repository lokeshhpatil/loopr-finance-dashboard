import mongoose from "mongoose";

export const connectDB = async() => {
  try {
    const connectionInstance = await mongoose.connect(process.env.MONGO_URI as string);
    console.log("MONGODB connected successfully");
  } catch (error) {
    if(error instanceof Error) {
      console.log("Error while connecting DB :: db -> ", error);
    console.log(error.message);
    }else{
      console.log("Unknown error:", error);
    }
  }
}