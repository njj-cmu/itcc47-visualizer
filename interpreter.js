/*
 * A small interpreter for the course's pseudocode grammar:
 *   READ, WRITE, assignment (<- or the arrow char), IF/ELSE IF/ELSE/ENDIF,
 *   FOR var <- start TO/DOWNTO end [STEP positiveValue] DO/ENDFOR,
 *   WHILE cond DO/ENDWHILE,
 *   CASE var OF value: .../DEFAULT: .../ENDCASE, BREAK, RETURN, STOP,
 *   array literals [a, b, c] and indexing arr[i], # comments.
 *
 * Parsing produces an AST once. Execution is a generator that yields one
 * "step" per primitive action (read, write, assign, condition check, loop
 * boundary) so the UI can play/pause/step through it and build a trace
 * table, mirroring how a student would dry-run the algorithm by hand.
 */

// ---------- tokenizer ----------

const KEYWORDS = new Set([
  'READ', 'WRITE', 'IF', 'THEN', 'ELSE', 'ENDIF',
  'FOR', 'EACH', 'IN', 'TO', 'DOWNTO', 'STEP', 'DO', 'ENDFOR',
  'WHILE', 'ENDWHILE', 'CASE', 'OF', 'DEFAULT', 'ENDCASE',
  'BREAK', 'RETURN', 'STOP', 'AND', 'OR', 'NOT', 'TRUE', 'FALSE',
]);

function normalizeSource(src) {
  return src
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/←/g, '<-');
}

function tokenize(src) {
  const text = normalizeSource(src);
  const lines = text.split('\n');
  const tokens = [];
  for (let lineNo = 0; lineNo < lines.length; lineNo++) {
    const line = lines[lineNo];
    const push = (type, value, column) => tokens.push({ type, value, line: lineNo + 1, column: column + 1 });
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (/\s/.test(ch)) { i++; continue; }
      if (ch === '#') break;
      if (ch === '"') {
        const start = i;
        let j = i + 1;
        let str = '';
        while (j < line.length && line[j] !== '"') { str += line[j]; j++; }
        if (j >= line.length) {
          throw new TracerError('String is missing its closing quote', lineNo + 1, start + 1,
            'E_UNTERMINATED_STRING', 'Add a double quote at the end of the text.');
        }
        push('string', str, start);
        i = j + 1;
        continue;
      }
      if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(line[i + 1] || ''))) {
        let j = i;
        while (j < line.length && /[0-9.]/.test(line[j])) j++;
        const raw = line.slice(i, j);
        if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(raw)) {
          throw new TracerError(`Malformed number '${raw}'`, lineNo + 1, i + 1,
            'E_MALFORMED_NUMBER', 'Use at most one decimal point.');
        }
        push('number', parseFloat(raw), i);
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(ch)) {
        let j = i;
        while (j < line.length && /[A-Za-z0-9_]/.test(line[j])) j++;
        const word = line.slice(i, j);
        const upper = word.toUpperCase();
        if (KEYWORDS.has(upper)) {
          push('keyword', upper, i);
        } else {
          push('ident', word, i);
        }
        i = j;
        continue;
      }
      if (ch === '<' && line[i + 1] === '-') {
        push('op', '<-', i);
        i += 2;
        continue;
      }
      if (ch === '<' && line[i + 1] === '=') { push('op', '<=', i); i += 2; continue; }
      if (ch === '>' && line[i + 1] === '=') { push('op', '>=', i); i += 2; continue; }
      if (ch === '<' && line[i + 1] === '>') { push('op', '<>', i); i += 2; continue; }
      if (ch === '!' && line[i + 1] === '=') { push('op', '<>', i); i += 2; continue; }
      if (ch === '=' && line[i + 1] === '=') { push('op', '=', i); i += 2; continue; }
      if ('+-*/%=<>,:[]()'.includes(ch)) {
        push('op', ch, i);
        i++;
        continue;
      }
      throw new TracerError(`Unrecognized character '${ch}'`, lineNo + 1, i + 1,
        'E_UNKNOWN_CHARACTER', 'Use only the operators shown in the grammar guide.');
    }
    tokens.push({ type: 'newline', line: lineNo + 1 });
  }
  tokens.push({ type: 'eof', line: lines.length });
  return tokens;
}

