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
    source: Object.freeze(ComputerArchitectureMachine.MICRO_OPERATION_LABELS),
    sourceFor() { return this.source; },
    run(options = {}, playbackOptions = {}) {
      return ComputerArchitectureMachine.run(options.preset || this.input.defaultPreset, playbackOptions);
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
    metrics: Object.freeze([]),
    source: Object.freeze(ComputerArchitectureMachine.EXECUTION_MICRO_OPERATION_LABELS),
    sourceFor() { return this.source; },
    run(options = {}, playbackOptions = {}) {
      return ComputerArchitectureMachine.runExecution(options.preset || this.input.defaultPreset, playbackOptions);
    },
  });
  const byId = new Map([[fetchActivity.id, fetchActivity], [executionActivity.id, executionActivity]]);
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
