// =============================================================================
// Environment configuration
// All secrets come from environment variables — never hard-coded.
// =============================================================================

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    // In development we allow missing keys and fall back to mock mode
    if (process.env.NODE_ENV === 'development' || process.env.USE_MOCK_PROVIDERS !== 'false') {
      return '';
    }
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

export const env = {
  // App
  nodeEnv: process.env.NODE_ENV ?? 'development',
  appUrl: optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),

  // Supabase
  supabaseUrl: optional('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),

  // AI — Gemini preferred when GEMINI_API_KEY is set
  geminiApiKey: optional('GEMINI_API_KEY'),
  xaiApiKey: optional('XAI_API_KEY'),
  openaiApiKey: optional('OPENAI_API_KEY'),
  aiModel: optional('AI_MODEL', 'gemini-2.0-flash'),

  // Maps / Business data
  googleMapsApiKey: optional('GOOGLE_MAPS_API_KEY'),
  serpApiKey: optional('SERPAPI_API_KEY'),

  // Website audit
  pagespeedApiKey: optional('PAGESPEED_API_KEY'),

  // Payments
  stripeSecretKey: optional('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
  stripePublishableKey: optional('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  razorpayKeyId: optional('RAZORPAY_KEY_ID'),
  razorpayKeySecret: optional('RAZORPAY_KEY_SECRET'),

  // Feature flags
  useMockProviders: process.env.USE_MOCK_PROVIDERS !== 'false',

  // Security
  cronSecret: optional('CRON_SECRET'),
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseAnonKey);
}

export function isStripeConfigured(): boolean {
  return Boolean(env.stripeSecretKey && env.stripePublishableKey);
}

export function isAIConfigured(): boolean {
  return Boolean(env.geminiApiKey || env.xaiApiKey || env.openaiApiKey);
}
