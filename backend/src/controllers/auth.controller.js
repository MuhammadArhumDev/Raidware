import User from "../models/User.js";
import { sendResponse } from "../utils/response.utils.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";
import config from "../config/index.js";

export async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists)
      return sendResponse(res, 400, false, "Email already registered");

    const user = new User({ name, email, password });
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

    // verify signature
    import("jsonwebtoken")
      .then(({ default: jwt }) => {
        try {
          const payload = jwt.verify(token, config.jwt.refreshSecret);
          const userId = payload.id;
          User.findById(userId)
            .then((user) => {
              if (!user)
                return sendResponse(res, 401, false, "Invalid refresh token");
              const found = user.refreshTokens.find((rt) => rt.token === token);
              if (!found)
                return sendResponse(res, 401, false, "Invalid refresh token");

              const newAccess = generateAccessToken({
                id: user._id,
                role: user.role,
              });
              const newRefresh = generateRefreshToken({ id: user._id });

              // replace refresh token
              user.refreshTokens = user.refreshTokens.filter(
                (rt) => rt.token !== token
              );
              user.refreshTokens.push({ token: newRefresh });
              user.save();

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
    if (!token) return sendResponse(res, 200, true, "No refresh token");

    // Remove token from user
    import("jsonwebtoken")
      .then(({ default: jwt }) => {
        try {
          const payload = jwt.verify(token, config.jwt.refreshSecret);
          const userId = payload.id;
          User.findById(userId)
            .then(async (user) => {
              if (!user) return sendResponse(res, 200, true, "Logged out");
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
