import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://5.189.167.55:6379";

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableAutoPipelining: true,
  retryStrategy(times) {
    if (times > 5) {
      console.error("Redis: Max retry attempts reached. Giving up.");
      return null; 
    }
    const delay = Math.min(times * 500, 3000);
    console.log(`Redis: Reconnecting in ${delay}ms (attempt ${times})...`);
    return delay;
  },
});

redis.on("connect", () => {
  console.log("[Redis] Connected");
});

redis.on("ready", () => {
  console.log("[Redis] Ready");

  redis
    .config("SET", "notify-keyspace-events", "Ex")
    .then(() => console.log("[Redis] notify-keyspace-events set to 'Ex'"))
    .catch((err) =>
      console.warn(
        "[Redis] Could not set notify-keyspace-events (expiration events may not work):",
        err.message
      )
    );
});

redis.on("error", (err) => {
  console.error("[Redis] Client error:", err.message);
});

redis.on("close", () => {
  console.log("[Redis] Connection closed");
});

export default redis;
