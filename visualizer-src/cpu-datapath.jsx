import React, { memo } from 'react';
import { m } from 'motion/react';

const DATAPATH_ROUTES = Object.freeze([
  Object.freeze({ id: 'pc-mar', from: 'PC', to: 'MAR', d: 'M480 106 H525', x: [480, 525], y: [106, 106], times: [0, 1], tone: 'address-path' }),
  Object.freeze({ id: 'mar-memory', from: 'MAR', to: 'memory', d: 'M590 72 V60 H246', x: [590, 590, 246], y: [72, 60, 60], times: [0, .05, 1], tone: 'address-path' }),
  Object.freeze({ id: 'memory-mdr', from: 'memory', to: 'MDR', d: 'M246 372 H525', x: [246, 525], y: [372, 372], times: [0, 1], tone: 'data-path' }),
  Object.freeze({ id: 'mdr-ir', from: 'MDR', to: 'IR', d: 'M655 372 H675 V106 H700', x: [655, 675, 675, 700], y: [372, 372, 106, 106], times: [0, .08, .9, 1], tone: 'data-path' }),
  Object.freeze({ id: 'ir-decoder', from: 'IR', to: 'Decoder', d: 'M870 106 H930', x: [870, 930], y: [106, 106], times: [0, 1], tone: 'data-path' }),
  Object.freeze({ id: 'r1-alu', from: 'R1', to: 'ALU', d: 'M486 252 V304 H710 V338', x: [486, 486, 710, 710], y: [252, 304, 304, 338], times: [0, .13, .87, 1], tone: 'operand-path' }),
  Object.freeze({ id: 'decoder-alu', from: 'Decoder', to: 'ALU', d: 'M1005 140 V156 H740 V372', x: [1005, 1005, 740, 740], y: [140, 156, 156, 372], times: [0, .07, .65, 1], tone: 'operand-path' }),
  Object.freeze({ id: 'alu-r1', from: 'ALU', to: 'R1', d: 'M710 338 V304 H486 V252', x: [710, 710, 486, 486], y: [338, 304, 304, 252], times: [0, .13, .87, 1], tone: 'result-path' }),
]);

const CONTROL_CONNECTIONS = Object.freeze([
  Object.freeze({ id: 'control-pc', d: 'M812 170 V156 H415 V140', x: [812, 812, 415, 415], y: [170, 156, 156, 140], times: [0, .08, .92, 1], signals: Object.freeze(['PCout', 'PCinc']) }),
  Object.freeze({ id: 'control-mar', d: 'M852 170 V152 H590 V140', x: [852, 852, 590, 590], y: [170, 152, 152, 140], times: [0, .08, .92, 1], signals: Object.freeze(['MARin', 'MARout']) }),
  Object.freeze({ id: 'control-ir', d: 'M902 170 V156 H785 V140', x: [902, 902, 785, 785], y: [170, 156, 156, 140], times: [0, .12, .88, 1], signals: Object.freeze(['IRin']) }),
  Object.freeze({ id: 'control-decoder', d: 'M962 170 V156 H1005 V140', x: [962, 962, 1005, 1005], y: [170, 156, 156, 140], times: [0, .2, .8, 1], signals: Object.freeze(['IMMout']) }),
  Object.freeze({ id: 'control-r1', d: 'M800 170 V158 H486 V184', x: [800, 800, 486, 486], y: [170, 158, 158, 184], times: [0, .08, .92, 1], signals: Object.freeze(['R1out', 'R1in']) }),
  Object.freeze({ id: 'control-memory', d: 'M760 280 H738 V310 H266 V286 H246', x: [760, 738, 738, 266, 266, 246], y: [280, 280, 310, 310, 286, 286], times: [0, .06, .15, .78, .92, 1], signals: Object.freeze(['READ', 'MFC']) }),
  Object.freeze({ id: 'control-mdr', d: 'M760 328 H660 V372 H655', x: [760, 660, 660, 655], y: [328, 328, 372, 372], times: [0, .58, .94, 1], signals: Object.freeze(['MDRin', 'MDRout']) }),
  Object.freeze({ id: 'control-alu', d: 'M760 354 H745', x: [760, 745], y: [354, 354], times: [0, 1], signals: Object.freeze(['ALUinA', 'ALUinB', 'ALUadd', 'ALUout']) }),
]);

function format(value, width, numberFormat) {
  if (value == null) return '—';
  return ComputerArchitectureMachine.formatValue(value, width, numberFormat);
}

