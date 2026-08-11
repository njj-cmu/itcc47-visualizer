/*
 * Static checks for plain-language algorithms, organised around the five
 * characteristics from Topic 01: Clear, Complete, Finite, Correct, Ordered.
 *
 * These are heuristics over natural language, not proofs. The structural
 * checks (does every branch reach an output, is a block empty) are reliable;
 * the wording checks are prompts for the writer to look again. Correctness
 * is deliberately not checked here — that is what tracing is for.
 */

// ---------- step classification ----------

const RE_DECISION = /^\s*(if|otherwise|else|when|in case)\b/i;
const RE_LOOP = /^\s*(for each|for every|for all|repeat|while|loop|do the following|keep)\b/i;
const RE_INPUT = /^\s*(read|get|receive|ask|input|obtain|accept|prompt)\b/i;
const RE_OUTPUT_START = /^\s*(display|show|print|output|write|report)\b/i;
const RE_OUTPUT_ANY = /\b(display|displays|show|shows|print|prints|output|outputs|write|writes)\b/i;
const RE_TERMINAL = /\b(stop|halt|terminate|do not proceed|end the (program|algorithm)|exit the (program|algorithm))\b/i;

function detectType(text) {
  const t = text.trim();
  if (!t) return 'empty';
  if (RE_DECISION.test(t)) return 'decision';
  if (RE_LOOP.test(t)) return 'loop';
  if (RE_INPUT.test(t)) return 'input';
  if (RE_OUTPUT_START.test(t)) return 'output';
  if (RE_TERMINAL.test(t)) return 'terminal';
  return 'action';
}

/** "Otherwise, if X" continues a decision group; "Otherwise:" closes it. */
function isBranchContinuation(text) {
  return /^\s*(otherwise|else)\b/i.test(text.trim());
}

function isCatchAll(text) {
  const t = text.trim();
  if (!/^\s*(otherwise|else)\b/i.test(t)) return false;
  const rest = t.replace(/^\s*(otherwise|else)\b/i, '').replace(/^[\s,:.]+/, '');
  return !/^(if|when)\b/i.test(rest);
}

// ---------- tree ----------

function buildTree(steps) {
  const root = { level: -1, children: [], text: '', type: 'root' };
  const stack = [root];
  steps.forEach((s, index) => {
    const node = {
      index,
      text: s.text,
      level: s.level,
      type: detectType(s.text),
      children: [],
    };
    node.inlineOutput = node.type === 'output' || RE_OUTPUT_ANY.test(node.text);
    node.inlineTerminal = RE_TERMINAL.test(node.text);
    while (stack.length > 1 && stack[stack.length - 1].level >= node.level) stack.pop();
    stack[stack.length - 1].children.push(node);
    stack.push(node);
  });
  return root;
}

// ---------- path analysis ----------
// walk() answers: along every path, does the algorithm reach an output or a
// deliberate stop? Path state is just "has output happened yet", so memoising
// on (list, index, produced) keeps this linear instead of exponential.

function makeWalker() {
  const listIds = new Map();
  let nextId = 0;
  const memo = new Map();

  function idOf(list) {
    if (!listIds.has(list)) listIds.set(list, nextId++);
    return listIds.get(list);
  }

  function walk(nodes, i, produced) {
    const key = `${idOf(nodes)}:${i}:${produced ? 1 : 0}`;
    if (memo.has(key)) return memo.get(key);
    memo.set(key, { ok: true, exits: new Set() }); // cycle guard

    const result = compute(nodes, i, produced);
    memo.set(key, result);
    return result;
  }

  function compute(nodes, i, produced) {
    if (i >= nodes.length) return { ok: true, exits: new Set([produced]) };

    const node = nodes[i];

    if (node.type === 'terminal' || node.inlineTerminal) {
      return { ok: true, exits: new Set() }; // a deliberate stop is a valid ending
    }

    if (node.type === 'decision') {
      const group = [node];
      let j = i + 1;
      while (j < nodes.length && isBranchContinuation(nodes[j].text)) { group.push(nodes[j]); j++; }
      const after = j;

      let ok = true;
      const exits = new Set();

      for (const b of group) {
        const p = produced || b.inlineOutput;
        if (b.inlineTerminal) continue;
        if (b.children.length) {
          const r1 = walk(b.children, 0, p);
          ok = ok && r1.ok;
          for (const e of r1.exits) {
            const r2 = walk(nodes, after, e);
            ok = ok && r2.ok;
            r2.exits.forEach((x) => exits.add(x));
          }
        } else {
          const r2 = walk(nodes, after, p);
          ok = ok && r2.ok;
          r2.exits.forEach((x) => exits.add(x));
        }
      }

      if (!isCatchAll(group[group.length - 1].text)) {
        const r = walk(nodes, after, produced);
        ok = ok && r.ok;
        r.exits.forEach((x) => exits.add(x));
      }

      return { ok, exits };
    }

    if (node.type === 'loop') {
      let ok = true;
      const exits = new Set();
      if (node.children.length) {
        const r1 = walk(node.children, 0, produced);
        ok = ok && r1.ok;
        for (const e of r1.exits) {
          const r2 = walk(nodes, i + 1, e);
          ok = ok && r2.ok;
          r2.exits.forEach((x) => exits.add(x));
        }
      }
      const r3 = walk(nodes, i + 1, produced || node.inlineOutput);
      ok = ok && r3.ok;
      r3.exits.forEach((x) => exits.add(x));
      return { ok, exits };
    }

    return walk(nodes, i + 1, produced || node.inlineOutput);
  }

  /** true when every path from here ends having produced output (or stopped). */
  function allPathsProduce(nodes, i, produced) {
    const r = walk(nodes, i, produced);
    if (!r.ok) return false;
    for (const e of r.exits) if (!e) return false;
    return true;
  }

  return { allPathsProduce };
}

