/* Publishes the static visualizer bundle from Vite's isolated output folder. */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const output = path.join(root, '.visualizer-build');
const assets = ['visualizer-app.js', 'visualizer-workspace.css'];

for (const asset of assets) {
  const source = path.join(output, asset);
  if (!fs.existsSync(source)) throw new Error(`Vite did not produce ${asset}.`);
  fs.copyFileSync(source, path.join(root, asset));
}

fs.rmSync(output, { recursive: true, force: true });
console.log(`Published ${assets.join(' and ')}.`);
