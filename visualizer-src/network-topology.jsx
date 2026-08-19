import React, { memo, useState } from 'react';

const DESKTOP_GEOMETRY = Object.freeze({
  id: 'desktop', viewBox: '0 0 1100 420',
  devices: {
    'host-a': { x: 38, y: 82, width: 248, height: 226 },
    'switch-1': { x: 414, y: 112, width: 272, height: 170 },
    'host-b': { x: 814, y: 82, width: 248, height: 226 },
  },
  ports: {
    'host-a-eth0': { x: 232, y: 177, width: 58, height: 72, cx: 278, cy: 213, labelX: 228, labelY: 166, labelAnchor: 'end', plugAngle: 0 },
    'switch-1-p1': { x: 410, y: 177, width: 72, height: 72, cx: 426, cy: 213, labelX: 446, labelY: 171, labelAnchor: 'middle', plugAngle: 180 },
    'switch-1-p2': { x: 618, y: 177, width: 72, height: 72, cx: 674, cy: 213, labelX: 654, labelY: 171, labelAnchor: 'middle', plugAngle: 0 },
    'host-b-eth0': { x: 810, y: 177, width: 58, height: 72, cx: 822, cy: 213, labelX: 872, labelY: 166, labelAnchor: 'start', plugAngle: 180 },
  },
  paths: {
    'link-host-a-switch': 'M278 213 C326 257 380 257 426 213',
    'link-switch-host-b': 'M674 213 C718 257 778 257 822 213',
  },
});

const MOBILE_GEOMETRY = Object.freeze({
  id: 'mobile', viewBox: '0 0 390 580',
  devices: {
    'host-a': { x: 48, y: 20, width: 294, height: 150 },
    'switch-1': { x: 48, y: 215, width: 294, height: 150 },
    'host-b': { x: 48, y: 410, width: 294, height: 150 },
  },
  ports: {
    'host-a-eth0': { x: 252, y: 92, width: 72, height: 60, cx: 290, cy: 140, labelX: 288, labelY: 85, labelAnchor: 'middle', plugAngle: 90 },
    'switch-1-p1': { x: 58, y: 211, width: 72, height: 60, cx: 95, cy: 230, labelX: 95, labelY: 204, labelAnchor: 'middle', plugAngle: -25 },
    'switch-1-p2': { x: 260, y: 309, width: 72, height: 60, cx: 295, cy: 346, labelX: 250, labelY: 344, labelAnchor: 'end', plugAngle: 155 },
    'host-b-eth0': { x: 60, y: 408, width: 72, height: 60, cx: 95, cy: 430, labelX: 140, labelY: 454, labelAnchor: 'start', plugAngle: -25 },
  },
  paths: {
    'link-host-a-switch': 'M290 140 C284 184 160 183 95 230',
    'link-switch-host-b': 'M295 346 C238 389 155 385 95 430',
  },
});

function pathId(layoutId, linkId) { return `network-path-${layoutId}-${linkId}`; }

function Rj45Port({ id, label, geometry, state }) {
  const { x, y, width, height, labelX, labelY, labelAnchor } = geometry;
  const opening = { x: x + 7, y: y + 9, width: width - 14, height: height - 18 };
  return <g className={`network-rj45-port is-${state || 'idle'}`} data-interface-id={id} data-interface-state={state || 'idle'}
    data-jack-x={x} data-jack-y={y} data-jack-width={width} data-jack-height={height}
    data-jack-opening-x={opening.x} data-jack-opening-y={opening.y} data-jack-opening-width={opening.width} data-jack-opening-height={opening.height}
    data-anchor-x={geometry.cx} data-anchor-y={geometry.cy}>
    <rect className="network-jack-bezel-shadow" x={x - 3} y={y - 3} width={width + 6} height={height + 6} rx="7"/>
    <rect className="network-jack-bezel" x={x} y={y} width={width} height={height} rx="5"/>
    <path className="network-jack-interior" d={`M${opening.x} ${opening.y + 8}h8v-8h${opening.width - 16}v8h8v${opening.height - 8}h-${opening.width}Z`}/>
    <g className="network-jack-contacts">{Array.from({ length: 8 }, (_, index) => <path d={`M${opening.x + 7 + index * ((opening.width - 14) / 7)} ${opening.y + opening.height - 5}v-10`} key={index}/>)}</g>
    <circle className="network-jack-led is-link" cx={x + 8} cy={y + 8} r="3"/><circle className="network-jack-led is-activity" cx={x + width - 8} cy={y + 8} r="3"/>
    <text className="network-port-label" x={labelX} y={labelY} textAnchor={labelAnchor}>{label}</text>
  </g>;
}

