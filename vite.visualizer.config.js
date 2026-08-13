const path = require('path');
const { defineConfig } = require('vite');

module.exports = defineConfig({
  base: './',
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    emptyOutDir: true,
    outDir: path.resolve(__dirname, '.visualizer-build'),
    cssCodeSplit: false,
    minify: true,
    lib: {
      entry: path.resolve(__dirname, 'visualizer-src/main.jsx'),
      name: 'ITCC47VisualizerApp',
      formats: ['iife'],
      fileName: () => 'visualizer-app.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (asset) => asset.name && asset.name.endsWith('.css')
          ? 'visualizer-workspace.css' : 'visualizer-assets/[name][extname]',
      },
    },
  },
});
