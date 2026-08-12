/*
 * Shared, framework-neutral timeline and playback controller.
 *
 * The controller treats an event's frame as opaque data. Sorting, tracing,
 * and future data-structure visualizers can therefore share playback without
 * coupling their renderers or domain models to the DOM.
 */
const ITCC47Playback = (() => {
  const STATES = new Set(['idle', 'paused', 'playing', 'complete']);

  function timelineEvent(spec) {
    if (!spec || !spec.id || !spec.domain || !spec.type) {
      throw new Error('Timeline events require id, domain, and type.');
    }
    return Object.freeze({
      id: String(spec.id),
      domain: String(spec.domain),
      type: String(spec.type),
      message: String(spec.message || ''),
      frame: spec.frame || {},
      metrics: Object.freeze({ ...(spec.metrics || {}) }),
      source: spec.source || null,
      segment: spec.segment || null,
      boundary: !!spec.boundary,
      terminal: !!spec.terminal,
    });
  }

  function createController(options = {}) {
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    const delayForSpeed = typeof options.delayForSpeed === 'function'
      ? options.delayForSpeed : (speed) => Math.max(50, 1100 - speed * 100);

    let events = [];
    let index = 0;
    let speed = Number(options.speed) || 6;
    let status = 'idle';
    let timer = null;
    let disposed = false;

    function snapshot() {
      return Object.freeze({
        status,
        index,
        total: events.length,
        speed,
        currentEvent: events[index] || null,
        atEnd: events.length === 0 || index >= events.length - 1,
      });
    }

    function emit() {
      if (!disposed) onChange(snapshot());
    }

    function clearTimer() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function setStatus(next) {
      if (!STATES.has(next)) throw new Error(`Unknown playback state: ${next}`);
      status = next;
    }

    function pause(shouldEmit = true) {
      clearTimer();
      if (events.length === 0) setStatus('idle');
      else if (index >= events.length - 1) setStatus('complete');
      else setStatus('paused');
      if (shouldEmit) emit();
    }

    function advance() {
      if (index < events.length - 1) index += 1;
      if (index >= events.length - 1) pause();
      else emit();
    }

    function schedule() {
      clearTimer();
      if (status !== 'playing' || disposed) return;
      timer = setTimeout(() => {
        timer = null;
        advance();
        if (status === 'playing') schedule();
      }, delayForSpeed(speed));
    }

    function load(nextEvents, startIndex = 0) {
      clearTimer();
      events = Array.isArray(nextEvents) ? [...nextEvents] : [];
      index = events.length ? Math.max(0, Math.min(events.length - 1, Number(startIndex) || 0)) : 0;
      setStatus(events.length ? (index === events.length - 1 ? 'complete' : 'paused') : 'idle');
      emit();
      return snapshot();
    }

    function play() {
      if (disposed || events.length === 0 || index >= events.length - 1) return snapshot();
      setStatus('playing');
      emit();
      schedule();
      return snapshot();
    }

    function toggle() {
      return status === 'playing' ? (pause(), snapshot()) : play();
    }

    function step(delta = 1) {
      pause(false);
      index = Math.max(0, Math.min(Math.max(events.length - 1, 0), index + Number(delta || 0)));
      setStatus(events.length === 0 ? 'idle' : (index >= events.length - 1 ? 'complete' : 'paused'));
      emit();
      return snapshot();
    }

    function seek(nextIndex) {
      pause(false);
      index = Math.max(0, Math.min(Math.max(events.length - 1, 0), Number(nextIndex) || 0));
      setStatus(events.length === 0 ? 'idle' : (index >= events.length - 1 ? 'complete' : 'paused'));
      emit();
      return snapshot();
    }

    function finishSegment() {
      pause(false);
      while (index < events.length - 1) {
        index += 1;
        if (events[index].boundary || events[index].terminal) break;
      }
      setStatus(events.length === 0 ? 'idle' : (index >= events.length - 1 ? 'complete' : 'paused'));
      emit();
      return snapshot();
    }

    function setSpeed(nextSpeed) {
      speed = Math.max(1, Math.min(10, Number(nextSpeed) || 1));
      if (status === 'playing') schedule();
      emit();
      return snapshot();
    }

    function dispose() {
      clearTimer();
      disposed = true;
      events = [];
      status = 'idle';
    }

    return { load, play, pause, toggle, step, seek, finishSegment, setSpeed, dispose, getState: snapshot };
  }

  return { timelineEvent, createController };
})();
