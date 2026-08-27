import React, { memo, useMemo } from 'react';
import { NetworkDiagramControls } from './network-diagram-controls.jsx';
import { NetworkOperationCarousel } from './network-operation-carousel.jsx';

const SCENE_LAYOUTS = Object.freeze({
  'client-server-services': {
    desktop: { viewBox: '0 0 1300 500', devices: {
      'client-laptop': { x: 20, y: 190, w: 150, h: 120 }, 'home-router': { x: 215, y: 185, w: 150, h: 130 },
      'internet-cloud': { x: 430, y: 190, w: 160, h: 120 }, 'service-router': { x: 655, y: 165, w: 160, h: 170 },
      'email-server': { x: 920, y: 24, w: 155, h: 110 }, 'web-server': { x: 920, y: 195, w: 155, h: 110 }, 'file-server': { x: 920, y: 366, w: 155, h: 110 },
    } },
    mobile: { viewBox: '0 0 390 820', devices: {
      'client-laptop': { x: 110, y: 24, w: 170, h: 95 }, 'home-router': { x: 110, y: 158, w: 170, h: 100 },
      'internet-cloud': { x: 105, y: 302, w: 180, h: 96 }, 'service-router': { x: 100, y: 445, w: 190, h: 110 },
      'email-server': { x: 8, y: 650, w: 116, h: 130 }, 'web-server': { x: 137, y: 650, w: 116, h: 130 }, 'file-server': { x: 266, y: 650, w: 116, h: 130 },
    } },
  },
  'local-peer-sharing': {
    desktop: { viewBox: '0 0 1100 500', devices: {
      'peer-laptop-a': { x: 35, y: 170, w: 210, h: 130 }, 'peer-switch': { x: 445, y: 170, w: 210, h: 130 },
      'peer-laptop-b': { x: 855, y: 70, w: 210, h: 130 }, 'shared-printer': { x: 855, y: 330, w: 210, h: 130 },
    } },
    mobile: { viewBox: '0 0 390 760', devices: {
      'peer-laptop-a': { x: 100, y: 25, w: 190, h: 110 }, 'peer-switch': { x: 100, y: 245, w: 190, h: 110 },
      'peer-laptop-b': { x: 12, y: 520, w: 176, h: 120 }, 'shared-printer': { x: 202, y: 520, w: 176, h: 120 },
    } },
  },
  'small-office-components': {
    desktop: { viewBox: '0 0 1100 500', devices: {
      'office-laptop': { x: 25, y: 34, w: 185, h: 120 }, 'office-ap': { x: 270, y: 34, w: 185, h: 120 },
      'office-switch': { x: 465, y: 205, w: 185, h: 120 }, 'office-router': { x: 715, y: 205, w: 185, h: 120 },
      'server-laptop': { x: 355, y: 365, w: 185, h: 110 }, 'office-printer': { x: 930, y: 205, w: 145, h: 120 },
    } },
    mobile: { viewBox: '0 0 390 860', devices: {
      'office-laptop': { x: 15, y: 24, w: 170, h: 105 }, 'office-ap': { x: 205, y: 24, w: 170, h: 105 },
      'office-switch': { x: 105, y: 210, w: 180, h: 105 }, 'office-router': { x: 105, y: 390, w: 180, h: 105 },
      'server-laptop': { x: 15, y: 630, w: 170, h: 110 }, 'office-printer': { x: 205, y: 630, w: 170, h: 110 },
    } },
  },
  'campus-media': {
    desktop: { viewBox: '0 0 1100 500', devices: {
      'faculty-pc': { x: 20, y: 190, w: 155, h: 120 }, 'building-a-switch': { x: 220, y: 190, w: 170, h: 120 },
      'building-b-switch': { x: 560, y: 190, w: 170, h: 120 }, 'campus-ap': { x: 790, y: 48, w: 150, h: 110 },
      'student-tablet': { x: 950, y: 48, w: 130, h: 110 }, 'library-server': { x: 860, y: 355, w: 180, h: 115 },
    } },
    mobile: { viewBox: '0 0 390 880', devices: {
      'faculty-pc': { x: 105, y: 20, w: 180, h: 105 }, 'building-a-switch': { x: 105, y: 190, w: 180, h: 105 },
      'building-b-switch': { x: 105, y: 385, w: 180, h: 105 }, 'campus-ap': { x: 10, y: 615, w: 170, h: 105 },
      'student-tablet': { x: 210, y: 615, w: 170, h: 105 }, 'library-server': { x: 105, y: 755, w: 180, h: 105 },
    } },
  },
  'branch-topology': {
    desktop: { viewBox: '0 0 1100 500', devices: {
      'branch-laptop': { x: 18, y: 190, w: 150, h: 120 }, 'branch-ap-router': { x: 205, y: 175, w: 170, h: 145 },
      'branch-internet': { x: 440, y: 190, w: 165, h: 120 }, 'hq-router': { x: 665, y: 175, w: 160, h: 145 },
      'hq-switch': { x: 875, y: 80, w: 180, h: 120 }, 'hq-app-server': { x: 875, y: 330, w: 180, h: 120 },
    } },
    mobile: { viewBox: '0 0 390 900', devices: {
      'branch-laptop': { x: 105, y: 20, w: 180, h: 100 }, 'branch-ap-router': { x: 100, y: 160, w: 190, h: 110 },
      'branch-internet': { x: 100, y: 315, w: 190, h: 100 }, 'hq-router': { x: 100, y: 460, w: 190, h: 110 },
      'hq-switch': { x: 30, y: 660, w: 160, h: 105 }, 'hq-app-server': { x: 210, y: 660, w: 160, h: 105 },
    } },
  },
});

