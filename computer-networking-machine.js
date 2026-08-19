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
        { id: 'switch-1-p1', label: 'Fa0/1 · Port 1', shortLabel: 'Fa0/1', peerInterfaceId: 'host-a-eth0' },
        { id: 'switch-1-p2', label: 'Fa0/2 · Port 2', shortLabel: 'Fa0/2', peerInterfaceId: 'host-b-eth0' },
      ],
    },
  }]);
  const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

  const operation = (id, label, summary, phases) => ({ id, label, summary, phases });
  const detail = (id, label, message, options = {}) => ({ id, label, message, ...options });

  const OPERATIONS = freeze([
    operation('evaluate-subnet', 'Compare the subnets', 'Host A applies /24 and decides that Host B is on the same LAN.', [
      detail('focus-host-a', 'Read Host A configuration', 'Host A starts with 192.168.10.10/24 on eth0.', {
        deviceId: 'host-a', question: 'What address and mask does Host A use?',
        facts: ['Host A eth0: 192.168.10.10/24', 'Target IPv4: 192.168.10.20'], outcome: 'source-ready',
      }),
      detail('apply-source-mask', 'Apply the /24 mask', 'Host A applies /24 to its own address and gets network 192.168.10.0/24.', {
        deviceId: 'host-a', question: 'Which network contains Host A?',
        facts: ['192.168.10.10 AND 255.255.255.0', 'Source network: 192.168.10.0/24'], outcome: 'source-network-192.168.10.0',
      }),
      detail('compare-target-network', 'Classify Host B as local', 'The target produces the same 192.168.10.0/24 network, so Host A will deliver directly on this LAN.', {
        deviceId: 'host-a', question: 'Is 192.168.10.20 on my local subnet?',
        facts: ['Source network: 192.168.10.0/24', 'Target network: 192.168.10.0/24'], outcome: 'local',
        console: 'Host A: destination 192.168.10.20 is local.',
      }),
    ]),
    operation('check-arp-cache', 'Look for a cached mapping', 'Host A checks its ARP table and finds no MAC address for Host B.', [
      detail('inspect-arp-cache', 'Inspect Host A ARP table', 'Host A searches its local ARP table for 192.168.10.20.', {
        deviceId: 'host-a', question: 'Do I already know the target MAC address?',
        facts: ['Lookup key: 192.168.10.20', 'Host A ARP table: empty'], outcome: 'lookup-in-progress',
      }),
      detail('confirm-cache-miss', 'Confirm the cache miss', 'No matching entry exists, so Host A must use ARP before it can build the Ethernet destination field.', {
        deviceId: 'host-a', question: 'What happens when the lookup has no row?',
        facts: ['Matching entry: none', 'Required value: Host B MAC'], outcome: 'cache-miss',
        console: 'Host A: ARP cache miss for 192.168.10.20.',
      }),
    ]),
    operation('build-arp-request', 'Construct and send the request', 'Host A creates an ARP Request in a broadcast Ethernet frame and sends it from eth0 to Fa0/1.', [
      detail('compose-arp-request', 'Compose the ARP Request', 'Host A asks who owns 192.168.10.20 and supplies its own IPv4 and MAC addresses for the answer.', {
        deviceId: 'host-a', question: 'Which values belong in the ARP message?',
        facts: ['Operation: request (1)', 'Sender: 192.168.10.10 / 02:00:00:00:10:0A', 'Target: 192.168.10.20 / unknown'], outcome: 'arp-request-ready',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', stage: 'source', interfaceId: 'host-a-eth0', tone: 'broadcast' },
      }),
      detail('wrap-broadcast-frame', 'Wrap it in an Ethernet broadcast', 'Because the target MAC is the missing value, the Ethernet destination is FF:FF:FF:FF:FF:FF.', {
        deviceId: 'host-a', question: 'How can an unknown Ethernet neighbor receive the question?',
        facts: [`Ethernet destination: ${BROADCAST_MAC}`, `ARP target MAC: ${UNKNOWN_MAC}`, 'EtherType: 0x0806'], outcome: 'broadcast-request',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', stage: 'source', interfaceId: 'host-a-eth0', tone: 'broadcast' },
        console: 'Host A: who has 192.168.10.20? Tell 192.168.10.10.',
      }),
      detail('transmit-request-fa0-1', 'Transmit eth0 → Fa0/1', 'The ARP Request leaves Host A eth0 on the exact cable connected to switch Fa0/1.', {
        deviceId: 'host-a', question: 'Which physical interfaces carry this frame first?',
        facts: ['Source jack: Host A eth0', 'Destination jack: Switch Fa0/1 · Port 1'], outcome: 'request-at-switch-ingress',
        packetFocusId: 'arp-request-1', transport: {
          packetId: 'arp-request-1', linkId: 'link-host-a-switch', fromInterfaceId: 'host-a-eth0', toInterfaceId: 'switch-1-p1', stage: 'travel', tone: 'ingress',
        },
      }),
    ]),
    operation('switch-flood-request', 'Learn and flood the broadcast', 'The switch learns Host A on Fa0/1 and floods the request only through Fa0/2.', [
      detail('receive-request-fa0-1', 'Receive on Fa0/1', 'Switch 1 receives the request through its Fa0/1 jack; the frame is retained at that ingress while it is inspected.', {
        deviceId: 'switch-1', question: 'Where did this frame enter the switch?',
        facts: ['Ingress interface: Fa0/1 · Port 1', 'Source MAC: 02:00:00:00:10:0A'], outcome: 'ingress-fa0-1',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', linkId: 'link-host-a-switch', fromInterfaceId: 'host-a-eth0', toInterfaceId: 'switch-1-p1', stage: 'destination', tone: 'ingress' },
      }),
      detail('learn-host-a-source', 'Learn Host A from the source', 'The switch learns only from the Ethernet source MAC and records Host A on Fa0/1.', {
        deviceId: 'switch-1', question: 'What source information can the switch learn?',
        facts: ['Source MAC: 02:00:00:00:10:0A', 'Ingress: Fa0/1', 'MAC table action: add source'], outcome: 'learn-host-a-fa0-1',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', linkId: 'link-host-a-switch', fromInterfaceId: 'host-a-eth0', toInterfaceId: 'switch-1-p1', stage: 'destination', tone: 'learned' },
      }),
      detail('classify-broadcast', 'Classify the broadcast', 'FF:FF:FF:FF:FF:FF identifies a broadcast, so the switch must use every eligible port except the ingress.', {
        deviceId: 'switch-1', question: 'Is the destination a learned unicast or a broadcast?',
        facts: [`Destination MAC: ${BROADCAST_MAC}`, 'Ingress excluded: Fa0/1', 'Eligible egress: Fa0/2'], outcome: 'broadcast-egress-fa0-2',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', stage: 'source', interfaceId: 'switch-1-p2', tone: 'broadcast' },
      }),
      detail('flood-request-fa0-2', 'Flood Fa0/2 → Host B eth0', 'The switch copies the broadcast only to Fa0/2, whose cable terminates inside Host B eth0.', {
        deviceId: 'switch-1', question: 'Which cable carries the eligible broadcast copy?',
        facts: ['Source jack: Switch Fa0/2 · Port 2', 'Destination jack: Host B eth0', 'Fa0/1 is not used as egress'], outcome: 'flood-fa0-2',
        packetFocusId: 'arp-request-1', transport: {
          packetId: 'arp-request-1', linkId: 'link-switch-host-b', fromInterfaceId: 'switch-1-p2', toInterfaceId: 'host-b-eth0', stage: 'travel', tone: 'broadcast',
        },
        console: 'Switch 1: learned Host A on Fa0/1; flooded the broadcast only to Fa0/2.',
      }),
    ]),
    operation('host-b-build-reply', 'Let Host B answer', 'Host B recognizes its IPv4 address, learns the sender mapping, and builds a unicast ARP Reply.', [
      detail('receive-request-eth0', 'Receive at Host B eth0', 'The broadcast arrives through the RJ45 jack labeled eth0 and is retained there for Host B to inspect.', {
        deviceId: 'host-b', question: 'Which Host B interface received the request?',
        facts: ['Interface: Host B eth0', `Ethernet destination: ${BROADCAST_MAC}`], outcome: 'request-received',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', linkId: 'link-switch-host-b', fromInterfaceId: 'switch-1-p2', toInterfaceId: 'host-b-eth0', stage: 'destination', tone: 'broadcast' },
      }),
      detail('match-target-ip', 'Match the target IPv4 address', 'Host B compares the ARP target 192.168.10.20 with its eth0 address and finds an exact match.', {
        deviceId: 'host-b', question: 'Does the requested IPv4 address belong to me?',
        facts: ['ARP target: 192.168.10.20', 'Host B eth0: 192.168.10.20/24'], outcome: 'target-is-host-b',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', stage: 'destination', interfaceId: 'host-b-eth0', tone: 'broadcast' },
      }),
      detail('learn-host-a-arp', 'Learn Host A from the request', 'Host B records the request sender mapping, which is safe to learn from the ARP message it just received.', {
        deviceId: 'host-b', question: 'Which sender mapping can Host B retain?',
        facts: ['192.168.10.10', '02:00:00:00:10:0A', 'Host B ARP table: add confirmed row'], outcome: 'host-b-learned-host-a',
        packetFocusId: 'arp-request-1', transport: { packetId: 'arp-request-1', stage: 'destination', interfaceId: 'host-b-eth0', tone: 'learned' },
      }),
      detail('compose-arp-reply', 'Compose a unicast ARP Reply', 'Host B answers directly to Host A with its MAC address and uses Host A’s learned MAC as the Ethernet destination.', {
        deviceId: 'host-b', question: 'How should Host B address the answer?',
        facts: ['Operation: reply (2)', 'Sender MAC: 02:00:00:00:10:14', 'Ethernet destination: 02:00:00:00:10:0A'], outcome: 'reply-unicast',
        packetFocusId: 'arp-reply-1', transport: { packetId: 'arp-reply-1', stage: 'source', interfaceId: 'host-b-eth0', tone: 'unicast' },
        console: 'Host B: 192.168.10.20 is at 02:00:00:00:10:14.',
      }),
    ]),
    operation('switch-forward-reply', 'Forward the reply to Host A', 'The reply enters Fa0/2; the switch learns Host B and forwards the unicast only through Fa0/1.', [
      detail('transmit-reply-fa0-2', 'Transmit eth0 → Fa0/2', 'Host B sends the reply from eth0 on the exact cable connected to switch Fa0/2.', {
        deviceId: 'host-b', question: 'Which interfaces carry the reply into the switch?',
        facts: ['Source jack: Host B eth0', 'Destination jack: Switch Fa0/2 · Port 2'], outcome: 'reply-at-switch-ingress',
        packetFocusId: 'arp-reply-1', transport: {
          packetId: 'arp-reply-1', linkId: 'link-switch-host-b', fromInterfaceId: 'host-b-eth0', toInterfaceId: 'switch-1-p2', stage: 'travel', tone: 'unicast',
        },
      }),
      detail('receive-and-learn-host-b', 'Receive and learn Host B', 'Switch 1 receives the reply on Fa0/2 and learns Host B from the Ethernet source MAC.', {
        deviceId: 'switch-1', question: 'What source mapping did Fa0/2 reveal?',
        facts: ['Source MAC: 02:00:00:00:10:14', 'Ingress: Fa0/2', 'MAC table action: add source'], outcome: 'learn-host-b-fa0-2',
        packetFocusId: 'arp-reply-1', transport: { packetId: 'arp-reply-1', linkId: 'link-switch-host-b', fromInterfaceId: 'host-b-eth0', toInterfaceId: 'switch-1-p2', stage: 'destination', tone: 'learned' },
      }),
      detail('lookup-host-a-destination', 'Look up Host A’s destination MAC', 'The reply destination matches the Host A entry learned earlier on Fa0/1.', {
        deviceId: 'switch-1', question: 'Which learned port reaches 02:00:00:00:10:0A?',
        facts: ['Destination found: Host A', 'Learned interface: Fa0/1', 'Eligible egress: Fa0/1 only'], outcome: 'unicast-egress-fa0-1',
        packetFocusId: 'arp-reply-1', transport: { packetId: 'arp-reply-1', stage: 'source', interfaceId: 'switch-1-p1', tone: 'unicast' },
      }),
      detail('forward-reply-fa0-1', 'Forward Fa0/1 → Host A eth0', 'The switch unicasts the reply through Fa0/1 on the cable that terminates inside Host A eth0.', {
        deviceId: 'switch-1', question: 'Which cable carries the unicast reply?',
        facts: ['Source jack: Switch Fa0/1 · Port 1', 'Destination jack: Host A eth0', 'Fa0/2 is not used as egress'], outcome: 'unicast-fa0-1',
        packetFocusId: 'arp-reply-1', transport: {
          packetId: 'arp-reply-1', linkId: 'link-host-a-switch', fromInterfaceId: 'switch-1-p1', toInterfaceId: 'host-a-eth0', stage: 'travel', tone: 'unicast',
        },
        console: 'Switch 1: learned Host B on Fa0/2; forwarded the reply only to Fa0/1.',
      }),
    ]),
    operation('host-a-learn-arp', 'Record the learned mapping', 'Host A receives and validates the reply, then commits Host B to its ARP table.', [
      detail('receive-reply-eth0', 'Receive the reply at Host A eth0', 'The unicast reply arrives at the same Host A RJ45 jack that sent the request.', {
        deviceId: 'host-a', question: 'Where did the ARP Reply arrive?',
        facts: ['Interface: Host A eth0', 'Ethernet destination matches Host A MAC'], outcome: 'reply-received',
        packetFocusId: 'arp-reply-1', transport: { packetId: 'arp-reply-1', linkId: 'link-host-a-switch', fromInterfaceId: 'switch-1-p1', toInterfaceId: 'host-a-eth0', stage: 'destination', tone: 'unicast' },
      }),
      detail('validate-arp-mapping', 'Validate the reply mapping', 'Host A confirms that the sender IPv4 is the address it requested and reads Host B’s sender MAC.', {
        deviceId: 'host-a', question: 'Does this reply answer the outstanding request?',
        facts: ['Requested IPv4: 192.168.10.20', 'Reply sender IPv4: 192.168.10.20', 'Reply sender MAC: 02:00:00:00:10:14'], outcome: 'mapping-valid',
        packetFocusId: 'arp-reply-1', transport: { packetId: 'arp-reply-1', stage: 'destination', interfaceId: 'host-a-eth0', tone: 'unicast' },
      }),
      detail('commit-host-b-arp', 'Commit Host B to the ARP table', 'Host A stores the confirmed IPv4-to-MAC mapping without creating a duplicate row.', {
        deviceId: 'host-a', question: 'What mapping did the ARP Reply provide?',
        facts: ['192.168.10.20', '02:00:00:00:10:14', 'Entry state: confirmed'], outcome: 'arp-confirmed',
        packetFocusId: 'arp-reply-1', transport: { packetId: 'arp-reply-1', stage: 'destination', interfaceId: 'host-a-eth0', tone: 'learned' },
        console: 'Host A: cached 192.168.10.20 → 02:00:00:00:10:14.',
      }),
    ]),
    operation('ready-for-ipv4', 'Finish neighbor discovery', 'Host A now knows the destination MAC needed for local Ethernet delivery.', [
      detail('ready-for-ipv4', 'Ready to build the IPv4 frame', 'Neighbor discovery is complete. Sending the ICMP Echo Request belongs to the next activity.', {
        deviceId: 'host-a', question: 'What can Host A do now?',
        facts: ['Destination is local', 'ARP mapping is confirmed', 'Ethernet destination is known'], outcome: 'ready-for-ipv4',
        packetFocusId: 'arp-reply-1', transport: { packetId: 'arp-reply-1', stage: 'destination', interfaceId: 'host-a-eth0', tone: 'learned' },
        console: 'Host A: ready to build the IPv4 frame for Host B.',
      }),
    ]),
  ]);

  const PHASES = freeze(OPERATIONS.map((item) => ({
    id: item.id, label: item.label, explanation: item.summary,
    next: item.id === 'ready-for-ipv4' ? 'Continue with same-subnet ICMP ping.' : null,
  })));

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
    if (!sameSubnet(preset.hostA.ip, preset.hostB.ip, preset.prefixLength)) throw new Error('The ARP neighbor-discovery preset requires both hosts on one subnet.');
    const ids = [preset.hostA.id, preset.hostB.id, preset.switch?.id, preset.hostA.interfaceId, preset.hostB.interfaceId, ...(preset.switch?.interfaces || []).map((item) => item.id)];
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new Error('Networking preset entity IDs must be present and unique.');
    if (preset.switch.interfaces.length !== 2) throw new Error('The first networking preset requires exactly two switch interfaces.');
    if (preset.hostA.switchInterfaceId !== 'switch-1-p1' || preset.hostB.switchInterfaceId !== 'switch-1-p2') throw new Error('The curated ARP topology must keep Host A on Fa0/1 and Host B on Fa0/2.');
    return true;
  }

  function packetDefinitions(preset, globalIndex) {
    const request = globalIndex < 5 ? { status: 'absent', location: null }
      : globalIndex < 7 ? { status: 'prepared', location: 'host-a-eth0' }
        : globalIndex === 7 ? { status: 'in-transit', location: 'link-host-a-switch' }
          : globalIndex < 11 ? { status: 'at-ingress', location: 'switch-1-p1' }
            : globalIndex === 11 ? { status: 'in-transit', location: 'link-switch-host-b' }
              : { status: 'delivered', location: 'host-b-eth0' };
    const reply = globalIndex < 15 ? { status: 'absent', location: null }
      : globalIndex === 15 ? { status: 'prepared', location: 'host-b-eth0' }
        : globalIndex === 16 ? { status: 'in-transit', location: 'link-switch-host-b' }
          : globalIndex < 19 ? { status: 'at-ingress', location: 'switch-1-p2' }
            : globalIndex === 19 ? { status: 'in-transit', location: 'link-host-a-switch' }
              : { status: 'delivered', location: 'host-a-eth0' };
    const common = { hardwareType: 'Ethernet', protocolType: 'IPv4', hardwareSize: 6, protocolSize: 4 };
    return [
      { id: 'arp-request-1', kind: 'arp-request', ...request,
        ethernet: { source: preset.hostA.mac, destination: BROADCAST_MAC, etherType: ETHER_TYPE_ARP },
        arp: { ...common, operation: 'request', operationCode: 1, senderMac: preset.hostA.mac, senderIp: preset.hostA.ip, targetMac: UNKNOWN_MAC, targetIp: preset.hostB.ip } },
      { id: 'arp-reply-1', kind: 'arp-reply', ...reply,
        ethernet: { source: preset.hostB.mac, destination: preset.hostA.mac, etherType: ETHER_TYPE_ARP },
        arp: { ...common, operation: 'reply', operationCode: 2, senderMac: preset.hostB.mac, senderIp: preset.hostB.ip, targetMac: preset.hostA.mac, targetIp: preset.hostA.ip } },
    ];
  }

  function tableEntry(id, values, state, changed, learnedFromPacketId) {
    return { id, ...values, state, changed, learnedFromPacketId };
  }

  function tablesFor(preset, globalIndex) {
    return {
      arp: [
        tableEntry('host-a-arp-host-b', { deviceId: 'host-a', ip: preset.hostB.ip, mac: preset.hostB.mac }, globalIndex >= 22 ? 'confirmed' : 'absent', globalIndex === 22, globalIndex >= 22 ? 'arp-reply-1' : null),
        tableEntry('host-b-arp-host-a', { deviceId: 'host-b', ip: preset.hostA.ip, mac: preset.hostA.mac }, globalIndex >= 14 ? 'confirmed' : 'absent', globalIndex === 14, globalIndex >= 14 ? 'arp-request-1' : null),
      ],
      mac: [
        tableEntry('switch-1-mac-host-a', { deviceId: 'switch-1', mac: preset.hostA.mac, interfaceId: 'switch-1-p1' }, globalIndex >= 9 ? 'confirmed' : 'absent', globalIndex === 9, globalIndex >= 9 ? 'arp-request-1' : null),
        tableEntry('switch-1-mac-host-b', { deviceId: 'switch-1', mac: preset.hostB.mac, interfaceId: 'switch-1-p2' }, globalIndex >= 17 ? 'confirmed' : 'absent', globalIndex === 17, globalIndex >= 17 ? 'arp-reply-1' : null),
      ],
    };
  }

  function deviceState(id, phase) {
    if (id !== phase.deviceId) return 'idle';
    if (phase.transport?.stage === 'travel') return id === 'switch-1' ? 'forwarding' : 'sending';
    if (phase.id.includes('learn') || phase.id.includes('commit')) return 'learning';
    if (phase.id.includes('receive')) return 'receiving';
    return 'deciding';
  }

  function linkState(id, phase) {
    if (phase.transport?.linkId !== id) return { active: false, direction: null, tone: 'inactive' };
    const active = phase.transport.stage === 'travel';
    return { active, direction: active ? `${phase.transport.fromInterfaceId}-to-${phase.transport.toInterfaceId}` : null, tone: phase.transport.tone || 'inactive' };
  }

  function topologyFor(preset, phase) {
    return {
      devices: [
        { id: 'host-a', kind: 'host', label: preset.hostA.label, state: deviceState('host-a', phase), interfaces: [{ id: 'host-a-eth0', label: 'eth0', ip: preset.hostA.ip, prefixLength: preset.prefixLength, mac: preset.hostA.mac, media: 'RJ45' }] },
        { id: 'switch-1', kind: 'switch', label: preset.switch.label, state: deviceState('switch-1', phase), interfaces: preset.switch.interfaces.map((item) => ({ ...item, media: 'RJ45' })) },
        { id: 'host-b', kind: 'host', label: preset.hostB.label, state: deviceState('host-b', phase), interfaces: [{ id: 'host-b-eth0', label: 'eth0', ip: preset.hostB.ip, prefixLength: preset.prefixLength, mac: preset.hostB.mac, media: 'RJ45' }] },
      ],
      links: [
        { id: 'link-host-a-switch', endpointIds: ['host-a-eth0', 'switch-1-p1'], fromInterfaceId: 'host-a-eth0', toInterfaceId: 'switch-1-p1', ...linkState('link-host-a-switch', phase) },
        { id: 'link-switch-host-b', endpointIds: ['switch-1-p2', 'host-b-eth0'], fromInterfaceId: 'switch-1-p2', toInterfaceId: 'host-b-eth0', ...linkState('link-switch-host-b', phase) },
      ],
    };
  }

  function operationTimeline(operations, currentOperationIndex, currentDetailIndex, granularity, terminal) {
    let detailedStart = 0;
    return operations.map((item, operationIndex) => {
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

  function flattenOperations() {
    const result = [];
    OPERATIONS.forEach((item, operationIndex) => item.phases.forEach((phase, detailIndex) => result.push({ item, phase, operationIndex, detailIndex, globalIndex: result.length })));
    return result;
  }

  const FLAT_DETAILS = freeze(flattenOperations());

  function consoleFor(globalIndex) {
    return FLAT_DETAILS.slice(0, globalIndex + 1).filter(({ phase }) => phase.console)
      .map(({ phase }, index) => ({ id: `network-log:${index + 1}`, deviceId: phase.deviceId, text: phase.console }));
  }

  function frameFor(preset, operationIndex, detailIndex, granularity) {
    const item = OPERATIONS[operationIndex];
    const phase = item.phases[detailIndex];
    const globalIndex = FLAT_DETAILS.find((entry) => entry.operationIndex === operationIndex && entry.detailIndex === detailIndex).globalIndex;
    const terminal = globalIndex === FLAT_DETAILS.length - 1;
    const transport = phase.transport ? { ...phase.transport, timing: { sourceHoldMs: 800, travelMs: 900, retainAtDestination: true } } : null;
    return {
      kind: 'network-topology', presetId: preset.id, playbackGranularity: granularity,
      operation: { id: item.id, index: operationIndex + 1, total: OPERATIONS.length, label: item.label, summary: item.summary },
      detail: { id: phase.id, index: detailIndex + 1, total: item.phases.length, globalIndex: globalIndex + 1, globalTotal: FLAT_DETAILS.length, label: phase.label },
      phase: { id: phase.id, index: globalIndex + 1, total: FLAT_DETAILS.length, label: phase.label, explanation: phase.message, next: terminal ? 'Continue with same-subnet ICMP ping.' : FLAT_DETAILS[globalIndex + 1].phase.label },
      topology: topologyFor(preset, { ...phase, transport }), packets: packetDefinitions(preset, globalIndex), packetFocusId: phase.packetFocusId || null,
      transport, tables: tablesFor(preset, globalIndex),
      decision: { deviceId: phase.deviceId, question: phase.question, facts: [...phase.facts], outcome: phase.outcome },
      console: consoleFor(globalIndex), operationTimeline: operationTimeline(OPERATIONS, operationIndex, detailIndex, granularity, terminal),
    };
  }

  function normalizeGranularity(value) { return value === 'micro' ? 'micro' : 'operation'; }

  function resolvePreset(presetOrId) {
    const preset = typeof presetOrId === 'string' ? PRESET_BY_ID.get(presetOrId) : presetOrId;
    if (!preset) throw new Error(`Unknown networking preset: ${presetOrId}`);
    validatePreset(preset);
    return preset;
  }

  function timelineFor(presetOrId = PRESETS[0].id, options = {}) {
    const preset = resolvePreset(presetOrId);
    const granularity = normalizeGranularity(options.granularity);
    if (granularity === 'micro') {
      return freeze(FLAT_DETAILS.map(({ item, phase, operationIndex, detailIndex }, eventIndex) => {
        const frame = frameFor(preset, operationIndex, detailIndex, granularity);
        return BSITPlayback.timelineEvent({
          id: `${ACTIVITY_ID}:${preset.id}:micro:${phase.id}`, domain: DOMAIN, type: phase.id, message: phase.message, frame,
          transition: eventIndex === 0 ? null : { kind: 'network-detail', wait: true, sequenceId: `network-sequence:${preset.id}:${phase.id}`, durationUnits: 1, phases: [{ id: phase.id, label: phase.label, durationWeight: 1, frame }] },
          source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 },
          boundary: detailIndex === item.phases.length - 1, terminal: eventIndex === FLAT_DETAILS.length - 1,
        });
      }));
    }
    return freeze(OPERATIONS.map((item, operationIndex) => {
      const frames = item.phases.map((phase, detailIndex) => ({ id: phase.id, label: phase.label, durationWeight: 1, frame: frameFor(preset, operationIndex, detailIndex, granularity) }));
      return BSITPlayback.timelineEvent({
        id: `${ACTIVITY_ID}:${preset.id}:operation:${item.id}`, domain: DOMAIN, type: item.id, message: item.summary, frame: frames.at(-1).frame,
        transition: operationIndex === 0 ? null : { kind: 'network-operation', wait: true, sequenceId: `network-sequence:${preset.id}:${item.id}`, durationUnits: frames.length, phases: frames },
        source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 }, boundary: true, terminal: operationIndex === OPERATIONS.length - 1,
      });
    }));
  }

  function run(presetOrId, options = {}) {
    const preset = presetOrId ? resolvePreset(presetOrId) : PRESETS[0];
    const granularity = normalizeGranularity(options.granularity);
    const events = timelineFor(preset, { granularity });
    return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: true, output: true }, result: freeze({ presetId: preset.id, granularity, finalFrame: events.at(-1).frame }) });
  }

  PRESETS.forEach(validatePreset);

  return freeze({
    ACTIVITY_ID, DOMAIN, BROADCAST_MAC, UNKNOWN_MAC, ETHER_TYPE_ARP, ENTITY_IDS, PRESETS, PHASES, OPERATIONS,
    DETAILS: FLAT_DETAILS.map(({ phase }) => phase), ipv4ToInt, prefixMask, sameSubnet, validatePreset, normalizeGranularity,
    getPreset(id) { return PRESET_BY_ID.get(id) || null; }, listPresets() { return PRESETS; }, timelineFor, run,
  });
})();
