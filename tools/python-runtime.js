/* Shared Python discovery for the existing examples and the recursion fixtures. */
const { spawnSync } = require('child_process');

function findPython() {
  const configured = process.env.BSIT_PYTHON;
  const candidates = configured ? [[configured, []]] : process.platform === 'win32'
    ? [['python', []], ['py', ['-3']]] : [['python3', []], ['python', []]];
  for (const [command, args] of candidates) {
    const probe = spawnSync(command, [...args, '--version'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return [command, args];
  }
  throw new Error('Python 3 was not found. Set BSIT_PYTHON to its executable path.');
}
module.exports = { findPython };
