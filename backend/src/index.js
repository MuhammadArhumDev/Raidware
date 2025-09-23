import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import config from "./config/index.js";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import { errorHandler } from "./middleware/error.middleware.js";

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// Routes
app.use("/api/auth", authRoutes);

app.get("/", (req, res) =>
  res.json({
    success: true,
    message: "Miss Malaika ggg, we welcome you to AI receptionist system",
  })
);

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
