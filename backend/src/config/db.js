import mongoose from "mongoose";
import config from "./index.js";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, {

      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 10000,
      heartbeatFrequencyMS: 2000,
    });
    console.log("Successfully connected to MongoDB.");
  } catch (err) {

    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

export default connectDB;
