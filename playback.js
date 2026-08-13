/*
 * Shared, framework-neutral timeline and playback controller.
 *
 * The controller treats an event's frame as opaque data. Sorting, tracing,
 * and future data-structure visualizers can therefore share playback without
 * coupling their renderers or domain models to the DOM.
 */
const ITCC47Playback = (() => {
  const EVENT_SCHEMA_VERSION = 2;
  const STATES = new Set(['idle', 'paused', 'playing', 'complete']);

  function deepFreeze(value, seen = new Set()) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value) || seen.has(value)) return value;
    seen.add(value);
    Reflect.ownKeys(value).forEach((key) => deepFreeze(value[key], seen));
    return Object.freeze(value);
  }

  function freezeFrame(frame) {
    if (!frame || typeof frame !== 'object') return Object.freeze({});
    return deepFreeze(frame);
  }

  function timelineEvent(spec) {
    if (!spec || !spec.id || !spec.domain || !spec.type) {
      throw new Error('Timeline events require id, domain, and type.');
    }
    return Object.freeze({
      schemaVersion: EVENT_SCHEMA_VERSION,
      id: String(spec.id),
      domain: String(spec.domain),
      type: String(spec.type),
      message: String(spec.message || ''),
      frame: freezeFrame({ ...(spec.frame || {}) }),
      metrics: deepFreeze({ ...(spec.metrics || {}) }),
      transition: spec.transition ? deepFreeze({ ...spec.transition }) : null,
      source: spec.source || null,
      segment: spec.segment || null,
      boundary: !!spec.boundary,
      terminal: !!spec.terminal,
    });
  }

  function createController(options = {}) {
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    const listeners = new Set();
    const delayForSpeed = typeof options.delayForSpeed === 'function'
      ? options.delayForSpeed : (speed) => Math.max(50, 1100 - speed * 100);

    let events = [];
    let index = 0;
    let speed = Number(options.speed) || 6;
    let status = 'idle';
    let timer = null;
    let disposed = false;
    let cachedSnapshot = null;
    let transitioning = false;
    let transitionToken = null;
    let transitionSerial = 0;
    let direction = 0;
    let navigationSource = 'load';

    function snapshot() {
      const next = {
        status,
        index,
        total: events.length,
        speed,
        currentEvent: events[index] || null,
        atEnd: events.length === 0 || index >= events.length - 1,
        transitioning,
        transitionToken,
        direction,
        navigationSource,
      };
      if (cachedSnapshot && Object.keys(next).every((key) => cachedSnapshot[key] === next[key])) return cachedSnapshot;
      cachedSnapshot = Object.freeze(next);
      return cachedSnapshot;
    }

    function emit() {
      if (disposed) return;
      const state = snapshot();
      onChange(state);
      listeners.forEach((listener) => listener(state));
    }

    function clearTimer() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    }

    function cancelTransition() {
      transitioning = false;
      transitionToken = null;
    }

    function beginTransition(event) {
      if (!event?.transition?.wait) return false;
      transitionSerial += 1;
      transitioning = true;
      transitionToken = `${event.id}:${transitionSerial}`;
      return true;
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

    function advance(source = 'play') {
      if (transitioning) return;
      const previous = index;
      if (index < events.length - 1) index += 1;
      direction = Math.sign(index - previous);
      navigationSource = source;
      const waiting = beginTransition(events[index]);
      if (index >= events.length - 1) pause();
      else emit();
      return waiting;
    }

    function schedule() {
      clearTimer();
      if (status !== 'playing' || disposed) return;
      timer = setTimeout(() => {
        timer = null;
        const waiting = advance('play');
        if (status === 'playing' && !waiting) schedule();
      }, delayForSpeed(speed));
    }

    function load(nextEvents, startIndex = 0) {
      clearTimer();
      cancelTransition();
      events = Array.isArray(nextEvents) ? [...nextEvents] : [];
      index = events.length ? Math.max(0, Math.min(events.length - 1, Number(startIndex) || 0)) : 0;
      direction = 0;
      navigationSource = 'load';
      setStatus(events.length ? (index === events.length - 1 ? 'complete' : 'paused') : 'idle');
      emit();
      return snapshot();
    }

    function play() {
      if (disposed || events.length === 0 || index >= events.length - 1) return snapshot();
      setStatus('playing');
      emit();
      if (!transitioning) schedule();
      return snapshot();
    }

    function toggle() {
      return status === 'playing' ? (pause(), snapshot()) : play();
    }

    function step(delta = 1) {
      if (transitioning) return snapshot();
      pause(false);
      const previous = index;
      index = Math.max(0, Math.min(Math.max(events.length - 1, 0), index + Number(delta || 0)));
      direction = Math.sign(index - previous);
      navigationSource = 'step';
      beginTransition(events[index]);
      setStatus(events.length === 0 ? 'idle' : (index >= events.length - 1 ? 'complete' : 'paused'));
      emit();
      return snapshot();
    }

    function seek(nextIndex) {
      pause(false);
      cancelTransition();
      const previous = index;
      index = Math.max(0, Math.min(Math.max(events.length - 1, 0), Number(nextIndex) || 0));
      direction = Math.sign(index - previous);
      navigationSource = 'seek';
      setStatus(events.length === 0 ? 'idle' : (index >= events.length - 1 ? 'complete' : 'paused'));
      emit();
      return snapshot();
    }

    function finishSegment() {
      if (transitioning) return snapshot();
      pause(false);
      const previous = index;
      while (index < events.length - 1) {
        index += 1;
        if (events[index].boundary || events[index].terminal) break;
      }
      direction = Math.sign(index - previous);
      navigationSource = 'segment';
      beginTransition(events[index]);
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

    function completeTransition(token) {
      if (!transitioning || token !== transitionToken) return snapshot();
      cancelTransition();
      emit();
      if (status === 'playing') schedule();
      return snapshot();
    }

    function dispose() {
      clearTimer();
      cancelTransition();
      disposed = true;
      events = [];
      status = 'idle';
      listeners.clear();
    }

    function subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    return { load, play, pause, toggle, step, seek, finishSegment, setSpeed, completeTransition, dispose,
      subscribe, getSnapshot: snapshot, getState: snapshot };
  }

  function runResult(spec = {}) {
    const events = Object.freeze([...(spec.events || [])]);
    const diagnostics = Object.freeze([...(spec.diagnostics || [])]);
    const capabilities = Object.freeze({
      visualize: events.some((event) => event.frame && event.frame.kind),
      trace: events.length > 0,
      variables: events.some((event) => event.frame && event.frame.vars),
      operations: events.some((event) => Object.keys(event.metrics || {}).length > 0),
      output: events.some((event) => event.frame && event.frame.outputValue !== undefined),
      ...(spec.capabilities || {}),
    });
    return Object.freeze({
      schemaVersion: 2,
      events,
      steps: events,
      outcome: spec.outcome || (diagnostics.length ? 'error' : 'complete'),
      diagnostics,
      capabilities,
      result: spec.result || null,
      truncated: !!spec.truncated,
      error: spec.error || null,
    });
  }

  return { EVENT_SCHEMA_VERSION, timelineEvent, createController, runResult, deepFreeze };
})();
