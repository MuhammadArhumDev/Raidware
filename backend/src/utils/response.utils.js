function sendResponse(
  res,
  statusCode = 200,
  success = true,
  message = "",
  data = null
) {
  res.status(statusCode).json({
    success,
    message,
    data,
  });
}

function sendError(
  res,
  statusCode = 500,
  message = "Internal Server Error",
  details = null
) {
  res.status(statusCode).json({
    success: false,
    message,
    details,
  });
}

export { sendResponse, sendError };
