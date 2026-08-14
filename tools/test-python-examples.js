/* Executes every displayed ITCC45 Python example against its declared output. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const context = vm.createContext({ console, setTimeout, clearTimeout });
['course-catalog.js', 'playback.js', 'itcc45-activities.js'].forEach((file) => vm.runInContext(fs.readFileSync(path.join(ROOT, file), 'utf8'), context));
const activities = vm.runInContext('ITCC45Activities.list()', context);

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

const [python, prefix] = findPython();
let failures = 0;
activities.forEach((activity) => {
  const source = activity.source.join('\n');
  const grammar = spawnSync(python, [...prefix, '-c', 'import ast, sys; ast.parse(sys.stdin.read(), feature_version=(3, 9))'], { input: source, encoding: 'utf8', timeout: 10000 });
  const run = spawnSync(python, [...prefix, '-c', source], { encoding: 'utf8', timeout: 10000 });
  const actual = String(run.stdout || '').replace(/\r\n/g, '\n').trim().split('\n').filter(Boolean);
  const expected = [...activity.expectedOutput];
  const pass = grammar.status === 0 && run.status === 0 && JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${pass ? 'PASS' : 'FAIL'} ${activity.id}`);
  if (!pass) {
    failures += 1;
    console.error(`  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}\n  grammar:  ${String(grammar.stderr || '').trim()}\n  stderr:   ${String(run.stderr || '').trim()}`);
  }
});
if (failures) process.exit(1);
console.log(`\n${activities.length}/${activities.length} Python 3.9-compatible examples executed successfully.`);