function componentState(animationMetadata, id) {
  if (!animationMetadata || !id) return '';
  const { sourceId, targetId, stage } = animationMetadata;
  if (sourceId === id && targetId === id) return stage === 'arrive' ? 'is-received' : stage === 'travel' ? 'is-sent' : 'is-source';
  if (targetId === id) return stage === 'arrive' ? 'is-received' : stage === 'arm' || stage === 'travel' ? 'is-ready' : '';
  if (sourceId === id) return stage === 'travel' || stage === 'arrive' ? 'is-sent' : 'is-source';
  return '';
}

function isTransferSource(animationMetadata, id) {
  return animationMetadata?.stage === 'travel' && animationMetadata.sourceId === id;
}

function wrapTeachingText(text, maxCharacters = 39, maxLines = 2) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  words.forEach((word) => {
    const current = lines.at(-1);
    if (!current || current.length + word.length + 1 > maxCharacters) lines.push(word);
    else lines[lines.length - 1] = `${current} ${word}`;
  });
  if (lines.length <= maxLines) return lines;
  const visible = lines.slice(0, maxLines);
  visible[maxLines - 1] = `${visible[maxLines - 1].replace(/[.,;:]?$/, '')}…`;
  return visible;
}

function SvgTeachingNote({ text, x, y, className }) {
  return <text className={className} x={x} y={y} aria-label={text}>{wrapTeachingText(text).map((line, index) => <tspan x={x} dy={index ? 16 : 0} key={`${line}:${index}`}>{line}</tspan>)}</text>;
}

function nextTeachingNote(frame, numberFormat) {
  const terminal = frame.operation.index === frame.operation.total
    && frame.microStep.index === frame.microStep.total;
  if (terminal && frame.execution?.complete) {
    const pc = format(frame.registers.PC.value, frame.registers.PC.width, numberFormat);
    return `Fetch the next instruction at PC ${pc}.`;
  }
  if (terminal) return `Execute ${frame.instruction.mnemonic}; execution is outside this activity.`;

  const currentOperation = frame.microOperations.find((operation) => operation.id === `operation:${frame.operation.id}`);
  const nextMicroStep = currentOperation?.substeps[frame.microStep.index];
  if (nextMicroStep) return nextMicroStep.label.endsWith('.') ? nextMicroStep.label : `${nextMicroStep.label}.`;
  const nextOperation = frame.microOperations[frame.operation.index];
  return nextOperation ? `${nextOperation.label}.` : 'Continue to the next instruction.';
}

function RegisterBox({ id, x, y, width = 130, register, animationMetadata, numberFormat }) {
  const state = componentState(animationMetadata, id);
  const emitting = isTransferSource(animationMetadata, id);
  return <g className={`cpu-component cpu-register-box ${state}`} data-component-id={id} data-component-state={state || 'idle'}>
    <rect x={x} y={y} width={width} height="68" rx="8"/>
    <text className="cpu-svg-label" x={x + 13} y={y + 23}>{id}</text>
    <text className={`cpu-svg-value ${emitting ? 'is-emitting' : ''}`} data-source-pulse={emitting ? id : undefined} x={x + 13} y={y + 50} textLength={numberFormat === 'bin' ? width - 26 : undefined} lengthAdjust={numberFormat === 'bin' ? 'spacingAndGlyphs' : undefined}>{format(register.value, register.width, numberFormat)}</text>
    <text className="cpu-svg-width" x={x + width - 13} y={y + 22} textAnchor="end">{register.width}-bit</text>
  </g>;
}

function ValueCue({ route, transfer, motionMode, spawnHoldDuration, movementDuration, numberFormat }) {
  if (!route || !transfer) return null;
  const animate = motionMode === 'on' && movementDuration > 0;
  const last = route.x.length - 1;
  const label = `${format(transfer.value, transfer.width, numberFormat)} · ${transfer.role || transfer.kind}`;
  const width = Math.min(148, Math.max(88, 24 + label.length * 6.2));
  const content = <g className="cpu-value-pill"><rect x={-width / 2} y="-12" width={width} height="24" rx="12"/><text x="0" y="4" textAnchor="middle" textLength={label.length > 18 ? width - 18 : undefined} lengthAdjust={label.length > 18 ? 'spacingAndGlyphs' : undefined}>{label}</text></g>;
  return <g className="cpu-value-cue" data-transfer-id={transfer.id} data-transfer-role={transfer.role || transfer.kind} data-retain-at-endpoint="true">
    {animate ? <m.g data-motion-role="moving-value" initial={{ x: route.x[0], y: route.y[0], opacity: 1 }} animate={{ x: route.x, y: route.y, opacity: 1 }} transition={{ x: { delay: spawnHoldDuration, duration: movementDuration, ease: 'easeInOut', times: route.times }, y: { delay: spawnHoldDuration, duration: movementDuration, ease: 'easeInOut', times: route.times }, opacity: { duration: 0 } }}>{content}</m.g>
      : <g className="is-static" data-motion-role="moving-value" transform={`translate(${route.x[last]} ${route.y[last]})`}>{content}</g>}
  </g>;
}

