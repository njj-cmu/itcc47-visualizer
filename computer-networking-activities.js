/* Introduction to Networking activity catalog. */
const ComputerNetworkingActivities = (() => {
  'use strict';

  const CONTENT_VERSION = 1;
  const arpActivity = Object.freeze({
    id: 'networking-arp-neighbor-discovery',
    contentVersion: CONTENT_VERSION,
    module: 1,
    topic: 'Local Network Delivery',
    family: 'Local Network Delivery',
    title: 'Discover a neighbor with ARP',
    subtitle: 'Follow a local IPv4 destination decision, ARP broadcast, switch learning, and unicast reply.',
    engine: 'guided-network-model',
    renderer: 'network-topology',
    workspaceKind: 'network-lab',
    workspaceComposition: 'network-lab',
    mobileViews: Object.freeze([
      Object.freeze({ id: 'topology', label: 'Topology', icon: 'network' }),
      Object.freeze({ id: 'packet', label: 'Packet', icon: 'inspect' }),
      Object.freeze({ id: 'tables', label: 'Tables', icon: 'list' }),
      Object.freeze({ id: 'steps', label: 'Steps', icon: 'more' }),
    ]),
    evidenceViews: Object.freeze(['packet-inspector', 'network-decisions', 'arp-table', 'mac-table']),
    inputControlIds: Object.freeze(['network-preset']),
    input: Object.freeze({
      kind: 'network-preset',
      label: 'Network example',
      editable: false,
      defaultPreset: ComputerNetworkingMachine.PRESETS[0].id,
      presets: ComputerNetworkingMachine.PRESETS,
    }),
    metrics: Object.freeze([]),
    source: Object.freeze(ComputerNetworkingMachine.PHASES.map((phase) => phase.label)),
    sourceFor() { return this.source; },
    run(options = {}, playbackOptions = {}) {
      return ComputerNetworkingMachine.run(options.preset || this.input.defaultPreset, playbackOptions);
    },
  });

  const byId = new Map([[arpActivity.id, arpActivity]]);
  return Object.freeze({
    SCHEMA_VERSION: 1,
    CONTENT_VERSION,
    get(id) { return byId.get(id) || arpActivity; },
    list() { return Object.freeze([...byId.values()]); },
  });
})();

if (typeof BSITLearningLab !== 'undefined') {
  BSITLearningLab.registerActivities('computer-networking', ComputerNetworkingActivities);
}
