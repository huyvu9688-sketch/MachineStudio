import "server-only";
import { z } from "zod";

// Server-only environment validation. Clerk keys stay optional so the
// app keeps building and running under Clerk's keyless dev mode; see
// context/progress-tracker.md.
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
});

export const env = envSchema.parse(process.env);
