import React, { memo, useMemo, useRef } from 'react';
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


function center(box) { return { x: box.x + box.w / 2, y: box.y + box.h / 2 }; }

function classificationFor(device) {
  if (device.tags.includes('server-role')) return 'End device · Server role';
  if (device.kind === 'end-device') return 'End device';
  if (device.kind === 'intermediary') return 'Intermediary network device';
  return 'Network connection';
}

function narrationFor(device, frame) {
  return frame.callouts?.[device.id] || `${device.label} is active during “${frame.detail.label}.”`;
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
    const outerBox = layout.devices[deviceId];
    const box = { x: outerBox.x + outerBox.w * .16, y: outerBox.y + 8, w: outerBox.w * .68, h: Math.min(72, outerBox.h * .62) };
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

function ServiceGlyph({ device, x, y }) {
  if (device.tags.includes('service-email')) return <g className="network-service-glyph"><rect x={x} y={y} width="24" height="17" rx="2"/><path d={`M${x + 2} ${y + 3}l10 8 10-8`}/></g>;
  if (device.tags.includes('service-web')) return <g className="network-service-glyph"><circle cx={x + 12} cy={y + 9} r="10"/><path d={`M${x + 2} ${y + 9}h20M${x + 12} ${y - 1}c-5 5-5 15 0 20M${x + 12} ${y - 1}c5 5 5 15 0 20`}/></g>;
  if (device.tags.includes('service-file') || device.tags.includes('server-role')) return <g className="network-service-glyph"><path d={`M${x} ${y + 3}h9l3 4h12v14H${x}Z`}/></g>;
  return null;
}

function GenericDeviceIcon({ device, box }) {
  const cx = box.x + box.w / 2;
  const top = box.y + 9;
  const laptop = device.id.includes('laptop') || device.tags.includes('client') && !device.tags.includes('router');
  const server = device.tags.includes('server-role') && !device.id.includes('laptop');
  const printer = device.id.includes('printer');
  const tablet = device.id.includes('tablet');
  const router = device.tags.includes('router') || device.tags.includes('gateway');
  const networkCloud = device.kind === 'network-cloud' || device.tags.includes('internet');
  const accessPoint = device.tags.includes('access-point') && !router;
  const networkSwitch = device.tags.includes('switch');
  if (networkCloud) return <g className="network-generic-icon icon-cloud" transform={`translate(${cx - 43} ${top + 10})`}><path d="M16 46C5 46 0 39 0 31c0-9 8-16 18-16 4-10 14-15 25-12 8 2 13 8 15 15 13-2 28 5 28 17 0 7-6 11-15 11Z"/><path className="network-icon-detail" d="M17 33h52"/></g>;
  if (router) return <g className="network-generic-icon icon-router" transform={`translate(${cx - 42} ${top + 8})`}><ellipse cx="42" cy="18" rx="37" ry="14"/><path d="M5 18v26c0 8 17 14 37 14s37-6 37-14V18"/><path className="network-icon-detail" d="m24 18 12-7m-12 7 10 2m26-2-12-7m12 7-10 2M42 29v16m0-16-6 7m6-7 6 7"/></g>;
  if (server) return <g className="network-generic-icon icon-server" transform={`translate(${cx - 26} ${top})`}><path d="M7 3 40 0l6 7v58l-39 5Z"/><path className="network-icon-detail" d="M13 13h23v13H13Zm0 21h23v13H13Zm0 21h23v8H13Z"/><circle className="network-icon-led" cx="17" cy="20" r="2"/><circle className="network-icon-led" cx="17" cy="41" r="2"/><ServiceGlyph device={device} x={48} y={29}/></g>;
  if (printer) return <g className="network-generic-icon icon-printer" transform={`translate(${cx - 39} ${top + 5})`}><path d="M19 0h40v19H19Z"/><path d="M7 17h64v34H7Z"/><path d="M18 39h42v27H18Z"/><circle className="network-icon-led" cx="58" cy="27" r="3"/><path className="network-icon-detail" d="M26 48h26m-26 7h26"/></g>;
  if (tablet) return <g className="network-generic-icon icon-tablet" transform={`translate(${cx - 24} ${top})`}><rect x="1" y="0" width="46" height="68" rx="7"/><rect className="network-icon-detail" x="7" y="7" width="34" height="50" rx="2"/><circle className="network-icon-led" cx="24" cy="62" r="2"/></g>;
  if (accessPoint) return <g className="network-generic-icon icon-access-point" transform={`translate(${cx - 41} ${top + 8})`}><rect x="14" y="32" width="54" height="26" rx="8"/><circle className="network-icon-led" cx="41" cy="45" r="4"/><path className="network-icon-detail" d="M26 26c8-8 22-8 30 0M18 18c13-13 33-13 46 0M10 10c18-18 44-18 62 0"/></g>;
  if (networkSwitch) return <g className="network-generic-icon icon-switch" transform={`translate(${cx - 45} ${top + 18})`}><path d="M2 7 17 0h68l5 9v37H2Z"/><path className="network-icon-detail" d="M13 18h64M13 28h64"/>{[0, 1, 2, 3, 4, 5].map((index) => <rect className="network-icon-port" x={14 + index * 11} y="35" width="7" height="5" key={index}/>)}</g>;
  if (laptop) return <g className="network-generic-icon icon-laptop" transform={`translate(${cx - 46} ${top + 4})`}><rect x="14" y="0" width="64" height="45" rx="4"/><rect className="network-icon-detail" x="19" y="5" width="54" height="34" rx="1"/><path d="M10 45h72l9 12c1 3-2 5-6 5H7c-5 0-7-3-5-6Z"/><path className="network-icon-detail" d="M34 50h24"/>{device.tags.includes('server-role') ? <ServiceGlyph device={device} x={70} y={33}/> : null}</g>;
  return <g className="network-generic-icon icon-computer" transform={`translate(${cx - 39} ${top + 2})`}><rect x="5" y="0" width="68" height="45" rx="4"/><rect className="network-icon-detail" x="11" y="6" width="56" height="33"/><path d="M39 45v11m-18 6h36M28 56h22"/></g>;
}

function FoundationRoleRegions({ frame, compact }) {
  if (frame.presetId !== 'client-server-services' || compact) return null;
  return <g className="network-foundation-role-regions" aria-hidden="true">
    <rect x="8" y="128" width="180" height="242" rx="14"/><text x="98" y="116" textAnchor="middle">End device</text>
    <rect x="198" y="108" width="650" height="282" rx="14"/><text x="523" y="96" textAnchor="middle">Intermediary network devices</text>
    <rect x="875" y="8" width="404" height="476" rx="14"/><text x="1077" y="20" textAnchor="middle">Servers</text>
  </g>;
}

function FoundationDevice({ device, box, interfaces, active }) {
  return <g className={`network-foundation-device kind-${device.kind} ${active ? 'is-focused' : ''}`} data-device-id={device.id} data-classification={classificationFor(device)}>
    <GenericDeviceIcon device={device} box={box}/>
    <text className="network-foundation-device-title" x={box.x + box.w / 2} y={box.y + box.h - 20} textAnchor="middle">{device.label}</text>
    <text className="network-foundation-device-role" x={box.x + box.w / 2} y={box.y + box.h - 5} textAnchor="middle">{device.role}</text>
    {device.interfaces.map((item) => {
      const point = interfaces[item.id];
      return <g className={`network-foundation-interface media-${item.media}`} data-interface-id={item.id} data-interface-media={item.media} key={item.id}>
        <rect className="network-foundation-port" x={point.x - 8} y={point.y - 7} width="16" height="14" rx="3"/>
        <circle className="network-foundation-interface-core" cx={point.x} cy={point.y} r="4"/>
      </g>;
    })}
  </g>;
}

export const NetworkFoundationsRenderer = memo(function NetworkFoundationsRenderer({ frame, compact = false }) {
  const geometry = useMemo(() => frame ? geometryFor(frame, compact) : null, [compact, frame]);
  if (!frame || !geometry) return null;
  const focused = new Set(frame.focus.deviceIds);
  const focusedLinks = new Set(frame.focus.linkIds);
  const deviceIsFocused = (item) => focused.has(item.id) || item.interfaces.some((entry) => focused.has(entry.id));
  const zoneWidth = 100 / frame.topology.zones.length;
  const calloutIds = new Set(Object.keys(frame.callouts || {}));
  const calloutDevices = frame.topology.devices.filter((item) => calloutIds.has(item.id)).slice(0, compact ? 1 : 2);
  const viewBoxWidth = Number(geometry.viewBox.split(' ')[2]);
  return <div className="network-foundations-renderer representation-generic display-generic" data-layout={geometry.id} data-scene-id={frame.scene.id} data-situation-id={frame.situation.id} data-operation-id={frame.operation.id} data-detail-id={frame.detail.id} data-display-mode="generic" data-interface-labels="hidden">
    <NetworkOperationCarousel timeline={frame.operationTimeline} label="Eight-step Networking Today overview"/>
    <div className="network-diagram-toolbar"><div className="network-detail-label"><strong>Operation {frame.operation.index} of {frame.operation.total}</strong><span>Detail {frame.detail.index} of {frame.detail.total} · {frame.detail.label}</span></div><div className="network-situation-badge"><span>Situation</span><strong>{frame.situation.label}</strong><em>{frame.situation.protocol}</em></div></div>
    <svg className="network-foundations-svg" viewBox={geometry.viewBox} role="img" aria-labelledby="network-foundations-title network-foundations-description">
      <title id="network-foundations-title">{frame.scene.title}</title>
      <desc id="network-foundations-description">{frame.scene.description} {frame.phase.explanation}</desc>
      <defs><marker id={`foundation-arrow-${geometry.id}`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth"><path d="M0 0 8 4 0 8Z"/></marker></defs>
      <FoundationRoleRegions frame={frame} compact={compact}/>
      <g className="network-foundation-links">
        {frame.topology.links.map((item) => <path className={`network-foundation-link media-${item.media} ${focusedLinks.has(item.id) ? 'is-focused' : ''}`} d={geometry.paths[item.id]}
          data-link-id={item.id} data-from-interface-id={item.fromInterfaceId} data-to-interface-id={item.toInterfaceId} data-path-definition={geometry.paths[item.id]}
          markerEnd={focusedLinks.has(item.id) ? `url(#foundation-arrow-${geometry.id})` : undefined} key={item.id}/>)}
      </g>
      {frame.topology.devices.map((item) => <FoundationDevice device={item} box={geometry.devices[item.id]} interfaces={geometry.interfaces} active={deviceIsFocused(item)} key={item.id}/>)}
      {calloutDevices.map((item) => <FoundationCallout device={item} box={geometry.devices[item.id]} frame={frame} viewBoxWidth={viewBoxWidth} key={`callout:${item.id}`}/>)}
      <g className="network-foundation-zone-labels" aria-hidden="true">{frame.topology.zones.map((zone, index) => <text x={`${zoneWidth * index + zoneWidth / 2}%`} y="98%" textAnchor="middle" key={zone.id}>{zone.label}</text>)}</g>
    </svg>
    <div className="network-foundation-caption"><span>{frame.scene.networkType}</span><strong>{frame.evidence.conclusion}</strong><em>Generic view</em></div>
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
    <dl><div><dt>Network topology</dt><dd>{frame.scene.label}</dd></div><div><dt>Situation</dt><dd>{frame.situation.label}</dd></div><div><dt>Representation</dt><dd>Generic</dd></div><div><dt>Focus</dt><dd>{frame.evidence.category}</dd></div></dl>
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

function NetworkFoundationPresetControls({ activity, inputs, setInputs }) {
  const dialogRef = useRef(null);
  const selected = inputs.preset || activity.input.defaultPreset;
  const situations = activity.input.situationsByPreset[selected] || [];
  const selectedSituation = inputs.situation || situations[0]?.id || '';
  function openExample(presetId) {
    const activityId = activity.input.activityByPreset[presetId];
    if (!activityId || activityId === activity.id) { dialogRef.current?.close(); return; }
    const url = new URL(location.href);
    url.searchParams.set('course', 'computer-networking');
    url.searchParams.set('activity', activityId);
    location.assign(url.toString());
  }
  return <div className="network-foundation-controls">
    <button className="network-topology-change" type="button" onClick={() => dialogRef.current?.showModal()}><span>Network topology</span><strong>Change Network Topology</strong><em>{activity.input.presets.find((item) => item.id === selected)?.label}</em></button>
    <label className="network-situation-control"><span>Situation</span><select aria-label="Situation" value={selectedSituation} onChange={(event) => setInputs((current) => ({ ...current, situation: event.target.value }))}>{situations.map((item) => <option value={item.id} key={item.id}>{item.label}</option>)}</select><em>{situations.length} guided {situations.length === 1 ? 'situation' : 'situations'}</em></label>
    <dialog className="network-topology-dialog" ref={dialogRef} aria-labelledby="network-topology-dialog-title">
      <header><div><span>Module 1</span><h2 id="network-topology-dialog-title">Change Network Topology</h2><p>Choose one fixed network. The Situation control changes what happens without changing the devices.</p></div><form method="dialog"><button type="submit" aria-label="Close topology chooser">×</button></form></header>
      <div className="network-topology-choices">{activity.input.presets.map((preset, index) => <button type="button" className={preset.id === selected ? 'is-current' : ''} aria-current={preset.id === selected ? 'true' : undefined} onClick={() => openExample(preset.id)} key={preset.id}><span>{String(index + 1).padStart(2, '0')}</span><strong>{preset.label}</strong><em>{preset.description}</em></button>)}</div>
    </dialog>
  </div>;
}

BSITVisualizerRegistry.registerRenderer('network-foundations', NetworkFoundationsRenderer);
BSITVisualizerRegistry.registerEvidenceView('network-foundation-guide', NetworkFoundationEvidenceView, { label: 'Evidence', icon: 'list' });
BSITVisualizerRegistry.registerInputControls('network-foundation-preset', NetworkFoundationPresetControls);
