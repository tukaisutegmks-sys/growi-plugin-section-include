import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: 'manifest.json',
    rollupOptions: {
      input: ['/client-entry.tsx'],
    },
  },
});
