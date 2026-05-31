import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars for the current mode so we can read them here if needed
  const _env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    plugins: [react(), tailwindcss()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },

    // ── Dev server ────────────────────────────────────────────────────────────
    server: {
      port: 5173,
      host: true,

      // Allow these hosts to reach the Vite dev server
      // (needed when Cloudflare Tunnel / ngrok exposes localhost externally)
      allowedHosts: [
        'localhost',
        'app.gymanger.com',
        'staging.gymanger.com',
        '.ngrok-free.app',   // any ngrok subdomain
        '.ngrok.io',
        '.trycloudflare.com',
      ],

      // Proxy /api → backend port 9000.
      // Active in development only — staging/production builds talk directly
      // to VITE_API_URL (https://api.gymanger.com) with no proxy needed.
      proxy: isDev
        ? {
            '/api': {
              target: 'http://localhost:9000',
              changeOrigin: true,
            },
          }
        : undefined,
    },

    // ── Preview server (vite preview after a build) ───────────────────────────
    preview: {
      port: 4173,
      host: true,
      allowedHosts: [
        'localhost',
        'app.gymanger.com',
        'staging.gymanger.com',
      ],
    },

    // ── Build ─────────────────────────────────────────────────────────────────
    build: {
      // Source maps in dev/staging for easier debugging; disabled in production
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks: {
            react:  ['react', 'react-dom'],
            router: ['react-router-dom'],
            query:  ['@tanstack/react-query'],
          },
        },
      },
    },
  };
});
