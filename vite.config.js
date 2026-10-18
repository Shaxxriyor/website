import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any folder on the host
// (e.g. readingcdi.uz/new/ while it's being previewed).
export default defineConfig({
  base: './',
  plugins: [react()],
});
