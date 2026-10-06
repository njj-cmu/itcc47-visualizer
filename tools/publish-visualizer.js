/* Publishes the static visualizer bundle and route-scoped optional activity packs. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');
const output = path.join(root, '.visualizer-build');
const packDestination = path.join(root, 'activity-packs');
const assets = ['visualizer-app.js', 'visualizer-workspace.css'];
const packs = [
  {
    buildDirectory: '.sorting-pack-build',
    assets: ['sorting-traces.js', 'sorting-workspace.js', 'sorting-workspace.css'],
    manifestFile: 'sorting-manifest.json', revisioned: true,
    manifest: { schemaVersion: 1, id: 'python-sorting', title: 'Python Merge Sort and Lomuto Quicksort' },
  },
  {
    buildDirectory: '.recursion-pack-build',
    assets: ['recursion-traces.js', 'recursion-workspace.js', 'recursion-workspace.css'],
    manifestFile: 'recursion-foundations-manifest.json',
    manifest: { schemaVersion: 1, id: 'python-recursion-foundations', title: 'Python recursion foundations and applications' },
  },
  {
    buildDirectory: '.sliding-window-pack-build',
    assets: ['sliding-window-maximum.js', 'sliding-window-maximum.css'],
    manifestFile: 'manifest.json',
    manifest: {
      schemaVersion: 1,
      id: 'deque-sliding-window',
      title: 'Sliding Window Maximum',
    },
  },
  {
    buildDirectory: '.priority-service-lane-pack-build',
    assets: ['priority-service-lane.js', 'priority-service-lane.css'],
    manifestFile: 'priority-service-lane-manifest.json',
    manifest: {
      schemaVersion: 1,
      id: 'deque-service-lane',
      title: 'Priority service lane',
    },
  },
];

for (const asset of assets) {
  const source = path.join(output, asset);
  if (!fs.existsSync(source)) throw new Error(`Vite did not produce ${asset}.`);
  fs.copyFileSync(source, path.join(root, asset));
}
fs.copyFileSync(path.join(root, '.recursion-catalog-build/recursion-activities.js'), path.join(root, 'recursion-activities.js'));
fs.rmSync(path.join(root, '.recursion-catalog-build'), { recursive: true, force: true });

fs.rmSync(packDestination, { recursive: true, force: true });
fs.mkdirSync(packDestination, { recursive: true });
for (const pack of packs) {
  const packOutput = path.join(root, pack.buildDirectory);
  const revision = pack.revisioned ? crypto.createHash('sha256').update(Buffer.concat(pack.assets.map(asset => fs.readFileSync(path.join(packOutput, asset))))).digest('hex').slice(0, 16) : null;
  const directory = revision ? `sorting-${revision}` : '';
  const destination = path.join(packDestination, directory);
  fs.mkdirSync(destination, { recursive: true });
  const publicPath = asset => ['activity-packs', directory, asset].filter(Boolean).join('/');
  for (const asset of pack.assets) {
    const source = path.join(packOutput, asset);
    if (!fs.existsSync(source)) throw new Error(`Vite did not produce optional pack asset ${asset}.`);
    fs.copyFileSync(source, path.join(destination, asset));
  }
  const manifest = {
    ...pack.manifest,
    cacheName: 'bsit-learning-lab-optional-packs-v1',
    ...(revision ? { revision } : {}),
    files: [...pack.assets.map(publicPath), publicPath(pack.manifestFile)],
  };
  const assetsBytes = pack.assets.reduce((total, asset) => total + fs.statSync(path.join(destination, asset)).size, 0);
  let manifestBytes = assetsBytes;
  let manifestText;
  for (let attempt = 0; attempt < 16; attempt += 1) {
    manifestText = JSON.stringify({ ...manifest, bytes: manifestBytes });
    const nextBytes = assetsBytes + Buffer.byteLength(manifestText);
    if (nextBytes === manifestBytes) break;
    manifestBytes = nextBytes;
  }
  manifestText = JSON.stringify({ ...manifest, bytes: manifestBytes });
  if (assetsBytes + Buffer.byteLength(manifestText) !== manifestBytes) throw new Error(`${pack.manifestFile} size did not converge.`);
  fs.writeFileSync(path.join(destination, pack.manifestFile), manifestText, 'utf8');
  if (revision) {
    // Local build/test index; the browser installs the versioned manifest path.
    fs.writeFileSync(path.join(packDestination, pack.manifestFile), manifestText, 'utf8');
    fs.appendFileSync(path.join(root, 'recursion-activities.js'), `\nglobalThis.BSIT_SORTING_PACK_PATH=${JSON.stringify(directory)};\n`);
  }
  console.log(`Published ${pack.manifest.id} optional pack (${manifestBytes} bytes).`);
}

fs.rmSync(output, { recursive: true, force: true });
for (const pack of packs) fs.rmSync(path.join(root, pack.buildDirectory), { recursive: true, force: true });
console.log(`Published ${assets.join(' and ')} plus ${packs.length} optional activity packs.`);