class TracerError extends Error {
  constructor(message, line, column, code = 'E_TRACER', hint = '') {
    super(line ? `Line ${line}${column ? `, column ${column}` : ''}: ${message}` : message);
    this.line = line;
    this.column = column || null;
    this.code = code;
    this.hint = hint;
  }
}

// ---------- parser ----------
// Grammar (informal):
//   program := stmt*
//   stmt := read | write | assign | if | for | while | case | break | return | stop
//   block := stmt* (until a terminator keyword)

class Parser {
  constructor(tokens) {
    this.tokens = tokens.filter((t) => t.type !== 'newline');
    this.pos = 0;
    this.loopDepth = 0;
  }

  peek(offset = 0) { return this.tokens[this.pos + offset]; }
  at(type, value) {
    const t = this.peek();
    if (t.type !== type) return false;
    if (value !== undefined && t.value !== value) return false;
    return true;
  }
  atKeyword(...values) { return this.at('keyword') && values.includes(this.peek().value); }
  next() { return this.tokens[this.pos++]; }
  expectKeyword(value) {
    if (!this.atKeyword(value)) this.err(`Expected '${value}'`);
    return this.next();
  }
  expectOp(value) {
    if (!this.at('op', value)) this.err(`Expected '${value}'`);
    return this.next();
  }
  err(msg, code = 'E_PARSE', hint = '') {
    const token = this.peek();
    throw new TracerError(msg, token ? token.line : undefined, token ? token.column : undefined, code, hint);
  }

  parseProgram() {
    const stmts = this.parseBlock(() => this.at('eof'));
    return stmts;
  }

  parseBlock(isEnd) {
    const stmts = [];
    while (!isEnd() && !this.at('eof')) {
      const stmt = this.parseStmt();
      stmts.push(stmt);
      const previous = this.tokens[this.pos - 1];
      const next = this.peek();
      if (previous && next && next.type !== 'eof' && next.line === previous.line) {
        this.err('Write only one statement per line', 'E_STATEMENT_BOUNDARY', 'Move the next statement to a new line.');
      }
    }
    return stmts;
  }

  parseStmt() {
    const t = this.peek();
    if (this.atKeyword('READ')) return this.parseRead();
    if (this.atKeyword('WRITE')) return this.parseWrite();
    if (this.atKeyword('IF')) return this.parseIf();
    if (this.atKeyword('FOR')) return this.parseFor();
    if (this.atKeyword('WHILE')) return this.parseWhile();
    if (this.atKeyword('CASE')) return this.parseCase();
    if (this.atKeyword('BREAK')) {
      if (this.loopDepth === 0) this.err('BREAK can only be used inside a loop', 'E_BREAK_OUTSIDE_LOOP', 'Remove BREAK or place it inside FOR/WHILE.');
      this.next(); return { type: 'Break', line: t.line };
    }
    if (this.atKeyword('STOP')) { this.next(); return { type: 'Stop', line: t.line }; }
    if (this.atKeyword('RETURN')) {
      const returnToken = this.next();
      let expr = null;
      if (!this.atStmtEnd() && this.peek().line === returnToken.line) expr = this.parseExpr();
      return { type: 'Return', expr, line: t.line };
    }
    if (this.at('ident')) return this.parseAssign();
    this.err(`Unexpected token '${t.value !== undefined ? t.value : t.type}'`);
  }

  atStmtEnd() {
    return this.atKeyword('ENDIF', 'ELSE', 'ENDFOR', 'ENDWHILE', 'ENDCASE', 'DEFAULT') || this.at('eof') ||
      (this.at('op', ':'));
  }

