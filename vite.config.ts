import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
    },
    build: {
      outDir: 'dist',
    },
    define: {
      // Polyfill process.env.API_KEY for the app code
      'process.env.API_KEY': JSON.stringify(env.REACT_APP_API_KEY || env.API_KEY || '')
    }
  };
});