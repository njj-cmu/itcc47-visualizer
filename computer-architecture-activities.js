/* Computer Architecture activity catalog. */
const ComputerArchitectureActivities = (() => {
  'use strict';
  const CONTENT_VERSION = 1;
  const fetchActivity = Object.freeze({
    id: 'architecture-fetch-cycle',
    contentVersion: CONTENT_VERSION,
    module: 1,
    topic: 'CPU and Instruction Flow',
    family: 'CPU and Instruction Flow',
    title: 'Fetch one instruction',
    subtitle: 'Follow one 16-bit instruction from the program counter into the instruction register.',
    engine: 'guided-teaching-cpu',
    renderer: 'cpu-datapath',
    workspaceKind: 'cpu-lab',
    workspaceComposition: 'cpu-datapath',
    mobileViews: Object.freeze([
      Object.freeze({ id: 'datapath', label: 'Datapath', icon: 'cpu' }),
      Object.freeze({ id: 'memory', label: 'Memory', icon: 'memory' }),
      Object.freeze({ id: 'steps', label: 'Steps', icon: 'list' }),
      Object.freeze({ id: 'more', label: 'More', icon: 'more' }),
    ]),
    evidenceViews: Object.freeze(['micro-operations', 'cpu-registers', 'cpu-buses', 'cpu-instruction']),
    inputControlIds: Object.freeze(['cpu-preset', 'number-format']),
    input: Object.freeze({
      kind: 'cpu-preset',
      editable: false,
      defaultPreset: ComputerArchitectureMachine.PRESETS[0].id,
      presets: ComputerArchitectureMachine.PRESETS,
    }),
    metrics: Object.freeze([]),
    completionActions: Object.freeze([
      Object.freeze({ id: 'decode', label: 'Decode this instruction', href: 'visualizer.html?course=computer-architecture&activity=architecture-decode-instruction', kind: 'primary' }),
      Object.freeze({ id: 'practice-fetch', label: 'Practice fetch', href: 'computer-architecture-practice.html#fetch', kind: 'secondary' }),
    ]),
    source: Object.freeze(ComputerArchitectureMachine.MICRO_OPERATION_LABELS.slice(0, 5)),
    sourceFor() { return this.source; },
    run(options = {}, playbackOptions = {}) {
      return ComputerArchitectureMachine.run(options.preset || this.input.defaultPreset, playbackOptions);
    },
  });
  const decodeActivity = Object.freeze({
    id: 'architecture-decode-instruction',
    contentVersion: CONTENT_VERSION,
    module: 1,
    topic: 'CPU and Instruction Flow',
    family: 'CPU and Instruction Flow',
    title: 'Decode one instruction',
    subtitle: 'Break the fetched word in IR into fields and determine what the CPU must do next.',
    engine: 'guided-teaching-cpu',
    renderer: 'cpu-instruction-decode',
    workspaceKind: 'cpu-lab',
    workspaceComposition: 'cpu-decode',
    mobileViews: Object.freeze([
      Object.freeze({ id: 'decode', label: 'Decode', icon: 'grid' }),
      Object.freeze({ id: 'fields', label: 'Fields', icon: 'registers' }),
      Object.freeze({ id: 'steps', label: 'Steps', icon: 'list' }),
      Object.freeze({ id: 'more', label: 'More', icon: 'more' }),
    ]),
    evidenceViews: Object.freeze(['micro-operations', 'cpu-decode-fields', 'cpu-machine-state', 'cpu-decode-meaning']),
    inputControlIds: fetchActivity.inputControlIds,
    input: Object.freeze({
      kind: 'cpu-preset',
      editable: false,
      defaultPreset: ComputerArchitectureMachine.PRESETS[0].id,
      presets: ComputerArchitectureMachine.PRESETS,
    }),
    completionActions: Object.freeze([
      Object.freeze({ id: 'execute-add', label: 'Run 5 + 13', href: 'visualizer.html?course=computer-architecture&activity=architecture-add-immediate', kind: 'primary' }),
      Object.freeze({ id: 'practice-decode', label: 'Practice decoding', href: 'computer-architecture-practice.html#decode', kind: 'secondary' }),
    ]),
    metrics: Object.freeze([]),
    source: Object.freeze(ComputerArchitectureMachine.DECODE_OPERATION_LABELS),
    sourceFor() { return this.source; },
    run(options = {}, playbackOptions = {}) {
      return ComputerArchitectureMachine.runDecode(options.preset || this.input.defaultPreset, playbackOptions);
    },
  });
  const executionActivity = Object.freeze({
    id: 'architecture-add-immediate',
    contentVersion: CONTENT_VERSION,
    module: 1,
    topic: 'CPU and Instruction Flow',
    family: 'CPU and Instruction Flow',
    title: 'Add 5 + 13',
    subtitle: 'Fetch ADDI R1, #13, run 5 + 13 through the ALU, and write 18 back into R1.',
    engine: 'guided-teaching-cpu',
    renderer: 'cpu-datapath',
    workspaceKind: 'cpu-lab',
    workspaceComposition: 'cpu-datapath',
    mobileViews: fetchActivity.mobileViews,
    evidenceViews: fetchActivity.evidenceViews,
    inputControlIds: fetchActivity.inputControlIds,
    input: Object.freeze({
      kind: 'cpu-preset',
      label: 'Operation example',
      editable: false,
      defaultPreset: ComputerArchitectureMachine.EXECUTION_PRESETS[0].id,
      presets: ComputerArchitectureMachine.EXECUTION_PRESETS,
    }),
    completionActions: Object.freeze([
      Object.freeze({ id: 'practice-execution', label: 'Practice execution', href: 'computer-architecture-practice.html#execute', kind: 'primary' }),
      Object.freeze({ id: 'fetch-again', label: 'Fetch another instruction', href: 'visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle', kind: 'secondary' }),
    ]),
    metrics: Object.freeze([]),
    source: Object.freeze(ComputerArchitectureMachine.EXECUTION_MICRO_OPERATION_LABELS),
    sourceFor() { return this.source; },
    run(options = {}, playbackOptions = {}) {
      return ComputerArchitectureMachine.runExecution(options.preset || this.input.defaultPreset, playbackOptions);
    },
  });
  const byId = new Map([[fetchActivity.id, fetchActivity], [decodeActivity.id, decodeActivity], [executionActivity.id, executionActivity]]);
  return Object.freeze({
    SCHEMA_VERSION: 1,
    CONTENT_VERSION,
    get(id) { return byId.get(id) || fetchActivity; },
    list() { return Object.freeze([...byId.values()]); },
  });
})();

if (typeof BSITLearningLab !== 'undefined') {
  BSITLearningLab.registerActivities('computer-architecture', ComputerArchitectureActivities);
}
