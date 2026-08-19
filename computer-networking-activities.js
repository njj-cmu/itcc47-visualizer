/* Introduction to Networking activity catalog. */
const ComputerNetworkingActivities = (() => {
  'use strict';

  const CONTENT_VERSION = 2;
  const foundationsActivity = Object.freeze({
    id: 'networking-read-classroom-network',
    contentVersion: CONTENT_VERSION,
    module: 1,
    topic: 'Networking Today',
    family: 'Network Foundations',
    title: 'Read a classroom network',
    subtitle: 'Identify the people, devices, interfaces, media, representations, and reliability choices in one connected classroom.',
    engine: 'guided-network-model',
    renderer: 'network-foundations',
    workspaceKind: 'network-lab',
    workspaceComposition: 'network-foundations',
    mobileViews: Object.freeze([
      Object.freeze({ id: 'diagram', label: 'Diagram', icon: 'network' }),
      Object.freeze({ id: 'concepts', label: 'Concepts', icon: 'inspect' }),
      Object.freeze({ id: 'evidence', label: 'Evidence', icon: 'list' }),
      Object.freeze({ id: 'steps', label: 'Steps', icon: 'more' }),
    ]),
    evidenceViews: Object.freeze(['network-foundation-guide']),
    inputControlIds: Object.freeze(['network-foundation-preset']),
    input: Object.freeze({
      kind: 'network-foundation-preset',
      label: 'Classroom example',
      editable: false,
      defaultPreset: ComputerNetworkingFoundationsMachine.PRESETS[0].id,
      presets: ComputerNetworkingFoundationsMachine.PRESETS,
    }),
    metrics: Object.freeze([]),
    source: Object.freeze(ComputerNetworkingFoundationsMachine.PHASES.map((phase) => phase.label)),
    sourceFor() { return this.source; },
    completionActions: Object.freeze([
      Object.freeze({ id: 'preview-arp', label: 'Preview Topic 6: ARP', href: 'visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery', kind: 'secondary' }),
    ]),
    run(options = {}, playbackOptions = {}) {
      return ComputerNetworkingFoundationsMachine.run(options.preset || this.input.defaultPreset, playbackOptions);
    },
  });

  const arpActivity = Object.freeze({
    id: 'networking-arp-neighbor-discovery',
    contentVersion: CONTENT_VERSION,
    module: 6,
    topic: 'Network Layer & Address Resolution',
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

  const activities = Object.freeze([foundationsActivity, arpActivity]);
  const byId = new Map(activities.map((activity) => [activity.id, activity]));
  return Object.freeze({
    SCHEMA_VERSION: 1,
    CONTENT_VERSION,
    get(id) { return byId.get(id) || foundationsActivity; },
    list() { return activities; },
  });
})();

if (typeof BSITLearningLab !== 'undefined') {
  BSITLearningLab.registerActivities('computer-networking', ComputerNetworkingActivities);
}
