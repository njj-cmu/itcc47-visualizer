/* Deterministic, offline Industry Data Workbench scenarios for Module 2. */
const ITCC47IndustryWorkbench = (() => {
  const SCHEMA_VERSION = 1;
  const CONTENT_VERSION = '2026.08-industry-workbench';
  const EXPERIENCE_ID = 'industry-data-workbench';
  const DATASET_ID = 'support-operations-v1';
  const DATASET_SEED = 0x5A172026;
  const CHECKPOINT_ID = 'm2-industry-workbench';
  const LENGTH = 12400;
  const PRIORITY_COUNTS = Object.freeze({ P1: 620, P2: 3100, P3: 4960, P4: 3720 });
  const PRIORITY_STARTS = Object.freeze({ P1: 0, P2: 620, P3: 3720, P4: 8680 });
  const PRIORITY_ENDS = Object.freeze({ P1: 619, P2: 3719, P3: 8679, P4: 12399 });
  const MANUAL_REVIEW_LENGTH = 2048;
  const CATEGORY = Object.freeze(['Network', 'Billing', 'Login', 'Device', 'Access', 'Other']);
  const STATUS = Object.freeze(['Open', 'Investigating', 'Waiting', 'Resolved']);
  const TIERS = Object.freeze(['Standard', 'Silver', 'Gold', 'Platinum']);
  const SLA_MINUTES = Object.freeze({ P1: 60, P2: 480, P3: 1440, P4: 2880 });

  let priorityEntities = null;
  let priorityRanks = null;
  const recordCache = new Map();

  function ensurePriorityMaps() {
    if (priorityEntities) return;
    // This is the stable result of grouping arrival-order identities by priority:
    // every priority band preserves the original entity order.
    priorityEntities = [
      ...Array.from({ length: 620 }, (_, index) => index),
      ...Array.from({ length: 3100 }, (_, index) => 4822 + index),
      ...Array.from({ length: 4202 }, (_, index) => 620 + index),
      ...Array.from({ length: 758 }, (_, index) => 7922 + index),
      ...Array.from({ length: 3720 }, (_, index) => 8680 + index),
    ];
    priorityRanks = new Array(LENGTH);
    priorityEntities.forEach((entityIndex, index) => { priorityRanks[entityIndex] = index; });
  }

  function priorityAtRank(rank) {
    if (rank <= PRIORITY_ENDS.P1) return 'P1';
    if (rank <= PRIORITY_ENDS.P2) return 'P2';
    if (rank <= PRIORITY_ENDS.P3) return 'P3';
    return 'P4';
  }

  function openedAtFor(entityIndex) {
    if (entityIndex === 4822) return '2026-08-18 09:14';
    const minutes = 8 * 60 + ((entityIndex * 7) % (36 * 60));
    const day = 18 + Math.floor(minutes / (24 * 60));
    const minuteOfDay = minutes % (24 * 60);
    const hour = Math.floor(minuteOfDay / 60);
    const minute = minuteOfDay % 60;
    return `2026-08-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  function recordForEntity(entityIndex) {
    if (!Number.isInteger(entityIndex) || entityIndex < 0 || entityIndex >= LENGTH) return null;
    if (recordCache.has(entityIndex)) return recordCache.get(entityIndex);
    ensurePriorityMaps();
    const mixed = (Math.imul(entityIndex + 1, 2654435761) + DATASET_SEED) >>> 0;
    const priority = priorityAtRank(priorityRanks[entityIndex]);
    const slaMinutes = SLA_MINUTES[priority];
    const ageMinutes = entityIndex < 27 ? Math.max(5, slaMinutes - 15 - entityIndex)
      : entityIndex === 27 ? slaMinutes + 35
        : 10 + (mixed % (slaMinutes * 2));
    const status = entityIndex === 27 ? 'Open' : STATUS[(mixed >>> 5) % STATUS.length];
    const record = Object.freeze({
      ticketId: `TCK-${String(entityIndex + 1).padStart(6, '0')}`,
      entityIndex,
      priority,
      openedAt: openedAtFor(entityIndex),
      category: entityIndex === 4822 ? 'Network' : CATEGORY[(mixed >>> 9) % CATEGORY.length],
      status: entityIndex === 4822 ? 'Open' : status,
      sla: slaMinutes >= 1440 ? `${slaMinutes / 1440}d` : slaMinutes >= 60 ? `${slaMinutes / 60}h` : `${slaMinutes}m`,
      slaMinutes,
      ageMinutes,
      customerTier: entityIndex === 4822 ? 'Gold' : TIERS[(mixed >>> 13) % TIERS.length],
      breached: status !== 'Resolved' && ageMinutes > slaMinutes,
    });
    recordCache.set(entityIndex, record);
    return record;
  }

  const viewSpecs = Object.freeze({
    arrival: Object.freeze({ id: 'arrival', label: 'Arrival-order view', length: LENGTH, sortedBy: null }),
    priority: Object.freeze({ id: 'priority', label: 'Priority-sorted view', length: LENGTH, sortedBy: 'priority, then arrival order' }),
    review: Object.freeze({ id: 'review', label: 'Manual-review view', length: MANUAL_REVIEW_LENGTH, sortedBy: null }),
  });

  function entityAt(viewId, index) {
    const view = viewSpecs[viewId];
    if (!view || !Number.isInteger(index) || index < 0 || index >= view.length) return null;
    if (viewId === 'arrival') return index;
    if (viewId === 'review') return (index * 37 + 11) % LENGTH;
    ensurePriorityMaps();
    return priorityEntities[index];
  }

  function recordAt(viewId, index) {
    const entityIndex = entityAt(viewId, index);
    return entityIndex == null ? null : recordForEntity(entityIndex);
  }

  const dataset = Object.freeze({
    id: DATASET_ID,
    seed: DATASET_SEED,
    title: 'Support Operations',
    description: '12,400 deterministic support tickets shared across arrival-order, priority-sorted, and manual-review views.',
    logicalLength: LENGTH,
    schema: Object.freeze(['ticketId', 'priority', 'openedAt', 'category', 'status', 'sla', 'customerTier']),
    views: viewSpecs,
    priorityCounts: PRIORITY_COUNTS,
    priorityStarts: PRIORITY_STARTS,
    priorityEnds: PRIORITY_ENDS,
    recordAt,
    recordForEntity,
  });

  function phase(labels, current) {
    return Object.freeze({
      index: current,
      total: labels.length,
      steps: Object.freeze(labels.map((label, index) => Object.freeze({
        id: `phase:${index + 1}`, label,
        state: index < current ? 'complete' : index === current ? 'current' : 'pending',
      }))),
    });
  }

  function gapToken(start, end, reason = 'Records compressed for scale') {
    return Object.freeze({ kind: 'gap', id: `gap:${start}:${end}`, start, end, count: end - start + 1, reason });
  }

  function tokensFor({ viewId, length = viewSpecs[viewId].length, keyField, indices, roles = {}, resolver = null, reason }) {
    const valid = [...new Set(indices.filter((index) => Number.isInteger(index) && index >= 0 && index < length))].sort((a, b) => a - b);
    const tokens = [];
    let cursor = 0;
    valid.forEach((index) => {
      if (index > cursor) tokens.push(gapToken(cursor, index - 1, reason));
      const resolved = resolver ? resolver(index) : { record: recordAt(viewId, index), sourceIndex: index };
      if (resolved?.kind === 'hole') {
        tokens.push(Object.freeze({ kind: 'hole', id: `hole:${index}`, index, label: resolved.label || 'open slot' }));
      } else if (resolved?.record) {
        tokens.push(Object.freeze({
          kind: 'record', id: `record:${index}:${resolved.record.ticketId}`, index,
          sourceIndex: resolved.sourceIndex, entityId: resolved.record.ticketId,
          key: resolved.record[keyField], record: resolved.record,
          role: roles[index] || 'default',
        }));
      }
      cursor = index + 1;
    });
    if (cursor < length) tokens.push(gapToken(cursor, length - 1, reason));
    return Object.freeze(tokens);
  }

  function discardedFor(length, activeRange) {
    if (!activeRange) return Object.freeze([[0, length - 1]]);
    const ranges = [];
    if (activeRange[0] > 0) ranges.push([0, activeRange[0] - 1]);
    if (activeRange[1] < length - 1) ranges.push([activeRange[1] + 1, length - 1]);
    return Object.freeze(ranges.map((range) => Object.freeze(range)));
  }

  function frame(spec) {
    return {
      kind: 'industry-dataset', datasetId: DATASET_ID, scenarioId: spec.scenarioId,
      logicalLength: spec.logicalLength, view: Object.freeze({ ...viewSpecs[spec.viewId], length: spec.logicalLength }),
      keyField: spec.keyField, phase: spec.phase, tokens: spec.tokens,
      pointers: Object.freeze([...(spec.pointers || [])].map((pointer) => Object.freeze({ ...pointer }))),
      activeRange: spec.activeRange ? Object.freeze([...spec.activeRange]) : null,
      discardedRanges: Object.freeze([...(spec.discardedRanges || [])].map((range) => Object.freeze([...range]))),
      scannedRange: spec.scannedRange ? Object.freeze([...spec.scannedRange]) : null,
      selectedRecord: spec.selectedRecord ? Object.freeze({ ...spec.selectedRecord }) : null,
      comparison: spec.comparison ? Object.freeze({ ...spec.comparison }) : null,
      facts: Object.freeze([...(spec.facts || [])].map((fact) => Object.freeze({ ...fact }))),
      held: Object.freeze([...(spec.held || [])].map((item) => Object.freeze({ ...item }))),
      transition: spec.transition ? Object.freeze({ ...spec.transition }) : null,
      operationSpan: spec.operationSpan ? Object.freeze({ ...spec.operationSpan }) : null,
      invariants: Object.freeze({ ...(spec.invariants || {}) }),
    };
  }

  function event(activityId, index, type, message, eventFrame, metrics, options = {}) {
    const frameMove = eventFrame.transition;
    const transition = options.transition || (frameMove ? {
      kind: 'shift', wait: true,
      moves: [{ entityId: frameMove.entityId, from: `index:${frameMove.from}`, to: `index:${frameMove.to}` }],
    } : null);
    return ITCC47Playback.timelineEvent({
      id: `${activityId}:${index}`, domain: 'industry-dataset', type, message,
      frame: eventFrame, metrics, boundary: !!options.boundary, terminal: !!options.terminal,
      transition, source: null,
    });
  }

  function activity(spec) {
    return Object.freeze({
      id: spec.id, contentVersion: CONTENT_VERSION, module: 2, topic: 'Industry Data Workbench', family: 'Industry Data Workbench',
      title: spec.title, subtitle: spec.subtitle, question: spec.question, algorithm: spec.algorithm,
      datasetView: spec.datasetView, previewIndices: Object.freeze([...(spec.previewIndices || [0, 1, 2])]),
      engine: 'curated-industry-dataset', renderer: 'industry-dataset', teachingVariant: spec.variant,
      experienceId: EXPERIENCE_ID, catalogPlacement: 'featured-workbench', workspaceMode: 'industry-dataset', datasetId: DATASET_ID,
      checkpointId: CHECKPOINT_ID, cloIds: Object.freeze([1, 2, 4, 5]), reviewStatus: 'reviewed',
      source: null, views: Object.freeze(['visualize']), evidenceViews: Object.freeze([]),
      input: Object.freeze({ kind: 'industry-dataset', editable: false, defaultValues: Object.freeze([]) }),
      metrics: Object.freeze(spec.metrics.map((metric) => Object.freeze({ ...metric }))),
      complexity: Object.freeze({ ...spec.complexity }), blurb: spec.subtitle,
      sourceFor() { return null; }, run: spec.run,
    });
  }

  const slaPhases = ['Define the SLA predicate', 'Scan arrival order', 'Confirm the first breach', 'Report the cost'];
  const slaBreachScan = activity({
    id: 'industry-sla-breach-scan', title: 'SLA Breach Scan',
    subtitle: 'Find the first open ticket whose age exceeds its SLA.',
    question: 'Which open ticket is the first to exceed its SLA?', algorithm: 'Linear search',
    datasetView: 'arrival', previewIndices: [0, 1, 2, 27, LENGTH - 1], variant: 'industry-linear-search',
    metrics: [{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }],
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    run() {
      const events = [];
      const id = this.id;
      const baseIndices = [0, 1, 2, 26, 27, 28, LENGTH - 1];
      const initialTokens = tokensFor({ viewId: 'arrival', keyField: 'status', indices: baseIndices });
      events.push(event(id, events.length, 'initialize', 'Define one precise breach predicate before scanning.', frame({
        scenarioId: id, logicalLength: LENGTH, viewId: 'arrival', keyField: 'status', phase: phase(slaPhases, 0), tokens: initialTokens,
        activeRange: [0, LENGTH - 1], pointers: [], facts: [{ label: 'predicate', value: 'status ≠ Resolved AND age > SLA', tone: 'secondary' }],
        invariants: { stableIds: true, arrivalOrder: true },
      }), { comparisons: 0 }, { boundary: true }));
      let found = null;
      for (let index = 0; index < LENGTH; index += 1) {
        const record = recordAt('arrival', index);
        const outcome = record.breached;
        const roles = { [index]: outcome ? 'found' : 'active' };
        const visible = [...baseIndices, index - 1, index, index + 1];
        const scannedRange = index > 0 ? [0, index - 1] : null;
        const eventFrame = frame({
          scenarioId: id, logicalLength: LENGTH, viewId: 'arrival', keyField: 'status', phase: phase(slaPhases, outcome ? 2 : 1),
          tokens: tokensFor({ viewId: 'arrival', keyField: 'status', indices: visible, roles }), pointers: [{ id: 'i', label: 'i', index, tone: 'primary' }],
          activeRange: [index, LENGTH - 1], scannedRange,
          selectedRecord: { index, entityId: record.ticketId },
          discardedRanges: [], comparison: { text: `${record.status} and ${record.ageMinutes}m > ${record.slaMinutes}m`, outcome },
          facts: [{ label: 'ticket', value: record.ticketId }, { label: 'comparisons', value: index + 1 }, { label: 'scanned', value: `${index + 1} of ${LENGTH}` }],
          invariants: { stableIds: true, firstMatchOnly: true, arrivalOrder: true },
        });
        events.push(event(id, events.length, 'comparison', outcome
          ? `${record.ticketId} is the first open ticket beyond its SLA.`
          : `${record.ticketId} does not breach the predicate; continue to the next arrival.`, eventFrame, { comparisons: index + 1 }, { boundary: outcome }));
        if (outcome) { found = { index, record }; break; }
      }
      const finalFrame = frame({
        scenarioId: id, logicalLength: LENGTH, viewId: 'arrival', keyField: 'status', phase: phase(slaPhases, 3),
        tokens: tokensFor({ viewId: 'arrival', keyField: 'status', indices: [...baseIndices, found.index], roles: { [found.index]: 'found' } }),
        pointers: [{ id: 'result', label: 'first breach', index: found.index, tone: 'success' }], activeRange: null,
        selectedRecord: { index: found.index, entityId: found.record.ticketId },
        facts: [{ label: 'result', value: found.record.ticketId, tone: 'success' }, { label: 'index', value: found.index }, { label: 'comparisons', value: found.index + 1 }],
        invariants: { stableIds: true, firstMatchOnly: true, arrivalOrder: true },
      });
      events.push(event(id, events.length, 'return', `Return ${found.record.ticketId} at arrival index ${found.index}.`, finalFrame, { comparisons: found.index + 1 }, { terminal: true, boundary: true }));
      return ITCC47Playback.runResult({ events, result: { index: found.index, ticketId: found.record.ticketId } });
    },
  });

  const rangePhases = ['Validate stable priority order', 'Find first P2', 'Find after-last P2', 'Report range'];
  const priorityRangeRecall = activity({
    id: 'industry-priority-range-recall', title: 'Priority Range Recall',
    subtitle: 'Find the complete P2 band in the stable priority-sorted view.',
    question: 'Where does the complete P2 priority band begin and end?', algorithm: 'Lower + upper bound',
    datasetView: 'priority', previewIndices: [0, 619, 620, 3719, 3720, LENGTH - 1], variant: 'industry-binary-range',
    metrics: [{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }],
    complexity: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
    run() {
      const events = [];
      const id = this.id;
      const base = [0, 1, 2, 617, 618, 619, 620, 621, 622, 3719, 3720, LENGTH - 1];
      const makeFrame = ({ currentPhase, low, high, mid = null, best = null, comparison = null, comparisons = 0, titleFact = null }) => {
        const activeRange = low <= high ? [low, high] : null;
        const roles = {};
        if (Number.isInteger(mid)) roles[mid] = 'inspected';
        if (Number.isInteger(best)) roles[best] = 'best';
        const pointers = [];
        if (activeRange) {
          pointers.push({ id: 'low', label: 'low', index: low, tone: 'primary' }, { id: 'high', label: 'high', index: high, tone: 'secondary' });
        }
        if (Number.isInteger(mid)) pointers.push({ id: 'mid', label: 'mid', index: mid, tone: 'minimum' });
        const facts = [{ label: 'best bound', value: Number.isInteger(best) ? best : 'not set' }, { label: 'remaining range', value: activeRange ? `${low} … ${high}` : 'empty' }, { label: 'comparisons', value: comparisons }];
        if (titleFact) facts.unshift(titleFact);
        return frame({
          scenarioId: id, logicalLength: LENGTH, viewId: 'priority', keyField: 'priority', phase: phase(rangePhases, currentPhase),
          tokens: tokensFor({ viewId: 'priority', keyField: 'priority', indices: [...base, low, high, mid, best], roles }), pointers,
          selectedRecord: Number.isInteger(mid) ? { index: mid, entityId: recordAt('priority', mid).ticketId } : null,
          activeRange, discardedRanges: discardedFor(LENGTH, activeRange), comparison, facts,
          invariants: { stableIds: true, sortedByPriority: true, p2Start: 620, p2End: 3719 },
        });
      };
      events.push(event(id, events.length, 'initialize', 'The view is stably sorted by priority while preserving arrival order inside each priority.', makeFrame({ currentPhase: 0, low: 0, high: LENGTH - 1 }), { comparisons: 0 }, { boundary: true }));
      let comparisons = 0;
      let low = 0; let high = LENGTH - 1; let first = null;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const record = recordAt('priority', mid);
        const outcome = Number(record.priority.slice(1)) >= 2;
        comparisons += 1;
        if (outcome) { first = mid; high = mid - 1; } else low = mid + 1;
        events.push(event(id, events.length, 'comparison', outcome
          ? `${record.priority} is at least P2; keep ${mid} as the best first index${low <= high ? ' and continue left.' : '. The remaining range is now empty.'}`
          : `${record.priority} comes before P2; discard the left half and continue right.`, makeFrame({
          currentPhase: 1, low, high, mid, best: first, comparisons,
          comparison: { text: `tickets[mid].priority >= P2`, outcome },
        }), { comparisons }, { boundary: true }));
      }
      events.push(event(id, events.length, 'loop-exit', `The first P2 ticket is fixed at index ${first}.`, makeFrame({
        currentPhase: 2, low: 0, high: LENGTH - 1, best: first, comparisons,
        titleFact: { label: 'first P2', value: first, tone: 'success' },
      }), { comparisons }, { boundary: true }));
      low = 0; high = LENGTH - 1; let last = null;
      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const record = recordAt('priority', mid);
        const outcome = Number(record.priority.slice(1)) <= 2;
        comparisons += 1;
        if (outcome) { last = mid; low = mid + 1; } else high = mid - 1;
        events.push(event(id, events.length, 'comparison', outcome
          ? `${record.priority} is at most P2; keep ${mid} as the best last index and continue right.`
          : `${record.priority} comes after P2; discard the right half and continue left.`, makeFrame({
          currentPhase: 2, low, high, mid, best: last, comparisons,
          comparison: { text: `tickets[mid].priority <= P2`, outcome },
          titleFact: { label: 'first P2', value: first, tone: 'success' },
        }), { comparisons }, { boundary: true }));
      }
      const finalTokens = tokensFor({ viewId: 'priority', keyField: 'priority', indices: base, roles: { [first]: 'found', [last]: 'found' } });
      const finalFrame = frame({
        scenarioId: id, logicalLength: LENGTH, viewId: 'priority', keyField: 'priority', phase: phase(rangePhases, 3), tokens: finalTokens,
        pointers: [{ id: 'first', label: 'first P2', index: first, tone: 'success' }, { id: 'last', label: 'last P2', index: last, tone: 'success' }],
        activeRange: [first, last], discardedRanges: [[0, first - 1], [last + 1, LENGTH - 1]],
        facts: [{ label: 'lower bound', value: first, tone: 'success' }, { label: 'upper bound', value: last + 1, tone: 'success' }, { label: 'P2 tickets', value: last - first + 1 }],
        invariants: { stableIds: true, sortedByPriority: true, p2Start: first, p2End: last },
      });
      events.push(event(id, events.length, 'return', `Return the half-open P2 range [${first}, ${last + 1}).`, finalFrame, { comparisons }, { terminal: true, boundary: true }));
      return ITCC47Playback.runResult({ events, result: { lower: first, upper: last + 1, count: last - first + 1 } });
    },
  });

  const newPriorityTicket = Object.freeze({
    ticketId: 'TCK-NEW-P2', entityIndex: null, priority: 'P2', openedAt: '2026-08-19 00:01',
    category: 'Network', status: 'Open', sla: '8h', slaMinutes: 480, ageMinutes: 0, customerTier: 'Gold', breached: false,
  });
  const insertionPhases = ['Hold the incoming ticket', 'Shift later priorities', 'Preserve equal-priority order', 'Write and verify'];

  function insertionResolver(hole, written) {
    return (index) => {
      if (written && index === 3720) return { record: newPriorityTicket, sourceIndex: null };
      if (!written && index === hole) return { kind: 'hole', label: 'open slot' };
      if (index > (written ? 3720 : hole)) return { record: recordAt('priority', index - 1), sourceIndex: index - 1 };
      return { record: recordAt('priority', index), sourceIndex: index };
    };
  }

  const stablePriorityDispatch = activity({
    id: 'industry-stable-priority-dispatch', title: 'Stable Priority Dispatch',
    subtitle: 'Insert one new P2 ticket without reordering existing P2 tickets.',
    question: 'Where can a new P2 ticket enter without reordering existing P2 tickets?', algorithm: 'Stable insertion',
    datasetView: 'priority', previewIndices: [619, 620, 3719, 3720, LENGTH - 1], variant: 'industry-stable-insertion',
    metrics: [{ key: 'comparisons', short: 'Cmp', label: 'Comparisons' }, { key: 'moves', short: 'Mov', label: 'Moves' }],
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    run() {
      const events = [];
      const id = this.id;
      const length = LENGTH + 1;
      const base = [0, 1, 2, 619, 620, 3719, 3720, 3721, 12398, 12399, 12400];
      const makeFrame = ({ currentPhase, hole = null, written = false, active = [], moves = 0, comparisons = 0, comparison = null, transition = null, operationSpan = null, held = true }) => {
        const roles = Object.fromEntries(active.map((index) => [index, 'active']));
        const indices = [...base, hole, ...(transition ? [transition.from, transition.to] : [])];
        return frame({
          scenarioId: id, logicalLength: length, viewId: 'priority', keyField: 'priority', phase: phase(insertionPhases, currentPhase),
          tokens: tokensFor({ viewId: 'priority', length, keyField: 'priority', indices, roles, resolver: insertionResolver(hole, written), reason: 'Unchanged records compressed for scale' }),
          pointers: Number.isInteger(hole) ? [{ id: 'hole', label: 'open slot', index: hole, tone: 'danger' }] : [], activeRange: [3720, 12400],
          discardedRanges: [], comparison, held: held ? [{ ...newPriorityTicket, label: 'incoming ticket' }] : [], transition, operationSpan,
          facts: [{ label: 'insert index', value: 3720 }, { label: 'moves', value: moves }, { label: 'stable P2 order', value: 'preserved', tone: 'success' }],
          invariants: { stableIds: true, equalPriorityOrder: true, contiguous: written, uniqueIds: true },
        });
      };
      events.push(event(id, events.length, 'initialize', 'Hold the incoming P2 ticket outside the priority-sorted view.', makeFrame({ currentPhase: 0, hole: 12400 }), { comparisons: 0, moves: 0 }, { boundary: true }));
      events.push(event(id, events.length, 'comparison', 'The final P4 ticket is greater than P2, so it must shift right.', makeFrame({
        currentPhase: 1, hole: 12400, active: [12399], comparison: { text: 'P4 > P2', outcome: true }, comparisons: 1,
      }), { comparisons: 1, moves: 0 }));
      events.push(event(id, events.length, 'mutation', 'Shift the last record from 12,399 to 12,400.', makeFrame({
        currentPhase: 1, hole: 12399, active: [12399, 12400], moves: 1, comparisons: 1, transition: { from: 12399, to: 12400, entityId: recordAt('priority', 12399).ticketId },
      }), { comparisons: 1, moves: 1 }));
      events.push(event(id, events.length, 'compressed-mutation', 'Apply the same right-shift to source indexes 3,721 through 12,398.', makeFrame({
        currentPhase: 1, hole: 3721, active: [3721, 12399], moves: 8679, comparisons: 1,
        operationSpan: { start: 3721, end: 12398, count: 8678, reason: 'Each record moves exactly one slot right.' },
      }), { comparisons: 1, moves: 8679 }, { boundary: true }));
      events.push(event(id, events.length, 'mutation', 'Shift source index 3,720 to 3,721, leaving the insertion slot open.', makeFrame({
        currentPhase: 2, hole: 3720, active: [3720, 3721], moves: 8680, comparisons: 1, transition: { from: 3720, to: 3721, entityId: recordAt('priority', 3720).ticketId },
      }), { comparisons: 1, moves: 8680 }));
      events.push(event(id, events.length, 'comparison', 'The previous record is also P2, so the strict greater-than condition is false and it stays before the new ticket.', makeFrame({
        currentPhase: 2, hole: 3720, active: [3719, 3720], moves: 8680, comparisons: 2, comparison: { text: 'P2 > P2', outcome: false },
      }), { comparisons: 2, moves: 8680 }, { boundary: true }));
      events.push(event(id, events.length, 'mutation', 'Write the held P2 ticket into index 3,720.', makeFrame({
        currentPhase: 3, written: true, active: [3720], moves: 8680, comparisons: 2, held: false,
      }), { comparisons: 2, moves: 8680 }));
      events.push(event(id, events.length, 'return', 'The new ticket follows every existing P2 ticket and the view remains sorted.', makeFrame({
        currentPhase: 3, written: true, active: [3719, 3720, 3721], moves: 8680, comparisons: 2, held: false,
      }), { comparisons: 2, moves: 8680 }, { terminal: true, boundary: true }));
      return ITCC47Playback.runResult({ events, result: { index: 3720, moves: 8680, ticketId: newPriorityTicket.ticketId } });
    },
  });

  const reviewTicket = Object.freeze({
    ticketId: 'TCK-NEW-RVW', entityIndex: null, priority: 'P2', openedAt: '2026-08-19 00:05',
    category: 'Access', status: 'Investigating', sla: '8h', slaMinutes: 480, ageMinutes: 5, customerTier: 'Platinum', breached: false,
  });
  const mutationPhases = ['Prepare indexed insertion', 'Shift right and write', 'Remove and close the hole', 'Verify contiguous storage'];

  function postInsertRecord(index) {
    if (index === 640) return reviewTicket;
    return recordAt('review', index > 640 ? index - 1 : index);
  }

  function reviewInsertResolver(hole, written) {
    return (index) => {
      if (written) return { record: postInsertRecord(index), sourceIndex: index === 640 ? null : index > 640 ? index - 1 : index };
      if (index === hole) return { kind: 'hole', label: 'open slot' };
      if (index > hole) return { record: recordAt('review', index - 1), sourceIndex: index - 1 };
      return { record: recordAt('review', index), sourceIndex: index };
    };
  }

  function reviewRemoveResolver(hole, shrunk) {
    return (index) => {
      if (!shrunk && index === hole) return { kind: 'hole', label: 'open slot' };
      const source = index >= 1520 && (shrunk || index < hole) ? index + 1 : index;
      return { record: postInsertRecord(source), sourceIndex: source };
    };
  }

  const reviewQueueMutation = activity({
    id: 'industry-review-queue-mutation', title: 'Review Queue Mutation',
    subtitle: 'Insert and remove tickets at target indexes while keeping storage contiguous.',
    question: 'What shifts when a ticket enters or leaves a target index?', algorithm: 'Indexed mutation',
    datasetView: 'review', previewIndices: [0, 1, 2, 640, 1520, MANUAL_REVIEW_LENGTH - 1], variant: 'industry-indexed-mutation',
    metrics: [{ key: 'moves', short: 'Mov', label: 'Moves' }, { key: 'writes', short: 'Wrt', label: 'Writes' }],
    complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
    run() {
      const events = [];
      const id = this.id;
      const insertedLength = MANUAL_REVIEW_LENGTH + 1;
      const base = [0, 1, 2, 639, 640, 641, 1519, 1520, 1521, 2047, 2048];
      const makeFrame = ({ currentPhase, length = insertedLength, mode = 'insert', hole = null, written = false, shrunk = false, active = [], moves = 0, writes = 0, transition = null, operationSpan = null, held = [] }) => {
        const resolver = mode === 'insert' ? reviewInsertResolver(hole, written) : reviewRemoveResolver(hole, shrunk);
        const roles = Object.fromEntries(active.map((index) => [index, 'active']));
        const indices = [...base, hole, ...(transition ? [transition.from, transition.to] : [])];
        return frame({
          scenarioId: id, logicalLength: length, viewId: 'review', keyField: 'priority', phase: phase(mutationPhases, currentPhase),
          tokens: tokensFor({ viewId: 'review', length, keyField: 'priority', indices, roles, resolver, reason: 'Unchanged queue positions compressed for scale' }),
          pointers: Number.isInteger(hole) ? [{ id: 'hole', label: 'open slot', index: hole, tone: 'danger' }] : [], activeRange: null,
          discardedRanges: [], held, transition, operationSpan,
          facts: [{ label: 'insert index', value: 640 }, { label: 'remove index', value: 1520 }, { label: 'moves', value: moves }, { label: 'writes', value: writes }],
          invariants: { stableIds: true, contiguous: (written && mode === 'insert') || shrunk, uniqueIds: true, size: length },
        });
      };
      events.push(event(id, events.length, 'initialize', 'Hold the incoming review ticket and grow the logical size by one.', makeFrame({
        currentPhase: 0, hole: 2048, held: [{ ...reviewTicket, label: 'ticket to insert' }],
      }), { moves: 0, writes: 0 }, { boundary: true }));
      events.push(event(id, events.length, 'mutation', 'Shift source index 2,047 into the new final slot.', makeFrame({
        currentPhase: 1, hole: 2047, active: [2047, 2048], moves: 1, transition: { from: 2047, to: 2048, entityId: recordAt('review', 2047).ticketId }, held: [{ ...reviewTicket, label: 'ticket to insert' }],
      }), { moves: 1, writes: 1 }));
      events.push(event(id, events.length, 'compressed-mutation', 'Apply the same right-shift to source indexes 641 through 2,046.', makeFrame({
        currentPhase: 1, hole: 641, active: [641, 2047], moves: 1407, writes: 1407,
        operationSpan: { start: 641, end: 2046, count: 1406, reason: 'Each existing review ticket moves exactly one slot right.' },
        held: [{ ...reviewTicket, label: 'ticket to insert' }],
      }), { moves: 1407, writes: 1407 }, { boundary: true }));
      events.push(event(id, events.length, 'mutation', 'Shift source index 640 to 641, leaving index 640 open.', makeFrame({
        currentPhase: 1, hole: 640, active: [640, 641], moves: 1408, writes: 1408,
        transition: { from: 640, to: 641, entityId: recordAt('review', 640).ticketId }, held: [{ ...reviewTicket, label: 'ticket to insert' }],
      }), { moves: 1408, writes: 1408 }));
      events.push(event(id, events.length, 'mutation', 'Write the held ticket into review index 640.', makeFrame({
        currentPhase: 1, written: true, active: [640], moves: 1408, writes: 1409,
      }), { moves: 1408, writes: 1409 }, { boundary: true }));
      const removedRecord = postInsertRecord(1520);
      events.push(event(id, events.length, 'mutation', `Hold ${removedRecord.ticketId} outside the queue, leaving a hole at index 1,520.`, makeFrame({
        currentPhase: 2, mode: 'remove', hole: 1520, active: [1520], moves: 1408, writes: 1409,
        held: [{ ...removedRecord, label: 'removed ticket' }],
      }), { moves: 1408, writes: 1409 }));
      events.push(event(id, events.length, 'mutation', 'Move source index 1,521 left into the hole.', makeFrame({
        currentPhase: 2, mode: 'remove', hole: 1521, active: [1520, 1521], moves: 1409, writes: 1410,
        transition: { from: 1521, to: 1520, entityId: postInsertRecord(1521).ticketId }, held: [{ ...removedRecord, label: 'removed ticket' }],
      }), { moves: 1409, writes: 1410 }));
      events.push(event(id, events.length, 'compressed-mutation', 'Apply the same left-shift to source indexes 1,522 through 2,047.', makeFrame({
        currentPhase: 2, mode: 'remove', hole: 2047, active: [1521, 2047], moves: 1935, writes: 1936,
        operationSpan: { start: 1522, end: 2047, count: 526, reason: 'Each later review ticket moves exactly one slot left.' },
        held: [{ ...removedRecord, label: 'removed ticket' }],
      }), { moves: 1935, writes: 1936 }, { boundary: true }));
      events.push(event(id, events.length, 'mutation', 'Move source index 2,048 left, then shrink away the final hole.', makeFrame({
        currentPhase: 2, mode: 'remove', hole: 2048, active: [2047, 2048], moves: 1936, writes: 1937,
        transition: { from: 2048, to: 2047, entityId: postInsertRecord(2048).ticketId }, held: [{ ...removedRecord, label: 'removed ticket' }],
      }), { moves: 1936, writes: 1937 }));
      events.push(event(id, events.length, 'return', 'The review queue is contiguous again with the original logical size.', makeFrame({
        currentPhase: 3, length: MANUAL_REVIEW_LENGTH, mode: 'remove', shrunk: true, active: [640, 1520, 2047], moves: 1936, writes: 1937,
        held: [{ ...removedRecord, label: 'removed ticket' }],
      }), { moves: 1936, writes: 1937 }, { terminal: true, boundary: true }));
      return ITCC47Playback.runResult({ events, result: {
        insertedIndex: 640, removedIndex: 1520, insertMoves: 1408, removalMoves: 528,
        totalMoves: 1936, insertedTicketId: reviewTicket.ticketId, removedTicketId: removedRecord.ticketId,
      } });
    },
  });

  const scenarios = Object.freeze([slaBreachScan, priorityRangeRecall, stablePriorityDispatch, reviewQueueMutation]);
  const byId = new Map(scenarios.map((scenario) => [scenario.id, scenario]));
  function getScenario(id) { return byId.get(id) || null; }
  function listScenarios() { return Object.freeze([...scenarios]); }

  if (typeof ITCC47Activities !== 'undefined') scenarios.forEach((scenario) => ITCC47Activities.register(scenario));

  return Object.freeze({
    SCHEMA_VERSION, CONTENT_VERSION, EXPERIENCE_ID, DATASET_ID, CHECKPOINT_ID,
    dataset, getScenario, listScenarios,
  });
})();