function CablePlug({ interfaceId, linkId, geometry, tone, active }) {
  return <g className={`network-cable-plug is-${active ? tone : 'inactive'}`} data-plug-interface-id={interfaceId} data-plug-link-id={linkId}
    data-plug-tip-x={geometry.cx} data-plug-tip-y={geometry.cy} transform={`translate(${geometry.cx} ${geometry.cy}) rotate(${geometry.plugAngle})`}>
    <path className="network-plug-shadow" d="M-11 -14H15L23 -17H36V17H23L15 14H-11Z"/>
    <path className="network-plug-head" d="M-10 -12H14V12H-10Z"/>
    <path className="network-plug-latch" d="M-4 -12V-20H13L19 -13"/>
    <path className="network-plug-contacts" d="M-7 -8H10 M-7 -5H10 M-7 -2H10 M-7 1H10 M-7 4H10 M-7 7H10"/>
    <path className="network-plug-boot" d="M14 -14H24L35 -10V10L24 14H14Z"/>
    <path className="network-plug-ribs" d="M21 -11V11 M26 -11V11 M31 -9V9"/>
  </g>;
}

function HostDevice({ id, label, device, geometry, port, portLabel, mobile }) {
  const portOnLeft = mobile && id === 'host-b';
  const screenX = mobile ? geometry.x + (portOnLeft ? 140 : 18) : geometry.x + 24;
  const screenWidth = mobile ? 136 : 145;
  const textX = mobile ? geometry.x + (portOnLeft ? 160 : 18) : geometry.x + (id === 'host-b' ? 94 : 24);
  return <g className={`network-device network-host is-${device?.state || 'idle'}`} data-device-id={id}>
    <rect className="network-device-shadow" x={geometry.x + 5} y={geometry.y + 7} width={geometry.width} height={geometry.height} rx="12"/>
    <rect className="network-device-shell" x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx="12"/>
    <rect className="network-host-screen" x={screenX} y={geometry.y + (mobile ? 18 : 25)} width={screenWidth} height={mobile ? 64 : 102} rx="7"/>
    <path className="network-host-screen-line" d={mobile
      ? `M${screenX + 18} ${geometry.y + 44}h${screenWidth - 36} M${screenX + 18} ${geometry.y + 60}h${screenWidth - 54}`
      : `M${geometry.x + 46} ${geometry.y + 60}h98 M${geometry.x + 46} ${geometry.y + 78}h72 M${geometry.x + 46} ${geometry.y + 96}h86`}/>
    <text className="network-device-title" x={textX} y={geometry.y + geometry.height - (mobile ? 36 : 50)}>{label}</text>
    <text className="network-device-address" x={textX} y={geometry.y + geometry.height - (mobile ? 16 : 26)}>{device?.interfaces?.[0]?.ip}/24</text>
    <rect className="network-nic-plate" x={port.x - 9} y={port.y - 13} width={port.width + 18} height={port.height + 26} rx="7"/>
    <Rj45Port id={id === 'host-a' ? 'host-a-eth0' : 'host-b-eth0'} label={portLabel} geometry={port} state={device?.state}/>
  </g>;
}

function physicalPathAnnotation(frame) {
  const annotations = {
    'transmit-request-fa0-1': 'Host A eth0 → cable → switch Fa0/1',
    'receive-request-fa0-1': 'Ingress Fa0/1 → inspect the Ethernet frame',
    'learn-host-a-source': 'Ingress Fa0/1 → learn Host A source MAC',
    'classify-broadcast': 'Ingress Fa0/1 → exclude ingress → choose Fa0/2',
    'flood-request-fa0-2': 'Broadcast egress Fa0/2 → Host B eth0',
    'receive-request-eth0': 'Switch Fa0/2 → cable → Host B eth0',
    'transmit-reply-fa0-2': 'Host B eth0 → cable → switch Fa0/2',
    'receive-and-learn-host-b': 'Ingress Fa0/2 → learn Host B source MAC',
    'lookup-host-a-destination': 'Host A destination MAC → learned Fa0/1',
    'forward-reply-fa0-1': 'Unicast egress Fa0/1 → Host A eth0',
    'receive-reply-eth0': 'Switch Fa0/1 → cable → Host A eth0',
  };
  return annotations[frame.detail.id] || frame.operation.summary;
}

