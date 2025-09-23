import mongoose from "mongoose";
import config from "./index.js";

export async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, {
      // options are minimal; mongoose v7+ no longer needs useNewUrlParser/useUnifiedTopology
      // add a short selection timeout so failures show up quickly during dev
      serverSelectionTimeoutMS: 5000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    // print full error to help debugging (includes errno, address, stack)
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

export default connectDB;
