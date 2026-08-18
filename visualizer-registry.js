/* Framework-neutral registries for visualization domains and evidence views. */
const ITCC47VisualizerRegistry = (() => {
  const renderers = new Map();
  const evidenceViews = new Map();
  const inputControls = new Map();

  function registerRenderer(domain, renderer) {
    if (!domain || !renderer) throw new Error('Renderer registration requires a domain and renderer.');
    renderers.set(String(domain), { value: renderer, loader: null, promise: null });
  }

  function registerLazyRenderer(domain, loader) {
    if (!domain || typeof loader !== 'function') throw new Error('Lazy renderer registration requires a loader function.');
    renderers.set(String(domain), { value: null, loader, promise: null });
  }

  async function resolveRenderer(domain) {
    const entry = renderers.get(String(domain));
    if (!entry) return null;
    if (entry.value) return entry.value;
    if (!entry.promise) {
      entry.promise = Promise.resolve(entry.loader()).then((module) => {
        entry.value = module && module.default ? module.default : module;
        return entry.value;
      });
    }
    return entry.promise;
  }

  function registerEvidenceView(id, view, metadata = {}) {
    if (!id || !view) throw new Error('Evidence view registration requires an id and view.');
    evidenceViews.set(String(id), Object.freeze({
      id: String(id), view,
      label: String(metadata.label || id),
      icon: String(metadata.icon || 'more'),
    }));
  }

  function getEvidenceView(id) { return evidenceViews.get(String(id))?.view || null; }
  function getEvidenceDefinition(id) { return evidenceViews.get(String(id)) || null; }
  function registerInputControls(kind, component) {
    if (!kind || !component) throw new Error('Input-control registration requires a kind and component.');
    inputControls.set(String(kind), component);
  }
  function getInputControls(kind) { return inputControls.get(String(kind)) || null; }
  function rendererDomains() { return Object.freeze([...renderers.keys()]); }
  function evidenceIds() { return Object.freeze([...evidenceViews.keys()]); }
  function inputKinds() { return Object.freeze([...inputControls.keys()]); }

  return Object.freeze({ registerRenderer, registerLazyRenderer, resolveRenderer,
    registerEvidenceView, getEvidenceView, getEvidenceDefinition,
    registerInputControls, getInputControls, rendererDomains, evidenceIds, inputKinds });
})();

/* Course-neutral name with the ITCC47 global retained as a compatibility facade. */
const BSITVisualizerRegistry = ITCC47VisualizerRegistry;