function SwitchDevice({ device, geometry, ports, mobile }) {
  return <g className={`network-device network-switch is-${device?.state || 'idle'}`} data-device-id="switch-1">
    <rect className="network-device-shadow" x={geometry.x + 5} y={geometry.y + 7} width={geometry.width} height={geometry.height} rx="10"/>
    <rect className="network-device-shell network-switch-shell" x={geometry.x} y={geometry.y} width={geometry.width} height={geometry.height} rx="10"/>
    <text className="network-switch-kicker" x={mobile ? geometry.x + geometry.width / 2 : geometry.x + 22} y={geometry.y + (mobile ? 48 : 19)} textAnchor={mobile ? 'middle' : 'start'}>TEACHING SWITCH · 2 PORTS</text>
    <text className="network-device-title" x={mobile ? geometry.x + geometry.width / 2 : geometry.x + 22} y={geometry.y + (mobile ? 75 : 39)} textAnchor={mobile ? 'middle' : 'start'}>Switch 1</text>
    <path className="network-switch-rule" d={mobile ? `M${geometry.x + 112} ${geometry.y + 90}h70` : `M${geometry.x + 20} ${geometry.y + 49}h${geometry.width - 40}`}/>
    <Rj45Port id="switch-1-p1" label="Fa0/1 · Port 1" geometry={ports['switch-1-p1']} state={device?.state}/>
    <Rj45Port id="switch-1-p2" label="Fa0/2 · Port 2" geometry={ports['switch-1-p2']} state={device?.state}/>
  </g>;
}

function PacketGlyph({ packet, transport, geometry, motionMode, animateTravel, layoutId }) {
  if (!packet || packet.status === 'absent' || !transport) return null;
  const isRequest = packet.kind === 'arp-request';
  const label = isRequest ? 'ARP REQUEST' : 'ARP REPLY';
  const linkPathId = transport.linkId ? pathId(layoutId, transport.linkId) : null;
  const reverse = transport.linkId && geometry.paths[transport.linkId]
    && transport.fromInterfaceId !== (transport.linkId === 'link-host-a-switch' ? 'host-a-eth0' : 'switch-1-p2');
  const endpointId = transport.stage === 'source' ? (transport.interfaceId || transport.fromInterfaceId)
    : transport.stage === 'destination' ? (transport.interfaceId || transport.toInterfaceId)
      : transport.toInterfaceId;
  const endpoint = geometry.ports[endpointId] || geometry.ports[transport.toInterfaceId] || geometry.ports[transport.fromInterfaceId];
  const transform = animateTravel ? undefined : `translate(${endpoint?.cx || 0} ${endpoint?.cy || 0})`;
  return <g className={`network-packet is-${transport.tone || 'unicast'} is-${transport.stage}`} data-packet-id={packet.id}
    data-motion-link-id={transport.linkId || ''} data-motion-path-id={linkPathId || ''} data-motion-mode={motionMode} transform={transform}>
    {animateTravel ? <animateMotion dur="0.9s" begin="0.8s" fill="freeze" calcMode="linear" keyPoints={reverse ? '1;0' : '0;1'} keyTimes="0;1">
      <mpath href={`#${linkPathId}`}/>
    </animateMotion> : null}
    <rect x="-34" y="-18" width="68" height="36" rx="7"/>
    <path d="M-24 -8h16l6 6 6-6h18"/>
    <text x="0" y="9" textAnchor="middle">{label}</text>
  </g>;
}

