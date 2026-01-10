import dotenv from "dotenv";

dotenv.config();

const config = {
  port: process.env.PORT || 9631,
  mongoUri:
    process.env.MONGO_URI ||
    "mongodb://127.0.0.1:27017/multitenant_receptionist",
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || "access-secret-example",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "refresh-secret-example",
    accessExpire: process.env.JWT_ACCESS_EXPIRE || "15m",
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || "7d",
  },
  cookie: {
    refreshTokenName: process.env.REFRESH_COOKIE_NAME || "refresh_token",
    secure: process.env.COOKIE_SECURE === "true",
  },
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:9630",
};

export default config;
