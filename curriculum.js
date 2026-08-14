/* Course-neutral release states over the generated ITCC47 curriculum payload. */
const ITCC47Curriculum = (() => {
  const SCHEMA_VERSION = 2;
  const PREVIEW_STORAGE_KEY = 'itcc47.release-preview:v1';
  const VALID_STATES = new Set(['available', 'current', 'locked', 'planned']);
  const data = ITCC47_CURRICULUM_DATA;
  const checkpoints = Object.freeze([...(data.checkpoints || [])]);
  const modules = Object.freeze([...(data.modules || [])]);
  const clos = Object.freeze([...(data.clos || [])]);
  const checkpointById = new Map(checkpoints.map((item) => [item.id, item]));
  const moduleById = new Map(modules.map((item) => [item.id, item]));
  const resourceByKey = new Map((data.resources || []).map((item) => [`${item.kind}:${item.id}`, Object.freeze({ ...item })]));

  function getCheckpoint(id) { return checkpointById.get(String(id || '')) || null; }
  function getModule(id) { return moduleById.get(String(id || '')) || null; }
  function getResource(kind, id) { return resourceByKey.get(`${kind}:${id}`) || null; }
  function listResources(kind) {
    const values = [...resourceByKey.values()];
    return Object.freeze(kind ? values.filter((item) => item.kind === kind) : values);
  }

  function validateProfile(profile) {
    return !!profile && profile.schemaVersion === SCHEMA_VERSION
      && typeof profile.profileId === 'string' && Number.isInteger(profile.profileVersion)
      && checkpointById.has(profile.currentCheckpointId);
  }

  function readPreview(storage = localStorage) {
    try {
      const value = JSON.parse(storage.getItem(PREVIEW_STORAGE_KEY) || 'null');
      if (!value || value.schemaVersion !== SCHEMA_VERSION
        || value.profileId !== ITCC47_RELEASE_PROFILE.profileId
        || value.profileVersion !== ITCC47_RELEASE_PROFILE.profileVersion
        || !checkpointById.has(value.currentCheckpointId)) return null;
      return value;
    } catch { return null; }
  }

  function writePreview(checkpointId, storage = localStorage) {
    if (!checkpointById.has(checkpointId)) return null;
    const value = Object.freeze({
      schemaVersion: SCHEMA_VERSION,
      profileId: ITCC47_RELEASE_PROFILE.profileId,
      profileVersion: ITCC47_RELEASE_PROFILE.profileVersion,
      currentCheckpointId: checkpointId,
    });
    try { storage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(value)); } catch { /* optional storage */ }
    return value;
  }

  function clearPreview(storage = localStorage) {
    try { storage.removeItem(PREVIEW_STORAGE_KEY); } catch { /* optional storage */ }
  }

  function isPreviewRequested(search = location.search) {
    return new URLSearchParams(search || '').get('preview') === '1';
  }

  function activeProfile(options = {}) {
    const base = validateProfile(ITCC47_RELEASE_PROFILE)
      ? ITCC47_RELEASE_PROFILE
      : { schemaVersion: SCHEMA_VERSION, profileId: 'safe-fallback', profileVersion: 1, currentCheckpointId: 'orientation' };
    if (!options.preview && !isPreviewRequested(options.search)) return Object.freeze({ ...base, preview: false });
    const preview = readPreview(options.storage);
    return Object.freeze({ ...base, currentCheckpointId: preview?.currentCheckpointId || base.currentCheckpointId, preview: true });
  }

  function stateForCheckpoint(checkpointId, options = {}) {
    const checkpoint = getCheckpoint(checkpointId);
    if (!checkpoint) return Object.freeze({ state: 'planned', checkpoint: null, current: getCheckpoint('orientation'), reason: 'Curriculum mapping is incomplete.' });
    const profile = activeProfile(options);
    const current = getCheckpoint(profile.currentCheckpointId) || getCheckpoint('orientation');
    if (checkpoint.reviewStatus === 'draft' && !profile.preview) {
      return Object.freeze({ state: 'locked', checkpoint, current, profile, reason: 'This checkpoint is still under curriculum review.' });
    }
    const state = checkpoint.order < current.order ? 'available' : checkpoint.order === current.order ? 'current' : 'locked';
    return Object.freeze({ state, checkpoint, current, profile, reason: state === 'locked' ? `Available after ${current.title}.` : '' });
  }

  function stateForResource(kind, id, options = {}) {
    const resource = getResource(kind, id);
    if (!resource) return Object.freeze({ state: 'planned', resource: null, checkpoint: null, reason: 'This resource is not mapped to the reviewed curriculum.' });
    if (resource.alwaysAvailable) {
      const profile = activeProfile(options); const checkpoint = getCheckpoint(resource.checkpointId);
      return Object.freeze({ state: 'available', resource, checkpoint, current: getCheckpoint(profile.currentCheckpointId), profile, reason: '' });
    }
    return Object.freeze({ ...stateForCheckpoint(resource.checkpointId, options), resource });
  }

  function isOpen(kind, id, options = {}) {
    const state = stateForResource(kind, id, options).state;
    return state === 'available' || state === 'current';
  }

  function resourcesForCheckpoint(checkpointId) {
    return Object.freeze(listResources().filter((resource) => resource.checkpointId === checkpointId));
  }

  function assertState(state) {
    if (!VALID_STATES.has(state)) throw new Error(`Unknown curriculum state: ${state}`);
    return state;
  }

  return Object.freeze({
    SCHEMA_VERSION, PREVIEW_STORAGE_KEY, data, clos, modules, checkpoints,
    getCheckpoint, getModule, getResource, listResources, resourcesForCheckpoint,
    validateProfile, readPreview, writePreview, clearPreview, isPreviewRequested,
    activeProfile, stateForCheckpoint, stateForResource, isOpen, assertState,
  });
})();

if (typeof BSITLearningLab !== 'undefined') BSITLearningLab.registerCurriculum('itcc47', ITCC47Curriculum);
