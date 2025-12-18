import express from "express";
import helmet from "helmet";
import cors from "cors";
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
import { globalLimiter } from "./middleware/rateLimit.middleware.js";
import { initSocket } from "./services/socket.service.js";
import { syncDeviceHashes } from "./services/deviceAuth.service.js";
import "./config/redis.js";

const app = express();
const httpServer = createServer(app);

// Middlewares
app.use(helmet());
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);
app.use(express.json({ limit: "10kb" })); // Body limit
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

// Security
// app.use(mongoSanitize()); // Incompatible with Express 5 direct assignment
import { safeMongoSanitize } from "./middleware/security.middleware.js";
app.use(safeMongoSanitize);

// app.use(xss()); // Potentially incompatible or redundant with modern React/Helmet. Disabling to prevent similar crash.
app.use(hpp());

// Rate Limiting
app.use(globalLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/admin", adminRoutes);

// Error handler
app.use(errorHandler);

const start = async () => {
  console.log("Starting server initialization...");
  try {
    await connectDB();
    initSocket(httpServer);

    // Initial Sync
    await syncDeviceHashes();

    // Periodic Sync (every 3 hours)
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
