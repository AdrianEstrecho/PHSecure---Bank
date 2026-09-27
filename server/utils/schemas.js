import { z } from "zod";

export const emailField = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address."));

export const passwordField = z
  .string()
  .min(10, "Use at least 10 characters for your password.")
  .max(128, "Passwords can be at most 128 characters.")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), "Include at least one letter and one number.");

export const phoneField = z
  .string()
  .transform((s) => s.replace(/[\s().-]/g, ""))
  .pipe(z.string().regex(/^\+[1-9]\d{7,14}$/, "Enter the number in international format, e.g. +63 917 123 4567."));

export const codeField = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code.");

export const methodField = z.enum(["EMAIL", "TOTP", "SMS", "PASSKEY"], "Unknown security method.");

export const tokenField = z.string().min(1, "Missing token.");
