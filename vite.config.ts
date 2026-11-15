import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';

export default defineConfig({
  plugins: [svelte()],
  // The demo app builds here; dist/ holds the package from svelte-package.
  build: { outDir: 'demo-dist' },
  // Tests mount components, which needs Svelte's browser build rather than the server build.
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
});
