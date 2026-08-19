(function (root) {
  'use strict';

  const VERSION = 1;
  const STORAGE_KEY = 'itcc45.workspace-layout:v1';
  const DEFAULT_SOURCE_RATIO = 0.4;
  const MIN_SOURCE_RATIO = 0.3;
  const MAX_SOURCE_RATIO = 0.65;

  function normalizeEvidence(value, fallback) {
    return value === 'expanded' || value === 'collapsed' ? value : fallback;
  }

  function readStored(storage, key, fallback, normalizeValue) {
    try { return normalizeValue(JSON.parse(storage.getItem(key))); }
    catch { return fallback(); }
  }

  function writeStored(storage, key, value) {
    try { storage.setItem(key, JSON.stringify(value)); } catch { /* in-memory layout still applies */ }
    return value;
  }

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
      evidence: normalizeEvidence(value.evidence, fallback.evidence),
      sourceRatio: clampSourceRatio(value.sourceRatio),
    };
  }

  function read(storage, viewportWidth) {
    return readStored(storage, STORAGE_KEY, () => defaults(viewportWidth), (value) => normalize(value, viewportWidth));
  }

  function write(storage, value, viewportWidth) {
    const next = normalize({ ...value, version: VERSION }, viewportWidth);
    return writeStored(storage, STORAGE_KEY, next);
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
      evidence: normalizeEvidence(value.evidence, fallback.evidence),
    };
  }
  function readITCC47(storage) {
    return readStored(storage, ITCC47_STORAGE_KEY, itcc47Defaults, normalizeITCC47);
  }
  function writeITCC47(storage, value) {
    const next = normalizeITCC47({ ...value, version: VERSION });
    return writeStored(storage, ITCC47_STORAGE_KEY, next);
  }

  root.ITCC47WorkspaceLayout = Object.freeze({
    VERSION,
    STORAGE_KEY: ITCC47_STORAGE_KEY,
    defaults: itcc47Defaults,
    normalize: normalizeITCC47,
    read: readITCC47,
    write: writeITCC47,
  });

  const COMPUTER_ARCHITECTURE_STORAGE_KEY = 'computer-architecture.workspace-layout:v1';
  function computerArchitectureDefaults() {
    return { version: VERSION, evidence: 'expanded' };
  }
  function normalizeComputerArchitecture(value) {
    const fallback = computerArchitectureDefaults();
    if (!value || value.version !== VERSION) return fallback;
    return { version: VERSION, evidence: normalizeEvidence(value.evidence, fallback.evidence) };
  }
  function readComputerArchitecture(storage) {
    return readStored(storage, COMPUTER_ARCHITECTURE_STORAGE_KEY, computerArchitectureDefaults, normalizeComputerArchitecture);
  }
  function writeComputerArchitecture(storage, value) {
    const next = normalizeComputerArchitecture({ ...value, version: VERSION });
    return writeStored(storage, COMPUTER_ARCHITECTURE_STORAGE_KEY, next);
  }

  root.ComputerArchitectureWorkspaceLayout = Object.freeze({
    VERSION,
    STORAGE_KEY: COMPUTER_ARCHITECTURE_STORAGE_KEY,
    defaults: computerArchitectureDefaults,
    normalize: normalizeComputerArchitecture,
    read: readComputerArchitecture,
    write: writeComputerArchitecture,
  });

  const COMPUTER_NETWORKING_STORAGE_KEY = 'computer-networking.workspace-layout:v1';
  function computerNetworkingDefaults() {
    return { version: VERSION, evidence: 'expanded' };
  }
  function normalizeComputerNetworking(value) {
    const fallback = computerNetworkingDefaults();
    if (!value || value.version !== VERSION) return fallback;
    return { version: VERSION, evidence: normalizeEvidence(value.evidence, fallback.evidence) };
  }
  function readComputerNetworking(storage) {
    return readStored(storage, COMPUTER_NETWORKING_STORAGE_KEY, computerNetworkingDefaults, normalizeComputerNetworking);
  }
  function writeComputerNetworking(storage, value) {
    const next = normalizeComputerNetworking({ ...value, version: VERSION });
    return writeStored(storage, COMPUTER_NETWORKING_STORAGE_KEY, next);
  }

  root.ComputerNetworkingWorkspaceLayout = Object.freeze({
    VERSION,
    STORAGE_KEY: COMPUTER_NETWORKING_STORAGE_KEY,
    defaults: computerNetworkingDefaults,
    normalize: normalizeComputerNetworking,
    read: readComputerNetworking,
    write: writeComputerNetworking,
  });
})(typeof window !== 'undefined' ? window : globalThis);
