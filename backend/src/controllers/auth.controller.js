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

    user.refreshTokens.push({ token: refreshToken });
    await user.save();

    res.cookie(config.cookie.refreshTokenName, refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7,
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

    if (user.role === "admin") {
      res.cookie("admin_token", accessToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: "lax",
        maxAge: 1000 * 60 * 15,
      });
    } else {
      res.cookie("organization_token", accessToken, {
        httpOnly: true,
        secure: config.cookie.secure,
        sameSite: "lax",
        maxAge: 1000 * 60 * 15,
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

    import("jsonwebtoken")
      .then(({ default: jwt }) => {
        try {
          const payload = jwt.verify(token, config.jwt.refreshSecret);
          const userId = payload.id;

          User.findById(userId)
            .then(async (user) => {
              if (!user) {
                return sendResponse(res, 401, false, "Invalid refresh token");
              }

              const foundToken = user.refreshTokens.find(
                (rt) => rt.token === token
              );

              if (!foundToken) {
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

              const newAccess = generateAccessToken({
                id: user._id,
                role: user.role,
              });
              const newRefresh = generateRefreshToken({ id: user._id });

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

    res.clearCookie("organization_token");
    res.clearCookie("admin_token");

    if (!token) {
      res.clearCookie(config.cookie.refreshTokenName);
      return sendResponse(res, 200, true, "Logged out");
    }

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