const KIND_LABELS = Object.freeze({ 'end-device': 'END DEVICE', intermediary: 'INTERMEDIARY', 'network-cloud': 'NETWORK' });
const DEVICE_MARKS = Object.freeze({
  'client-laptop': 'PC', 'peer-laptop-a': 'A', 'peer-laptop-b': 'B', 'office-laptop': 'PC', 'server-laptop': 'FS',
  'email-server': '@', 'web-server': 'WEB', 'file-server': 'FILE', 'library-server': 'LIB', 'hq-app-server': 'APP',
  'shared-printer': 'PRN', 'office-printer': 'PRN', 'student-tablet': 'TAB', 'faculty-pc': 'PC', 'branch-laptop': 'PC',
});
const NOOP = () => {};

function center(box) { return { x: box.x + box.w / 2, y: box.y + box.h / 2 }; }

function classificationFor(device) {
  if (device.tags.includes('server-role')) return 'End device · Server role';
  if (device.kind === 'end-device') return 'End device';
  if (device.kind === 'intermediary') return 'Intermediary network device';
  return 'Network connection';
}

function narrationFor(device, frame) {
  const interfaceNames = device.interfaces.map((item) => item.label).join(' and ');
  if (frame.detail.id === 'inspect-named-interfaces') return `${device.label} uses ${interfaceNames} on this path.`;
  if (frame.detail.id === 'classify-end-devices') return `${device.label} is an end device where messages begin or end.`;
  if (frame.detail.id === 'classify-intermediaries') return `${device.label} carries traffic between network endpoints.`;
  if (frame.detail.id === 'separate-device-and-role' && device.tags.includes('server-role')) return `${device.label} is an end device performing a server role.`;
  if (frame.detail.id === 'define-local-peer-network') return `${device.label} stays inside the local IP network.`;
  if (frame.detail.id === 'recognize-both-roles' && device.tags.includes('peer')) return `${device.label} can request and provide a shared resource.`;
  if (frame.detail.id === 'match-service-roles') {
    if (device.tags.includes('service-email')) return 'The email server handles SMTP and IMAP requests.';
    if (device.tags.includes('service-web')) return 'The web server handles HTTP and HTTPS requests.';
    if (device.tags.includes('service-file')) return 'The file server provides shared files through SMB.';
  }
  if (device.tags.includes('client')) return `${device.label} has to request the selected network service.`;
  if (device.tags.includes('service-email')) return 'The email server handles mail requests.';
  if (device.tags.includes('service-web')) return 'The web server handles web requests.';
  if (device.tags.includes('service-file')) return 'The file server provides shared files.';
  if (device.tags.includes('switch')) return `${device.label} forwards frames inside the local network.`;
  if (device.tags.includes('router') || device.tags.includes('gateway')) return `${device.label} checks which network should receive the traffic.`;
  if (device.tags.includes('access-point')) return `${device.label} joins wireless devices to the local network.`;
  if (device.kind === 'network-cloud') return `${device.label} represents the connection between distant networks.`;
  return `${device.label} is relevant to this step: ${frame.detail.label.toLowerCase()}.`;
}

