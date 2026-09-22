import { buildApp } from './app.js';
import { loadEnv } from './config/env.js';
import { createSupabaseAdminClient } from './infra/supabase/client.js';
import { SupabaseAccountRepository } from './infra/supabase/supabase-account-repository.js';

const env = loadEnv();

const supabase = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const app = await buildApp(
  {
    accountRepository: new SupabaseAccountRepository(supabase),
    corsOrigin: env.CORS_ORIGIN,
    auth: {
      supabaseUrl: env.SUPABASE_URL,
      userJwtSecret: env.SUPABASE_JWT_SECRET,
      serviceJwtSecret: env.SERVICE_JWT_SECRET,
      serviceIssuers: env.SERVICE_JWT_ISSUERS,
      serviceAudience: env.SERVICE_JWT_AUDIENCE,
    },
  },
  { logger: { level: env.LOG_LEVEL } },
);

try {
  await app.listen({ port: env.PORT, host: env.HOST });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}
