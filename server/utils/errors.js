export class HttpError extends Error {
  constructor(status, message, { code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, opts) => new HttpError(400, message, opts);
export const unauthorized = (message = "Please sign in to continue.", opts) => new HttpError(401, message, opts);
export const forbidden = (message, opts) => new HttpError(403, message, opts);
export const notFound = (message = "Not found.", opts) => new HttpError(404, message, opts);
export const conflict = (message, opts) => new HttpError(409, message, opts);
export const tooMany = (message, opts) => new HttpError(429, message, opts);
