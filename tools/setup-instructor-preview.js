/* Creates the private instructor token and publishes only its SHA-256 verifier. */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TOKEN_PATH = path.join(ROOT, '.instructor-preview-token');
const ACCESS_PATH = path.join(ROOT, 'instructor-access.js');

let token = fs.existsSync(TOKEN_PATH) ? fs.readFileSync(TOKEN_PATH, 'utf8').trim() : '';
if (!token) {
  token = crypto.randomBytes(32).toString('base64url');
  fs.writeFileSync(TOKEN_PATH, `${token}\n`, { encoding: 'utf8', mode: 0o600 });
}

const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
const source = fs.readFileSync(ACCESS_PATH, 'utf8');
const updated = source.replace(/tokenHash:\s*'[0-9a-f]{64}'/, `tokenHash: '${tokenHash}'`);
if (updated === source && !source.includes(`tokenHash: '${tokenHash}'`)) {
  throw new Error('instructor-access.js is missing its tokenHash field.');
}
fs.writeFileSync(ACCESS_PATH, updated, 'utf8');

console.log('Instructor preview access is configured.');
console.log(`Private token: ${TOKEN_PATH}`);
console.log('Paste that token into problems.html?instructorKey=YOUR_TOKEN on this browser once.');
