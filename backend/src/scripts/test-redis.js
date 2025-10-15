import dotenv from "dotenv";
import { resolve } from "path";

// Load .env explicitly
dotenv.config({ path: resolve(process.cwd(), ".env") });

import redis from "../config/redis.js";

async function testConnection() {
  console.log(
    "REDIS_CONNECTION_URL:",
    process.env.REDIS_CONNECTION_URL ? "Set" : "Not Set"
  );
  console.log("REDIS_URL:", process.env.REDIS_URL ? "Set" : "Not Set");
  console.log("REDIS_HOST:", process.env.REDIS_HOST);
  console.log("REDIS_PORT:", process.env.REDIS_PORT);

  try {
    console.log("Testing Redis connection...");

    // Set a timeout
    const timeout = setTimeout(() => {
      console.error("Timeout connecting to Redis");
      process.exit(1);
    }, 5000);

    await redis.ping();
    clearTimeout(timeout);

    console.log("Redis PING successful!");
    process.exit(0);
  } catch (error) {
    console.error("Redis connection failed:", error);
    process.exit(1);
  }
}

testConnection();
