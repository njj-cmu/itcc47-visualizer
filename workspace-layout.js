(function (root) {
  'use strict';

  const VERSION = 1;
  const STORAGE_KEY = 'itcc45.workspace-layout:v1';
  const DEFAULT_SOURCE_RATIO = 0.4;
  const MIN_SOURCE_RATIO = 0.3;
  const MAX_SOURCE_RATIO = 0.65;

  function clampSourceRatio(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return DEFAULT_SOURCE_RATIO;
    return Math.min(MAX_SOURCE_RATIO, Math.max(MIN_SOURCE_RATIO, numeric));
  }

  function defaultEvidence(viewportWidth) {
    return Number(viewportWidth) >= 1440 ? 'expanded' : 'collapsed';
  }

  function defaults(viewportWidth) {
    return {
      version: VERSION,
      evidence: defaultEvidence(viewportWidth),
      sourceRatio: DEFAULT_SOURCE_RATIO,
    };
  }

  function normalize(value, viewportWidth) {
    const fallback = defaults(viewportWidth);
    if (!value || value.version !== VERSION) return fallback;
    return {
      version: VERSION,
      evidence: value.evidence === 'expanded' || value.evidence === 'collapsed'
        ? value.evidence : fallback.evidence,
      sourceRatio: clampSourceRatio(value.sourceRatio),
    };
  }

  function read(storage, viewportWidth) {
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY));
      return normalize(saved, viewportWidth);
    } catch {
      return defaults(viewportWidth);
    }
  }

  function write(storage, value, viewportWidth) {
    const next = normalize({ ...value, version: VERSION }, viewportWidth);
    try { storage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* in-memory layout still applies */ }
    return next;
  }

  root.ITCC45WorkspaceLayout = Object.freeze({
    VERSION,
    STORAGE_KEY,
    DEFAULT_SOURCE_RATIO,
    MIN_SOURCE_RATIO,
    MAX_SOURCE_RATIO,
    clampSourceRatio,
    defaultEvidence,
    defaults,
    normalize,
    read,
    write,
  });

  const ITCC47_STORAGE_KEY = 'itcc47.workspace-layout:v1';
  function itcc47Defaults() {
    return { version: VERSION, evidence: 'expanded' };
  }
  function normalizeITCC47(value) {
    const fallback = itcc47Defaults();
    if (!value || value.version !== VERSION) return fallback;
    return {
      version: VERSION,
      evidence: value.evidence === 'expanded' || value.evidence === 'collapsed'
        ? value.evidence : fallback.evidence,
    };
  }
  function readITCC47(storage) {
    try { return normalizeITCC47(JSON.parse(storage.getItem(ITCC47_STORAGE_KEY))); }
    catch { return itcc47Defaults(); }
  }
  function writeITCC47(storage, value) {
    const next = normalizeITCC47({ ...value, version: VERSION });
    try { storage.setItem(ITCC47_STORAGE_KEY, JSON.stringify(next)); } catch { /* in-memory layout still applies */ }
    return next;
  }

  root.ITCC47WorkspaceLayout = Object.freeze({
    VERSION,
    STORAGE_KEY: ITCC47_STORAGE_KEY,
    defaults: itcc47Defaults,
    normalize: normalizeITCC47,
    read: readITCC47,
    write: writeITCC47,
  });
})(typeof window !== 'undefined' ? window : globalThis);
