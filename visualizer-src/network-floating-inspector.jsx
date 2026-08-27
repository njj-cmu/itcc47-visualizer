import React, { memo, useEffect, useRef, useState } from 'react';
import { ArpTableView, MacTableView, NetworkPacketInspector } from './network-topology.jsx';

const EDGE_INSET = 10;
const KEYBOARD_STEP = 18;
const MINIMUM_WIDTH = 340;
const MINIMUM_HEIGHT = 260;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

export const NetworkFloatingPacketInspector = memo(function NetworkFloatingPacketInspector({ boundaryRef, frame }) {
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const [position, setPosition] = useState(null);
  const [tab, setTab] = useState('packet');

  useEffect(() => {
    function movePanel(event) {
      const drag = dragRef.current;
      const boundary = boundaryRef.current;
      const panel = panelRef.current;
      if (!drag || drag.pointerId !== event.pointerId || !boundary || !panel) return;
      const boundaryBox = boundary.getBoundingClientRect();
      const maximumX = Math.max(EDGE_INSET, boundary.clientWidth - panel.offsetWidth - EDGE_INSET);
      const maximumY = Math.max(EDGE_INSET, boundary.clientHeight - panel.offsetHeight - EDGE_INSET);
      setPosition({
        x: clamp(event.clientX - boundaryBox.left - drag.offsetX, EDGE_INSET, maximumX),
        y: clamp(event.clientY - boundaryBox.top - drag.offsetY, EDGE_INSET, maximumY),
      });
    }
    function stopMoving(event) {
      if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
    }
    window.addEventListener('pointermove', movePanel);
    window.addEventListener('pointerup', stopMoving);
    window.addEventListener('pointercancel', stopMoving);
    const resizeObserver = window.ResizeObserver && panelRef.current ? new ResizeObserver(() => {
      setPosition((current) => {
        const boundary = boundaryRef.current;
        const panel = panelRef.current;
        if (!current || !boundary || !panel) return current;
        return {
          x: clamp(current.x, EDGE_INSET, Math.max(EDGE_INSET, boundary.clientWidth - panel.offsetWidth - EDGE_INSET)),
          y: clamp(current.y, EDGE_INSET, Math.max(EDGE_INSET, boundary.clientHeight - panel.offsetHeight - EDGE_INSET)),
        };
      });
    }) : null;
    resizeObserver?.observe(panelRef.current);
    return () => {
      window.removeEventListener('pointermove', movePanel);
      window.removeEventListener('pointerup', stopMoving);
      window.removeEventListener('pointercancel', stopMoving);
      resizeObserver?.disconnect();
    };
  }, [boundaryRef]);

  function clampPosition(x, y) {
    const boundary = boundaryRef.current;
    const panel = panelRef.current;
    if (!boundary || !panel) return { x, y };
    const maximumX = Math.max(EDGE_INSET, boundary.clientWidth - panel.offsetWidth - EDGE_INSET);
    const maximumY = Math.max(EDGE_INSET, boundary.clientHeight - panel.offsetHeight - EDGE_INSET);
    return { x: clamp(x, EDGE_INSET, maximumX), y: clamp(y, EDGE_INSET, maximumY) };
  }

  function beginDrag(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    const panel = panelRef.current;
    const boundary = boundaryRef.current;
    if (!panel || !boundary) return;
    const panelBox = panel.getBoundingClientRect();
    dragRef.current = { pointerId: event.pointerId, offsetX: event.clientX - panelBox.left, offsetY: event.clientY - panelBox.top };
    event.currentTarget.setPointerCapture(event.pointerId);
    setPosition({ x: panel.offsetLeft, y: panel.offsetTop });
  }

  function endDrag(event) {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  function moveWithKeyboard(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') { resetWindow(); return; }
    const panel = panelRef.current;
    const boundary = boundaryRef.current;
    if (event.shiftKey && panel && boundary) {
      const widthDelta = event.key === 'ArrowLeft' ? -KEYBOARD_STEP : event.key === 'ArrowRight' ? KEYBOARD_STEP : 0;
      const heightDelta = event.key === 'ArrowUp' ? -KEYBOARD_STEP : event.key === 'ArrowDown' ? KEYBOARD_STEP : 0;
      const panelX = position?.x ?? panel.offsetLeft;
      const panelY = position?.y ?? panel.offsetTop;
      panel.style.width = `${clamp(panel.offsetWidth + widthDelta, MINIMUM_WIDTH, boundary.clientWidth - panelX - EDGE_INSET)}px`;
      panel.style.height = `${clamp(panel.offsetHeight + heightDelta, MINIMUM_HEIGHT, boundary.clientHeight - panelY - EDGE_INSET)}px`;
      return;
    }
    const current = position || { x: panel?.offsetLeft || EDGE_INSET, y: panel?.offsetTop || EDGE_INSET };
    const deltaX = event.key === 'ArrowLeft' ? -KEYBOARD_STEP : event.key === 'ArrowRight' ? KEYBOARD_STEP : 0;
    const deltaY = event.key === 'ArrowUp' ? -KEYBOARD_STEP : event.key === 'ArrowDown' ? KEYBOARD_STEP : 0;
    setPosition(clampPosition(current.x + deltaX, current.y + deltaY));
  }

  function resetWindow() {
    setPosition(null);
    panelRef.current?.style.removeProperty('width');
    panelRef.current?.style.removeProperty('height');
  }

  return <aside ref={panelRef} className="network-floating-packet" data-floating-packet-inspector="true" data-position-mode={position ? 'custom' : 'default'} data-min-width={MINIMUM_WIDTH} data-min-height={MINIMUM_HEIGHT} style={position ? { left: `${position.x}px`, top: `${position.y}px`, right: 'auto', bottom: 'auto' } : undefined}>
    <div className="network-floating-packet-handle" tabIndex="0" role="group" aria-label="Move or resize packet inspector. Arrow keys move, Shift plus arrow keys resize, and Home resets." onPointerDown={beginDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={moveWithKeyboard}>
      <span aria-hidden="true">⠿</span><strong>Packet inspector</strong><small>Drag header · resize corner</small>
      <button type="button" onClick={resetWindow}>Reset window</button>
    </div>
    <div className="network-floating-inspector-tabs" role="tablist" aria-label="Inspector view">
      <button type="button" role="tab" aria-selected={tab === 'packet'} onClick={() => setTab('packet')}>Packet</button>
      <button type="button" role="tab" aria-selected={tab === 'arp'} onClick={() => setTab('arp')}>ARP table</button>
      <button type="button" role="tab" aria-selected={tab === 'mac'} onClick={() => setTab('mac')}>MAC table</button>
    </div>
    <div className="network-floating-packet-body">{tab === 'packet' ? <NetworkPacketInspector frame={frame}/> : tab === 'arp' ? <ArpTableView frame={frame}/> : <MacTableView frame={frame}/>}</div>
  </aside>;
});
