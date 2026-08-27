import React, { memo } from 'react';
import { NetworkOperationCarousel } from './network-operation-carousel.jsx';

const DESKTOP = Object.freeze({
  id: 'desktop', viewBox: '0 0 1100 470',
  devices: {
    'student-laptop': { x: 45, y: 54, w: 205, h: 118 },
    'instructor-pc': { x: 45, y: 292, w: 205, h: 118 },
    'classroom-ap': { x: 346, y: 54, w: 205, h: 118 },
    'classroom-switch': { x: 346, y: 292, w: 205, h: 118 },
    'edge-router': { x: 650, y: 172, w: 205, h: 130 },
    'learning-server': { x: 910, y: 172, w: 160, h: 130 },
  },
  interfaces: {
    'student-laptop-wlan0': { x: 250, y: 113 }, 'classroom-ap-radio0': { x: 346, y: 113 },
    'instructor-pc-eth0': { x: 250, y: 350 }, 'classroom-switch-fa0-1': { x: 346, y: 335 },
    'classroom-switch-fa0-2': { x: 551, y: 365 }, 'edge-router-g0-0': { x: 650, y: 264 },
    'classroom-ap-eth0': { x: 551, y: 130 }, 'edge-router-g0-1': { x: 650, y: 218 },
    'edge-router-wan0': { x: 855, y: 237 }, 'learning-server-eth0': { x: 910, y: 237 },
  },
  paths: {
    'link-student-ap': 'M250 113 C285 80 315 80 346 113',
    'link-instructor-switch': 'M250 350 C286 350 310 335 346 335',
    'link-switch-router': 'M551 365 C596 365 604 264 650 264',
    'link-ap-router': 'M551 130 C596 130 604 218 650 218',
    'link-router-server': 'M855 237 C875 237 890 237 910 237',
  },
});

const MOBILE = Object.freeze({
  id: 'mobile', viewBox: '0 0 390 720',
  devices: {
    'student-laptop': { x: 16, y: 28, w: 155, h: 104 },
    'instructor-pc': { x: 219, y: 28, w: 155, h: 104 },
    'classroom-ap': { x: 16, y: 190, w: 155, h: 104 },
    'classroom-switch': { x: 219, y: 190, w: 155, h: 104 },
    'edge-router': { x: 105, y: 378, w: 180, h: 112 },
    'learning-server': { x: 105, y: 576, w: 180, h: 112 },
  },
  interfaces: {
    'student-laptop-wlan0': { x: 94, y: 132 }, 'classroom-ap-radio0': { x: 94, y: 190 },
    'instructor-pc-eth0': { x: 296, y: 132 }, 'classroom-switch-fa0-1': { x: 296, y: 190 },
    'classroom-switch-fa0-2': { x: 250, y: 294 }, 'edge-router-g0-0': { x: 250, y: 378 },
    'classroom-ap-eth0': { x: 140, y: 294 }, 'edge-router-g0-1': { x: 140, y: 378 },
    'edge-router-wan0': { x: 195, y: 490 }, 'learning-server-eth0': { x: 195, y: 576 },
  },
  paths: {
    'link-student-ap': 'M94 132 V190', 'link-instructor-switch': 'M296 132 V190',
    'link-switch-router': 'M250 294 V378', 'link-ap-router': 'M140 294 V378',
    'link-router-server': 'M195 490 V576',
  },
});

const KIND_LABELS = Object.freeze({ 'end-device': 'END DEVICE', intermediary: 'INTERMEDIARY' });

function interfaceLabel(device, interfaceId) {
  return device.interfaces.find((item) => item.id === interfaceId)?.label || interfaceId;
}

function FoundationDevice({ device, geometry, interfaces, active }) {
  const icon = device.id === 'learning-server' ? '▥' : device.id === 'edge-router' ? '⇄' : device.id === 'classroom-switch' ? '⇆' : device.id === 'classroom-ap' ? '⌁' : '▱';
  return <g className={`network-foundation-device kind-${device.kind} ${active ? 'is-focused' : ''}`} data-device-id={device.id}>
    <rect className="network-foundation-device-shadow" x={geometry.x + 5} y={geometry.y + 7} width={geometry.w} height={geometry.h} rx="12"/>
    <rect className="network-foundation-device-shell" x={geometry.x} y={geometry.y} width={geometry.w} height={geometry.h} rx="12"/>
    <text className="network-foundation-device-icon" x={geometry.x + 22} y={geometry.y + 42}>{icon}</text>
    <text className="network-foundation-device-kind" x={geometry.x + 58} y={geometry.y + 25}>{KIND_LABELS[device.kind]}</text>
    <text className="network-foundation-device-title" x={geometry.x + 58} y={geometry.y + 48}>{device.label}</text>
    <text className="network-foundation-device-role" x={geometry.x + 18} y={geometry.y + geometry.h - 18}>{device.role}</text>
    {device.interfaces.map((item) => {
      const point = interfaces[item.id];
      const left = point.x <= geometry.x + 2;
      const right = point.x >= geometry.x + geometry.w - 2;
      const anchor = left ? 'start' : right ? 'end' : 'middle';
      const labelX = left ? point.x + 9 : right ? point.x - 9 : point.x;
      const labelY = point.y < geometry.y + geometry.h / 2 ? point.y + 19 : point.y - 11;
      return <g className={`network-foundation-interface media-${item.media}`} data-interface-id={item.id} data-interface-media={item.media} key={item.id}>
        <circle cx={point.x} cy={point.y} r="7"/><circle className="network-foundation-interface-core" cx={point.x} cy={point.y} r="3"/>
        <text x={labelX} y={labelY} textAnchor={anchor}>{item.label}</text>
      </g>;
    })}
  </g>;
}