// ---------- wording checks ----------

const VAGUE_TERMS = [
  { re: /\bclose\b/i, hint: 'Replace with an exact boundary, e.g. "3 km or less".' },
  { re: /\b(very far|far away|far)\b/i, hint: 'Replace with an exact boundary, e.g. "more than 10 km".' },
  { re: /\bmanageable\b/i, hint: 'State the exact range this covers.' },
  { re: /\b(large|big|huge|small|tiny|long|short)\b/i, hint: 'Give the number that separates this case from the others.' },
  { re: /\b(some|several|many|a few|a lot of)\b/i, hint: 'State how many.' },
  { re: /\b(appropriate|proper|properly|correctly|reasonable|normal|proper way)\b/i, hint: 'Say exactly what the step does.' },
  { re: /\b(enough|sufficient)\b/i, hint: 'State the threshold.' },
  { re: /(\betc\b\.?|\band so on\b|\band more\b)/i, hint: 'List the remaining cases explicitly.' },
  { re: /\b(maybe|probably|might|possibly|should probably)\b/i, hint: 'A step must be definite, not optional.' },
  { re: /\b(handle|deal with|take care of)\b/i, hint: 'Say what actually happens to the value.' },
  { re: /\b(if needed|if necessary|as needed|when appropriate|as required)\b/i, hint: 'State the condition that decides this.' },
  { re: /\b(invalid|valid)\b/i, hint: 'State the exact rule that makes a value valid or invalid.' },
  { re: /\b(something|somehow|whatever)\b/i, hint: 'Name the exact value or action.' },
  { re: /\b(good|bad|nice)\b/i, hint: 'Replace with a measurable condition.' },
];

const RE_DISCOUNT = /\b(subtract|discount|deduct|minus|reduce by|take off)\b/i;
const RE_CAP_WORDS = /\b(maximum|max|cap|capped|limit|limited|not more than|at most|exceeds?)\b/i;
const RE_UNBOUNDED_LOOP = /^\s*(repeat|loop|keep going|keep doing)\s*[:.]?\s*$/i;

/**
 * An upper cap is often written without the word "maximum" — the lecture's own
 * example is "if fine is greater than 300, set fine to 300". Detect that clamp
 * shape too: an upper bound whose same value is assigned back.
 */
function isUpperCap(text) {
  if (RE_CAP_WORDS.test(text)) return true;
  const m = text.match(/\b(?:greater than|more than|above|over)\s+(\d+(?:\.\d+)?)\b/i);
  if (!m) return false;
  const n = m[1].replace('.', '\\.');
  return new RegExp(`\\b(?:to|be|becomes?)\\s+${n}\\b`, 'i').test(text);
}

// ---------- main entry ----------

