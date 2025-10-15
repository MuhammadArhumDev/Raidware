import Redis from "ioredis";
import config from "./index.js";

const connectionUrl = process.env.REDIS_CONNECTION_URL || process.env.REDIS_URL;

const redis = connectionUrl
  ? new Redis(connectionUrl, {
      lazyConnect: true,
    })
  : new Redis({
      host: process.env.REDIS_HOST || "139.59.30.129",
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      lazyConnect: false,
    });

redis.on("connect", () => {
  console.log("Redis client connected");
});

redis.on("error", (err) => {
  console.error("Redis client error:", err);
});

export default redis;
