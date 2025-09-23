import jwt from "jsonwebtoken";
import config from "../config/index.js";

export async function protect(req, res, next) {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer "))
      return res
        .status(401)
        .json({ success: false, message: "Not authorized" });
    const token = auth.split(" ")[1];
    const payload = jwt.verify(token, config.jwt.accessSecret);
    req.user = { id: payload.id, role: payload.role };
    next();
  } catch (err) {
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

export default { protect, authorizeRoles };