function ControlCue({ cue, route, motionMode, spawnHoldDuration, movementDuration, staggerDuration }) {
  if (!cue || !route) return null;
  const reversed = cue.direction === 'to-cu';
  const x = reversed ? [...route.x].reverse() : route.x;
  const y = reversed ? [...route.y].reverse() : route.y;
  const times = reversed ? route.times.map((value) => 1 - value).reverse() : route.times;
  const departureStagger = (cue.order - 1) * staggerDuration;
  const delay = spawnHoldDuration + departureStagger;
  const cueDuration = Math.max(.2, movementDuration - departureStagger);
  const animate = motionMode === 'on' && movementDuration > 0;
  const last = x.length - 1;
  const width = Math.max(44, 18 + cue.signalId.length * 6.4);
  const content = <g className="cpu-control-pill"><rect x={-width / 2} y="-10" width={width} height="20" rx="10"/><text x="0" y="4" textAnchor="middle">{cue.signalId}</text></g>;
  return <g className="cpu-control-cue" data-control-cue-id={cue.id} data-signal-direction={cue.direction} data-cue-origin={cue.originId} data-retain-at-endpoint="true">
    {animate ? <m.g data-motion-role="control-signal" initial={{ x: x[0], y: y[0], opacity: 1 }} animate={{ x, y, opacity: 1 }} transition={{ x: { delay, duration: cueDuration, ease: 'easeInOut', times }, y: { delay, duration: cueDuration, ease: 'easeInOut', times }, opacity: { duration: 0 } }}>{content}</m.g>
      : <g className="is-static" data-motion-role="control-signal" transform={`translate(${x[last]} ${y[last]})`}>{content}</g>}
  </g>;
}

function RouteBadge({ x, y, width, children, tone = '' }) {
  return <g className={`cpu-route-badge ${tone}`}><rect x={x} y={y} width={width} height="18" rx="4"/><text x={x + width / 2} y={y + 13} textAnchor="middle">{children}</text></g>;
}

function MainMemorySvg({ frame, animationMetadata, numberFormat }) {
  const state = componentState(animationMetadata, 'memory');
  const reading = frame.memory.state !== 'idle';
  const emitsTransfer = isTransferSource(animationMetadata, 'memory');
  const emitsMfc = animationMetadata.stage === 'arm' && (animationMetadata.controlCues || []).some((cue) => cue.originId === 'memory');
  return <g className={`cpu-component cpu-main-memory ${state}`} data-component-id="memory" data-component-state={state || 'idle'}>
    <rect className="cpu-main-memory-shell" x="16" y="16" width="230" height="424" rx="13"/>
    <text className="cpu-svg-label" x="34" y="44">MAIN MEMORY</text>
    <text className="cpu-svg-muted" x="34" y="64">256 × 16-bit words</text>
    <path className="cpu-memory-divider" d="M16 82 H246"/>
    <text className="cpu-svg-kicker" x="39" y="103">ADDR</text>
    <text className="cpu-svg-kicker" x="121" y="103">WORD</text>
    {frame.memory.cells.map((cell, index) => {
      const selected = cell.address === frame.memory.selectedAddress;
      const y = 114 + index * 44;
      return <g className={`cpu-memory-row ${selected ? 'is-selected' : ''} ${selected && reading ? 'is-reading' : ''}`} data-memory-address={cell.address} key={cell.id}>
        <rect x="29" y={y} width="204" height="38" rx="6"/>
        <text className="cpu-svg-mini" x="41" y={y + 25} textLength={numberFormat === 'bin' ? 66 : undefined} lengthAdjust={numberFormat === 'bin' ? 'spacingAndGlyphs' : undefined}>{format(cell.address, 8, numberFormat)}</text>
        <text className={`cpu-svg-value cpu-memory-word ${selected && emitsTransfer ? 'is-emitting' : ''}`} data-source-pulse={selected && emitsTransfer ? 'memory' : undefined} x="121" y={y + 25} textLength={numberFormat === 'bin' ? 100 : undefined} lengthAdjust={numberFormat === 'bin' ? 'spacingAndGlyphs' : undefined}>{format(cell.value, 16, numberFormat)}</text>
      </g>;
    })}
    <text className="cpu-svg-kicker" x="34" y="422">MEMORY STATE</text>
    <text className={`cpu-svg-state cpu-memory-footer-state ${emitsMfc ? 'is-emitting' : ''}`} data-source-pulse={emitsMfc ? 'memory' : undefined} x="228" y="422" textAnchor="end">{frame.memory.state}</text>
  </g>;
}