function analyzeAlgorithm(steps) {
  const findings = [];
  const add = (characteristic, severity, stepIndex, message, hint) => {
    findings.push({ characteristic, severity, stepIndex, message, hint });
  };

  const root = buildTree(steps);
  const walker = makeWalker();

  // --- per-step wording checks (Clear) ---
  steps.forEach((s, i) => {
    const text = s.text.trim();
    if (!text) {
      add('Clear', 'error', i, 'This step is empty.', 'Write the action or remove the step.');
      return;
    }
    // Quoted text is a literal output value, not prose to judge for vagueness.
    const prose = text.replace(/"[^"]*"/g, '').replace(/[“][^”]*[”]/g, '');
    for (const v of VAGUE_TERMS) {
      const m = prose.match(v.re);
      if (m) {
        add('Clear', 'review', i, `Vague wording: "${m[0]}".`, v.hint);
        break; // one wording flag per step keeps the list readable
      }
    }
    if (/\band then\b/i.test(text) || (text.match(/;/g) || []).length >= 2) {
      add('Clear', 'review', i, 'This step may be doing more than one thing.', 'Split it into separate numbered steps.');
    }
  });

  // --- structural checks over the tree ---
  function visitList(nodes) {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // orphan Otherwise
      if (isBranchContinuation(node.text)) {
        const prev = nodes[i - 1];
        if (!prev || (prev.type !== 'decision')) {
          add('Complete', 'error', node.index, 'This "Otherwise" has no matching "If" before it.', 'Add the condition it belongs to, or make this a plain step.');
        }
      }

      // empty blocks
      if (node.type === 'decision' && node.children.length === 0) {
        // Either the action sits inline after a comma, or it belongs in sub-steps.
        const t = node.text.trim();
        const commaIdx = t.indexOf(',');
        const endsWithColon = /:\s*$/.test(t);
        const hasInlineAction = !endsWithColon && commaIdx !== -1 && t.slice(commaIdx + 1).trim().length > 0;
        if (!hasInlineAction) {
          add('Complete', 'error', node.index, 'This condition has no steps under it.', 'Press Tab on the next line to add the steps it controls.');
        }
      }
      if (node.type === 'loop') {
        if (node.children.length === 0) {
          add('Complete', 'error', node.index, 'This loop has no steps under it.', 'Press Tab on the next line to add the steps it repeats.');
        }
        if (RE_UNBOUNDED_LOOP.test(node.text)) {
          add('Finite', 'warning', node.index, 'This loop does not say when it stops.', 'Add a bound, e.g. "For each purchase" or "Repeat until the number is not negative".');
        }
      }

      // decision group: does the false path lead anywhere?
      if (node.type === 'decision' && !isBranchContinuation(node.text)) {
        let j = i + 1;
        while (j < nodes.length && isBranchContinuation(nodes[j].text)) j++;
        const group = nodes.slice(i, j);
        if (!isCatchAll(group[group.length - 1].text)) {
          if (!walker.allPathsProduce(nodes, j, false)) {
            add('Complete', 'warning', node.index, 'When this condition is false, the algorithm produces no result.', 'Add an "Otherwise" branch, or a step after it that always runs.');
          }
        }
      }

      // ordering trap taught in the lecture: discount applied before the cap
      if (RE_DISCOUNT.test(node.text)) {
        for (let k = i + 1; k < nodes.length; k++) {
          if (isUpperCap(nodes[k].text)) {
            add('Ordered', 'review', node.index, 'A discount here is applied before a maximum is enforced later.', 'Check the order — capping after a discount can silently overwrite it.');
            break;
          }
        }
      }

      if (node.children.length) visitList(node.children);
    }
  }
  visitList(root.children);

  // --- whole-algorithm checks ---
  const hasOutput = steps.some((s) => RE_OUTPUT_ANY.test(s.text));
  if (steps.length > 0 && !hasOutput) {
    add('Finite', 'warning', steps.length - 1, 'No step displays a result.', 'Add a step that displays the output the problem asks for.');
  } else if (steps.length > 0 && !walker.allPathsProduce(root.children, 0, false)) {
    add('Finite', 'warning', steps.length - 1, 'At least one path through the algorithm ends without displaying a result.', 'Follow each branch to the end and check that every one produces output or stops on purpose.');
  }

  // indentation jumps (only possible via import/paste)
  steps.forEach((s, i) => {
    const prevLevel = i === 0 ? -1 : steps[i - 1].level;
    if (s.level > prevLevel + 1) {
      add('Clear', 'error', i, 'This step is indented more than one level past the step above it.', 'Use Shift+Tab to move it back.');
    }
  });

  return findings;
}

const CHARACTERISTICS = [
  { name: 'Clear', blurb: 'Each step can be understood without guessing.' },
  { name: 'Complete', blurb: 'The steps cover all required cases.' },
  { name: 'Finite', blurb: 'The algorithm eventually ends on every branch.' },
  { name: 'Correct', blurb: 'The algorithm produces the expected output.', manual: true },
  { name: 'Ordered', blurb: 'The steps are arranged in the proper sequence.' },
];
