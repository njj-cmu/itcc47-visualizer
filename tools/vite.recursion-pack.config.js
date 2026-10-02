const path = require('path');
const { defineConfig } = require('vite');
const root = path.join(__dirname, '..');
module.exports = defineConfig({
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: false, // The Python generator has already placed verified fixtures here.
    outDir: path.join(root, '.recursion-pack-build'),
    cssCodeSplit: false, minify: true,
    lib: {
      entry: path.join(root, 'visualizer-src/recursion-pack.jsx'),
      name: 'BSITRecursionPack', formats: ['iife'], fileName: () => 'recursion-workspace.js',
    },
    rollupOptions: {
      external: ['react'],
      output: { globals: { react: 'BSITVisualizerReact' }, assetFileNames: 'recursion-workspace.css' },
    },
  },
});
