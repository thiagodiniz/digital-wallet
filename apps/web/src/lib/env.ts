function required(name: keyof ImportMetaEnv): string {
  const value = import.meta.env[name];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL'),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY'),
  apiUrl: required('VITE_API_URL'),
};
