/*
 * ITCC47 exact symbolic operation analysis.
 *
 * The engine is deliberately framework-neutral. It has no DOM, storage,
 * clock, network, or authentication dependency and works from file:// pages.
 */

(function attachSymbolicCounting(global) {
  'use strict';

  const ENGINE_VERSION = '2.0.0';
  const CONTRACT_VERSION = '2.0.0';

  // ---------- exact rational arithmetic ----------

  function gcd(a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const next = a % b; a = b; b = next; }
    return a || 1;
  }

  function rational(numerator, denominator = 1) {
    if (!Number.isInteger(numerator) || !Number.isInteger(denominator) || denominator === 0) {
      throw new TypeError('Rational values require integer numerator and non-zero denominator.');
    }
    const sign = denominator < 0 ? -1 : 1;
    const divisor = gcd(numerator, denominator);
    return Object.freeze({
      kind: 'Rational',
      numerator: sign * numerator / divisor,
      denominator: Math.abs(denominator) / divisor,
    });
  }

  function rationalFromNumber(value) {
    if (!Number.isFinite(value)) throw new TypeError('A rational value must be finite.');
    if (Number.isInteger(value)) return rational(value);
    const text = String(value);
    const places = (text.split('.')[1] || '').length;
    const scale = 10 ** places;
    return rational(Math.round(value * scale), scale);
  }

  const rAdd = (a, b) => rational(a.numerator * b.denominator + b.numerator * a.denominator, a.denominator * b.denominator);
  const rSub = (a, b) => rational(a.numerator * b.denominator - b.numerator * a.denominator, a.denominator * b.denominator);
  const rMul = (a, b) => rational(a.numerator * b.numerator, a.denominator * b.denominator);
  const rDiv = (a, b) => rational(a.numerator * b.denominator, a.denominator * b.numerator);
  const rNeg = (a) => rational(-a.numerator, a.denominator);
  const rZero = (a) => a.numerator === 0;
  const rOne = (a) => a.numerator === a.denominator;
  const rValue = (a) => a.numerator / a.denominator;

  // ---------- immutable public expression tree ----------

  function expr(kind, fields) { return Object.freeze({ kind, ...fields }); }
  const rationalExpr = (value, denominator) => expr('Rational', rational(
    value && value.kind === 'Rational' ? value.numerator : value,
    value && value.kind === 'Rational' ? value.denominator : (denominator || 1),
  ));
  const symbolExpr = (name) => expr('Symbol', { name: String(name) });
  const addExpr = (...terms) => expr('Add', { terms: Object.freeze(terms.flatMap((term) => term.kind === 'Add' ? term.terms : [term])) });
  const multiplyExpr = (...factors) => expr('Multiply', { factors: Object.freeze(factors.flatMap((factor) => factor.kind === 'Multiply' ? factor.factors : [factor])) });
  const powerExpr = (base, exponent) => expr('Power', { base, exponent });
  const sumExpr = (variable, start, end, body, step = rationalExpr(1), direction = 'TO') =>
    expr('Sum', { variable, start, end, body, step, direction });
  const floorExpr = (value) => expr('Floor', { value });
  const ceilingExpr = (value) => expr('Ceiling', { value });
  const maximumExpr = (...values) => expr('Maximum', { values: Object.freeze(values) });
  const unknownExpr = (text, reason) => expr('Unknown', { text, reason });

  // ---------- exact multivariable polynomials ----------

  function monomialKey(powers) {
    return Object.keys(powers).filter((name) => powers[name] !== 0).sort()
      .map((name) => `${name}^${powers[name]}`).join('|');
  }

  function parseMonomial(key) {
    const out = {};
    if (!key) return out;
    key.split('|').forEach((part) => {
      const cut = part.lastIndexOf('^');
      out[part.slice(0, cut)] = Number(part.slice(cut + 1));
    });
    return out;
  }

  function polynomial(terms) {
    const map = new Map();
    (terms || []).forEach(([key, coefficient]) => {
      const value = coefficient.kind === 'Rational' ? coefficient : rational(coefficient);
      const next = map.has(key) ? rAdd(map.get(key), value) : value;
      if (rZero(next)) map.delete(key); else map.set(key, next);
    });
    return { terms: map };
  }

  const pConstant = (value) => polynomial([['', value && value.kind === 'Rational' ? value : rationalFromNumber(value)]]);
  const pSymbol = (name) => polynomial([[monomialKey({ [name]: 1 }), rational(1)]]);
  const pZero = () => pConstant(0);
  function pAdd(a, b) { return polynomial([...a.terms, ...b.terms]); }
  function pNeg(a) { return polynomial([...a.terms].map(([key, coefficient]) => [key, rNeg(coefficient)])); }
  const pSub = (a, b) => pAdd(a, pNeg(b));
  function pMul(a, b) {
    const terms = [];
    a.terms.forEach((leftCoefficient, leftKey) => b.terms.forEach((rightCoefficient, rightKey) => {
      const powers = parseMonomial(leftKey);
      Object.entries(parseMonomial(rightKey)).forEach(([name, power]) => { powers[name] = (powers[name] || 0) + power; });
      terms.push([monomialKey(powers), rMul(leftCoefficient, rightCoefficient)]);
    }));
    return polynomial(terms);
  }
  function pScale(value, amount) { return pMul(value, pConstant(amount)); }
  function pPow(value, exponent) {
    let result = pConstant(1);
    for (let index = 0; index < exponent; index++) result = pMul(result, value);
    return result;
  }
  function pDivideConstant(value, divisor) {
    return polynomial([...value.terms].map(([key, coefficient]) => [key, rDiv(coefficient, divisor)]));
  }
  function pConstantValue(value) {
    if (value.terms.size === 0) return rational(0);
    if (value.terms.size === 1 && value.terms.has('')) return value.terms.get('');
    return null;
  }
  function pDegree(value, variable) {
    let degree = 0;
    value.terms.forEach((coefficient, key) => {
      if (!rZero(coefficient)) degree = Math.max(degree, parseMonomial(key)[variable] || 0);
    });
    return degree;
  }
  function pHas(value, variable) { return pDegree(value, variable) > 0; }
  function pCoefficient(value, variable, degree) {
    const terms = [];
    value.terms.forEach((coefficient, key) => {
      const powers = parseMonomial(key);
      if ((powers[variable] || 0) !== degree) return;
      delete powers[variable];
      terms.push([monomialKey(powers), coefficient]);
    });
    return polynomial(terms);
  }
  function pEvaluate(value, bindings) {
    let total = 0;
    value.terms.forEach((coefficient, key) => {
      let term = rValue(coefficient);
      Object.entries(parseMonomial(key)).forEach(([name, power]) => { term *= Number(bindings[name]) ** power; });
      total += term;
    });
    return total;
  }
  function pToExpr(value) {
    const terms = [...value.terms].map(([key, coefficient]) => {
      const factors = [];
      if (!rOne(coefficient) || !key) factors.push(rationalExpr(coefficient));
      Object.entries(parseMonomial(key)).forEach(([name, power]) => {
        factors.push(power === 1 ? symbolExpr(name) : powerExpr(symbolExpr(name), power));
      });
      return factors.length === 1 ? factors[0] : multiplyExpr(...factors);
    });
    return terms.length === 1 ? terms[0] : addExpr(...terms);
  }

  const superscript = (value) => String(value).split('').map((digit) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(digit)]).join('');
  function monomialText(key) {
    return Object.entries(parseMonomial(key)).map(([name, power]) => `${name}${power === 1 ? '' : superscript(power)}`).join('');
  }
  function compareTerms([leftKey], [rightKey]) {
    const left = parseMonomial(leftKey); const right = parseMonomial(rightKey);
    const leftDegree = Object.values(left).reduce((sum, power) => sum + power, 0);
    const rightDegree = Object.values(right).reduce((sum, power) => sum + power, 0);
    if (leftDegree !== rightDegree) return rightDegree - leftDegree;
    return leftKey.localeCompare(rightKey);
  }
  function formatRational(value) {
    return value.denominator === 1 ? String(Math.abs(value.numerator)) : `${Math.abs(value.numerator)}/${value.denominator}`;
  }
  function formatPolynomial(value) {
    const terms = [...value.terms].sort(compareTerms);
    if (!terms.length) return '0';
    return terms.map(([key, coefficient], index) => {
      const negative = coefficient.numerator < 0;
      const magnitude = rational(Math.abs(coefficient.numerator), coefficient.denominator);
      const variable = monomialText(key);
      let body;
      if (!key) body = formatRational(magnitude);
      else if (rOne(magnitude)) body = variable;
      else body = `${formatRational(magnitude)}${variable}`;
      if (index === 0) return `${negative ? '−' : ''}${body}`;
      return `${negative ? '−' : '+'} ${body}`;
    }).join(' ');
  }
  function formatFactoredPolynomial(value) {
    const variables = new Set();
    value.terms.forEach((coefficient, key) => Object.keys(parseMonomial(key)).forEach((name) => variables.add(name)));
    if (variables.size === 1 && value.terms.size === 2) {
      const name = [...variables][0];
      const quadratic = value.terms.get(monomialKey({ [name]: 2 }));
      const linear = value.terms.get(monomialKey({ [name]: 1 }));
      if (quadratic && linear && quadratic.denominator === linear.denominator && Math.abs(quadratic.numerator) === Math.abs(linear.numerator)) {
        const lead = rational(Math.abs(quadratic.numerator), quadratic.denominator);
        const sign = Math.sign(quadratic.numerator) === Math.sign(linear.numerator) ? '+' : '−';
        const numerator = `${name}(${name} ${sign} 1)`;
        if (rOne(lead)) return numerator;
        if (lead.numerator === 1) return `${numerator} / ${lead.denominator}`;
        return `${formatRational(lead)} × [${numerator}]${quadratic.numerator < 0 ? ' × −1' : ''}`;
      }
    }
    return formatPolynomial(value);
  }

  function formatExpression(node) {
    if (!node) return 'unknown';
    switch (node.kind) {
      case 'Rational': return node.denominator === 1 ? String(node.numerator) : `${node.numerator}/${node.denominator}`;
      case 'Symbol': return node.name;
      case 'Add': return node.terms.map(formatExpression).join(' + ')
        .replace(/\+ −/g, '− ')
        .replace(/\+ -1 × /g, '− ')
        .replace(/\+ 1 × /g, '+ ');
      case 'Multiply': return node.factors.map((factor) => {
        const text = formatExpression(factor);
        return factor.kind === 'Add' ? `[${text}]` : text;
      }).join(' × ');
      case 'Power': return `${formatExpression(node.base)}${superscript(node.exponent)}`;
      case 'Sum': return `Σ(${node.variable}=${formatExpression(node.start)} ${node.direction} ${formatExpression(node.end)}) ${formatExpression(node.body)}`;
      case 'Floor': return `⌊${formatExpression(node.value)}⌋`;
      case 'Ceiling': return `⌈${formatExpression(node.value)}⌉`;
      case 'Maximum': return `max(${node.values.map(formatExpression).join(', ')})`;
      case 'Unknown': return node.text || 'unknown';
      default: return 'unknown';
    }
  }

  function evaluateExpression(node, bindings) {
    switch (node.kind) {
      case 'Rational': return node.numerator / node.denominator;
      case 'Symbol': return Number(bindings[node.name]);
      case 'Add': return node.terms.reduce((sum, term) => sum + evaluateExpression(term, bindings), 0);
      case 'Multiply': return node.factors.reduce((product, factor) => product * evaluateExpression(factor, bindings), 1);
      case 'Power': return evaluateExpression(node.base, bindings) ** node.exponent;
      case 'Floor': return Math.floor(evaluateExpression(node.value, bindings));
      case 'Ceiling': return Math.ceil(evaluateExpression(node.value, bindings));
      case 'Maximum': return Math.max(...node.values.map((value) => evaluateExpression(value, bindings)));
      case 'Sum': {
        const start = evaluateExpression(node.start, bindings);
        const end = evaluateExpression(node.end, bindings);
        const step = evaluateExpression(node.step, bindings);
        let total = 0;
        if (node.direction === 'DOWNTO') {
          for (let current = start; current >= end; current -= step) total += evaluateExpression(node.body, { ...bindings, [node.variable]: current });
        } else {
          for (let current = start; current <= end; current += step) total += evaluateExpression(node.body, { ...bindings, [node.variable]: current });
        }
        return total;
      }
      default: return NaN;
    }
  }

  // ---------- AST to algebra ----------

  function algebra(poly, source, derivation) {
    return { poly, source: source || (poly ? pToExpr(poly) : unknownExpr('unknown')), derivation: derivation || [] };
  }
  const aConstant = (value) => algebra(pConstant(value), rationalExpr(rationalFromNumber(value)));
  function aAdd(...values) {
    const usable = values.filter(Boolean);
    return algebra(usable.every((value) => value.poly) ? usable.reduce((sum, value) => pAdd(sum, value.poly), pZero()) : null,
      addExpr(...usable.map((value) => value.source)), usable.flatMap((value) => value.derivation || []));
  }
  function aMultiply(left, right) {
    return algebra(left.poly && right.poly ? pMul(left.poly, right.poly) : null,
      multiplyExpr(left.source, right.source), [...(left.derivation || []), ...(right.derivation || [])]);
  }

  function expressionPolynomial(node, symbolMap, constants, loopVariables) {
    if (!node) return null;
    if (node.type === 'Number') return pConstant(node.value);
    if (node.type === 'Ident') {
      if (symbolMap.has(node.name)) return pSymbol(symbolMap.get(node.name));
      if (loopVariables.has(node.name)) return pSymbol(node.name);
      return constants.has(node.name) ? pConstant(constants.get(node.name)) : null;
    }
    if (node.type === 'Unary' && node.op === '-') {
      const child = expressionPolynomial(node.expr, symbolMap, constants, loopVariables);
      return child ? pNeg(child) : null;
    }
    if (node.type !== 'Binary') return null;
    const left = expressionPolynomial(node.left, symbolMap, constants, loopVariables);
    const right = expressionPolynomial(node.right, symbolMap, constants, loopVariables);
    if (!left || !right) return null;
    if (node.op === '+') return pAdd(left, right);
    if (node.op === '-') return pSub(left, right);
    if (node.op === '*') return pMul(left, right);
    if (node.op === '/') {
      const divisor = pConstantValue(right);
      return divisor && !rZero(divisor) ? pDivideConstant(left, divisor) : null;
    }
    return null;
  }

  function containsDivision(node) {
    if (!node) return false;
    if (node.type === 'Binary' && node.op === '/') return true;
    return ['left', 'right', 'expr', 'target', 'index'].some((key) => containsDivision(node[key])) ||
      (node.items || []).some(containsDivision);
  }

  function faulhaber(power, end) {
    if (power === 0) return end;
    if (power === 1) return pDivideConstant(pMul(end, pAdd(end, pConstant(1))), rational(2));
    if (power === 2) return pDivideConstant(pMul(pMul(end, pAdd(end, pConstant(1))), pAdd(pScale(end, 2), pConstant(1))), rational(6));
    return null;
  }

  function sumPolynomial(body, variable, start, end) {
    if (pDegree(body, variable) > 2) return null;
    const beforeStart = pSub(start, pConstant(1));
    let result = pZero();
    for (let power = 0; power <= 2; power++) {
      const coefficient = pCoefficient(body, variable, power);
      if (!coefficient.terms.size) continue;
      const upper = faulhaber(power, end);
      const lower = faulhaber(power, beforeStart);
      if (!upper || !lower) return null;
      result = pAdd(result, pMul(coefficient, pSub(upper, lower)));
    }
    return result;
  }

  function loopCountSource(loop) {
    const start = pToExpr(loop.start);
    const end = pToExpr(loop.end);
    const step = rationalExpr(loop.step);
    const distance = loop.direction === 'DOWNTO'
      ? addExpr(start, multiplyExpr(rationalExpr(-1), end))
      : addExpr(end, multiplyExpr(rationalExpr(-1), start));
    const quotient = multiplyExpr(distance, rationalExpr(rational(loop.step.denominator, loop.step.numerator)));
    return maximumExpr(rationalExpr(0), addExpr(floorExpr(quotient), rationalExpr(1)));
  }

  function sumAcrossLoop(value, loop) {
    if (!value) return null;
    const startConstant = pConstantValue(loop.start);
    const endConstant = pConstantValue(loop.end);
    if (startConstant && endConstant) {
      const start = rValue(startConstant); const end = rValue(endConstant); const step = rValue(loop.step);
      const count = loop.direction === 'DOWNTO'
        ? Math.max(0, Math.floor((start - end) / step) + 1)
        : Math.max(0, Math.floor((end - start) / step) + 1);
      if (value.poly && !pHas(value.poly, loop.varName)) return aMultiply(value, aConstant(count));
    }
    if (rOne(loop.step) && value.poly && !loop.requiresFloor) {
      const result = loop.direction === 'DOWNTO'
        ? sumPolynomial(value.poly, loop.varName, loop.end, loop.start)
        : sumPolynomial(value.poly, loop.varName, loop.start, loop.end);
      if (result) {
        const rawSum = sumExpr(loop.varName, pToExpr(loop.start), pToExpr(loop.end), value.source,
          rationalExpr(loop.step), loop.direction);
        const factored = formatFactoredPolynomial(result);
        return algebra(result, pToExpr(result), [
          { kind: 'per-outer-value', title: `For one ${loop.varName}`, expression: formatExpression(value.source) },
          { kind: 'summation', title: `Sum across ${loop.varName}`, expression: formatExpression(rawSum).replace(/ \+ -1(?=\)|\s|$)/g, ' − 1') },
          { kind: 'identity', title: 'Apply the summation identity', expression: factored },
        ]);
      }
    }
    if (value.poly && !pHas(value.poly, loop.varName)) {
      const count = algebra(null, loopCountSource(loop));
      return aMultiply(value, count);
    }
    return null;
  }

  function aggregateExecutions(loops) {
    let result = aConstant(1);
    for (let index = loops.length - 1; index >= 0; index--) {
      result = sumAcrossLoop(result, loops[index]);
      if (!result) return null;
    }
    return result;
  }

  // ---------- shared analysis helpers ----------

  function programBody(ast) { return ast && ast.type === 'Program' ? ast.body : (ast || []); }
  function readTargets(ast) {
    const reads = [];
    (function walk(block) {
      (block || []).forEach((stmt) => {
        if (stmt.type === 'Read' && stmt.target && stmt.target.index === null) reads.push({ name: stmt.target.name, line: stmt.line });
        if (stmt.block) walk(stmt.block);
        if (stmt.branches) stmt.branches.forEach((branch) => walk(branch.block));
        if (stmt.cases) stmt.cases.forEach((item) => walk(item.block));
        if (stmt.defaultBlock) walk(stmt.defaultBlock);
      });
    })(programBody(ast));
    return reads;
  }

  function identifiersInExpression(node, out) {
    if (!node) return;
    if (node.type === 'Ident') out.add(node.name);
    ['left', 'right', 'expr', 'target', 'index'].forEach((key) => identifiersInExpression(node[key], out));
    if (node.items) node.items.forEach((item) => identifiersInExpression(item, out));
  }
  function suggestSymbols(ast) {
    const reads = readTargets(ast);
    const readNames = new Set(reads.map((read) => read.name));
    const used = new Set();
    (function walk(block) {
      (block || []).forEach((stmt) => {
        if (stmt.type === 'For') {
          identifiersInExpression(stmt.start, used); identifiersInExpression(stmt.end, used); identifiersInExpression(stmt.step, used);
        }
        if (stmt.type === 'While') identifiersInExpression(stmt.condition, used);
        if (stmt.block) walk(stmt.block);
        if (stmt.branches) stmt.branches.forEach((branch) => { identifiersInExpression(branch.condition, used); walk(branch.block); });
      });
    })(programBody(ast));
    return reads.map((read) => ({ ...read, suggested: used.has(read.name) && readNames.has(read.name), symbol: read.name }));
  }

  function selectedSymbols(options, reads) {
    const map = new Map();
    if (Array.isArray(options.symbols)) options.symbols.forEach((item) => {
      if (typeof item === 'string') map.set(item, item);
      else if (item && item.name && item.symbol) map.set(item.name, item.symbol);
    });
    else if (options.symbols && typeof options.symbols === 'object') Object.entries(options.symbols).forEach(([name, symbol]) => map.set(name, symbol));
    if (!map.size && options.inputName) map.set(options.inputName, options.inputSymbol || 'n');
    if (!map.size && reads[0]) map.set(reads[0].name, options.inputSymbol || reads[0].name);
    return map;
  }

  function findEndLine(sourceLines, loopLine) {
    let depth = 0;
    for (let index = loopLine - 1; index < sourceLines.length; index++) {
      const text = String(sourceLines[index] || '').replace(/#.*$/, '').trim().toUpperCase();
      if (/^FOR\b/.test(text)) depth++;
      if (/^ENDFOR\b/.test(text) && --depth === 0) return index + 1;
    }
    return loopLine;
  }
  function loopRuntime(steps, line) {
    const matching = (steps || []).filter((event) => event.frame && event.frame.loopLine === line);
    const finishes = matching.filter((event) => Number.isFinite(event.frame.loopIterations));
    return { invocations: finishes.length, iterations: finishes.reduce((sum, event) => sum + event.frame.loopIterations, 0) };
  }
  function eventRows(steps, sourceLines) {
    const grouped = new Map();
    (steps || []).forEach((event) => {
      const unitCost = Number(event.metrics && event.metrics.cost) || 0;
      if (unitCost <= 0) return;
      const line = event.source.line; const key = `${line}:${unitCost}`;
      if (!grouped.has(key)) grouped.set(key, {
        id: `actual:${key}`, line, statement: String(sourceLines[line - 1] || event.source.code || '').trim(), kind: 'statement',
        unitCost, actualRuns: 0, actualContribution: 0, symbolicRuns: null, contribution: null, enclosingLoops: [], confidence: 'actual',
      });
      const row = grouped.get(key); row.actualRuns++; row.actualContribution += unitCost;
    });
    return [...grouped.values()].sort((a, b) => a.line - b.line || a.unitCost - b.unitCost);
  }
  function statementUnitCost(stmt) {
    if (stmt.type === 'Read') return 1 + costTarget(stmt.target);
    if (stmt.type === 'Write') return costExpr(stmt.expr) + 1;
    if (stmt.type === 'Assign') return costExpr(stmt.expr) + costTarget(stmt.target);
    if (stmt.type === 'Return') return 1 + (stmt.expr ? costExpr(stmt.expr) : 0);
    return 0;
  }
  function containsType(block, type) {
    return (block || []).some((stmt) => stmt.type === type || containsType(stmt.block, type) ||
      (stmt.branches || []).some((branch) => containsType(branch.block, type)));
  }

  function inferDomain(loop, selectedValues) {
    if (!rOne(loop.step)) return null;
    const start = pConstantValue(loop.start); const end = pConstantValue(loop.end);
    const candidate = loop.direction === 'DOWNTO' ? loop.start : loop.end;
    const fixed = loop.direction === 'DOWNTO' ? end : start;
    if (!fixed || candidate.terms.size > 2) return null;
    const symbols = [...candidate.terms.keys()].flatMap((key) => Object.keys(parseMonomial(key)));
    const unique = [...new Set(symbols)];
    if (unique.length !== 1) return null;
    const name = unique[0]; const coefficient = candidate.terms.get(monomialKey({ [name]: 1 }));
    if (!coefficient || !rOne(coefficient)) return null;
    const offset = candidate.terms.get('') || rational(0);
    const threshold = loop.direction === 'DOWNTO' ? rValue(fixed) - rValue(offset) : rValue(fixed) - rValue(offset);
    const expression = `${name} ≥ ${threshold}`;
    return { expression, symbol: name, minimum: threshold, satisfied: !Number.isFinite(selectedValues[name]) || selectedValues[name] >= threshold };
  }

  function growthTerms(poly) {
    const candidates = [...poly.terms].filter(([key]) => key).map(([key]) => parseMonomial(key));
    const dominant = candidates.filter((left) => !candidates.some((right) => {
      const names = new Set([...Object.keys(left), ...Object.keys(right)]);
      let greater = false;
      for (const name of names) {
        if ((right[name] || 0) < (left[name] || 0)) return false;
        if ((right[name] || 0) > (left[name] || 0)) greater = true;
      }
      return greater;
    }));
    if (!dominant.length) return ['1'];
    return dominant.map((powers) => monomialText(monomialKey(powers))).sort();
  }
  function boundText(prefix, terms) { return `${prefix}(${terms.join(' + ')})`; }

  function growthPolynomial(node) {
    if (!node) return null;
    if (node.kind === 'Rational') return pConstant(node.numerator === 0 ? 0 : 1);
    if (node.kind === 'Symbol') return pSymbol(node.name);
    if (node.kind === 'Floor' || node.kind === 'Ceiling') return growthPolynomial(node.value);
    if (node.kind === 'Maximum') {
      const values = node.values.map(growthPolynomial);
      return values.every(Boolean) ? values.reduce(pAdd, pZero()) : null;
    }
    if (node.kind === 'Add') {
      const terms = node.terms.map(growthPolynomial);
      return terms.every(Boolean) ? terms.reduce(pAdd, pZero()) : null;
    }
    if (node.kind === 'Multiply') {
      const factors = node.factors.map(growthPolynomial);
      return factors.every(Boolean) ? factors.reduce(pMul, pConstant(1)) : null;
    }
    if (node.kind === 'Power') {
      const base = growthPolynomial(node.base);
      return base ? pPow(base, node.exponent) : null;
    }
    return null;
  }

  function analyse(options) {
    options = options || {};
    const ast = options.ast || [];
    const body = programBody(ast);
    const steps = options.steps || [];
    const sourceLines = options.sourceLines || [];
    const model = options.model === 'full' ? 'full' : 'lecture';
    const reads = readTargets(ast);
    const symbolMap = selectedSymbols(options, reads);
    const branchSelections = options.branchSelections || {};
    const rows = []; const loops = []; const diagnostics = []; const domains = []; const assumptions = []; const requiredAssumptions = [];
    const constants = new Map(); const loopVariables = new Set();
    const actualRows = eventRows(steps, sourceLines);
    let exact = true;

    const selectedValues = {};
    reads.forEach((read, index) => {
      const symbol = symbolMap.get(read.name);
      if (symbol && options.inputs && Number.isFinite(Number(options.inputs[index]))) selectedValues[symbol] = Number(options.inputs[index]);
    });

    function diagnostic(code, line, message, suggestion, severity = 'warning') {
      if (severity !== 'info') exact = false;
      diagnostics.push({ code, severity, line, column: 1, message, suggestion });
    }

    function addRow(stmt, unitCost, executions, enclosingLoops, kind = 'statement', statement, actualRunsOverride, suffix) {
      const contribution = executions ? aMultiply(aConstant(unitCost), executions) : null;
      const matching = actualRows.filter((row) => row.line === stmt.line && row.unitCost === unitCost);
      const actualRuns = Number.isFinite(actualRunsOverride)
        ? actualRunsOverride
        : matching.reduce((sum, row) => sum + row.actualRuns, 0);
      const runsText = executions ? (executions.poly ? formatFactoredPolynomial(executions.poly) : formatExpression(executions.source)) : null;
      let contributionText = null;
      if (contribution) {
        if (unitCost > 1 && executions.poly && pDegree(executions.poly, [...symbolMap.values()][0] || '') >= 2) contributionText = `${unitCost} × [${runsText}]`;
        else contributionText = contribution.poly ? formatFactoredPolynomial(contribution.poly) : formatExpression(contribution.source);
      }
      rows.push({
        id: `${stmt.line}:${kind}:${suffix || rows.length}`, line: stmt.line, statement: statement || stmt.text || String(sourceLines[stmt.line - 1] || '').trim(), kind,
        unitCost, actualRuns, actualContribution: actualRuns * unitCost, symbolicRuns: runsText, contribution: contributionText,
        enclosingLoops: enclosingLoops.map((loop) => ({ line: loop.line, endLine: loop.endLine })),
        explanation: executions && executions.derivation.length ? executions.derivation[executions.derivation.length - 1].expression : 'This statement executes once for each enclosing-loop value.',
        confidence: executions ? 'exact' : 'unsupported', derivation: executions ? executions.derivation : [], _executions: executions, _contribution: contribution,
      });
    }

    function walk(blockToWalk, enclosingLoops, localConstants) {
      for (const stmt of blockToWalk) {
        const executions = aggregateExecutions(enclosingLoops);
        if (['Read', 'Write', 'Assign', 'Return'].includes(stmt.type)) {
          const hasNodeSyntax = (node) => !!node && (['Field', 'NewNode', 'Null'].includes(node.type) ||
            ['left', 'right', 'expr', 'target', 'index', 'argument', 'value'].some((key) => hasNodeSyntax(node[key])) ||
            (node.items || []).some(hasNodeSyntax));
          if ((stmt.target && stmt.target.fields && stmt.target.fields.length) || hasNodeSyntax(stmt.expr)) {
            diagnostic('W_SYMBOLIC_NODE_EXPRESSION', stmt.line,
              'Primitive counting for node allocation and fields is not defined in this course model.',
              'Use Actual trace metrics for node visits and pointer writes; symbolic algebra remains unchanged.');
          }
          addRow(stmt, statementUnitCost(stmt), executions, enclosingLoops);
          if (stmt.type === 'Read' && stmt.target.index === null) localConstants.delete(stmt.target.name);
          if (stmt.type === 'Assign' && stmt.target.index === null && enclosingLoops.length === 0) {
            const value = expressionPolynomial(stmt.expr, symbolMap, localConstants, loopVariables);
            const constantValue = value && pConstantValue(value);
            if (constantValue) localConstants.set(stmt.target.name, rValue(constantValue)); else localConstants.delete(stmt.target.name);
          }
          if (stmt.type === 'Return') diagnostic('W_SYMBOLIC_EARLY_EXIT', stmt.line,
            'RETURN changes which later statements execute.', 'Release B analyses RETURN inside confirmed recursive functions.');
          continue;
        }

        if (stmt.type === 'For') {
          const stepPoly = expressionPolynomial(stmt.step || { type: 'Number', value: 1 }, symbolMap, localConstants, loopVariables);
          const step = stepPoly && pConstantValue(stepPoly);
          if (!step || rValue(step) <= 0 || !Number.isInteger(rValue(step))) {
            diagnostic('W_SYMBOLIC_LOOP_STEP', stmt.line, 'The loop STEP is not a provable positive whole-number constant.',
              'Use STEP 1 or another positive whole-number constant.');
            addRow(stmt, 0, null, enclosingLoops, 'loop-header');
            continue;
          }
          const start = expressionPolynomial(stmt.start, symbolMap, localConstants, loopVariables);
          const end = expressionPolynomial(stmt.end, symbolMap, localConstants, loopVariables);
          if (!start || !end) {
            diagnostic('W_SYMBOLIC_LOOP_BOUND', stmt.line, `Cannot derive an exact bound for ${stmt.text}.`,
              'Confirm every READ value used by this bound as a symbolic dimension, or simplify the bound.');
            addRow(stmt, 0, null, enclosingLoops, 'loop-header');
            continue;
          }
          if (containsType(stmt.block, 'Break')) {
            diagnostic('W_SYMBOLIC_BREAK', stmt.line, 'BREAK can alter this loop before its counted bound is exhausted.',
              'Remove BREAK or analyse a separately stated worst-case iteration assumption.');
            addRow(stmt, 0, null, enclosingLoops, 'loop-header');
            continue;
          }
          const runtime = loopRuntime(steps, stmt.line);
          const loop = {
            line: stmt.line, endLine: findEndLine(sourceLines, stmt.line), varName: stmt.varName,
            direction: stmt.direction === 'DOWNTO' ? 'DOWNTO' : 'TO', start, end, step,
            requiresFloor: containsDivision(stmt.start) || containsDivision(stmt.end),
            boundExpression: `${exprToText(stmt.start)} ${stmt.direction || 'TO'} ${exprToText(stmt.end)}${rOne(step) ? '' : ` STEP ${rValue(step)}`}`,
            actualInvocations: runtime.invocations, actualIterations: runtime.iterations,
          };
          loopVariables.add(stmt.varName);
          const totalIterations = aggregateExecutions(enclosingLoops.concat(loop));
          const perEntry = sumAcrossLoop(aConstant(1), loop);
          loop.symbolicIterations = perEntry ? (perEntry.poly ? formatFactoredPolynomial(perEntry.poly) : formatExpression(perEntry.source)) : null;
          loop.totalSymbolicIterations = totalIterations ? (totalIterations.poly ? formatFactoredPolynomial(totalIterations.poly) : formatExpression(totalIterations.source)) : null;
          loop.explanation = loop.symbolicIterations
            ? `The ${loop.direction} loop includes its endpoint and advances by ${rValue(step)}: ${loop.boundExpression} = ${loop.symbolicIterations} iterations per entry.`
            : `The ${loop.direction} loop includes its endpoint and advances by ${rValue(step)}.`;
          loop.confidence = totalIterations ? 'exact' : 'unsupported';
          loops.push(loop);
          const domain = inferDomain(loop, selectedValues);
          if (domain && !domains.some((item) => item.expression === domain.expression)) domains.push(domain);
          if (domain && !domain.satisfied) diagnostics.push({
            code: 'W_SYMBOLIC_DOMAIN', severity: 'warning', line: stmt.line, column: 1,
            message: `This run violates the inferred domain ${domain.expression}; the displayed simple formula does not describe the empty-range case.`,
            suggestion: 'Use an input inside the stated domain or retain the max/floor form.',
          });

          if (model === 'lecture') addRow(stmt, 0, executions, enclosingLoops, 'loop-header');
          else {
            const conditionRuns = totalIterations && executions ? aAdd(totalIterations, executions) : null;
            addRow(stmt, costExpr(stmt.start) + costExpr(stmt.end) + (stmt.stepExplicit ? costExpr(stmt.step) : 0) + 1, executions, enclosingLoops,
              'loop-control', `${stmt.text} — setup`, runtime.invocations, 'setup');
            addRow(stmt, 3, conditionRuns, enclosingLoops, 'loop-control', `${stmt.varName} bound condition`, runtime.iterations + runtime.invocations, 'condition');
            addRow(stmt, 4, totalIterations, enclosingLoops, 'loop-control', `${stmt.varName} step`, runtime.iterations, 'increment');
          }
          walk(stmt.block, enclosingLoops.concat(loop), new Map(localConstants));
          loopVariables.delete(stmt.varName);
          continue;
        }

        if (stmt.type === 'If') {
          const key = String(stmt.line);
          const selection = Number(branchSelections[key]);
          if (!Number.isInteger(selection) || selection < 0 || selection >= stmt.branches.length) {
            requiredAssumptions.push({
              id: `branch:${stmt.line}`, kind: 'worst-case-path', line: stmt.line,
              prompt: `Choose the worst-case path for IF on line ${stmt.line}.`,
              candidates: stmt.branches.map((branch, index) => ({ value: index, label: branch.text || (branch.condition ? `Branch ${index + 1}` : 'ELSE') })),
            });
            diagnostic('W_SYMBOLIC_BRANCH', stmt.line, 'This branch has multiple candidate execution paths.',
              'Choose the visible worst-case path before continuing symbolic analysis.');
          } else {
            const chosen = stmt.branches[selection];
            assumptions.push({ id: `branch:${stmt.line}`, kind: 'worst-case-path', line: stmt.line, value: selection,
              statement: chosen.text, sessionOnly: true });
            if (chosen.condition) addRow({ ...stmt, text: chosen.text, line: chosen.line }, costExpr(chosen.condition), executions, enclosingLoops, 'condition');
            walk(chosen.block, enclosingLoops, new Map(localConstants));
          }
          continue;
        }

        const unsupported = {
          While: ['W_SYMBOLIC_WHILE', 'WHILE depends on repeated runtime conditions.'],
          ForEach: ['W_SYMBOLIC_FOR_EACH', 'FOR EACH needs a confirmed symbolic collection length.'],
          Case: ['W_SYMBOLIC_CASE', 'CASE has multiple candidate execution paths.'],
          Break: ['W_SYMBOLIC_BREAK', 'BREAK alters its enclosing loop.'],
          Stop: ['W_SYMBOLIC_EARLY_EXIT', 'STOP prevents later statements from executing.'],
        }[stmt.type];
        if (unsupported) diagnostic(unsupported[0], stmt.line, unsupported[1], 'Use Actual view or rewrite the control-flow assumption explicitly.');
      }
    }

    walk(body, [], constants);

    if (model === 'full') {
      rows.filter((row) => row.kind === 'loop-control').forEach((row) => actualRows.push({
        ...row, id: `actual:${row.id}`, symbolicRuns: null, contribution: null, confidence: 'actual', derivation: [],
      }));
      actualRows.sort((a, b) => a.line - b.line || String(a.id).localeCompare(String(b.id)));
    }

    const contributingRows = rows.filter((row) => row.unitCost > 0 && row._contribution);
    const totalExpression = contributingRows.length ? contributingRows.reduce((sum, row) => aAdd(sum, row._contribution), aConstant(0)) : aConstant(0);
    const expanded = totalExpression.poly ? formatPolynomial(totalExpression.poly) : null;
    let factored = totalExpression.poly ? formatFactoredPolynomial(totalExpression.poly) : formatExpression(totalExpression.source);
    const complexRow = contributingRows.filter((row) => row._executions && (row._executions.poly || row._executions.derivation.length))
      .sort((a, b) => {
        const symbols = [...symbolMap.values()];
        const degreeOf = (rowValue) => {
          const growth = rowValue._executions.poly || growthPolynomial(rowValue._executions.source);
          return growth ? Math.max(0, ...symbols.map((name) => pDegree(growth, name))) : 0;
        };
        return degreeOf(b) - degreeOf(a);
      })[0];
    if (complexRow && /\([^)]*[+−][^)]*\)|\//.test(complexRow.symbolicRuns || '') &&
        complexRow._executions.derivation.length && totalExpression.poly && complexRow._contribution.poly) {
      const remainder = pSub(totalExpression.poly, complexRow._contribution.poly);
      const left = complexRow.contribution;
      const right = formatPolynomial(remainder);
      factored = right === '0' ? left : `${left} + ${right}`.replace(/\+ −/g, '− ');
    }

    const publicRows = rows.map(({ _executions, _contribution, ...row }) => row);
    const actualTotal = actualRows.reduce((sum, row) => sum + row.actualContribution, 0);
    const growthPoly = totalExpression.poly || growthPolynomial(totalExpression.source);
    const terms = growthPoly ? growthTerms(growthPoly) : [];
    const bigO = exact && terms.length ? boundText('O', terms) : null;
    const theta = exact && terms.length ? boundText('Θ', terms) : null;
    const derivation = complexRow ? [
      ...complexRow.derivation,
      { kind: 'unit-cost', title: 'Multiply by the line unit cost', expression: complexRow.contribution },
      { kind: 'total', title: 'Add the remaining contributions', expression: factored },
    ] : [];

    return {
      contractVersion: CONTRACT_VERSION, engineVersion: ENGINE_VERSION, model,
      source: { kind: 'Program', lines: sourceLines.length },
      sourceForm: factored, factoredForm: exact ? factored : null, expandedForm: exact ? expanded : null,
      symbols: [...symbolMap].map(([name, symbol]) => ({ name, symbol })),
      symbolSelection: { confirmed: options.symbolsConfirmed !== false, dimensions: [...symbolMap.values()] },
      inferredDomains: domains.map(({ satisfied, ...domain }) => domain),
      assumptions, requiredAssumptions, worstCaseSelection: assumptions,
      tightBound: theta, derivation, confidence: exact ? (assumptions.length ? 'assumption-based' : 'exact') : 'unsupported',
      actualTotal, symbolicTotal: exact ? factored : null, simplifiedTotal: exact ? factored : null,
      expandedTotal: exact ? expanded : null, dominantTerm: exact && terms.length ? terms.join(' + ') : null,
      growthClass: bigO, rows: publicRows, actualRows, loops, diagnostics,
      inputName: [...symbolMap.keys()][0] || null, inputSymbol: [...symbolMap.values()][0] || null,
      actualInput: [...symbolMap.keys()][0] ? selectedValues[[...symbolMap.values()][0]] ?? null : null,
      expression: totalExpression.source,
    };
  }

  global.ITCC47Counting = Object.freeze({
    ENGINE_VERSION, CONTRACT_VERSION, analyse, analyze: analyse, suggestSymbols,
    Rational: Object.freeze({ create: rational, fromNumber: rationalFromNumber, add: rAdd, subtract: rSub, multiply: rMul, divide: rDiv, valueOf: rValue }),
    SymbolicExpr: Object.freeze({ rational: rationalExpr, symbol: symbolExpr, add: addExpr, multiply: multiplyExpr, power: powerExpr,
      sum: sumExpr, floor: floorExpr, ceiling: ceilingExpr, maximum: maximumExpr, unknown: unknownExpr,
      format: formatExpression, evaluate: evaluateExpression }),
    expression: Object.freeze({
      constant: pConstant, variable: () => pSymbol('n'), symbol: pSymbol, add: pAdd, subtract: pSub, multiply: pMul,
      evaluate(value, input, symbol = 'n') {
        // Phase 1 exposed coefficient arrays. Keep accepting them while the
        // shell and any saved classroom examples migrate to the v2 contract.
        if (Array.isArray(value)) return value.reduce((sum, coefficient, power) => sum + coefficient * (Number(input) ** power), 0);
        return pEvaluate(value, typeof input === 'object' ? input : { [symbol]: input });
      },
      format: formatPolynomial, formatFactored: formatFactoredPolynomial, degree(value, symbol = 'n') { return pDegree(value, symbol); },
    }),
  });
})(typeof window !== 'undefined' ? window : globalThis);
