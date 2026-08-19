/* Deterministic, framework-neutral teaching model for Networking Today. */
const ComputerNetworkingFoundationsMachine = (() => {
  'use strict';

  const ACTIVITY_ID = 'networking-read-classroom-network';
  const DOMAIN = 'network-foundations';
  const freeze = (value) => BSITPlayback.deepFreeze(value);

  const PRESETS = freeze([{
    id: 'classroom-network',
    label: 'Connected classroom',
    description: 'Read one fixed classroom LAN, its Internet edge, and the people and services that use it.',
    devices: [
      { id: 'student-laptop', kind: 'end-device', label: 'Student laptop', role: 'client', interfaces: [{ id: 'student-laptop-wlan0', label: 'wlan0', media: 'wireless' }] },
      { id: 'instructor-pc', kind: 'end-device', label: 'Instructor PC', role: 'client and peer', interfaces: [{ id: 'instructor-pc-eth0', label: 'eth0', media: 'copper' }] },
      { id: 'classroom-ap', kind: 'intermediary', label: 'Wireless AP', role: 'wireless access', interfaces: [{ id: 'classroom-ap-radio0', label: 'radio0', media: 'wireless' }, { id: 'classroom-ap-eth0', label: 'eth0', media: 'copper' }] },
      { id: 'classroom-switch', kind: 'intermediary', label: 'Classroom switch', role: 'LAN forwarding', interfaces: [{ id: 'classroom-switch-fa0-1', label: 'Fa0/1', media: 'copper' }, { id: 'classroom-switch-fa0-2', label: 'Fa0/2', media: 'copper' }] },
      { id: 'edge-router', kind: 'intermediary', label: 'Edge router', role: 'LAN/WAN boundary and firewall', interfaces: [{ id: 'edge-router-g0-0', label: 'G0/0', media: 'copper' }, { id: 'edge-router-g0-1', label: 'G0/1', media: 'copper' }, { id: 'edge-router-wan0', label: 'WAN0', media: 'fiber' }] },
      { id: 'learning-server', kind: 'end-device', label: 'Learning server', role: 'server', interfaces: [{ id: 'learning-server-eth0', label: 'eth0', media: 'fiber' }] },
    ],
    links: [
      { id: 'link-student-ap', fromInterfaceId: 'student-laptop-wlan0', toInterfaceId: 'classroom-ap-radio0', media: 'wireless', scope: 'LAN' },
      { id: 'link-instructor-switch', fromInterfaceId: 'instructor-pc-eth0', toInterfaceId: 'classroom-switch-fa0-1', media: 'copper', scope: 'LAN' },
      { id: 'link-switch-router', fromInterfaceId: 'classroom-switch-fa0-2', toInterfaceId: 'edge-router-g0-0', media: 'copper', scope: 'LAN' },
      { id: 'link-ap-router', fromInterfaceId: 'classroom-ap-eth0', toInterfaceId: 'edge-router-g0-1', media: 'copper', scope: 'LAN' },
      { id: 'link-router-server', fromInterfaceId: 'edge-router-wan0', toInterfaceId: 'learning-server-eth0', media: 'fiber', scope: 'WAN' },
    ],
  }]);
  const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

  const detail = (id, label, message, evidence) => ({ id, label, message, ...evidence });
  const operation = (id, label, summary, phases) => ({ id, label, summary, phases });
  const OPERATIONS = freeze([
    operation('network-purpose', 'Explain the purpose', 'Start with the people and services the classroom network must connect.', [
      detail('observe-classroom-needs', 'Observe the classroom need', 'Students and an instructor need a reliable path to shared learning services.', { category: 'Purpose', focusIds: ['student-laptop', 'instructor-pc', 'learning-server'], facts: ['People use applications', 'Applications need connected devices'], conclusion: 'The network supports communication and access.' }),
      detail('identify-communication-ends', 'Find both ends', 'A communication begins on an end device and finishes at another end device or service.', { category: 'Purpose', focusIds: ['student-laptop', 'learning-server'], facts: ['Source: student laptop', 'Destination: learning server'], conclusion: 'A useful path has a source and destination.' }),
      detail('state-network-purpose', 'State the purpose', 'The network joins devices, media, and services so information can move between people and applications.', { category: 'Purpose', focusIds: ['student-laptop', 'classroom-ap', 'edge-router', 'learning-server'], facts: ['Devices create and consume data', 'Intermediaries carry it'], conclusion: 'The network exists to deliver communication.' }),
    ]),
    operation('end-device-roles', 'Identify end-device roles', 'Separate hosts from the client, server, and peer roles they perform.', [
      detail('mark-end-devices', 'Mark the hosts', 'The laptop, instructor PC, and learning server are end devices because communication begins or ends on them.', { category: 'Components', focusIds: ['student-laptop', 'instructor-pc', 'learning-server'], facts: ['Laptop: end device', 'PC: end device', 'Server: end device'], conclusion: 'Hosts are the endpoints of network messages.' }),
      detail('assign-client-server', 'Assign client and server roles', 'The laptop requests a learning page, while the server supplies it.', { category: 'Roles', focusIds: ['student-laptop', 'learning-server'], facts: ['Client requests a service', 'Server provides a service'], conclusion: 'Client and server describe roles, not device shapes.' }),
      detail('recognize-peer-role', 'Recognize a peer role', 'The instructor PC can both request and provide a classroom resource, so one host may perform both roles.', { category: 'Roles', focusIds: ['instructor-pc'], facts: ['Can request resources', 'Can share resources'], conclusion: 'A host may act as both client and server.' }),
    ]),
    operation('intermediary-roles', 'Identify intermediaries', 'Explain how access points, switches, routers, and firewalls connect and protect endpoints.', [
      detail('locate-lan-intermediaries', 'Locate the LAN devices', 'The access point joins wireless hosts and the switch joins wired hosts.', { category: 'Components', focusIds: ['classroom-ap', 'classroom-switch'], facts: ['AP: wireless access', 'Switch: wired LAN forwarding'], conclusion: 'Intermediaries connect end devices to the network.' }),
      detail('locate-network-edge', 'Locate the network edge', 'The edge router connects the classroom LAN to a wider network.', { category: 'Components', focusIds: ['edge-router'], facts: ['LAN-facing interfaces', 'WAN-facing interface'], conclusion: 'A router connects different networks.' }),
      detail('connect-security-role', 'Connect the security role', 'The edge device also enforces which traffic may cross the classroom boundary.', { category: 'Security', focusIds: ['edge-router'], facts: ['Protect access', 'Inspect boundary traffic'], conclusion: 'Security is designed into the network edge.' }),
    ]),
    operation('interfaces-and-media', 'Inspect interfaces and media', 'Distinguish the interface, physical port, and signal medium used by each link.', [
      detail('inspect-named-interfaces', 'Inspect named interfaces', 'Each connection is attached to a specific interface such as eth0, Fa0/1, radio0, or WAN0.', { category: 'Physical layer', focusIds: ['instructor-pc-eth0', 'classroom-switch-fa0-1', 'student-laptop-wlan0'], facts: ['NIC connects a host', 'Port is a physical connector', 'Interface names the attachment point'], conclusion: 'Connections belong to interfaces, not device centers.' }),
      detail('compare-signal-media', 'Compare signal media', 'Copper carries electrical signals, fiber carries light, and wireless carries electromagnetic signals through the air.', { category: 'Media', focusLinkIds: ['link-instructor-switch', 'link-student-ap', 'link-router-server'], facts: ['Copper: electrical', 'Fiber: light', 'Wireless: radio'], conclusion: 'The medium determines how bits cross the link.' }),
      detail('trace-physical-path', 'Trace the physical path', 'Follow the actual media and named interfaces from an endpoint toward the network edge.', { category: 'Physical layer', representation: 'physical', focusLinkIds: ['link-instructor-switch', 'link-switch-router'], facts: ['eth0 to Fa0/1', 'Fa0/2 to G0/0'], conclusion: 'A physical path is a sequence of connected interfaces.' }),
    ]),
    operation('network-representations', 'Compare representations', 'Use physical and logical views for different questions about the same network.', [
      detail('read-physical-topology', 'Read the physical topology', 'The physical view emphasizes device location, interface names, and the media joining them.', { category: 'Representation', representation: 'physical', focusIds: ['instructor-pc', 'classroom-switch', 'edge-router'], facts: ['Where devices are', 'Which ports are joined'], conclusion: 'Physical topology explains placement and cabling.' }),
      detail('read-logical-topology', 'Read the logical topology', 'The logical view groups the classroom LAN, its boundary, and the remote service by communication role.', { category: 'Representation', representation: 'logical', focusIds: ['student-laptop', 'instructor-pc', 'edge-router', 'learning-server'], facts: ['Classroom LAN', 'Network edge', 'Remote service'], conclusion: 'Logical topology explains how communication is organized.' }),
      detail('choose-useful-view', 'Choose the useful view', 'Use the physical view to troubleshoot a cable and the logical view to reason about network scope.', { category: 'Representation', representation: 'split', facts: ['Cable question: physical', 'Scope question: logical'], conclusion: 'Both representations describe the same network.' }),
    ]),
    operation('network-scope', 'Classify network scope', 'Place the classroom LAN inside the wider WAN and Internet context.', [
      detail('classify-classroom-lan', 'Classify the classroom LAN', 'The devices under one local administration form a LAN.', { category: 'Scope', focusIds: ['student-laptop', 'instructor-pc', 'classroom-ap', 'classroom-switch', 'edge-router'], facts: ['Limited local area', 'Common administration'], conclusion: 'The classroom side is a LAN.' }),
      detail('connect-lans-with-wan', 'Connect through a WAN', 'The edge router uses a service-provider path to reach remote networks across a larger geographic area.', { category: 'Scope', focusLinkIds: ['link-router-server'], facts: ['Router marks the boundary', 'WAN joins distant networks'], conclusion: 'A WAN connects networks over distance.' }),
      detail('distinguish-access-scopes', 'Distinguish access scopes', 'The Internet is public interconnection; an intranet is private to an organization; an extranet grants limited outside access.', { category: 'Scope', focusIds: ['edge-router', 'learning-server'], facts: ['Internet: public', 'Intranet: internal', 'Extranet: limited partner access'], conclusion: 'Access policy differs even when technologies overlap.' }),
    ]),
    operation('reliable-network', 'Evaluate reliability', 'Check the four qualities expected of a dependable modern network.', [
      detail('check-fault-tolerance', 'Check fault tolerance', 'Redundant paths and recoverable services reduce the effect of a single failure.', { category: 'Reliability', quality: 'fault-tolerance', facts: ['Avoid one critical failure point', 'Recover service predictably'], conclusion: 'Fault tolerance limits disruption.' }),
      detail('check-scale-and-quality', 'Check scalability and QoS', 'The design should accept more users while prioritizing time-sensitive voice or video when capacity is contested.', { category: 'Reliability', quality: 'scale-qos', facts: ['Grow without redesigning everything', 'Prioritize delay-sensitive traffic'], conclusion: 'Scalability and QoS protect the user experience.' }),
      detail('check-security', 'Check security', 'Confidentiality, integrity, and availability guide how devices, accounts, and traffic are protected.', { category: 'Reliability', quality: 'security', focusIds: ['edge-router'], facts: ['Confidentiality', 'Integrity', 'Availability'], conclusion: 'A reliable network must also be secure.' }),
    ]),
    operation('trends-and-profession', 'Connect trends and practice', 'Finish by relating the classroom network to current use and professional responsibility.', [
      detail('identify-network-trends', 'Identify current trends', 'BYOD, collaboration, video, cloud services, and smart devices all increase dependence on the network.', { category: 'Trends', focusIds: ['student-laptop', 'learning-server'], facts: ['Mobile and personal devices', 'Cloud and collaboration', 'Video and smart environments'], conclusion: 'Network design responds to changing use.' }),
      detail('identify-professional-actions', 'Identify professional actions', 'An IT professional documents interfaces, protects access, verifies operation, and communicates changes.', { category: 'Profession', focusIds: ['classroom-switch', 'edge-router'], facts: ['Document', 'Secure', 'Verify', 'Communicate'], conclusion: 'Professional practice makes networks supportable.' }),
      detail('summarize-classroom-network', 'Summarize the network', 'The classroom network combines endpoints, intermediaries, named interfaces, media, scope, reliability, and responsible operation.', { category: 'Summary', representation: 'split', focusIds: ['student-laptop', 'instructor-pc', 'classroom-ap', 'classroom-switch', 'edge-router', 'learning-server'], facts: ['Components and roles', 'Physical and logical views', 'Reliable and secure operation'], conclusion: 'You can now read the network before tracing its traffic.' }),
    ]),
  ]);

  const FLAT_DETAILS = freeze(OPERATIONS.flatMap((item, operationIndex) => item.phases.map((phase, detailIndex) => ({ item, phase, operationIndex, detailIndex }))));
  const PHASES = freeze(OPERATIONS.map((item) => ({ id: item.id, label: item.label, explanation: item.summary })));
  const ENTITY_IDS = freeze({
    devices: PRESETS[0].devices.map((item) => item.id),
    interfaces: PRESETS[0].devices.flatMap((item) => item.interfaces.map((entry) => entry.id)),
    links: PRESETS[0].links.map((item) => item.id),
  });

  function validatePreset(preset) {
    if (!preset?.id || !preset?.label) throw new Error('Foundation presets require an id and label.');
    const interfaces = preset.devices.flatMap((device) => device.interfaces.map((item) => item.id));
    const allIds = [...preset.devices.map((item) => item.id), ...interfaces, ...preset.links.map((item) => item.id)];
    if (allIds.some((id) => !id) || new Set(allIds).size !== allIds.length) throw new Error('Foundation entity IDs must be present and unique.');
    const interfaceSet = new Set(interfaces);
    if (preset.links.some((link) => !interfaceSet.has(link.fromInterfaceId) || !interfaceSet.has(link.toInterfaceId))) throw new Error('Every foundation link must terminate at declared interfaces.');
    return true;
  }

  function resolvePreset(presetOrId) {
    const preset = typeof presetOrId === 'string' ? PRESET_BY_ID.get(presetOrId) : presetOrId;
    if (!preset) throw new Error(`Unknown foundation preset: ${presetOrId}`);
    validatePreset(preset);
    return preset;
  }

  function normalizeGranularity(value) { return value === 'micro' ? 'micro' : 'operation'; }

  function operationTimeline(currentOperationIndex, currentDetailIndex, granularity, terminal) {
    let detailedStart = 0;
    return OPERATIONS.map((item, operationIndex) => {
      const status = operationIndex < currentOperationIndex ? 'complete' : operationIndex > currentOperationIndex ? 'upcoming' : terminal ? 'complete' : 'active';
      const marker = {
        id: `operation:${item.id}`, index: operationIndex + 1, label: item.label, status,
        activeEvent: granularity === 'operation' ? operationIndex + 1 : detailedStart + 1,
        details: item.phases.map((phase, detailIndex) => ({
          id: `detail:${phase.id}`, index: detailIndex + 1, label: phase.label,
          status: operationIndex < currentOperationIndex || (operationIndex === currentOperationIndex && detailIndex < currentDetailIndex) ? 'complete'
            : operationIndex > currentOperationIndex || detailIndex > currentDetailIndex ? 'upcoming' : terminal ? 'complete' : 'active',
          activeEvent: granularity === 'micro' ? detailedStart + detailIndex + 1 : null,
        })),
      };
      detailedStart += item.phases.length;
      return marker;
    });
  }

  function frameFor(preset, operationIndex, detailIndex, granularity) {
    const item = OPERATIONS[operationIndex];
    const phase = item.phases[detailIndex];
    const globalIndex = FLAT_DETAILS.findIndex((entry) => entry.operationIndex === operationIndex && entry.detailIndex === detailIndex);
    const terminal = globalIndex === FLAT_DETAILS.length - 1;
    return {
      kind: 'network-foundations', presetId: preset.id, playbackGranularity: granularity,
      operation: { id: item.id, index: operationIndex + 1, total: OPERATIONS.length, label: item.label, summary: item.summary },
      detail: { id: phase.id, index: detailIndex + 1, total: item.phases.length, globalIndex: globalIndex + 1, globalTotal: FLAT_DETAILS.length, label: phase.label },
      phase: { id: phase.id, index: globalIndex + 1, total: FLAT_DETAILS.length, label: phase.label, explanation: phase.message, next: terminal ? 'Preview address resolution in Topic 6.' : FLAT_DETAILS[globalIndex + 1].phase.label },
      topology: { devices: preset.devices, links: preset.links },
      focus: { deviceIds: phase.focusIds || [], linkIds: phase.focusLinkIds || [], representation: phase.representation || 'physical' },
      evidence: { category: phase.category, facts: [...phase.facts], conclusion: phase.conclusion, quality: phase.quality || null },
      operationTimeline: operationTimeline(operationIndex, detailIndex, granularity, terminal),
    };
  }

  function timelineFor(presetOrId = PRESETS[0].id, options = {}) {
    const preset = resolvePreset(presetOrId);
    const granularity = normalizeGranularity(options.granularity);
    if (granularity === 'micro') {
      return freeze(FLAT_DETAILS.map(({ item, phase, operationIndex, detailIndex }, eventIndex) => {
        const frame = frameFor(preset, operationIndex, detailIndex, granularity);
        return BSITPlayback.timelineEvent({
          id: `${ACTIVITY_ID}:${preset.id}:micro:${phase.id}`, domain: DOMAIN, type: phase.id, message: phase.message, frame,
          transition: eventIndex === 0 ? null : { kind: 'network-foundation-detail', wait: true, sequenceId: `network-foundation:${preset.id}:${phase.id}`, durationUnits: 1, phases: [{ id: phase.id, label: phase.label, durationWeight: 1, frame }] },
          source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 },
          boundary: detailIndex === item.phases.length - 1, terminal: eventIndex === FLAT_DETAILS.length - 1,
        });
      }));
    }
    return freeze(OPERATIONS.map((item, operationIndex) => {
      const frames = item.phases.map((phase, detailIndex) => ({ id: phase.id, label: phase.label, durationWeight: 1, frame: frameFor(preset, operationIndex, detailIndex, granularity) }));
      return BSITPlayback.timelineEvent({
        id: `${ACTIVITY_ID}:${preset.id}:operation:${item.id}`, domain: DOMAIN, type: item.id, message: item.summary, frame: frames.at(-1).frame,
        transition: operationIndex === 0 ? null : { kind: 'network-foundation-operation', wait: true, sequenceId: `network-foundation:${preset.id}:${item.id}`, durationUnits: frames.length, phases: frames },
        source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 }, boundary: true, terminal: operationIndex === OPERATIONS.length - 1,
      });
    }));
  }

  function finalState(frame) {
    return freeze({ presetId: frame.presetId, operationId: frame.operation.id, detailId: frame.detail.id, topology: frame.topology, evidence: frame.evidence, focus: frame.focus });
  }

  function run(presetOrId, options = {}) {
    const preset = presetOrId ? resolvePreset(presetOrId) : PRESETS[0];
    const granularity = normalizeGranularity(options.granularity);
    const events = timelineFor(preset, { granularity });
    return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: true, output: true }, result: freeze({ presetId: preset.id, granularity, finalFrame: events.at(-1).frame, finalState: finalState(events.at(-1).frame) }) });
  }

  PRESETS.forEach(validatePreset);
  return freeze({
    ACTIVITY_ID, DOMAIN, ENTITY_IDS, PRESETS, PHASES, OPERATIONS, DETAILS: FLAT_DETAILS.map(({ phase }) => phase),
    validatePreset, normalizeGranularity, getPreset(id) { return PRESET_BY_ID.get(id) || null; }, listPresets() { return PRESETS; }, timelineFor, run,
  });
})();
