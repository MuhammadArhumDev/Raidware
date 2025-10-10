import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import xss from "xss-clean";
import hpp from "hpp";

import config from "./config/index.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { globalLimiter } from "./middleware/rateLimit.middleware.js";

const app = express();

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
app.use(mongoSanitize());
app.use(xss());
app.use(hpp());

// Rate Limiting
app.use(globalLimiter);

// Routes
app.use("/api/auth", authRoutes);

// Error handler
app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(config.port, () =>
    console.log(`Server running on port ${config.port}`)
  );
};

start().catch((err) => {
  console.error("Failed to start server", err);
  process.exit(1);
});

export default app;
