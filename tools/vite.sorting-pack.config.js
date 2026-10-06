const path = require('path');
const { defineConfig } = require('vite');
const root = path.join(__dirname, '..');
module.exports = defineConfig({
  base: './', define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: { emptyOutDir: false, outDir: path.join(root, '.sorting-pack-build'), cssCodeSplit: false, minify: true,
    lib: { entry: path.join(root, 'visualizer-src/sorting-pack.jsx'), name: 'BSITSortingPack', formats: ['iife'], fileName: () => 'sorting-workspace.js' },
    rollupOptions: { external: ['react'], output: { globals: { react: 'BSITVisualizerReact' }, assetFileNames: 'sorting-workspace.css' } },
  },
});
