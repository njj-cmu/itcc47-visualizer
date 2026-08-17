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
let executions = 0;

function boundaryInputs(activity, boundary) {
  return Object.fromEntries(activity.input.controls.map((control) => {
    if (control.type !== 'number') {
      const value = boundary === 'minimum' ? 'A "quoted" value' : boundary === 'middle' ? 'Learner' : 'Transfer case';
      return [control.key, value.slice(0, control.maxLength || 100)];
    }
    if (boundary === 'minimum') return [control.key, control.min];
    if (boundary === 'maximum') return [control.key, control.max];
    return [control.key, (Number(control.min) + Number(control.max)) / 2];
  }));
}

function execute(activity, options, label) {
  const source = activity.sourceFor(options).join('\n');
  const grammar = spawnSync(python, [...prefix, '-c', 'import ast, sys; ast.parse(sys.stdin.read(), feature_version=(3, 9))'], { input: source, encoding: 'utf8', timeout: 10000 });
  const run = spawnSync(python, [...prefix, '-c', source], { encoding: 'utf8', timeout: 10000 });
  const actual = String(run.stdout || '').replace(/\r\n/g, '\n').trim().split('\n').filter(Boolean);
  const expected = [...activity.run(options).events.at(-1).frame.output];
  executions += 1;
  const pass = grammar.status === 0 && run.status === 0 && JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    failures += 1;
    console.error(`FAIL ${activity.id} (${label})`);
    console.error(`  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}\n  grammar:  ${String(grammar.stderr || '').trim()}\n  stderr:   ${String(run.stderr || '').trim()}`);
  }
  return pass;
}

activities.forEach((activity) => {
  const scenarios = [
    ['default', { ...activity.input.defaults }],
    ['minimum', boundaryInputs(activity, 'minimum')],
    ['middle', boundaryInputs(activity, 'middle')],
    ['maximum', boundaryInputs(activity, 'maximum')],
  ];
  const passed = scenarios.map(([label, options]) => execute(activity, options, label)).every(Boolean);
  console.log(`${passed ? 'PASS' : 'FAIL'} ${activity.id} (${scenarios.length} scenarios)`);
});
if (failures) process.exit(1);
console.log(`\n${executions}/${executions} Python 3.9-compatible scenario programs matched their guided timelines.`);