function wrapCallout(text, limit = 29) {
  const lines = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if (!current || `${current} ${word}`.length <= limit) current = current ? `${current} ${word}` : word;
    else { lines.push(current); current = word; }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function FoundationCallout({ device, box, frame, viewBoxWidth }) {
  const width = Math.min(196, Math.max(154, box.w + 18));
  const narration = narrationFor(device, frame);
  const lines = wrapCallout(narration);
  const height = 22 + lines.length * 14;
  let x = Math.max(8, Math.min(viewBoxWidth - width - 8, box.x + box.w / 2 - width / 2));
  let y = box.y - height - 16;
  let tail = `M${box.x + box.w / 2 - 8} ${y + height - 1}L${box.x + box.w / 2} ${box.y - 3}L${box.x + box.w / 2 + 8} ${y + height - 1}Z`;
  if (box.x > viewBoxWidth * .65 && box.x + box.w + width + 22 <= viewBoxWidth) {
    x = box.x + box.w + 14;
    y = box.y + Math.max(0, (box.h - height) / 2);
    tail = `M${x + 1} ${y + height / 2 - 7}L${box.x + box.w + 3} ${box.y + box.h / 2}L${x + 1} ${y + height / 2 + 7}Z`;
  } else if (box.x > viewBoxWidth * .76) {
    x = Math.max(8, box.x - width - 14);
    y = box.y + Math.max(0, (box.h - height) / 2);
    tail = `M${x + width - 1} ${y + height / 2 - 7}L${box.x - 3} ${box.y + box.h / 2}L${x + width - 1} ${y + height / 2 + 7}Z`;
  } else if (y < 8) {
    y = box.y + box.h + 15;
    tail = `M${box.x + box.w / 2 - 8} ${y + 1}L${box.x + box.w / 2} ${box.y + box.h + 3}L${box.x + box.w / 2 + 8} ${y + 1}Z`;
  }
  return <g className="network-device-callout" data-callout-device-id={device.id} role="note" aria-label={narration}>
    <path d={tail}/><rect x={x} y={y} width={width} height={height} rx="8"/>
    <text x={x + 11} y={y + 18}>{lines.map((line, index) => <tspan x={x + 11} dy={index ? 14 : 0} key={`${device.id}:${line}`}>{line}</tspan>)}</text>
  </g>;
}

function geometryFor(frame, compact) {
  const layout = SCENE_LAYOUTS[frame.presetId]?.[compact ? 'mobile' : 'desktop'] || SCENE_LAYOUTS['client-server-services'][compact ? 'mobile' : 'desktop'];
  const deviceByInterface = new Map(frame.topology.devices.flatMap((item) => item.interfaces.map((entry) => [entry.id, item.id])));
  const otherInterface = new Map(frame.topology.links.flatMap((item) => [[item.fromInterfaceId, item.toInterfaceId], [item.toInterfaceId, item.fromInterfaceId]]));
  const sideGroups = new Map();
  for (const device of frame.topology.devices) {
    const box = layout.devices[device.id];
    const origin = center(box);
    const groups = { left: [], right: [], top: [], bottom: [] };
    for (const item of device.interfaces) {
      const otherDeviceId = deviceByInterface.get(otherInterface.get(item.id));
      const target = center(layout.devices[otherDeviceId] || box);
      const dx = target.x - origin.x;
      const dy = target.y - origin.y;
      const side = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'right' : 'left') : (dy >= 0 ? 'bottom' : 'top');
      groups[side].push(item.id);
    }
    sideGroups.set(device.id, groups);
  }
  const interfaces = {};
  for (const [deviceId, groups] of sideGroups) {
    const box = layout.devices[deviceId];
    for (const [side, ids] of Object.entries(groups)) ids.forEach((id, index) => {
      const ratio = (index + 1) / (ids.length + 1);
      interfaces[id] = side === 'left' ? { x: box.x, y: box.y + box.h * ratio, side }
        : side === 'right' ? { x: box.x + box.w, y: box.y + box.h * ratio, side }
          : side === 'top' ? { x: box.x + box.w * ratio, y: box.y, side }
            : { x: box.x + box.w * ratio, y: box.y + box.h, side };
    });
  }
  const paths = Object.fromEntries(frame.topology.links.map((item) => {
    const from = interfaces[item.fromInterfaceId];
    const to = interfaces[item.toInterfaceId];
    const horizontal = Math.abs(to.x - from.x) >= Math.abs(to.y - from.y);
    const d = horizontal
      ? `M${from.x} ${from.y} C${(from.x + to.x) / 2} ${from.y} ${(from.x + to.x) / 2} ${to.y} ${to.x} ${to.y}`
      : `M${from.x} ${from.y} C${from.x} ${(from.y + to.y) / 2} ${to.x} ${(from.y + to.y) / 2} ${to.x} ${to.y}`;
    return [item.id, d];
  }));
  return { ...layout, id: compact ? 'mobile' : 'desktop', interfaces, paths };
}

