import { z } from "zod";

// Validated once at boot — a missing required env fails fast with a named
// error instead of a mystery 500 at demo time (docs/04 §11).
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  // Optional integrations — every one has a local fallback:
  RESEND_API_KEY: z.string().optional(), // fallback: console email transport
  BLOB_READ_WRITE_TOKEN: z.string().optional(), // fallback: local-disk uploads
  CRON_SECRET: z.string().optional(), // fallback: jobs open in dev only
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const missing = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join("\n  ");
  throw new Error(`Invalid environment configuration:\n  ${missing}`);
}

export const config = parsed.data;
