import User from "../models/User.js";
import { sendResponse } from "../utils/response.utils.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import config from "../config/index.js";

export async function register(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const exists = await User.findOne({ email });
    if (exists)
      return sendResponse(res, 400, false, "Email already registered");

    const user = new User({ name, email, password, role: role || "user" });
    await user.save();

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Save refresh token on user
    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.cookie(config.cookie.refreshTokenName, refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    });

    return sendResponse(res, 201, true, "User registered", {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return sendResponse(res, 401, false, "Invalid credentials");

    const match = await user.comparePassword(password);
    if (!match) return sendResponse(res, 401, false, "Invalid credentials");

    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.cookie(config.cookie.refreshTokenName, refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });

    // Set role-specific token cookie
    if (user.role === "admin") {
      res.cookie("admin_token", accessToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: "lax",
        maxAge: 1000 * 60 * 15, // 15 minutes
      });
    } else {
      res.cookie("organization_token", accessToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: "lax",
        maxAge: 1000 * 60 * 15, // 15 minutes
      });
    }

    console.log("Login Successful for:", user.email, "Role:", user.role);
    console.log(
      "Cookies set: refreshToken,",
      user.role === "admin" ? "admin_token" : "organization_token"
    );

    return sendResponse(res, 200, true, "Logged in", {
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshToken(req, res, next) {
  try {
    const token =
      req.cookies?.[config.cookie.refreshTokenName] || req.body.refreshToken;
    if (!token) return sendResponse(res, 401, false, "Refresh token missing");

    // Clear the cookie immediately if we are processing it, to prevent race conditions or simple reuse
    // (Optional strategy, but good for one-time use enforcement)
    // res.clearCookie(config.cookie.refreshTokenName);

    import("jsonwebtoken")
      .then(({ default: jwt }) => {
        try {
          const payload = jwt.verify(token, config.jwt.refreshSecret);
          const userId = payload.id;

          User.findById(userId)
            .then(async (user) => {
              // 1. User not found
              if (!user) {
                return sendResponse(res, 401, false, "Invalid refresh token");
              }

              // 2. Token reuse detection
              const foundToken = user.refreshTokens.find(
                (rt) => rt.token === token
              );

              if (!foundToken) {
                // Token is valid (signature-wise) but not in DB.
                // This means it was already used/rotated!
                // SECURITY ALERT: Delete ALL refresh tokens for this user.
                user.refreshTokens = [];
                await user.save();
                res.clearCookie(config.cookie.refreshTokenName);
                return sendResponse(
                  res,
                  403,
                  false,
                  "Refresh token reused. Security alert: Please login again."
                );
              }

              // 3. Valid token found. Rotate it.
              const newAccess = generateAccessToken({
                id: user._id,
                role: user.role,
              });
              const newRefresh = generateRefreshToken({ id: user._id });

              // Remove old token, add new one
              user.refreshTokens = user.refreshTokens.filter(
                (rt) => rt.token !== token
              );
              user.refreshTokens.push({ token: newRefresh });
              await user.save();

              res.cookie(config.cookie.refreshTokenName, newRefresh, {
                httpOnly: true,
                secure: config.cookie.secure,
                sameSite: "lax",
                maxAge: 1000 * 60 * 60 * 24 * 7,
              });

              return sendResponse(res, 200, true, "Token refreshed", {
                accessToken: newAccess,
              });
            })
            .catch(next);
        } catch (err) {
          // Token verification failed (expired or invalid signature)
          if (err.name === "TokenExpiredError") {
            // If expired, we should just ask to login again, but also check if it WAS in db to remove it?
            // For simplicity, just return 401.
            res.clearCookie(config.cookie.refreshTokenName);
          }
          return sendResponse(res, 401, false, "Invalid refresh token");
        }
      })
      .catch(next);
  } catch (err) {
    next(err);
  }
}

export async function logout(req, res, next) {
  try {
    const token =
      req.cookies?.[config.cookie.refreshTokenName] || req.body.refreshToken;

    // Always clear access token cookies regardless of refresh token
    res.clearCookie("organization_token");
    res.clearCookie("admin_token");

    if (!token) {
      res.clearCookie(config.cookie.refreshTokenName);
      return sendResponse(res, 200, true, "Logged out");
    }

    // Remove token from user
    import("jsonwebtoken")
      .then(({ default: jwt }) => {
        try {
          const payload = jwt.verify(token, config.jwt.refreshSecret);
          const userId = payload.id;
          User.findById(userId)
            .then(async (user) => {
              if (!user) {
                res.clearCookie(config.cookie.refreshTokenName);
                return sendResponse(res, 200, true, "Logged out");
              }
              user.refreshTokens = user.refreshTokens.filter(
                (rt) => rt.token !== token
              );
              await user.save();
              res.clearCookie(config.cookie.refreshTokenName);
              return sendResponse(res, 200, true, "Logged out");
            })
            .catch(next);
        } catch (err) {
          // token invalid: still clear cookie
          res.clearCookie(config.cookie.refreshTokenName);
          return sendResponse(res, 200, true, "Logged out");
        }
      })
      .catch(next);
  } catch (err) {
    next(err);
  }
}

export async function me(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return sendResponse(res, 404, false, "User not found");
    return sendResponse(res, 200, true, "User profile", { user });
  } catch (err) {
    next(err);
  }
}

export default { register, login, refreshToken, logout, me };
