import { z } from "zod/v4";

const envSchema = z.object({
  DATABASE_URL: z.string().default("file:./dev.db"),
  EMBEDDING_PROVIDER: z.enum(["openai", "local", "none"]).default("none"),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export const env = envSchema.parse(process.env);