export const NetworkTopologyRenderer = memo(function NetworkTopologyRenderer({ frame, motionMode = 'on', duration = 0, compact = false, navigationSource = 'step' }) {
  if (!frame) return null;
  const geometry = compact ? MOBILE_GEOMETRY : DESKTOP_GEOMETRY;
  const devices = Object.fromEntries(frame.topology.devices.map((item) => [item.id, item]));
  const transport = frame.transport;
  const packet = frame.packets.find((item) => item.id === frame.packetFocusId);
  const animateTravel = motionMode === 'on' && duration > 0 && navigationSource !== 'seek' && navigationSource !== 'load' && transport?.stage === 'travel';
  const reducedTravel = motionMode === 'reduced' && transport?.stage === 'travel';
  const activeSource = transport?.fromInterfaceId || (transport?.stage === 'source' ? transport.interfaceId : null);
  const activeDestination = transport?.toInterfaceId || (transport?.stage === 'destination' ? transport.interfaceId : null);
  const plugs = frame.topology.links.flatMap((link) => [link.fromInterfaceId, link.toInterfaceId].map((interfaceId) => ({
    interfaceId, linkId: link.id, active: transport?.linkId === link.id || transport?.interfaceId === interfaceId, tone: transport?.tone || 'inactive',
  })));

  return <div className="network-topology-renderer" data-layout={geometry.id} data-motion-mode={motionMode}
    data-operation-id={frame.operation.id} data-detail-id={frame.detail.id}>
    <div className="network-operation-timeline" aria-label="Eight-step ARP overview">
      {frame.operationTimeline.map((item) => <span className={`is-${item.status}`} aria-current={item.status === 'active' ? 'step' : undefined} key={item.id}><b>{item.index}</b><i>{item.label}</i></span>)}
    </div>
    <div className="network-detail-label"><strong>Operation {frame.operation.index} of {frame.operation.total}</strong><span>Detail {frame.detail.index} of {frame.detail.total} · {frame.detail.label}</span></div>
    <svg className="network-topology-svg" viewBox={geometry.viewBox} role="img" aria-labelledby="network-topology-title network-topology-description">
      <title id="network-topology-title">Port-accurate ARP teaching topology</title>
      <desc id="network-topology-description">Host A eth0 connects to switch Fa0/1. Switch Fa0/2 connects to Host B eth0. {frame.phase.explanation}</desc>
      <defs>
        <marker id={`network-arrow-${geometry.id}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0 8 4 0 8Z"/></marker>
        <filter id={`network-glow-${geometry.id}`} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="4" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <linearGradient id="network-jack-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#a9b5ba"/><stop offset=".28" stopColor="#4c6069"/><stop offset=".65" stopColor="#24343c"/><stop offset="1" stopColor="#81939b"/></linearGradient>
      </defs>
      <g className="network-cables" data-layer="cables">
        {frame.topology.links.map((link) => {
          const d = geometry.paths[link.id];
          const active = transport?.linkId === link.id;
          return <g key={link.id}>
            <path className="network-cable-shadow" d={d}/>
            <path id={pathId(geometry.id, link.id)} className={`network-cable is-${active ? transport.tone : 'inactive'} ${link.active ? 'is-active' : ''} ${reducedTravel && active ? 'is-reduced-sequence' : ''}`}
              d={d} data-link-id={link.id} data-from-interface-id={link.fromInterfaceId} data-to-interface-id={link.toInterfaceId}
              data-path-definition={d} markerEnd={link.active ? `url(#network-arrow-${geometry.id})` : undefined}/>
          </g>;
        })}
      </g>
      <HostDevice id="host-a" label="Host A" device={devices['host-a']} geometry={geometry.devices['host-a']} port={geometry.ports['host-a-eth0']} portLabel="eth0" mobile={compact}/>
      <SwitchDevice device={devices['switch-1']} geometry={geometry.devices['switch-1']} ports={geometry.ports} mobile={compact}/>
      <HostDevice id="host-b" label="Host B" device={devices['host-b']} geometry={geometry.devices['host-b']} port={geometry.ports['host-b-eth0']} portLabel="eth0" mobile={compact}/>
      <g className="network-plugs" data-layer="plugs">{plugs.map((plug) => <CablePlug {...plug} geometry={geometry.ports[plug.interfaceId]} key={`${plug.linkId}:${plug.interfaceId}`}/>)}</g>
      {reducedTravel ? <g className="network-reduced-cues" aria-hidden="true">
        <circle className="network-reduced-source" cx={geometry.ports[activeSource]?.cx} cy={geometry.ports[activeSource]?.cy} r="24"/>
        <circle className="network-reduced-destination" cx={geometry.ports[activeDestination]?.cx} cy={geometry.ports[activeDestination]?.cy} r="24"/>
      </g> : null}
      <PacketGlyph packet={packet} transport={transport} geometry={geometry} motionMode={motionMode} animateTravel={animateTravel} layoutId={geometry.id}/>
    </svg>
    <div className="network-physical-path" aria-label="Current physical path"><span>Physical path</span><strong>{physicalPathAnnotation(frame)}</strong></div>
    <p className="sr-only" role="status">Operation {frame.operation.index} of 8. Detail {frame.detail.index} of {frame.detail.total}: {frame.detail.label}. {frame.phase.explanation}</p>
  </div>;
});

