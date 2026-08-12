/* Deterministic practice-result contract. Identity and timestamps belong to a future hosted portal. */
const ITCC47Evaluation = (() => {
  const SCHEMA_VERSION = 1;
  const ENGINE_VERSION = 'foundation-1';

  function createResult(spec) {
    return Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      engineVersion: ENGINE_VERSION,
      activityId: String(spec.activityId),
      activityVersion: Number(spec.activityVersion) || 1,
      status: spec.status,
      passed: Number(spec.passed) || 0,
      total: Number(spec.total) || 0,
      cases: Object.freeze([...(spec.cases || [])]),
      diagnostics: Object.freeze([...(spec.diagnostics || [])]),
      outputs: Object.freeze([...(spec.outputs || [])]),
    });
  }

  return { SCHEMA_VERSION, ENGINE_VERSION, createResult };
})();
