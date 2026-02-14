import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Cast process to any to avoid TypeScript error if @types/node is missing or incomplete
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      port: 3000,
      strictPort: true,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: false
    },
    define: {
      // Polyfill process.env.API_KEY for the app code so it works in the browser
      'process.env.API_KEY': JSON.stringify(env.REACT_APP_API_KEY || env.API_KEY || '')
    }
  };
});