export const CpuDatapathRenderer = memo(function CpuDatapathRenderer({ frame, numberFormat = 'hex', motionMode = 'on', duration = .52 }) {
  if (!frame) return <p className="cpu-empty-state">Preparing the teaching machine…</p>;
  const transfer = frame.transfer || null;
  const registers = frame.registers || {};
  const activeComponents = new Set(frame.activeComponents || []);
  const activeSignals = frame.signals.filter((signal) => signal.active);
  const activeSignalIds = new Set(activeSignals.map((signal) => signal.id));
  const animationMetadata = frame.animation || { stage: transfer ? 'travel' : 'focus', sourceId: [...activeComponents][0] || null, targetId: transfer?.to || null, routeId: null, controlCues: [] };
  const activeRoute = DATAPATH_ROUTES.find((route) => route.id === animationMetadata.routeId)
    || (transfer ? DATAPATH_ROUTES.find((route) => route.from === transfer.from && route.to === transfer.to) : null);
  const activeControlRoutes = CONTROL_CONNECTIONS.filter((route) => route.signals.some((signal) => activeSignalIds.has(signal)));
  const showDataRoute = activeRoute && animationMetadata.stage === 'travel';
  const showControlRoutes = animationMetadata.stage === 'arm';
  const timing = animationMetadata.timing || { spawnHoldUnits: 0, movementUnits: 0, retainAtEndpoint: false };
  const phaseWeight = Number(frame.microStep?.durationWeight) || timing.spawnHoldUnits + timing.movementUnits || 1;
  const durationUnit = duration > 0 ? duration / phaseWeight : 0;
  const spawnHoldDuration = durationUnit * timing.spawnHoldUnits;
  const movementDuration = durationUnit * timing.movementUnits;
  const staggerDuration = durationUnit * .21;
  const controlPulseSignals = new Set(animationMetadata.stage === 'arm'
    ? (animationMetadata.controlCues || []).filter((cue) => cue.originId === 'CONTROL').map((cue) => cue.signalId)
    : []);
  const execution = frame.execution || null;
  const aluDetail = execution?.status === 'calculated' || execution?.resultAvailable ? `${execution.left} + ${execution.right} = ${execution.result}` : componentState(animationMetadata, 'ALU') ? 'ready for input' : 'idle';
  const transferText = transfer ? `${transfer.from} transfers ${format(transfer.value, transfer.width, numberFormat)} to ${transfer.to}.` : frame.displayStep.detail;
  const signalText = activeSignals.map((signal) => signal.label).join(', ') || 'none';
  const teachingText = activeSignals.length
    ? activeSignals.map((signal) => signal.description).join(' ')
    : frame.displayStep.detail;
  const nextText = nextTeachingNote(frame, numberFormat);
  const stageText = animationMetadata.stage === 'focus'
    ? `${animationMetadata.sourceId} is highlighted as the source.`
    : animationMetadata.stage === 'arm'
      ? `The control unit sends ${signalText}.`
      : animationMetadata.stage === 'travel'
        ? transferText
        : `${animationMetadata.targetId || animationMetadata.sourceId} receives the value.`;
  const mobilePath = transfer
    ? { from: transfer.from === 'memory' ? 'Memory' : transfer.from, value: `${format(transfer.value, transfer.width, numberFormat)} · ${transfer.role || transfer.kind}`, to: transfer.to === 'memory' ? 'Memory' : transfer.to }
    : execution?.status === 'calculated'
      ? { from: `${execution.left} + ${execution.right}`, value: String(execution.result), to: 'ALU result' }
      : { from: animationMetadata.sourceId || 'CPU', value: animationMetadata.stage === 'arm' ? signalText : frame.microStep.label, to: animationMetadata.targetId || frame.operation.label };
  const mobileSourceRegister = registers[animationMetadata.sourceId];
  const mobileSourceValue = mobileSourceRegister
    ? format(mobileSourceRegister.value, mobileSourceRegister.width, numberFormat)
    : animationMetadata.sourceId === 'memory' ? frame.memory.state
      : animationMetadata.sourceId === 'ALU' ? aluDetail
        : animationMetadata.sourceId === 'Decoder' && execution ? `immediate ${execution.right}` : 'ready';

  return <div className="cpu-datapath-renderer" data-animation-stage={animationMetadata.stage} data-motion-mode={motionMode} data-spawn-hold-ms={Math.round(spawnHoldDuration * 1000)} data-movement-ms={Math.round(movementDuration * 1000)}>
    <p className="sr-only" role="status">Operation {frame.operation.index} of {frame.operation.total}: {frame.operation.label}. Micro-step {frame.microStep.index} of {frame.microStep.total}: {stageText} Active control signals: {signalText}.</p>
    <svg className="cpu-datapath-full" viewBox="0 0 1120 456" role="img" aria-labelledby="cpu-datapath-title cpu-datapath-description">
      <title id="cpu-datapath-title">16-bit teaching CPU connected to Main Memory</title>
      <desc id="cpu-datapath-description">{stageText} One full-height Main Memory connects directly to MAR through the address bus, MDR through the data bus, and the control unit through READ and MFC.</desc>

      <g className="cpu-svg-layer cpu-structural-layer" data-layer="structural-connections">
        <rect className="cpu-shell-outline" x="330" y="16" width="772" height="424" rx="15"/>
        {DATAPATH_ROUTES.map((route) => <path className={`cpu-path ${route.tone}`} d={route.d} data-route-id={route.id} key={route.id}/>) }
        {CONTROL_CONNECTIONS.map((connection) => <path className="cpu-control-path" d={connection.d} data-control-id={connection.id} key={connection.id}/>) }
      </g>

      <g className="cpu-svg-layer cpu-active-route-layer" data-layer="active-connections">
        {showDataRoute ? <m.path className={`cpu-path-trace ${activeRoute.tone} is-${animationMetadata.stage}`} d={activeRoute.d} data-active-route-id={activeRoute.id} initial={motionMode === 'on' && animationMetadata.stage === 'travel' ? { pathLength: 0, opacity: .35 } : false} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: motionMode === 'on' && animationMetadata.stage === 'travel' ? Math.min(duration * .34, .3) : 0, ease: 'easeOut' }}/> : null}
        {showControlRoutes ? activeControlRoutes.map((connection) => <path className="cpu-control-path is-active" d={connection.d} data-active-control-id={connection.id} key={connection.id}/>) : null}
      </g>

      <g className="cpu-svg-layer cpu-component-layer" data-layer="components-and-text">
        <text className="cpu-svg-kicker cpu-title-kicker" x="355" y="47">TEACHING CPU · 16-BIT WORD</text>
        <RouteBadge x={254} y={92} width={76}>ADDR · 8b</RouteBadge>
        <RouteBadge x={254} y={354} width={84}>DATA · 16b</RouteBadge>
        <RouteBadge x={254} y={292} width={76} tone="is-control">READ / MFC</RouteBadge>

        <MainMemorySvg frame={frame} animationMetadata={animationMetadata} numberFormat={numberFormat}/>
        <RegisterBox id="PC" x={350} y={72} register={registers.PC} animationMetadata={animationMetadata} numberFormat={numberFormat}/>
        <RegisterBox id="MAR" x={525} y={72} register={registers.MAR} animationMetadata={animationMetadata} numberFormat={numberFormat}/>
        <RegisterBox id="IR" x={700} y={72} width={170} register={registers.IR} animationMetadata={animationMetadata} numberFormat={numberFormat}/>

        <g className={`cpu-component cpu-context-unit ${componentState(animationMetadata, 'Decoder')}`} data-component-id="Decoder" data-component-state={componentState(animationMetadata, 'Decoder') || 'idle'}>
          <rect x="930" y="72" width="150" height="68" rx="8"/>
          <text className="cpu-svg-label" x="1005" y="100" textAnchor="middle">DECODER</text>
          <text className={`cpu-svg-muted ${isTransferSource(animationMetadata, 'Decoder') ? 'is-emitting' : ''}`} data-source-pulse={isTransferSource(animationMetadata, 'Decoder') ? 'Decoder' : undefined} x="1005" y="123" textAnchor="middle">{componentState(animationMetadata, 'Decoder') ? (execution ? 'immediate 13' : 'instruction fields') : 'idle'}</text>
        </g>

        <g className={`cpu-component cpu-register-bank ${componentState(animationMetadata, 'R1') ? 'has-active-register' : ''}`}>
          <rect x="350" y="184" width="360" height="84" rx="9"/>
          <text className="cpu-svg-kicker" x="367" y="207">GENERAL REGISTERS</text>
          {['R0','R1','R2','R3'].map((id, index) => {
            const state = componentState(animationMetadata, id);
            return <g className={`cpu-component cpu-register-cell ${state}`} data-component-id={id} data-component-state={state || 'idle'} key={id}>
              <rect x={366 + index * 83} y="220" width="74" height="32" rx="5"/>
              <text className={`cpu-svg-mini ${isTransferSource(animationMetadata, id) ? 'is-emitting' : ''}`} data-source-pulse={isTransferSource(animationMetadata, id) ? id : undefined} x={403 + index * 83} y="241" textAnchor="middle" textLength={numberFormat === 'bin' ? 64 : undefined} lengthAdjust={numberFormat === 'bin' ? 'spacingAndGlyphs' : undefined}>{id} {format(registers[id].value, 16, numberFormat)}</text>
            </g>;
          })}
        </g>

        <RegisterBox id="MDR" x={525} y={338} register={registers.MDR} animationMetadata={animationMetadata} numberFormat={numberFormat}/>
        <g className={`cpu-component cpu-context-unit cpu-alu-unit ${componentState(animationMetadata, 'ALU')}`} data-component-id="ALU" data-component-state={componentState(animationMetadata, 'ALU') || 'idle'}>
          <rect x="675" y="338" width="70" height="68" rx="8"/>
          <text className="cpu-svg-label" x="710" y="365" textAnchor="middle">ALU</text>
          <text className={`cpu-svg-muted cpu-svg-alu-equation ${isTransferSource(animationMetadata, 'ALU') ? 'is-emitting' : ''}`} data-source-pulse={isTransferSource(animationMetadata, 'ALU') ? 'ALU' : undefined} x="710" y="389" textAnchor="middle">{aluDetail}</text>
        </g>

        <g className={`cpu-component cpu-control-unit ${activeSignals.length ? 'is-active' : ''}`} data-component-id="CONTROL" data-component-state={activeSignals.length ? 'active' : 'idle'}>
          <rect x="760" y="170" width="320" height="250" rx="11"/>
          <text className="cpu-svg-label" x="782" y="199">CONTROL UNIT</text>
          <text className="cpu-svg-signal-label" x="782" y="222">CONTROL SIGNALS</text>
          {activeSignals.length ? activeSignals.map((signal, index) => <g className={controlPulseSignals.has(signal.id) ? 'is-emitting' : ''} data-source-pulse={controlPulseSignals.has(signal.id) ? `CONTROL:${signal.id}` : undefined} key={signal.id}>
            <rect className="cpu-signal-chip" x={782 + (index % 4) * 70} y={232 + Math.floor(index / 4) * 28} width="62" height="22" rx="5"/>
            <text className="cpu-svg-signal" x={813 + (index % 4) * 70} y={247 + Math.floor(index / 4) * 28} textAnchor="middle">{signal.label}</text>
          </g>) : <text className="cpu-svg-muted" x="782" y="248">No control signal is active</text>}
          <path className="cpu-control-divider" d="M782 272 H1058"/>
          <text className="cpu-svg-signal-label" x="782" y="294">WHAT IS HAPPENING</text>
          <SvgTeachingNote className="cpu-svg-guidance" text={teachingText} x={782} y={315}/>
          <text className="cpu-svg-signal-label cpu-svg-next-label" x="782" y="360">UP NEXT</text>
          <SvgTeachingNote className="cpu-svg-guidance cpu-svg-next" text={nextText} x={782} y={381}/>
        </g>
      </g>

      <g className="cpu-svg-layer cpu-cue-layer" data-layer="traveling-cues-and-arrivals">
        {animationMetadata.stage === 'arm' ? (animationMetadata.controlCues || []).map((cue) => <ControlCue cue={cue} route={CONTROL_CONNECTIONS.find((route) => route.id === cue.routeId)} motionMode={motionMode} spawnHoldDuration={spawnHoldDuration} movementDuration={movementDuration} staggerDuration={staggerDuration} key={cue.id}/>) : null}
        {animationMetadata.stage === 'travel' ? <ValueCue route={activeRoute} transfer={transfer} motionMode={motionMode} spawnHoldDuration={spawnHoldDuration} movementDuration={movementDuration} numberFormat={numberFormat}/> : null}
      </g>
    </svg>

    <div className="cpu-mobile-transfer" aria-label="Current CPU explanation">
      <span className="cpu-mobile-phase">Operation {frame.operation.index} / {frame.operation.total} · {frame.operation.label}</span>
      <div className={`cpu-mobile-control-unit ${controlPulseSignals.size ? 'is-emitting' : ''}`}><strong>Control Unit</strong><span>{activeSignals.map((signal) => signal.label).join(' · ') || 'No active signal'}</span></div>
      {animationMetadata.stage === 'focus' ? <div className="cpu-mobile-focus-scene"><div><span>Source component</span><b>{animationMetadata.sourceId}</b><code>{mobileSourceValue}</code></div><p>{frame.displayStep.detail}</p></div> : <div className="cpu-mobile-active-path" data-animation-stage={animationMetadata.stage}>
        <b className={`${componentState(animationMetadata, animationMetadata.sourceId)} ${animationMetadata.stage === 'travel' ? 'is-emitting' : ''}`}>{mobilePath.from}</b><span className={animationMetadata.stage === 'travel' || animationMetadata.stage === 'arm' ? 'is-live' : ''}><m.i initial={{ x: '0%' }} animate={motionMode === 'on' && (animationMetadata.stage === 'travel' || animationMetadata.stage === 'arm') ? { x: ['0%', '500%'] } : { x: '500%' }} transition={{ delay: spawnHoldDuration, duration: movementDuration, ease: 'linear' }}/></span><strong className={animationMetadata.stage === 'arm' ? 'is-control-cue' : ''}>{mobilePath.value}</strong><span className={animationMetadata.stage === 'travel' || animationMetadata.stage === 'arm' ? 'is-live' : ''}><m.i initial={{ x: '0%' }} animate={motionMode === 'on' && (animationMetadata.stage === 'travel' || animationMetadata.stage === 'arm') ? { x: ['0%', '500%'] } : { x: '500%' }} transition={{ delay: spawnHoldDuration + staggerDuration, duration: Math.max(.2, movementDuration - staggerDuration), ease: 'linear' }}/></span><b className={componentState(animationMetadata, animationMetadata.targetId)}>{mobilePath.to}</b>
      </div>}
      <div className="cpu-mobile-bus-legend"><span>Address bus</span><span>Data bus</span><span>Control bus</span></div>
      <div className="cpu-mobile-context-strip">
        {['PC','MAR','MDR','IR','R1'].map((id) => <span className={componentState(animationMetadata, id)} key={id}><small>{id}</small><code>{format(registers[id].value, registers[id].width, numberFormat)}</code></span>)}
        {['Decoder','ALU','Memory'].map((id) => <span className={componentState(animationMetadata, id === 'Memory' ? 'memory' : id)} key={id}><small>{id}</small><code>{id === 'Memory' ? frame.memory.state : id === 'ALU' && execution?.resultAvailable ? String(execution.result) : 'idle'}</code></span>)}
      </div>
      <div className="cpu-mobile-current-step"><b>{frame.microStep.index}</b><span><strong>{frame.microStep.label}</strong><p>{teachingText}</p><p className="cpu-mobile-next"><b>Up next:</b> {nextText}</p></span></div>
    </div>
  </div>;
});

