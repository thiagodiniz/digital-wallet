import { z } from 'zod';

const csv = z
  .string()
  .transform((value) => value.split(',').map((item) => item.trim()).filter(Boolean));

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: csv.default('http://localhost:5173'),
  LOG_LEVEL: z.string().default('info'),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  SERVICE_JWT_SECRET: z.string().min(1),
  SERVICE_JWT_ISSUERS: csv,
  SERVICE_JWT_AUDIENCE: z.string().default('wallet-api'),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const result = envSchema.safeParse(source);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
