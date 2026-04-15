import mongoSanitize from "express-mongo-sanitize";

export const safeMongoSanitize = (req, res, next) => {

  if (req.body) {
    req.body = mongoSanitize.sanitize(req.body);
  }

  if (req.params) {
    req.params = mongoSanitize.sanitize(req.params);
  }

  if (req.query) {
    const sanitizedQuery = mongoSanitize.sanitize(req.query);

    if (sanitizedQuery && sanitizedQuery !== req.query) {

      for (const key in req.query) {
        delete req.query[key];
      }

      Object.assign(req.query, sanitizedQuery);
    }
  }

  next();
};
