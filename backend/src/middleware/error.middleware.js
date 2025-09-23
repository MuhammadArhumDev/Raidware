import { sendError } from "../utils/response.utils.js";

export function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  const message = err.message || "Internal Server Error";
  const details = err.details || null;
  return sendError(res, status, message, details);
}

export default errorHandler;