function FoundationDevice({ device, box, interfaces, active, compact, displayMode, showInterfaceLabels }) {
  const mark = DEVICE_MARKS[device.id] || (device.kind === 'network-cloud' ? 'WAN' : device.tags.includes('router') ? 'R' : device.tags.includes('switch') ? 'SW' : device.tags.includes('access-point') ? 'AP' : device.tags.includes('server-role') ? 'SRV' : 'HOST');
  return <g className={`network-foundation-device kind-${device.kind} ${active ? 'is-focused' : ''}`} data-device-id={device.id}>
    <g className="network-device-classification" data-classification={classificationFor(device)}>
      <rect x={box.x - 7} y={box.y - 7} width={box.w + 14} height={box.h + 14} rx="15"/>
      <text x={box.x + 10} y={box.y - 12}>{classificationFor(device)}</text>
    </g>
    <rect className="network-foundation-device-shadow" x={box.x + 5} y={box.y + 7} width={box.w} height={box.h} rx="12"/>
    <rect className="network-foundation-device-shell" x={box.x} y={box.y} width={box.w} height={box.h} rx="12"/>
    <text className="network-foundation-device-icon" x={box.x + 18} y={box.y + 39}>{mark}</text>
    <text className="network-foundation-device-kind" x={box.x + 18} y={box.y + 63}>{KIND_LABELS[device.kind]}</text>
    <text className="network-foundation-device-title" x={box.x + 18} y={box.y + 84}>{device.label}</text>
    <text className="network-foundation-device-role" x={box.x + 18} y={box.y + box.h - 14}>{device.role}</text>
    {device.interfaces.map((item) => {
      const point = interfaces[item.id];
      return <g className={`network-foundation-interface media-${item.media}`} data-interface-id={item.id} data-interface-media={item.media} key={item.id}>
        <rect className="network-foundation-port" x={point.x - 10} y={point.y - 8} width="20" height="16" rx="3"/>
        <circle className="network-foundation-interface-core" cx={point.x} cy={point.y} r="3.5"/>
      </g>;
    })}
    {displayMode === 'interfaces' && showInterfaceLabels ? <g className="network-interface-labels" aria-label={`${device.label} interfaces`}>
      {device.interfaces.map((item, index) => <text x={box.x + box.w * ((index + 1) / (device.interfaces.length + 1))} y={box.y + box.h + (compact ? 18 : 17)} textAnchor="middle" key={`${device.id}:label:${item.id}`}>{item.label}</text>)}
    </g> : null}
  </g>;
}