export function NetworkPacketInspector({ frame }) {
  const packet = frame?.packets?.find((item) => item.id === frame.packetFocusId) || frame?.packets?.find((item) => item.status !== 'absent');
  if (!packet) return <section className="network-packet-inspector is-empty" aria-label="Packet inspector"><span>Packet inspector</span><strong>No ARP frame exists yet.</strong><p>Host A is still deciding whether the destination is local.</p></section>;
  return <section className="network-packet-inspector" aria-label="Packet inspector" data-packet-id={packet.id}>
    <header><div><span>Packet inspector</span><strong>{packet.kind === 'arp-request' ? 'ARP Request' : 'ARP Reply'}</strong></div><code>{packet.status.replace('-', ' ')}</code></header>
    <div className="network-packet-layers">
      <section><h3>Ethernet II <small>Layer 2 frame</small></h3><dl>
        <div><dt>Destination MAC</dt><dd>{packet.ethernet.destination}</dd></div><div><dt>Source MAC</dt><dd>{packet.ethernet.source}</dd></div><div><dt>EtherType</dt><dd>{packet.ethernet.etherType} · ARP</dd></div>
      </dl></section>
      <section><h3>Address Resolution Protocol <small>IPv4 mapping</small></h3><dl>
        <div><dt>Operation</dt><dd>{packet.arp.operation} ({packet.arp.operationCode})</dd></div><div><dt>Sender MAC</dt><dd>{packet.arp.senderMac}</dd></div><div><dt>Sender IPv4</dt><dd>{packet.arp.senderIp}</dd></div><div><dt>Target MAC</dt><dd>{packet.arp.targetMac}</dd></div><div><dt>Target IPv4</dt><dd>{packet.arp.targetIp}</dd></div>
      </dl></section>
    </div>
  </section>;
}

