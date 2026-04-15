import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { checkDeviceAuth } from "../services/deviceAuth.service.js";

export async function protect(req, res, next) {
  console.log('[Auth Middleware] verifyToken called');
  try {
    let token;

    console.log("--- Auth Middleware Debug v2 ---");
    console.log("Request URL:", req.originalUrl);
    console.log(
      "Headers Authorization:",
      req.headers.authorization ? "YES" : "NO"
    );
    console.log("Cookies:", JSON.stringify(req.cookies));

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
      console.log("Token Source: Bearer Header");
    } else if (req.cookies?.admin_token) {
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
    console.log('[Auth Middleware] token decoded:', payload.id);

    req.user = { id: payload.id, role: payload.role };
    next();
    console.log('[Auth Middleware] next() called');
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

export const verifyToken = protect;

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

/**
 * Middleware: check Redis cache for device auth hash.
 * Enriches req.cachedDevice with cached data if found.
 * Never blocks — only enriches the request object.
 */
export async function checkDeviceCache(req, res, next) {
  const macAddress = req.headers["x-device-mac"];

  if (!macAddress) {
    // No MAC header present — skip cache check, continue normally
    req.cachedDevice = null;
    return next();
  }

  try {
    const result = await checkDeviceAuth(macAddress);

    if (result.authenticated) {
      req.cachedDevice = result;
    } else {
      req.cachedDevice = null;
    }
  } catch (err) {
    console.error("[checkDeviceCache] Redis lookup error:", err.message);
    req.cachedDevice = null;
  }

  next();
}

export default { protect, authorizeRoles, verifyToken, requireAdmin, checkDeviceCache };