export const NetworkFoundationsRenderer = memo(function NetworkFoundationsRenderer({ frame, compact = false }) {
  if (!frame) return null;
  const geometry = compact ? MOBILE : DESKTOP;
  const focused = new Set(frame.focus.deviceIds);
  const focusedLinks = new Set(frame.focus.linkIds);
  const deviceByInterface = new Map(frame.topology.devices.flatMap((device) => device.interfaces.map((item) => [item.id, device])));
  const deviceIsFocused = (device) => focused.has(device.id) || device.interfaces.some((item) => focused.has(item.id));
  return <div className={`network-foundations-renderer representation-${frame.focus.representation}`} data-layout={geometry.id} data-operation-id={frame.operation.id} data-detail-id={frame.detail.id}>
    <NetworkOperationCarousel timeline={frame.operationTimeline} label="Eight-step Networking Today overview"/>
    <div className="network-detail-label"><strong>Operation {frame.operation.index} of {frame.operation.total}</strong><span>Detail {frame.detail.index} of {frame.detail.total} · {frame.detail.label}</span></div>
    <svg className="network-foundations-svg" viewBox={geometry.viewBox} role="img" aria-labelledby="network-foundations-title network-foundations-description">
      <title id="network-foundations-title">Connected classroom network</title>
      <desc id="network-foundations-description">A student laptop, instructor PC, access point, switch, edge router, and remote learning server. {frame.phase.explanation}</desc>
      <g className="network-foundation-scopes" aria-hidden="true">
        <rect className="network-foundation-lan" x="10" y="12" width={compact ? 370 : 875} height={compact ? 500 : 430} rx="24"/>
        <text x={compact ? 24 : 28} y={compact ? 18 : 36}>CLASSROOM LAN</text>
        <rect className="network-foundation-wan" x={compact ? 82 : 888} y={compact ? 548 : 138} width={compact ? 226 : 200} height={compact ? 162 : 198} rx="24"/>
        <text x={compact ? 100 : 908} y={compact ? 566 : 162}>WAN · REMOTE SERVICE</text>
      </g>
      <g className="network-foundation-links">
        {frame.topology.links.map((link) => {
          const active = focusedLinks.has(link.id) || focused.has(link.fromInterfaceId) || focused.has(link.toInterfaceId)
            || deviceIsFocused(deviceByInterface.get(link.fromInterfaceId)) && deviceIsFocused(deviceByInterface.get(link.toInterfaceId));
          return <path className={`network-foundation-link media-${link.media} ${active ? 'is-focused' : ''}`} d={geometry.paths[link.id]} data-link-id={link.id} data-from-interface-id={link.fromInterfaceId} data-to-interface-id={link.toInterfaceId} key={link.id}/>;
        })}
      </g>
      {frame.topology.devices.map((device) => <FoundationDevice device={device} geometry={geometry.devices[device.id]} interfaces={geometry.interfaces} active={deviceIsFocused(device)} key={device.id}/>)}
    </svg>
    <div className="network-foundation-caption"><span>{frame.evidence.category}</span><strong>{frame.evidence.conclusion}</strong><em>{frame.focus.representation === 'split' ? 'Physical + logical' : `${frame.focus.representation} view`}</em></div>
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
    <span>Learning evidence</span><strong>{frame.evidence.conclusion}</strong>
    <dl><div><dt>Representation</dt><dd>{frame.focus.representation === 'split' ? 'Physical + logical' : frame.focus.representation}</dd></div><div><dt>Focus</dt><dd>{frame.evidence.category}</dd></div></dl>
  </section>;
}

export const NetworkFoundationGuidePanel = memo(function NetworkFoundationGuidePanel({ frame, expanded, onExpandedChange }) {
  if (!expanded) return <aside className="network-evidence-rail" aria-label="Collapsed foundation guide"><button type="button" aria-expanded="false" aria-label="Expand foundation guide" onClick={() => onExpandedChange(true)}>›</button><span>Concept</span><span>Evidence</span><span>Roles</span></aside>;
  return <aside className="network-evidence-panel network-foundation-guide" aria-label="Networking Today guide">
    <header><div><span>Module 1 guide</span><strong>Read the network</strong></div><button type="button" aria-expanded="true" aria-label="Collapse foundation guide" onClick={() => onExpandedChange(false)}>‹</button></header>
    <NetworkFoundationConceptsView frame={frame}/>
    <NetworkFoundationEvidenceView frame={frame}/>
    <div className="network-foundation-legend"><span><i className="is-endpoint"/>End device</span><span><i className="is-intermediary"/>Intermediary</span><span><i className="is-wired"/>Wired media</span><span><i className="is-wireless"/>Wireless media</span></div>
  </aside>;
});

function NetworkFoundationPresetControls({ activity }) {
  const preset = activity.input.presets[0];
  return <div className="network-preset-control" aria-label="Classroom example"><span>Fixed classroom scenario</span><strong>{preset.label}</strong><em>Endpoints · intermediaries · media · LAN/WAN edge</em></div>;
}

BSITVisualizerRegistry.registerRenderer('network-foundations', NetworkFoundationsRenderer);
BSITVisualizerRegistry.registerEvidenceView('network-foundation-guide', NetworkFoundationEvidenceView, { label: 'Evidence', icon: 'list' });
BSITVisualizerRegistry.registerInputControls('network-foundation-preset', NetworkFoundationPresetControls);
