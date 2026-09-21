import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    environment: 'node',
    timeout: 10000,
    env: {
      NODE_ENV: 'development',
      SUPABASE_URL: 'https://gzcimnredlffqyogxzqq.supabase.co',
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role',
      PAYMENT_STATUS_TOKEN_SECRET: 'test-secret',
      TOTP_ENCRYPTION_KEY: 'test-totp',
      ANAMNESE_TOKEN_SECRET: 'test-anamnese',
      MP_ACCESS_TOKEN: 'test-mp-token',
      MP_PUBLIC_KEY: 'test-mp-key',
      MP_WEBHOOK_SECRET: 'test-mp-webhook',
      ASAAS_API_KEY: 'test-asaas',
      FRONTEND_URL: 'https://clinxia.vercel.app',
      SERVER_URL: 'https://clinxia-backend.onrender.com',
      PORT: '8787',
      DEFAULT_CLINIC_ID: '00000000-0000-0000-0000-000000000001',
    },
  },
});
