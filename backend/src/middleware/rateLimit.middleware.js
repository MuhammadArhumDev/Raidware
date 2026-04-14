import rateLimit from "express-rate-limit";

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 min window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    success: false,
    message:
      "Too many requests from this IP, please try again after 15 minutes",
  },
});

// Generous limiter for IoT device endpoints (heartbeat, network-log, authenticate)
// At 3s intervals: ~20 req/min/endpoint × 2 endpoints = 40 req/min = 600 per 15 min
// Set to 2000 for headroom (re-auth retries, multiple devices, etc.)
export const deviceLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Device rate limit exceeded, please slow down",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 login/register requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many login/register attempts from this IP, please try again after 15 minutes",
  },
});