export const MainMemoryPane = memo(function MainMemoryPane({ frame, numberFormat = 'hex' }) {
  if (!frame) return null;
  return <aside className="cpu-memory-pane" aria-label="Main Memory">
    <header><div><span>Main Memory</span><strong>Instructions and data · 256 × 16-bit words</strong></div><code>{frame.memory.state}</code></header>
    <div className="cpu-memory-head"><span>ADDR</span><span>WORD</span></div>
    <ol>{frame.memory.cells.map((cell) => <li className={cell.address === frame.memory.selectedAddress ? `is-selected is-${frame.memory.state}` : ''} key={cell.id}><code>{format(cell.address, 8, numberFormat)}</code><code>{format(cell.value, 16, numberFormat)}</code>{cell.address === frame.memory.selectedAddress ? <span>{frame.memory.state === 'idle' ? 'last read' : 'selected'}</span> : null}</li>)}</ol>
    <footer><span>Memory state</span><strong>{frame.memory.state}</strong></footer>
  </aside>;
});

function MicroOperationsView({ frame, controller }) {
  return <ol className="cpu-micro-operations" data-granularity={frame.playbackGranularity}>{frame.microOperations.map((operation) => {
    const current = operation.id === `operation:${frame.operation.id}`;
    return <li className={`cpu-operation-item is-${operation.status} ${current ? 'is-current' : ''}`} key={operation.id}>
      <button type="button" onClick={() => controller.seek(operation.activeEvent - 1)}><span>{operation.index}</span><strong>{operation.label}</strong><em>{operation.status}</em></button>
      <ol className="cpu-operation-substeps">{operation.substeps.map((item) => <li className={`is-${item.status}`} key={item.id}><button type="button" onClick={() => item.activeEvent ? controller.seek(item.activeEvent - 1) : undefined} disabled={!item.activeEvent}><span>{operation.index}.{item.index}</span><strong>{item.label}</strong><em>{item.status}</em></button></li>)}</ol>
    </li>;
  })}</ol>;
}