export const NetworkFoundationsRenderer = memo(function NetworkFoundationsRenderer({ frame, compact = false, displayMode = 'interfaces', showInterfaceLabels = true, onDisplayModeChange = NOOP, onShowInterfaceLabelsChange = NOOP }) {
  const geometry = useMemo(() => frame ? geometryFor(frame, compact) : null, [compact, frame]);
  if (!frame || !geometry) return null;
  const focused = new Set(frame.focus.deviceIds);
  const focusedLinks = new Set(frame.focus.linkIds);
  const deviceIsFocused = (item) => focused.has(item.id) || item.interfaces.some((entry) => focused.has(entry.id));
  const zoneWidth = 100 / frame.topology.zones.length;
  const calloutDevices = compact ? [] : frame.topology.devices.filter(deviceIsFocused).slice(0, 4);
  const viewBoxWidth = Number(geometry.viewBox.split(' ')[2]);
  return <div className={`network-foundations-renderer representation-${frame.focus.representation} display-${displayMode}`} data-layout={geometry.id} data-scene-id={frame.scene.id} data-operation-id={frame.operation.id} data-detail-id={frame.detail.id} data-display-mode={displayMode} data-interface-labels={showInterfaceLabels ? 'visible' : 'hidden'}>
    <NetworkOperationCarousel timeline={frame.operationTimeline} label="Eight-step Networking Today overview"/>
    <div className="network-diagram-toolbar"><div className="network-detail-label"><strong>Operation {frame.operation.index} of {frame.operation.total}</strong><span>Detail {frame.detail.index} of {frame.detail.total} · {frame.detail.label}</span></div><NetworkDiagramControls mode={displayMode} onModeChange={onDisplayModeChange} showLabels={showInterfaceLabels} onShowLabelsChange={onShowInterfaceLabelsChange}/></div>
    <svg className="network-foundations-svg" viewBox={geometry.viewBox} role="img" aria-labelledby="network-foundations-title network-foundations-description">
      <title id="network-foundations-title">{frame.scene.title}</title>
      <desc id="network-foundations-description">{frame.scene.description} {frame.phase.explanation}</desc>
      <defs><marker id={`foundation-arrow-${geometry.id}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0 8 4 0 8Z"/></marker></defs>
      <g className="network-foundation-links">
        {frame.topology.links.map((item) => <path className={`network-foundation-link media-${item.media} ${focusedLinks.has(item.id) ? 'is-focused' : ''}`} d={geometry.paths[item.id]}
          data-link-id={item.id} data-from-interface-id={item.fromInterfaceId} data-to-interface-id={item.toInterfaceId} data-path-definition={geometry.paths[item.id]}
          markerEnd={focusedLinks.has(item.id) ? `url(#foundation-arrow-${geometry.id})` : undefined} key={item.id}/>)}
      </g>
      {frame.topology.devices.map((item) => <FoundationDevice device={item} box={geometry.devices[item.id]} interfaces={geometry.interfaces} active={deviceIsFocused(item)} compact={compact} displayMode={displayMode} showInterfaceLabels={showInterfaceLabels} key={item.id}/>)}
      {calloutDevices.map((item) => <FoundationCallout device={item} box={geometry.devices[item.id]} frame={frame} viewBoxWidth={viewBoxWidth} key={`callout:${item.id}`}/>)}
      <g className="network-foundation-zone-labels" aria-hidden="true">{frame.topology.zones.map((zone, index) => <text x={`${zoneWidth * index + zoneWidth / 2}%`} y="98%" textAnchor="middle" key={zone.id}>{zone.label}</text>)}</g>
    </svg>
    <div className="network-foundation-caption"><span>{frame.scene.networkType}</span><strong>{frame.evidence.conclusion}</strong><em>{frame.focus.representation === 'split' ? 'Physical + logical' : `${frame.focus.representation} view`}</em></div>
    <p className="sr-only" role="status">Operation {frame.operation.index} of 8. Detail {frame.detail.index} of {frame.detail.total}: {frame.detail.label}. {frame.phase.explanation}</p>
  </div>;
});

export function NetworkFoundationConceptsView({ frame }) {
  if (!frame) return null;
  return <section className="network-foundation-concepts" aria-label="Current networking concept">
    <header><span>{frame.evidence.category}</span><strong>{frame.detail.label}</strong></header>
    <p>{frame.phase.explanation}</p>
    <ul>{frame.evidence.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
  </section>;
}

export function NetworkFoundationEvidenceView({ frame }) {
  if (!frame) return null;
  return <section className="network-foundation-evidence" aria-label="Foundation evidence">
    <span>Step evidence</span><strong>{frame.evidence.conclusion}</strong>
    <dl><div><dt>Network example</dt><dd>{frame.scene.label}</dd></div><div><dt>Representation</dt><dd>{frame.focus.representation === 'split' ? 'Physical + logical' : frame.focus.representation}</dd></div><div><dt>Focus</dt><dd>{frame.evidence.category}</dd></div></dl>
  </section>;
}

export const NetworkFoundationGuidePanel = memo(function NetworkFoundationGuidePanel({ frame, expanded, onExpandedChange }) {
  if (!expanded) return <aside className="network-evidence-rail" aria-label="Collapsed foundation guide"><button type="button" aria-expanded="false" aria-label="Expand foundation guide" onClick={() => onExpandedChange(true)}>›</button><span>Concept</span><span>Evidence</span><span>Roles</span></aside>;
  return <aside className="network-evidence-panel network-foundation-guide" aria-label="Networking Today guide">
    <header><div><span>Learning evidence</span><strong>{frame?.scene?.label || 'Module 1 guide'}</strong></div><button type="button" aria-expanded="true" aria-label="Collapse foundation guide" onClick={() => onExpandedChange(false)}>‹</button></header>
    <NetworkFoundationConceptsView frame={frame}/>
    <NetworkFoundationEvidenceView frame={frame}/>
    <div className="network-foundation-legend"><span><i className="is-endpoint"/>End device</span><span><i className="is-intermediary"/>Intermediary</span><span><i className="is-wired"/>Copper</span><span><i className="is-fiber"/>Fiber</span><span><i className="is-wireless"/>Wireless</span></div>
  </aside>;
});

function NetworkFoundationPresetControls({ activity }) {
  const selected = activity.input.defaultPreset;
  function openExample(event) {
    const activityId = activity.input.activityByPreset[event.target.value];
    if (!activityId || activityId === activity.id) return;
    const url = new URL(location.href);
    url.searchParams.set('course', 'computer-networking');
    url.searchParams.set('activity', activityId);
    location.assign(url.toString());
  }
  return <label className="network-preset-control" aria-label="Network example">
    <span>Network example</span>
    <select aria-label="Network example" value={selected} onChange={openExample}>{activity.input.presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select>
    <em>Five fixed Module 1 networks</em>
  </label>;
}

BSITVisualizerRegistry.registerRenderer('network-foundations', NetworkFoundationsRenderer);
BSITVisualizerRegistry.registerEvidenceView('network-foundation-guide', NetworkFoundationEvidenceView, { label: 'Evidence', icon: 'list' });
BSITVisualizerRegistry.registerInputControls('network-foundation-preset', NetworkFoundationPresetControls);
