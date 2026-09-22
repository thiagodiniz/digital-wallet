import { describe, expect, it } from 'vitest';
import { loadEnv } from '../src/config/env.js';

const valid = {
  SUPABASE_URL: 'https://x.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'k',
  SUPABASE_JWT_SECRET: 's',
  SERVICE_JWT_SECRET: 's2',
  SERVICE_JWT_ISSUERS: 'a, b ,c',
};

describe('loadEnv', () => {
  it('parses csv lists and applies defaults', () => {
    const env = loadEnv(valid);
    expect(env.SERVICE_JWT_ISSUERS).toEqual(['a', 'b', 'c']);
    expect(env.PORT).toBe(3000);
    expect(env.CORS_ORIGIN).toEqual(['http://localhost:5173']);
    expect(env.SERVICE_JWT_AUDIENCE).toBe('wallet-api');
  });

  it('fails fast on missing required variables', () => {
    expect(() => loadEnv({ ...valid, SUPABASE_URL: undefined })).toThrow(/SUPABASE_URL/);
  });
});
