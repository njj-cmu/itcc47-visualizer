const path = require('path');
const { defineConfig } = require('vite');
const root = path.join(__dirname, '..');
module.exports = defineConfig({
  build: {
    outDir: path.join(root, '.recursion-catalog-build'), emptyOutDir: true, minify: true,
    lib: { entry: path.join(root, 'visualizer-src/recursion-catalog.js'), name: 'BSITRecursionCatalog',
      formats: ['iife'], fileName: () => 'recursion-activities.js' },
  },
});
