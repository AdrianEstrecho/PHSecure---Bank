import { badRequest } from "../utils/errors.js";

/** Validates req.body against a zod schema and replaces it with the parsed value. */
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body ?? {});
  if (!result.success) {
    const issues = result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    throw badRequest(issues[0].message, { code: "VALIDATION", details: issues });
  }
  req.body = result.data;
  next();
};
