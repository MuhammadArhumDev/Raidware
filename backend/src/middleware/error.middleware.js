import { sendError } from "../utils/response.utils.js";

export function errorHandler(err, req, res, next) {
  console.error(err);

  let error = { ...err };
  error.message = err.message;

  // Mongoose bad ObjectId
  if (err.name === "CastError") {
    const message = `Resource not found`;
    return sendError(res, 404, message);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const message = "Duplicate field value entered";
    return sendError(res, 400, message);
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map((val) => val.message);
    return sendError(res, 400, "Validation Error", message);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return sendError(res, 401, "Invalid token");
  }

  if (err.name === "TokenExpiredError") {
    return sendError(res, 401, "Token expired");
  }

  const status = error.status || 500;
  const message = error.message || "Internal Server Error";
  const details = error.details || null;
  return sendError(res, status, message, details);
}

export default errorHandler;
