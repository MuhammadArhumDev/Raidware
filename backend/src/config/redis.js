import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://5.189.167.55:6379";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    if (times > 5) {
      console.error("Redis: Max retry attempts reached. Giving up.");
      return null; // Stop retrying
    }
    const delay = Math.min(times * 500, 3000);
    console.log(`Redis: Reconnecting in ${delay}ms (attempt ${times})...`);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("ready", () => {
  console.log("Redis ready");
});

redis.on("error", (err) => {
  console.error("Redis client error:", err.message);
});

redis.on("close", () => {
  console.log("Redis connection closed");
});

export default redis;
