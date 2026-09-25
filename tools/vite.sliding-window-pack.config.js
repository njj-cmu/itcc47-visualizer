const path = require('path');
const { defineConfig } = require('vite');

const root = path.join(__dirname, '..');

module.exports = defineConfig({
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: true,
    outDir: path.join(root, '.sliding-window-pack-build'),
    cssCodeSplit: false,
    minify: true,
    lib: {
      entry: path.join(root, 'visualizer-src/sliding-window-maximum-pack.jsx'),
      name: 'BSITSlidingWindowMaximumPack',
      formats: ['iife'],
      fileName: () => 'sliding-window-maximum.js',
    },
    rollupOptions: {
      external: ['react'],
      output: {
        globals: { react: 'BSITVisualizerReact' },
        assetFileNames: 'sliding-window-maximum.css',
      },
    },
  },
});
