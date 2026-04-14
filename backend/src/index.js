import express from "express";
import helmet from "helmet";
// import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";

import { createServer } from "http";
import config from "./config/index.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import deviceRoutes from "./routes/device.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { initSocketService } from "./services/socket.service.js";
import { Server } from "socket.io";
import { syncDeviceHashes } from "./services/deviceAuth.service.js";
import redis from "./config/redis.js";
import { initRedisPubSub } from "./services/redisPubSub.service.js";

const app = express();
const httpServer = createServer(app);

// app.use(helmet());

// Manual CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Methods",
    "GET,HEAD,OPTIONS,POST,PUT,DELETE"
  );
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  // Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

import { globalLimiter, deviceLimiter } from "./middleware/rateLimit.middleware.js";

import { safeMongoSanitize } from "./middleware/security.middleware.js";
app.use(safeMongoSanitize);

app.use(hpp());

// Device routes use a generous limiter (600 req/15min) — must come BEFORE globalLimiter
app.use("/api/devices", deviceLimiter, deviceRoutes);

// Global limiter applies to everything else (auth, admin, frontend API)
app.use(globalLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);

app.use(errorHandler);

const start = async () => {
  console.log("Starting server initialization...");
  try {
    await connectDB();
    const io = new Server(httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] },
    });
    initSocketService(io);

    // Make io and redis available to all route handlers via req.app.get()
    app.set('io', io);
    app.set('redis', redis);

    // Initialize Redis Pub/Sub for device heartbeat monitoring
    await initRedisPubSub(io);

    await syncDeviceHashes();

    setInterval(syncDeviceHashes, 3 * 60 * 60 * 1000);

    httpServer.listen(config.port, () =>
      console.log(`Server running on port ${config.port}`)
    );
  } catch (error) {
    console.error("Error starting server:", error);
  }
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});

export default app;
