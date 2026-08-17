/* Build the file://-safe classic-script curriculum payload from the public JSON source. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const SOURCE = path.join(ROOT, 'curriculum.public.json');
const OUTPUT = path.join(ROOT, 'curriculum.data.js');
const PROFILE = path.join(ROOT, 'release-profile.js');
const PUBLIC_KINDS = new Set(['lesson', 'tool', 'activity', 'problem']);
const REVIEW_STATUSES = new Set(['reviewed', 'draft']);

function readReleaseProfile() {
  const context = vm.createContext({});
  vm.runInContext(`${fs.readFileSync(PROFILE, 'utf8')}\nthis.profile = ITCC47_RELEASE_PROFILE;`, context);
  return context.profile;
}

function validate(data) {
  const failures = [];
  if (data.schemaVersion !== 2 || data.courseId !== 'itcc47') failures.push('schemaVersion 2 and courseId itcc47 are required');
  const cloIds = new Set((data.clos || []).map((item) => item.id));
  if (cloIds.size !== 6 || [...cloIds].some((id) => !Number.isInteger(id))) failures.push('six unique numeric CLO definitions are required');
  const modules = new Map((data.modules || []).map((item) => [item.id, item]));
  for (const module of modules.values()) for (const cloId of module.cloIds || []) if (!cloIds.has(cloId)) failures.push(`${module.id}: unknown CLO ${cloId}`);
  const checkpoints = new Map();
  let lastOrder = -Infinity;
  for (const checkpoint of data.checkpoints || []) {
    if (!checkpoint.id || checkpoints.has(checkpoint.id)) failures.push(`duplicate or missing checkpoint: ${checkpoint.id || '(blank)'}`);
    if (!modules.has(checkpoint.moduleId)) failures.push(`${checkpoint.id}: unknown module ${checkpoint.moduleId}`);
    if (!REVIEW_STATUSES.has(checkpoint.reviewStatus)) failures.push(`${checkpoint.id}: reviewStatus must be reviewed or draft`);
    if (!Number.isFinite(checkpoint.order) || checkpoint.order <= lastOrder) failures.push(`${checkpoint.id}: checkpoint order must increase`);
    lastOrder = checkpoint.order;
    checkpoints.set(checkpoint.id, checkpoint);
  }
  for (const checkpoint of checkpoints.values()) {
    for (const prerequisite of checkpoint.prerequisiteIds || []) {
      const target = checkpoints.get(prerequisite);
      if (!target || target.order >= checkpoint.order) failures.push(`${checkpoint.id}: invalid prerequisite ${prerequisite}`);
    }
  }
  const resourceKeys = new Set();
  for (const resource of data.resources || []) {
    const key = `${resource.kind}:${resource.id}`;
    if (!resource.kind || !resource.id || resourceKeys.has(key)) failures.push(`duplicate or incomplete resource ${key}`);
    if (!PUBLIC_KINDS.has(resource.kind)) failures.push(`${key}: unsupported public resource kind`);
    if ('labRefs' in resource) failures.push(`${key}: labRefs are not part of the public practice catalog`);
    if (!checkpoints.has(resource.checkpointId)) failures.push(`${key}: unknown checkpoint ${resource.checkpointId}`);
    resourceKeys.add(key);
  }
  for (const checkpoint of checkpoints.values()) {
    for (const reference of checkpoint.sequence || []) {
      if (!resourceKeys.has(reference)) failures.push(`${checkpoint.id}: sequence references missing public resource ${reference}`);
    }
  }
  if (failures.length) throw new Error(`Curriculum validation failed:\n- ${failures.join('\n- ')}`);
  return {
    ...data,
    checkpoints: data.checkpoints.map((checkpoint) => ({ ...checkpoint })),
    resources: data.resources.map((resource) => ({
      ...resource,
      reviewStatus: checkpoints.get(resource.checkpointId).reviewStatus,
    })),
  };
}

function validateRelease(data, profile) {
  const failures = [];
  if (!profile || profile.schemaVersion !== 2 || profile.profileVersion !== 3) failures.push('release profile schemaVersion 2 and profileVersion 3 are required');
  if ('finalProjectId' in (profile || {})) failures.push('finalProjectId is not supported by the practice-only release profile');
  const checkpoints = new Map(data.checkpoints.map((item) => [item.id, item]));
  const current = checkpoints.get(profile?.currentCheckpointId);
  if (!current) failures.push(`release profile points to missing checkpoint ${profile?.currentCheckpointId || '(blank)'}`);
  if (current?.reviewStatus !== 'reviewed') failures.push(`release profile cannot advance to draft checkpoint ${current?.id}`);
  if (current) {
    for (const checkpoint of data.checkpoints.filter((item) => item.order <= current.order)) {
      if (checkpoint.reviewStatus !== 'reviewed') failures.push(`${checkpoint.id}: deployed checkpoint is not reviewed`);
      for (const resource of data.resources.filter((item) => item.checkpointId === checkpoint.id)) {
        if (resource.reviewStatus !== 'reviewed') failures.push(`${resource.kind}:${resource.id}: deployed public resource is not reviewed`);
      }
    }
  }
  if (failures.length) throw new Error(`Release readiness validation failed:\n- ${failures.join('\n- ')}`);
  return profile;
}

function build() {
  const data = validate(JSON.parse(fs.readFileSync(SOURCE, 'utf8')));
  validateRelease(data, readReleaseProfile());
  const banner = '/* GENERATED FILE — edit curriculum.public.json, then run node tools/build-curriculum.js. */';
  fs.writeFileSync(OUTPUT, `${banner}\nconst ITCC47_CURRICULUM_DATA = ${JSON.stringify(data, null, 2)};\n`, 'utf8');
  console.log(`Built curriculum.data.js (${data.checkpoints.length} checkpoints, ${data.resources.length} resources)`);
}

if (require.main === module) build();
module.exports = { validate, validateRelease, readReleaseProfile, build };
