import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const enableHmr = env.VITE_ENABLE_HMR === 'true';
  
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'inline',
        includeAssets: ['official-clinxia-v9-icon.png', 'official-clinxia-v9-logo.png'],
        manifest: {
          name: 'Clinxia - Sistema de Gestão',
          short_name: 'Clinxia',
          description: 'Sistema completo de gestão para clínicas odontológicas e estética.',
          theme_color: '#0d9488',
          background_color: '#ffffff',
          display: 'standalone',
          orientation: 'portrait',
          scope: '/',
          start_url: '/',
          categories: ['business', 'productivity', 'medical'],
          icons: [
            {
              src: '/official-clinxia-v9-icon.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: '/official-clinxia-v9-icon.png',
              sizes: '512x512',
              type: 'image/png',
            },
            {
              src: '/official-clinxia-v9-icon.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\/api\/.*/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 5,
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, 'src') },
      ],
      dedupe: ['react', 'react-dom'],
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-supabase': ['@supabase/supabase-js'],
            'vendor-motion': ['framer-motion', 'motion', 'motion-dom'],
            'vendor-ui': ['lucide-react', 'clsx', 'tailwind-merge'],
            'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-state': ['zustand'],
            'vendor-dates': ['date-fns'],
          },
        },
      },
    },
    server: {
      hmr: enableHmr
        ? {
            host: 'localhost',
            protocol: 'ws',
            clientPort: 3000,
          }
        : false,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || 'http://localhost:8787',
          changeOrigin: true,
        },
      },
    },
  };
});