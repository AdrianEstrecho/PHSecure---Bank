import { HttpError } from "../utils/errors.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { message: "Not found.", code: "NOT_FOUND" } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: { message: "Malformed request body.", code: "BAD_JSON" } });
  }
  console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: { message: "Something went wrong on our side. Please try again.", code: "SERVER_ERROR" } });
}
