import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5173,
      host: true,
      allowedHosts: [
        'localhost',
        'app.gymanger.com',
        'staging.gymanger.com',
        '.ngrok-free.app',
        '.ngrok.io',
        '.trycloudflare.com',
      ],
      proxy: isDev
        ? { '/api': { target: 'http://localhost:9000', changeOrigin: true } }
        : undefined,
    },
    preview: {
      port: 4173,
      host: true,
      allowedHosts: ['localhost', 'app.gymanger.com', 'staging.gymanger.com'],
    },
    build: {
      sourcemap: mode !== 'production',
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('react-dom') || id.includes('react/')) return 'react';
            if (id.includes('react-router-dom')) return 'router';
            if (id.includes('@tanstack/react-query')) return 'query';
          },
        },
      },
    },
  };
});