function CpuRegistersView({ frame, viewOptions }) {
  const numberFormat = viewOptions?.numberFormat || 'hex';
  return <div className="cpu-register-evidence"><div className="cpu-evidence-head"><span>Register</span><span>Previous</span><span>Current</span></div>{Object.values(frame.registers).map((register) => <div className={register.changed ? 'is-changed' : ''} key={register.id}><strong>{register.id.replace('register:', '')}</strong><code>{format(register.previous, register.width, numberFormat)}</code><code>{format(register.value, register.width, numberFormat)}</code></div>)}</div>;
}

function CpuBusesView({ frame, viewOptions }) {
  const numberFormat = viewOptions?.numberFormat || 'hex';
  return <div className="cpu-bus-evidence">
    <section><span>Address bus · 8-bit</span><strong>{format(frame.buses.address.value, 8, numberFormat)}</strong><em>{frame.buses.address.active ? 'driven' : 'idle'}</em></section>
    <section><span>Data bus · 16-bit</span><strong>{format(frame.buses.data.value, 16, numberFormat)}</strong><em>{frame.buses.data.active ? 'driven' : 'idle'}</em></section>
    <section><span>Main Memory</span><strong>{frame.memory.selectedAddress == null ? '—' : format(frame.memory.selectedAddress, 8, numberFormat)}</strong><em>{frame.memory.state}</em></section>
    <h3>Control signals</h3><div className="cpu-signal-grid">{frame.signals.map((signal) => <span className={signal.active ? 'is-active' : ''} key={signal.id}>{signal.label}<b>{signal.active ? '1' : '0'}</b></span>)}</div>
  </div>;
}

