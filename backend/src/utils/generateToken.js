import jwt from "jsonwebtoken";
import config from "../config/index.js";

export function generateAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpire,
  });
}

export function generateRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  });
}

export default { generateAccessToken, generateRefreshToken };
