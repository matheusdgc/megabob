import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative base so the same build works on GitHub Pages (sub-path) and itch.io.
  base: './',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    // Phaser alone is ~1.2 MB minified; the default 500 kB warning is noise here.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