function CpuInstructionView({ frame, viewOptions }) {
  const numberFormat = viewOptions?.numberFormat || 'hex';
  if (!frame.instruction.available) return <div className="cpu-instruction-waiting"><strong>IR is not populated yet.</strong><p>Advance until MDR transfers the fetched word into the instruction register.</p></div>;
  const { fields } = frame.instruction;
  return <div className="cpu-instruction-evidence"><span>Instruction register</span><strong>{format(frame.instruction.word, 16, numberFormat)}</strong><div className="cpu-instruction-bits"><i className="opcode">{fields.opcode.bits}</i><i className="register">{fields.register.bits}</i><i className="operand">{fields.operand.bits}</i></div><dl><div><dt>Opcode</dt><dd>{frame.instruction.opcodeName}</dd></div><div><dt>Register</dt><dd>R{fields.register.value}</dd></div><div><dt>Operand / address</dt><dd>{format(fields.operand.value, 8, numberFormat)}</dd></div></dl><p>{frame.instruction.decoded ? frame.instruction.mnemonic : 'The fields are visible; decoding is the final fetch operation.'}</p>{frame.execution ? <section className={`cpu-execution-equation is-${frame.execution.status}`}><span>Guided operation</span><strong>{frame.execution.left} + {frame.execution.right} = {frame.execution.resultAvailable ? frame.execution.result : '?'}</strong><p>{frame.execution.complete ? `R1 now contains ${frame.execution.result}.` : `R1 starts at ${frame.execution.left}; follow both inputs through the ALU.`}</p></section> : null}</div>;
}

