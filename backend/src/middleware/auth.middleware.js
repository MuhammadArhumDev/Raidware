import jwt from "jsonwebtoken";
import config from "../config/index.js";

export async function protect(req, res, next) {
  try {
    let token;

    console.log("--- Auth Middleware Debug v2 ---");
    console.log("Request URL:", req.originalUrl);
    console.log(
      "Headers Authorization:",
      req.headers.authorization ? "YES" : "NO"
    );
    console.log("Cookies:", JSON.stringify(req.cookies));

    // 1. Check Authorization Header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token Source: Bearer Header");
    }
    // 2. Check Cookies (admin_token or organization_token)
    else if (req.cookies?.admin_token) {
      token = req.cookies.admin_token;
      console.log("Token Source: admin_token cookie");
    } else if (req.cookies?.organization_token) {
      token = req.cookies.organization_token;
      console.log("Token Source: organization_token cookie");
    }

    if (!token) {
      console.log("Auth Context: No token found anywhere.");
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    }

    console.log(
      "Token found (first 10 chars):",
      token.substring(0, 10) + "..."
    );

    const payload = jwt.verify(token, config.jwt.accessSecret);
    console.log("Token Verified Successfully.");
    console.log("Payload:", JSON.stringify(payload));

    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err.message);
    if (err.name === "JsonWebTokenError") {
      console.error("JWT Error Details:", err);
    }
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
}

export function authorizeRoles(...roles) {
  return (req, res, next) => {
    if (!req.user)
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ success: false, message: "Forbidden" });
    next();
  };
}

// Alias for protect - used in admin routes
export const verifyToken = protect;

// Middleware to require admin role
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }
  if (req.user.role !== "admin") {
    return res
      .status(403)
      .json({ success: false, message: "Admin access required" });
  }
  next();
}

export default { protect, authorizeRoles, verifyToken, requireAdmin };
