/* Optional, browser-local progress for focused ITCC47 visualizations. */
const ITCC47VisualizerProgress = (() => {
  const SCHEMA_VERSION = 1;
  const STORAGE_KEY = 'itcc47.visualizer-progress:v1';

  function empty() {
    return { schemaVersion: SCHEMA_VERSION, activities: {} };
  }

  function validTimestamp(value) {
    return typeof value === 'string' && Number.isFinite(Date.parse(value));
  }

  function read(storage = localStorage) {
    try {
      const stored = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      if (!stored || stored.schemaVersion !== SCHEMA_VERSION || !stored.activities || typeof stored.activities !== 'object') return empty();
      const activities = {};
      Object.entries(stored.activities).forEach(([activityId, record]) => {
        if (!activityId || !record || !validTimestamp(record.lastVisitedAt)) return;
        activities[activityId] = {
          lastVisitedAt: record.lastVisitedAt,
          ...(validTimestamp(record.reviewedAt) ? { reviewedAt: record.reviewedAt } : {}),
        };
      });
      return { schemaVersion: SCHEMA_VERSION, activities };
    } catch { return empty(); }
  }

  function timestamp(value) {
    const date = value instanceof Date ? value : new Date(value ?? Date.now());
    return Number.isFinite(date.getTime()) ? date.toISOString() : new Date().toISOString();
  }

  function write(data, storage = localStorage) {
    try { storage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* Progress is optional. */ }
    return data;
  }

  function markVisited(activityId, options = {}) {
    const id = String(activityId || '').trim();
    if (!id) return null;
    const storage = options.storage || localStorage;
    const data = read(storage);
    const previous = data.activities[id] || {};
    data.activities[id] = {
      lastVisitedAt: timestamp(options.now),
      ...(previous.reviewedAt ? { reviewedAt: previous.reviewedAt } : {}),
    };
    write(data, storage);
    return { ...data.activities[id] };
  }

  function markReviewed(activityId, options = {}) {
    const id = String(activityId || '').trim();
    if (!id) return null;
    const storage = options.storage || localStorage;
    const data = read(storage);
    const at = timestamp(options.now);
    data.activities[id] = { lastVisitedAt: at, reviewedAt: at };
    write(data, storage);
    return { ...data.activities[id] };
  }

  function get(activityId, storage = localStorage) {
    const record = read(storage).activities[String(activityId || '')];
    return record ? { ...record } : null;
  }

  function summary(activityIds, storage = localStorage) {
    const data = read(storage);
    const ids = [...new Set((activityIds || []).map(String))];
    let visited = 0;
    let reviewed = 0;
    ids.forEach((id) => {
      const record = data.activities[id];
      if (!record) return;
      visited += 1;
      if (record.reviewedAt) reviewed += 1;
    });
    return Object.freeze({ total: ids.length, visited, reviewed });
  }

  function formatDate(value) {
    if (!validTimestamp(value)) return '';
    const date = new Date(value);
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  }

  return Object.freeze({ SCHEMA_VERSION, STORAGE_KEY, read, get, markVisited, markReviewed, summary, formatDate });
})();