export function NetworkDecisionView({ frame }) {
  if (!frame) return null;
  return <section className="network-decision-view" aria-label="Current network decision">
    <header><span>Decision</span><strong>{frame.decision.question}</strong></header>
    <ul>{frame.decision.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
    <p><b>Outcome</b><span>{frame.decision.outcome.replaceAll('-', ' ')}</span></p>
    <div><b>Why</b>{frame.phase.explanation}</div>
  </section>;
}

function EmptyTableRow({ columns }) { return <div className="network-table-empty" style={{ gridColumn: `1 / ${columns + 1}` }}>No confirmed entries yet</div>; }

export function ArpTableView({ frame }) {
  const rows = frame?.tables?.arp?.filter((item) => item.state !== 'absent') || [];
  return <div className="network-table-view network-arp-table" aria-label="ARP tables"><div className="network-table-head"><span>Device</span><span>IPv4 address</span><span>MAC address</span></div>{rows.length ? rows.map((item) => <div className={`network-table-row is-${item.state} ${item.changed ? 'is-changed' : ''}`} data-row-id={item.id} key={item.id}><strong>{item.deviceId === 'host-a' ? 'Host A' : 'Host B'}</strong><code>{item.ip}</code><code>{item.mac}</code></div>) : <EmptyTableRow columns={3}/>}</div>;
}

export function MacTableView({ frame }) {
  const rows = frame?.tables?.mac?.filter((item) => item.state !== 'absent') || [];
  return <div className="network-table-view network-mac-table" aria-label="Switch MAC table"><div className="network-table-head"><span>Switch</span><span>Source MAC learned</span><span>Interface</span></div>{rows.length ? rows.map((item) => <div className={`network-table-row is-${item.state} ${item.changed ? 'is-changed' : ''}`} data-row-id={item.id} key={item.id}><strong>Switch 1</strong><code>{item.mac}</code><code>{item.interfaceId === 'switch-1-p1' ? 'Fa0/1' : 'Fa0/2'}</code></div>) : <EmptyTableRow columns={3}/>}</div>;
}

export function NetworkTablesView({ frame }) {
  const [tab, setTab] = useState('arp');
  return <section className="network-mobile-tables" aria-label="Network tables"><div role="tablist" aria-label="Table type"><button type="button" role="tab" aria-selected={tab === 'arp'} onClick={() => setTab('arp')}>ARP tables</button><button type="button" role="tab" aria-selected={tab === 'mac'} onClick={() => setTab('mac')}>MAC table</button></div>{tab === 'arp' ? <ArpTableView frame={frame}/> : <MacTableView frame={frame}/>}</section>;
}

export function NetworkStepsView({ frame, controller }) {
  if (!frame) return null;
  return <ol className="network-steps-view" data-granularity={frame.playbackGranularity}>{frame.operationTimeline.map((operation) => <li className={`is-${operation.status}`} key={operation.id}>
    <button type="button" onClick={() => controller.seek(operation.activeEvent - 1)}><span>{operation.index}</span><strong>{operation.label}</strong><em>{operation.status}</em></button>
    {operation.status === 'active' ? <ol>{operation.details.map((item) => <li className={`is-${item.status}`} key={item.id}><button type="button" disabled={!item.activeEvent} onClick={() => item.activeEvent && controller.seek(item.activeEvent - 1)}><span>{operation.index}.{item.index}</span><strong>{item.label}</strong><em>{item.status}</em></button></li>)}</ol> : null}
  </li>)}</ol>;
}

export const NetworkEvidencePanel = memo(function NetworkEvidencePanel({ frame, expanded, onExpandedChange }) {
  const [tab, setTab] = useState('arp');
  if (!expanded) return <aside className="network-evidence-rail" aria-label="Collapsed networking evidence"><button type="button" aria-expanded="false" aria-label="Expand networking evidence" onClick={() => onExpandedChange(true)}>›</button><span>Decision</span><span>ARP</span><span>MAC</span></aside>;
  return <aside className="network-evidence-panel" aria-label="Networking evidence">
    <header><div><span>Learning evidence</span><strong>Decision and tables</strong></div><button type="button" aria-expanded="true" aria-label="Collapse networking evidence" onClick={() => onExpandedChange(false)}>‹</button></header>
    <NetworkDecisionView frame={frame}/>
    <div className="network-evidence-tabs" role="tablist" aria-label="Networking tables"><button type="button" role="tab" aria-selected={tab === 'arp'} onClick={() => setTab('arp')}>ARP table</button><button type="button" role="tab" aria-selected={tab === 'mac'} onClick={() => setTab('mac')}>MAC table</button></div>
    <div className="network-evidence-table">{tab === 'arp' ? <ArpTableView frame={frame}/> : <MacTableView frame={frame}/>}</div>
  </aside>;
});

function NetworkPresetControls({ activity }) {
  const preset = activity.input.presets[0];
  return <div className="network-preset-control" aria-label="Network example"><span>Fixed classroom topology</span><strong>{preset.label}</strong><em>Host A eth0 ↔ Fa0/1 · Fa0/2 ↔ Host B eth0</em></div>;
}

BSITVisualizerRegistry.registerRenderer('network-topology', NetworkTopologyRenderer);
BSITVisualizerRegistry.registerEvidenceView('packet-inspector', NetworkPacketInspector, { label: 'Packet', icon: 'inspect' });
BSITVisualizerRegistry.registerEvidenceView('network-decisions', NetworkDecisionView, { label: 'Decision', icon: 'network' });
BSITVisualizerRegistry.registerEvidenceView('arp-table', ArpTableView, { label: 'ARP table', icon: 'grid' });
BSITVisualizerRegistry.registerEvidenceView('mac-table', MacTableView, { label: 'MAC table', icon: 'list' });
BSITVisualizerRegistry.registerInputControls('network-preset', NetworkPresetControls);
