import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { devApi } from './dev/api-plugin.js';

export default defineConfig(({ mode }) => {
  // Expose .env / .env.local to the dev API (server-side only, never bundled).
  Object.assign(process.env, { ...loadEnv(mode, process.cwd(), ''), ...process.env });
  process.env.ADMIN_USERNAME ??= 'admin';
  process.env.ADMIN_PASSWORD ??= 'devpassword';

  return {
    // Relative base so the build also works from a subfolder on other hosts.
    base: './',
    plugins: [react(), devApi()],
  };
});