  parseLValue() {
    const line = this.peek().line;
    const name = this.next().value;
    let index = null;
    if (this.at('op', '[')) {
      this.next();
      index = this.parseExpr();
      this.expectOp(']');
    }
    const text = index ? `${name}[${exprToText(index)}]` : name;
    return { name, index, line, text };
  }

  parseRead() {
    const line = this.next().line;
    const target = this.parseLValue();
    return { type: 'Read', target, line, text: `READ ${target.text}` };
  }

  parseWrite() {
    const line = this.next().line;
    const expr = this.parseExpr();
    return { type: 'Write', expr, line, text: `WRITE ${exprToText(expr)}` };
  }

  parseAssign() {
    const target = this.parseLValue();
    this.expectOp('<-');
    const expr = this.parseExpr();
    return { type: 'Assign', target, expr, line: target.line, text: `${target.text} <- ${exprToText(expr)}` };
  }

  parseIf() {
    const line = this.next().line;
    const branches = [];
    let condition = this.parseExpr();
    this.expectKeyword('THEN');
    let block = this.parseBlock(() => this.atKeyword('ELSE', 'ENDIF'));
    branches.push({ condition, block, line, text: `IF ${exprToText(condition)} THEN` });
    while (this.atKeyword('ELSE')) {
      const elseTok = this.next();
      // Newlines are stripped from the token stream, so "ELSE IF x THEN" and an
      // ELSE whose first statement is a nested IF look identical here. The line
      // number is what separates them: an ELSE IF is written on one line.
      if (this.atKeyword('IF') && this.peek().line === elseTok.line) {
        const eiLine = this.next().line;
        condition = this.parseExpr();
        this.expectKeyword('THEN');
        block = this.parseBlock(() => this.atKeyword('ELSE', 'ENDIF'));
        branches.push({ condition, block, line: eiLine, text: `ELSE IF ${exprToText(condition)} THEN` });
      } else {
        const elLine = this.peek().line;
        block = this.parseBlock(() => this.atKeyword('ENDIF'));
        branches.push({ condition: null, block, line: elLine, text: 'ELSE' });
        break;
      }
    }
    this.expectKeyword('ENDIF');
    return { type: 'If', branches, line };
  }

  parseFor() {
    const line = this.next().line;
    if (this.atKeyword('EACH')) {
      this.next();
      if (!this.at('ident')) this.err('Expected a loop variable after FOR EACH', 'E_EXPECTED_IDENTIFIER');
      const varName = this.next().value;
      this.expectKeyword('IN');
      const listExpr = this.parseExpr();
      this.expectKeyword('DO');
      this.loopDepth++;
      const block = this.parseBlock(() => this.atKeyword('ENDFOR'));
      this.loopDepth--;
      this.expectKeyword('ENDFOR');
      return { type: 'ForEach', varName, listExpr, block, line, text: `FOR EACH ${varName} IN ${exprToText(listExpr)} DO` };
    }
    if (!this.at('ident')) this.err('Expected a loop variable after FOR', 'E_EXPECTED_IDENTIFIER');
    const varName = this.next().value;
    this.expectOp('<-');
    const start = this.parseExpr();
    if (!this.atKeyword('TO', 'DOWNTO')) {
      this.err("Expected 'TO' or 'DOWNTO'", 'E_LOOP_DIRECTION',
        'Use TO for increasing loops or DOWNTO for decreasing loops.');
    }
    const direction = this.next().value;
    const end = this.parseExpr();
    let step = { type: 'Number', value: 1, line };
    let stepExplicit = false;
    if (this.atKeyword('STEP')) {
      this.next();
      step = this.parseExpr();
      stepExplicit = true;
    }
    this.expectKeyword('DO');
    this.loopDepth++;
    const block = this.parseBlock(() => this.atKeyword('ENDFOR'));
    this.loopDepth--;
    this.expectKeyword('ENDFOR');
    const stepText = step.type === 'Number' && step.value === 1 ? '' : ` STEP ${exprToText(step)}`;
    return {
      type: 'For', varName, start, end, step, stepExplicit, direction, block, line,
      text: `FOR ${varName} <- ${exprToText(start)} ${direction} ${exprToText(end)}${stepText} DO`,
    };
  }