function CpuPresetControls({ activity, inputs, setInputs, viewOptions, setViewOptions }) {
  return <div className="cpu-data-controls" aria-label="CPU lab controls">
    {activity.input.presets.length > 1 ? <label><span>{activity.input.label || 'Instruction preset'}</span><select aria-label={activity.input.label || 'Instruction preset'} value={inputs.preset || activity.input.defaultPreset} onChange={(event) => setInputs({ preset: event.target.value })}>{activity.input.presets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select></label> : <div className="cpu-fixed-preset"><span>{activity.input.label || 'Instruction'}</span><strong>{activity.input.presets[0].label}</strong></div>}
    <fieldset><legend>Number format</legend>{[['hex','HEX'],['bin','BIN'],['dec','DEC']].map(([value,label]) => <button type="button" aria-pressed={viewOptions.numberFormat === value} className={viewOptions.numberFormat === value ? 'active' : ''} onClick={() => setViewOptions((current) => ({ ...current, numberFormat: value }))} key={value}>{label}</button>)}</fieldset>
  </div>;
}

BSITVisualizerRegistry.registerRenderer('cpu-datapath', CpuDatapathRenderer);
BSITVisualizerRegistry.registerEvidenceView('micro-operations', MicroOperationsView, { label: 'Operations', icon: 'list' });
BSITVisualizerRegistry.registerEvidenceView('cpu-registers', CpuRegistersView, { label: 'Registers', icon: 'registers' });
BSITVisualizerRegistry.registerEvidenceView('cpu-buses', CpuBusesView, { label: 'Buses', icon: 'bus' });
BSITVisualizerRegistry.registerEvidenceView('cpu-instruction', CpuInstructionView, { label: 'Instruction', icon: 'code' });
BSITVisualizerRegistry.registerInputControls('cpu-preset', CpuPresetControls);
