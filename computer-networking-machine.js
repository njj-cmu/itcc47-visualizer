/* Deterministic, framework-neutral teaching model for curated networking activities. */
const ComputerNetworkingMachine = (() => {
  'use strict';

  const ACTIVITY_ID = 'networking-arp-neighbor-discovery';
  const DOMAIN = 'network-arp';
  const BROADCAST_MAC = 'FF:FF:FF:FF:FF:FF';
  const UNKNOWN_MAC = '00:00:00:00:00:00';
  const ETHER_TYPE_ARP = '0x0806';
  const freeze = (value) => BSITPlayback.deepFreeze(value);

  const ENTITY_IDS = freeze({
    devices: ['host-a', 'switch-1', 'host-b'],
    interfaces: ['host-a-eth0', 'switch-1-p1', 'switch-1-p2', 'host-b-eth0'],
    links: ['link-host-a-switch', 'link-switch-host-b'],
    packets: ['arp-request-1', 'arp-reply-1'],
    arpEntries: ['host-a-arp-host-b', 'host-b-arp-host-a'],
    macEntries: ['switch-1-mac-host-a', 'switch-1-mac-host-b'],
  });

  const PRESETS = freeze([{
    id: 'arp-same-lan',
    label: 'Host A discovers Host B',
    description: 'Resolve Host B on one curated 192.168.10.0/24 Ethernet LAN.',
    prefixLength: 24,
    hostA: {
      id: 'host-a', label: 'Host A', interfaceId: 'host-a-eth0',
      ip: '192.168.10.10', mac: '02:00:00:00:10:0A', switchInterfaceId: 'switch-1-p1',
    },
    hostB: {
      id: 'host-b', label: 'Host B', interfaceId: 'host-b-eth0',
      ip: '192.168.10.20', mac: '02:00:00:00:10:14', switchInterfaceId: 'switch-1-p2',
    },
    switch: {
      id: 'switch-1', label: 'Switch 1',
      interfaces: [
        { id: 'switch-1-p1', label: 'Fa0/1', peerInterfaceId: 'host-a-eth0' },
        { id: 'switch-1-p2', label: 'Fa0/2', peerInterfaceId: 'host-b-eth0' },
      ],
    },
  }]);
  const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

  const PHASES = freeze([
    {
      id: 'evaluate-subnet', label: 'Decide whether Host B is local',
      explanation: 'Host A applies /24 to both IPv4 addresses. Both belong to 192.168.10.0/24, so Host A will deliver directly on this LAN.',
      next: 'Check whether Host A already knows Host B\'s Ethernet address.',
      deviceId: 'host-a', question: 'Is 192.168.10.20 on my local subnet?',
      facts: ['Host A: 192.168.10.10/24', 'Host B: 192.168.10.20/24', 'Network: 192.168.10.0/24'],
      outcome: 'local', console: 'Host A: destination 192.168.10.20 is local.',
    },
    {
      id: 'check-arp-cache', label: 'Check the ARP cache',
      explanation: 'Host A has no confirmed mapping for 192.168.10.20, so it cannot yet build the destination Ethernet header.',
      next: 'Ask every device on the LAN who owns 192.168.10.20.',
      deviceId: 'host-a', question: 'Do I know the MAC address for 192.168.10.20?',
      facts: ['ARP cache lookup: 192.168.10.20', 'Matching entry: none'],
      outcome: 'cache-miss', console: 'Host A: ARP cache miss for 192.168.10.20.',
    },
    {
      id: 'build-arp-request', label: 'Build an ARP Request',
      explanation: 'Host A places the ARP Request in an Ethernet broadcast because the target MAC address is the missing information.',
      next: 'Transmit the broadcast to the switch.',
      deviceId: 'host-a', question: 'How can I ask an unknown Ethernet neighbor?',
      facts: [`Ethernet destination: ${BROADCAST_MAC}`, `ARP target MAC: ${UNKNOWN_MAC}`, 'ARP target IP: 192.168.10.20'],
      outcome: 'broadcast-request', console: 'Host A: who has 192.168.10.20? Tell 192.168.10.10.',
    },
    {
      id: 'switch-flood-request', label: 'Learn and flood the broadcast',
      explanation: 'Switch 1 learns Host A from the source MAC on Fa0/1. A broadcast is then copied only to eligible ports other than the ingress port.',
      next: 'Host B checks whether the ARP target IP belongs to it.',
      deviceId: 'switch-1', question: 'Where should this broadcast frame go?',
      facts: ['Ingress: Fa0/1', 'Learn source MAC on Fa0/1', 'Egress: Fa0/2 only'],
      outcome: 'flood-fa0-2', console: 'Switch 1: learned Host A on Fa0/1; flooded broadcast to Fa0/2.',
    },
    {
      id: 'host-b-build-reply', label: 'Host B answers the request',
      explanation: 'Host B recognizes its own IPv4 address, learns the sender mapping from the request, and prepares an ARP Reply addressed directly to Host A.',
      next: 'Send the unicast reply through the switch.',
      deviceId: 'host-b', question: 'Does the requested IPv4 address belong to me?',
      facts: ['ARP target IP: 192.168.10.20', 'Host B IP: 192.168.10.20', 'Reply destination: Host A MAC'],
      outcome: 'reply-unicast', console: 'Host B: 192.168.10.20 is at 02:00:00:00:10:14.',
    },
    {
      id: 'switch-forward-reply', label: 'Learn and forward the reply',
      explanation: 'Switch 1 learns Host B from the reply source on Fa0/2, then uses its existing Host A entry to forward the reply only to Fa0/1.',
      next: 'Host A records the answer in its ARP cache.',
      deviceId: 'switch-1', question: 'Which port reaches the reply destination MAC?',
      facts: ['Learn Host B source on Fa0/2', 'Host A destination found on Fa0/1', 'Egress: Fa0/1 only'],
      outcome: 'unicast-fa0-1', console: 'Switch 1: learned Host B on Fa0/2; forwarded reply to Fa0/1.',
    },
    {
      id: 'host-a-learn-arp', label: 'Record Host B in the ARP cache',
      explanation: 'Host A accepts the reply and records the confirmed mapping between Host B\'s IPv4 and Ethernet addresses.',
      next: 'Use the learned MAC address to build the intended IPv4 frame.',
      deviceId: 'host-a', question: 'What mapping did the ARP Reply provide?',
      facts: ['192.168.10.20', '02:00:00:00:10:14', 'Entry state: confirmed'],
      outcome: 'arp-confirmed', console: 'Host A: cached 192.168.10.20 → 02:00:00:00:10:14.',
    },
    {
      id: 'ready-for-ipv4', label: 'Neighbor discovery is complete',
      explanation: 'Host A now has the destination MAC needed for local Ethernet delivery. The next activity can send the actual ICMP Echo Request.',
      next: 'Continue with same-subnet ICMP ping.',
      deviceId: 'host-a', question: 'What can Host A do now?',
      facts: ['Destination is local', 'ARP mapping is confirmed', 'Ethernet destination is known'],
      outcome: 'ready-for-ipv4', console: 'Host A: ready to send the IPv4 packet to Host B.',
    },
  ]);

  function ipv4ToInt(address) {
    if (typeof address !== 'string') throw new TypeError('IPv4 address must be a string.');
    const parts = address.split('.');
    if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) {
      throw new Error(`Invalid IPv4 address: ${address}`);
    }
    return parts.reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
  }

  function prefixMask(prefixLength) {
    if (!Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
      throw new RangeError('IPv4 prefix length must be an integer from 0 to 32.');
    }
    return prefixLength === 0 ? 0 : (0xFFFFFFFF << (32 - prefixLength)) >>> 0;
  }

  function sameSubnet(first, second, prefixLength) {
    const mask = prefixMask(prefixLength);
    return (ipv4ToInt(first) & mask) === (ipv4ToInt(second) & mask);
  }

  function validateMac(address, label) {
    if (typeof address !== 'string' || !/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(address)) {
      throw new Error(`${label} must be an uppercase colon-delimited MAC address.`);
    }
  }

  function validatePreset(preset) {
    if (!preset?.id || !preset?.label) throw new Error('Networking presets require an id and label.');
    ipv4ToInt(preset.hostA?.ip);
    ipv4ToInt(preset.hostB?.ip);
    prefixMask(preset.prefixLength);
    validateMac(preset.hostA?.mac, 'Host A MAC');
    validateMac(preset.hostB?.mac, 'Host B MAC');
    if (!sameSubnet(preset.hostA.ip, preset.hostB.ip, preset.prefixLength)) {
      throw new Error('The ARP neighbor-discovery preset requires both hosts on one subnet.');
    }
    const ids = [
      preset.hostA.id, preset.hostB.id, preset.switch?.id,
      preset.hostA.interfaceId, preset.hostB.interfaceId,
      ...(preset.switch?.interfaces || []).map((item) => item.id),
    ];
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new Error('Networking preset entity IDs must be present and unique.');
    if (preset.switch.interfaces.length !== 2) throw new Error('The first networking preset requires exactly two switch interfaces.');
    return true;
  }

  function packetDefinitions(preset, stepIndex) {
    const requestStatus = stepIndex < 2 ? 'absent' : stepIndex === 2 ? 'prepared' : stepIndex === 3 ? 'in-transit' : 'delivered';
    const requestLocation = stepIndex < 2 ? null : stepIndex === 2 ? 'host-a' : stepIndex === 3 ? 'switch-1' : 'host-b';
    const replyStatus = stepIndex < 4 ? 'absent' : stepIndex === 4 ? 'prepared' : stepIndex === 5 ? 'in-transit' : 'delivered';
    const replyLocation = stepIndex < 4 ? null : stepIndex === 4 ? 'host-b' : stepIndex === 5 ? 'switch-1' : 'host-a';
    return [
      {
        id: 'arp-request-1', kind: 'arp-request', location: requestLocation,
        direction: stepIndex === 3 ? 'host-a-to-host-b' : null, status: requestStatus,
        ethernet: { source: preset.hostA.mac, destination: BROADCAST_MAC, etherType: ETHER_TYPE_ARP },
        arp: {
          operation: 'request', operationCode: 1,
          senderMac: preset.hostA.mac, senderIp: preset.hostA.ip,
          targetMac: UNKNOWN_MAC, targetIp: preset.hostB.ip,
        },
      },
      {
        id: 'arp-reply-1', kind: 'arp-reply', location: replyLocation,
        direction: stepIndex === 5 ? 'host-b-to-host-a' : null, status: replyStatus,
        ethernet: { source: preset.hostB.mac, destination: preset.hostA.mac, etherType: ETHER_TYPE_ARP },
        arp: {
          operation: 'reply', operationCode: 2,
          senderMac: preset.hostB.mac, senderIp: preset.hostB.ip,
          targetMac: preset.hostA.mac, targetIp: preset.hostA.ip,
        },
      },
    ];
  }

  function tableEntry(id, values, state, changed, learnedFromPacketId) {
    return { id, ...values, state, changed, learnedFromPacketId };
  }

  function tablesFor(preset, stepIndex) {
    return {
      arp: [
        tableEntry('host-a-arp-host-b', { deviceId: 'host-a', ip: preset.hostB.ip, mac: preset.hostB.mac }, stepIndex >= 6 ? 'confirmed' : 'absent', stepIndex === 6, stepIndex >= 6 ? 'arp-reply-1' : null),
        tableEntry('host-b-arp-host-a', { deviceId: 'host-b', ip: preset.hostA.ip, mac: preset.hostA.mac }, stepIndex >= 4 ? 'confirmed' : 'absent', stepIndex === 4, stepIndex >= 4 ? 'arp-request-1' : null),
      ],
      mac: [
        tableEntry('switch-1-mac-host-a', { deviceId: 'switch-1', mac: preset.hostA.mac, interfaceId: 'switch-1-p1' }, stepIndex >= 3 ? 'confirmed' : 'absent', stepIndex === 3, stepIndex >= 3 ? 'arp-request-1' : null),
        tableEntry('switch-1-mac-host-b', { deviceId: 'switch-1', mac: preset.hostB.mac, interfaceId: 'switch-1-p2' }, stepIndex >= 5 ? 'confirmed' : 'absent', stepIndex === 5, stepIndex >= 5 ? 'arp-reply-1' : null),
      ],
    };
  }

  function deviceState(id, activeDeviceId, stepIndex) {
    if (id !== activeDeviceId) return 'idle';
    if (stepIndex === 2 || stepIndex === 4) return 'sending';
    if (stepIndex === 3 || stepIndex === 5) return 'forwarding';
    if (stepIndex === 6) return 'learning';
    return 'deciding';
  }

  function topologyFor(preset, phase, stepIndex) {
    const requestFlood = stepIndex === 3;
    const replyForward = stepIndex === 5;
    return {
      devices: [
        {
          id: 'host-a', kind: 'host', label: preset.hostA.label, state: deviceState('host-a', phase.deviceId, stepIndex),
          interfaces: [{ id: 'host-a-eth0', label: 'eth0', ip: preset.hostA.ip, prefixLength: preset.prefixLength, mac: preset.hostA.mac }],
        },
        {
          id: 'switch-1', kind: 'switch', label: preset.switch.label, state: deviceState('switch-1', phase.deviceId, stepIndex),
          interfaces: preset.switch.interfaces.map((item) => ({ ...item })),
        },
        {
          id: 'host-b', kind: 'host', label: preset.hostB.label, state: deviceState('host-b', phase.deviceId, stepIndex),
          interfaces: [{ id: 'host-b-eth0', label: 'eth0', ip: preset.hostB.ip, prefixLength: preset.prefixLength, mac: preset.hostB.mac }],
        },
      ],
      links: [
        {
          id: 'link-host-a-switch', endpointIds: ['host-a-eth0', 'switch-1-p1'],
          active: replyForward, direction: replyForward ? 'switch-1-to-host-a' : null,
        },
        {
          id: 'link-switch-host-b', endpointIds: ['switch-1-p2', 'host-b-eth0'],
          active: requestFlood, direction: requestFlood ? 'switch-1-to-host-b' : null,
        },
      ],
    };
  }

  function frameFor(preset, stepIndex, granularity) {
    const phase = PHASES[stepIndex];
    return {
      kind: 'network-topology',
      presetId: preset.id,
      phase: {
        id: phase.id, index: stepIndex + 1, total: PHASES.length,
        label: phase.label, explanation: phase.explanation, next: phase.next,
      },
      topology: topologyFor(preset, phase, stepIndex),
      packets: packetDefinitions(preset, stepIndex),
      tables: tablesFor(preset, stepIndex),
      decision: {
        deviceId: phase.deviceId, question: phase.question,
        facts: [...phase.facts], outcome: phase.outcome,
      },
      console: PHASES.slice(0, stepIndex + 1).map((item, index) => ({ id: `network-log:${index + 1}`, deviceId: item.deviceId, text: item.console })),
      playbackGranularity: granularity,
    };
  }

  function normalizeGranularity(value) {
    return value === 'micro' ? 'micro' : 'operation';
  }

  function resolvePreset(presetOrId) {
    const preset = typeof presetOrId === 'string' ? PRESET_BY_ID.get(presetOrId) : presetOrId;
    if (!preset) throw new Error(`Unknown networking preset: ${presetOrId}`);
    validatePreset(preset);
    return preset;
  }

  function timelineFor(presetOrId = PRESETS[0].id, options = {}) {
    const preset = resolvePreset(presetOrId);
    const granularity = normalizeGranularity(options.granularity);
    return freeze(PHASES.map((phase, index) => {
      const frame = frameFor(preset, index, granularity);
      return BSITPlayback.timelineEvent({
        id: `${ACTIVITY_ID}:${preset.id}:${granularity}:${phase.id}`,
        domain: DOMAIN,
        type: phase.id,
        message: phase.explanation,
        frame,
        transition: index === 0 ? null : {
          kind: 'network-operation', wait: true,
          sequenceId: `network-sequence:${preset.id}:${phase.id}`,
          durationUnits: 1,
          phases: [{ id: phase.id, label: phase.label, durationWeight: 1, frame }],
        },
        source: { line: index + 1, code: phase.label },
        segment: { id: phase.id, index: index + 1 },
        boundary: true,
        terminal: index === PHASES.length - 1,
      });
    }));
  }

  function run(presetOrId, options = {}) {
    const preset = presetOrId ? resolvePreset(presetOrId) : PRESETS[0];
    const granularity = normalizeGranularity(options.granularity);
    const events = timelineFor(preset, { granularity });
    return BSITPlayback.runResult({
      events,
      capabilities: { visualize: true, trace: true, variables: true, operations: true, output: true },
      result: freeze({ presetId: preset.id, granularity, finalFrame: events.at(-1).frame }),
    });
  }

  PRESETS.forEach(validatePreset);

  return freeze({
    ACTIVITY_ID, DOMAIN, BROADCAST_MAC, UNKNOWN_MAC, ETHER_TYPE_ARP,
    ENTITY_IDS, PRESETS, PHASES,
    ipv4ToInt, prefixMask, sameSubnet, validatePreset, normalizeGranularity,
    getPreset(id) { return PRESET_BY_ID.get(id) || null; },
    listPresets() { return PRESETS; },
    timelineFor, run,
  });
})();
