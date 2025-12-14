import mongoSanitize from "express-mongo-sanitize";

export const safeMongoSanitize = (req, res, next) => {
  // Sanitize Body (usually writable)
  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
  }

  // Sanitize Params (usually writable)
  if (req.params) {
    req.params = mongoSanitize.sanitize(req.params);
  }

  // Sanitize Query
  if (req.query) {
    const sanitizedQuery = mongoSanitize.sanitize(req.query);
    // In Express 5, req.query is a getter. We must mutate the object it returns.
    // Check if we need to update
    if (sanitizedQuery && sanitizedQuery !== req.query) {
      // Clear existing keys
      for (const key in req.query) {
        delete req.query[key];
      }
      // Assign new keys
      Object.assign(req.query, sanitizedQuery);
    }
  }

  next();
};
