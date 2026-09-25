const path = require('path');
const { defineConfig } = require('vite');

const root = path.join(__dirname, '..');

module.exports = defineConfig({
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: true,
    outDir: path.join(root, '.priority-service-lane-pack-build'),
    cssCodeSplit: false,
    minify: true,
    lib: {
      entry: path.join(root, 'visualizer-src/priority-service-lane-pack.jsx'),
      name: 'BSITPriorityServiceLanePack',
      formats: ['iife'],
      fileName: () => 'priority-service-lane.js',
    },
    rollupOptions: {
      external: ['react'],
      output: {
        globals: { react: 'BSITVisualizerReact' },
        assetFileNames: 'priority-service-lane.css',
      },
    },
  },
});
