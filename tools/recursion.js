const path = require('path');
const { spawnSync } = require('child_process');
const { findPython } = require('./python-runtime');
const [python, prefix] = findPython();
const root = path.resolve(__dirname, '..');
function run(args) {
  const result = spawnSync(python, [...prefix, '-B', ...args], { cwd: root, stdio: 'inherit', timeout: 60000 });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
if (process.argv[2] === 'build') {
  run(['tools/recursion/build_traces.py']);
}
else if (process.argv[2] === 'test') {
  run(['tools/recursion/build_traces.py', '--check']);
  run(['-m', 'unittest', 'discover', '-s', 'tools/recursion', '-p', 'test_*.py', '-v']);
} else throw new Error('Use build or test.');