  parseWhile() {
    const line = this.next().line;
    const condition = this.parseExpr();
    this.expectKeyword('DO');
    this.loopDepth++;
    const block = this.parseBlock(() => this.atKeyword('ENDWHILE'));
    this.loopDepth--;
    this.expectKeyword('ENDWHILE');
    return { type: 'While', condition, block, line, text: `WHILE ${exprToText(condition)} DO` };
  }

  parseCase() {
    const line = this.next().line;
    const subject = this.parseExpr();
    this.expectKeyword('OF');
    const cases = [];
    let defaultBlock = null;
    while (!this.atKeyword('ENDCASE')) {
      if (this.atKeyword('DEFAULT')) {
        this.next();
        this.expectOp(':');
        defaultBlock = this.parseBlock(() => this.atKeyword('ENDCASE') || this.atCaseLabel());
      } else {
        const value = this.parseExpr();
        this.expectOp(':');
        const block = this.parseBlock(() => this.atKeyword('ENDCASE', 'DEFAULT') || this.atCaseLabel());
        cases.push({ value, block });
      }
    }
    this.expectKeyword('ENDCASE');
    return { type: 'Case', subject, cases, defaultBlock, line, text: `CASE ${exprToText(subject)} OF` };
  }

  atCaseLabel() {
    // a bare literal/ident followed by ':' marks the next case label
    const t = this.peek();
    if ((t.type === 'number' || t.type === 'string' || t.type === 'ident') && this.peek(1) && this.peek(1).type === 'op' && this.peek(1).value === ':') {
      return true;
    }
    return false;
  }

  // expression parsing (precedence climbing)
  parseExpr() { return this.parseOr(); }
  parseOr() {
    let left = this.parseAnd();
    while (this.atKeyword('OR')) { this.next(); left = { type: 'Logical', op: 'OR', left, right: this.parseAnd(), line: left.line }; }
    return left;
  }
  parseAnd() {
    let left = this.parseNot();
    while (this.atKeyword('AND')) { this.next(); left = { type: 'Logical', op: 'AND', left, right: this.parseNot(), line: left.line }; }
    return left;
  }
  parseNot() {
    if (this.atKeyword('NOT')) { const token = this.next(); return { type: 'Unary', op: 'NOT', expr: this.parseNot(), line: token.line }; }
    return this.parseComparison();
  }
  parseComparison() {
    let left = this.parseAdditive();
    if (this.at('op') && ['<', '>', '<=', '>=', '=', '<>'].includes(this.peek().value)) {
      const op = this.next().value;
      const right = this.parseAdditive();
      return { type: 'Binary', op, left, right, line: left.line };
    }
    return left;
  }
  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.at('op') && ['+', '-'].includes(this.peek().value)) {
      const op = this.next().value;
      left = { type: 'Binary', op, left, right: this.parseMultiplicative(), line: left.line };
    }
    return left;
  }
  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.at('op') && ['*', '/', '%'].includes(this.peek().value)) {
      const op = this.next().value;
      left = { type: 'Binary', op, left, right: this.parseUnary(), line: left.line };
    }
    return left;
  }
  parseUnary() {
    if (this.at('op', '-')) { const token = this.next(); return { type: 'Unary', op: '-', expr: this.parseUnary(), line: token.line }; }
    return this.parsePostfix();
  }
  parsePostfix() {
    let expr = this.parsePrimary();
    while (this.at('op', '[')) {
      this.next();
      const index = this.parseExpr();
      this.expectOp(']');
      expr = { type: 'Index', target: expr, index, line: expr.line || this.peek().line };
    }
    return expr;
  }
  parsePrimary() {
    const t = this.peek();
    if (t.type === 'number') { this.next(); return { type: 'Number', value: t.value, line: t.line }; }
    if (t.type === 'string') { this.next(); return { type: 'String', value: t.value, line: t.line }; }
    if (this.atKeyword('TRUE')) { this.next(); return { type: 'Bool', value: true, line: t.line }; }
    if (this.atKeyword('FALSE')) { this.next(); return { type: 'Bool', value: false, line: t.line }; }
    if (this.at('op', '(')) {
      this.next();
      const e = this.parseExpr();
      this.expectOp(')');
      return e;
    }
    if (this.at('op', '[')) {
      this.next();
      const items = [];
      if (!this.at('op', ']')) {
        items.push(this.parseExpr());
        while (this.at('op', ',')) { this.next(); items.push(this.parseExpr()); }
      }
      this.expectOp(']');
      return { type: 'ArrayLit', items, line: t.line };
    }
    if (t.type === 'ident') { this.next(); return { type: 'Ident', name: t.value, line: t.line }; }
    this.err(`Unexpected token in expression '${t.value !== undefined ? t.value : t.type}'`);
  }
}

function exprToText(node) {
  switch (node.type) {
    case 'Number': return String(node.value);
    case 'String': return `"${node.value}"`;
    case 'Bool': return node.value ? 'TRUE' : 'FALSE';
    case 'Ident': return node.name;
    case 'Index': return `${exprToText(node.target)}[${exprToText(node.index)}]`;
    case 'ArrayLit': return `[${node.items.map(exprToText).join(', ')}]`;
    case 'Unary': return `${node.op}${node.op === 'NOT' ? ' ' : ''}${exprToText(node.expr)}`;
    case 'Binary': return `${exprToText(node.left)} ${node.op} ${exprToText(node.right)}`;
    case 'Logical': return `${exprToText(node.left)} ${node.op} ${exprToText(node.right)}`;
    default: return '?';
  }
}

function parsePseudocode(src) {
  const tokens = tokenize(src);
  const parser = new Parser(tokens);
  return parser.parseProgram();
}

// ---------- execution ----------

class BreakSignal {}
class ReturnSignal { constructor(value) { this.value = value; } }
class StopSignal {}

function fmtValue(v) {
  if (v === undefined) return '—';
  if (v === null) return 'null';
  if (Array.isArray(v)) return `[${v.map(fmtValue).join(', ')}]`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

function snapshotEnv(env) {
  const out = {};
  for (const k of Object.keys(env)) out[k] = fmtValue(env[k]);
  return out;
}

function evalExpr(node, env) {
  switch (node.type) {
    case 'Number': return node.value;
    case 'String': return node.value;
    case 'Bool': return node.value;
    case 'Ident':
      if (!(node.name in env)) throw new TracerError(`Variable '${node.name}' has not been assigned yet`);
      return env[node.name];
    case 'ArrayLit': return node.items.map((it) => evalExpr(it, env));
    case 'Index': {
      const base = evalExpr(node.target, env);
      const rawIndex = evalExpr(node.index, env);
      if (!Number.isInteger(rawIndex)) throw new TracerError('List position must be a whole number', node.line, null, 'E_INVALID_INDEX');
      const idx = rawIndex;
      if (!Array.isArray(base)) throw new TracerError(`${exprToText(node.target)} is not a list`, node.line);
      if (idx < 0 || idx >= base.length) throw new TracerError(`List position ${idx} is outside 0–${base.length - 1}`, node.line, null,
        'E_INDEX_OUT_OF_BOUNDS', 'Check the loop boundary or list position.');
      return base[idx];
    }
    case 'Unary': {
      const v = evalExpr(node.expr, env);
      if (node.op === 'NOT') return !truthy(v);
      if (node.op === '-') return -v;
      break;
    }
    case 'Logical': {
      const l = truthy(evalExpr(node.left, env));
      if (node.op === 'AND') return l ? truthy(evalExpr(node.right, env)) : false;
      if (node.op === 'OR') return l ? true : truthy(evalExpr(node.right, env));
      break;
    }
    case 'Binary': {
      const l = evalExpr(node.left, env);
      const r = evalExpr(node.right, env);
      switch (node.op) {
        case '+': return (typeof l === 'string' || typeof r === 'string') ? `${fmtValue(l)}${fmtValue(r)}` : l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/':
          if (r === 0) throw new TracerError('Cannot divide by zero', node.line, null, 'E_DIVIDE_BY_ZERO');
          return Math.floor(l / r);
        case '%':
          if (r === 0) throw new TracerError('Cannot divide by zero', node.line, null, 'E_DIVIDE_BY_ZERO');
          return l % r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        case '=': return l === r;
        case '<>': return l !== r;
        default: break;
      }
      break;
    }
    default: break;
  }
  throw new TracerError(`Cannot evaluate expression`);
}

function truthy(v) { return v === true || (typeof v === 'number' && v !== 0); }

function assignLValue(target, value, env) {
  if (target.index === null) {
    env[target.name] = value;
    return;
  }
  if (!Array.isArray(env[target.name])) throw new TracerError(`${target.name} is not a list`, target.line);
  const idx = evalExpr(target.index, env);
  if (!Number.isInteger(idx)) throw new TracerError('List position must be a whole number', target.line, null, 'E_INVALID_INDEX');
  const canAppend = idx === env[target.name].length || (env[target.name].length === 0 && idx === 1);
  if (idx < 0 || (idx >= env[target.name].length && !canAppend)) throw new TracerError(
    `List position ${idx} skips beyond the next available position`, target.line, null,
    'E_INDEX_OUT_OF_BOUNDS', 'Use the next 0-based or 1-based position without skipping an item.');
  env[target.name][idx] = value;
}

/*
 * Primitive-operation cost model (Topic 01, "Counting Primitive Operations").
 * Accessing a value, an arithmetic operation, an assignment, a comparison and
 * an output each count as 1. A known list position (arr[2]) costs 1; a variable
 * index (arr[i]) costs 4 — access the list, access the index, index, retrieve —
 * which is what the worked tables in the complexity chapter use.
 */
function costExpr(node) {
  if (!node) return 0;
  switch (node.type) {
    case 'Number': case 'String': case 'Bool': case 'Ident':
      return 1;
    case 'Index':
      if (node.index.type === 'Number') return 1;
      return costExpr(node.target) + costExpr(node.index) + 2;
    case 'ArrayLit':
      return node.items.reduce((s, it) => s + costExpr(it), 0) + 1;
    case 'Unary':
      return costExpr(node.expr) + 1;
    case 'Binary': case 'Logical':
      return costExpr(node.left) + costExpr(node.right) + 1;
    default:
      return 1;
  }
}

/** Cost of storing into an assignment target. */
function costTarget(target) {
  if (!target.index) return 1;
  if (target.index.type === 'Number') return 1;
  return costExpr(target.index) + 2;
}

function mkStep(line, code, description, env, kind, extra) {
  return {
    line,
    code,
    description,
    vars: snapshotEnv(env),
    kind: kind || 'exec',
    cost: 0,
    controlCost: 0,
    ...extra,
  };
}

function* execBlock(stmts, env, ctx) {
  for (const stmt of stmts) {
    yield* execStmt(stmt, env, ctx);
  }
}

function* execStmt(stmt, env, ctx) {
  switch (stmt.type) {
    case 'Read': {
      if (ctx.inputs.length === 0) {
        throw new TracerError(`READ ${stmt.target.text} needs another input value`, stmt.line, null,
          'E_INPUT_EXHAUSTED', 'Add the missing value to the Input values box.');
      }
      const val = ctx.inputs.shift();
      assignLValue(stmt.target, val, env);
      // receive the value + store it
      yield mkStep(stmt.line, stmt.text, `Read ${stmt.target.text} = ${fmtValue(val)}`, env, 'read',
        { cost: 1 + costTarget(stmt.target) });
      break;
    }
    case 'Write': {
      const val = evalExpr(stmt.expr, env);
      ctx.output.push(val);
      yield mkStep(stmt.line, stmt.text, `Output: ${fmtValue(val)}`, env, 'write',
        { outputValue: val, cost: costExpr(stmt.expr) + 1 });
      break;
    }
    case 'Assign': {
      const val = evalExpr(stmt.expr, env);
      assignLValue(stmt.target, val, env);
      yield mkStep(stmt.line, stmt.text, `${stmt.target.text} = ${fmtValue(val)}`, env, 'assign',
        { cost: costExpr(stmt.expr) + costTarget(stmt.target) });
      break;
    }
    case 'If': {
      let taken = false;
      for (const branch of stmt.branches) {
        if (branch.condition) {
          const cond = truthy(evalExpr(branch.condition, env));
          yield mkStep(branch.line, branch.text, `Condition is ${cond ? 'TRUE' : 'FALSE'}`, env, 'condition',
            { cost: costExpr(branch.condition) });
          if (cond) {
            taken = true;
            yield* execBlock(branch.block, env, ctx);
            break;
          }
        } else {
          yield mkStep(branch.line, branch.text, 'Executing ELSE branch', env, 'condition');
          taken = true;
          yield* execBlock(branch.block, env, ctx);
          break;
        }
      }
      if (!taken) yield mkStep(stmt.line, 'ENDIF', 'No condition matched; nothing executed', env, 'condition');
      break;
    }
    case 'For': {
      const startVal = evalExpr(stmt.start, env);
      const endVal = evalExpr(stmt.end, env);
      const stepVal = evalExpr(stmt.step || { type: 'Number', value: 1 }, env);
      if (!Number.isFinite(stepVal) || !Number.isInteger(stepVal) || stepVal <= 0) {
        throw new TracerError('FOR STEP must be a positive whole number', stmt.line, null,
          'E_INVALID_LOOP_STEP', 'Use STEP 1 or another positive whole number; TO or DOWNTO chooses the direction.');
      }
      const direction = stmt.direction === 'DOWNTO' ? 'DOWNTO' : 'TO';
      const continues = (value) => direction === 'DOWNTO' ? value >= endVal : value <= endVal;
      const delta = direction === 'DOWNTO' ? -stepVal : stepVal;
      env[stmt.varName] = startVal;
      // The lecture's totals (e.g. T(n) = 7n + 6) charge nothing for the FOR
      // header, so loop control is tracked separately and is off by default.
      yield mkStep(stmt.line, stmt.text, `${stmt.varName} = ${startVal} (${direction} ${endVal}, step ${stepVal})`, env, 'loop',
        { controlCost: costExpr(stmt.start) + costExpr(stmt.end) + (stmt.stepExplicit ? costExpr(stmt.step) : 0) + 1, loopLine: stmt.line });
      let forIterations = 0;
      try {
        while (continues(env[stmt.varName])) {
          forIterations++;
          yield* execBlock(stmt.block, env, ctx);
          env[stmt.varName] += delta;
          if (continues(env[stmt.varName])) {
            yield mkStep(stmt.line, `FOR ${stmt.varName} <- ...`, `Next iteration: ${stmt.varName} = ${env[stmt.varName]}`, env, 'loop',
              { controlCost: 2, loopLine: stmt.line, iteration: true });
          }
        }
      } catch (e) {
        if (e instanceof BreakSignal) break;
        throw e;
      }
      yield mkStep(stmt.line, 'ENDFOR', `Loop finished (${stmt.varName} = ${env[stmt.varName]})`, env, 'loop',
        { controlCost: 1, loopLine: stmt.line, loopIterations: forIterations });
      break;
    }
    case 'ForEach': {
      const list = evalExpr(stmt.listExpr, env);
      if (!Array.isArray(list)) throw new TracerError(`${exprToText(stmt.listExpr)} is not a list`, stmt.line);
      yield mkStep(stmt.line, stmt.text, `Iterating ${list.length} item(s)`, env, 'loop',
        { controlCost: costExpr(stmt.listExpr), loopLine: stmt.line });
      let eachIterations = 0;
      try {
        for (const item of list) {
          env[stmt.varName] = item;
          eachIterations++;
          yield mkStep(stmt.line, stmt.text, `${stmt.varName} = ${fmtValue(item)}`, env, 'loop',
            { controlCost: 2, loopLine: stmt.line, iteration: true });
          yield* execBlock(stmt.block, env, ctx);
        }
      } catch (e) {
        if (e instanceof BreakSignal) break;
        throw e;
      }
      yield mkStep(stmt.line, 'ENDFOR', 'Loop finished', env, 'loop',
        { controlCost: 1, loopLine: stmt.line, loopIterations: eachIterations });
      break;
    }
    case 'While': {
      try {
        while (true) {
          const cond = truthy(evalExpr(stmt.condition, env));
          yield mkStep(stmt.line, stmt.text, `Condition is ${cond ? 'TRUE' : 'FALSE'}`, env, 'condition',
            { cost: costExpr(stmt.condition), loopLine: stmt.line });
          if (!cond) break;
          yield* execBlock(stmt.block, env, ctx);
        }
      } catch (e) {
        if (e instanceof BreakSignal) break;
        throw e;
      }
      break;
    }
    case 'Case': {
      const subject = evalExpr(stmt.subject, env);
      let matched = false;
      for (const c of stmt.cases) {
        const val = evalExpr(c.value, env);
        const isMatch = val === subject;
        yield mkStep(stmt.line, `${exprToText(c.value)}:`, `Compare with ${fmtValue(subject)} → ${isMatch ? 'match' : 'no match'}`, env, 'condition',
          { cost: costExpr(stmt.subject) + costExpr(c.value) + 1 });
        if (isMatch) {
          matched = true;
          yield* execBlock(c.block, env, ctx);
          break;
        }
      }
      if (!matched && stmt.defaultBlock) {
        yield mkStep(stmt.line, 'DEFAULT:', 'No case matched; using default', env, 'condition');
        yield* execBlock(stmt.defaultBlock, env, ctx);
      }
      break;
    }
    case 'Break': {
      yield mkStep(stmt.line, 'BREAK', 'Exiting loop', env, 'control');
      throw new BreakSignal();
    }
    case 'Return': {
      const val = stmt.expr ? evalExpr(stmt.expr, env) : undefined;
      yield mkStep(stmt.line, stmt.expr ? `RETURN ${exprToText(stmt.expr)}` : 'RETURN', `Returning ${fmtValue(val)}`, env, 'control');
      throw new ReturnSignal(val);
    }
    case 'Stop': {
      yield mkStep(stmt.line, 'STOP', 'Execution stopped', env, 'control');
      throw new StopSignal();
    }
    default:
      throw new TracerError(`Unknown statement type ${stmt.type}`);
  }
}

function* runProgram(ast, inputValues) {
  const env = {};
  const ctx = { inputs: [...inputValues], output: [], warnings: [] };
  try {
    yield* execBlock(ast, env, ctx);
  } catch (e) {
    if (e instanceof ReturnSignal || e instanceof StopSignal) {
      // clean termination
    } else {
      throw e;
    }
  }
  return { env, output: ctx.output, warnings: ctx.warnings };
}

function parseInputList(text) {
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => {
      if (/^(true|false)$/i.test(s)) return /^true$/i.test(s);
      if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
      return s;
    });
}
