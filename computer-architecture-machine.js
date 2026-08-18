/* Deterministic, framework-neutral teaching machine for guided CPU operations. */
const ComputerArchitectureMachine = (() => {
  'use strict';

  const WIDTHS = Object.freeze({
    PC: 8, MAR: 8, addressBus: 8,
    MDR: 16, IR: 16, R0: 16, R1: 16, R2: 16, R3: 16, dataBus: 16,
    memoryAddress: 8, memoryWord: 16,
  });
  const SIGNAL_IDS = Object.freeze([
    'PCout', 'MARin', 'MARout', 'READ', 'MFC', 'MDRin', 'MDRout', 'IRin', 'PCinc',
    'R1out', 'IMMout', 'ALUinA', 'ALUinB', 'ALUadd', 'ALUout', 'R1in',
  ]);
  const SIGNAL_DEFINITIONS = Object.freeze({
    PCout: Object.freeze({ label: 'PC-out', description: 'PC sends its address.' }),
    MARin: Object.freeze({ label: 'MAR-in', description: 'MAR accepts the address.' }),
    MARout: Object.freeze({ label: 'MAR-out', description: 'MAR sends its address.' }),
    READ: Object.freeze({ label: 'READ', description: 'Main Memory starts a read.' }),
    MFC: Object.freeze({ label: 'MFC', description: 'Main Memory reports that the word is ready.' }),
    MDRin: Object.freeze({ label: 'MDR-in', description: 'MDR accepts the memory word.' }),
    MDRout: Object.freeze({ label: 'MDR-out', description: 'MDR sends the instruction word.' }),
    IRin: Object.freeze({ label: 'IR-in', description: 'IR accepts the instruction word.' }),
    PCinc: Object.freeze({ label: 'PC-inc', description: 'PC advances to the next address.' }),
    R1out: Object.freeze({ label: 'R1-out', description: 'R1 sends its value.' }),
    IMMout: Object.freeze({ label: 'IMM-out', description: 'The decoder sends the immediate value.' }),
    ALUinA: Object.freeze({ label: 'ALU-A-in', description: 'The ALU accepts input A.' }),
    ALUinB: Object.freeze({ label: 'ALU-B-in', description: 'The ALU accepts input B.' }),
    ALUadd: Object.freeze({ label: 'ALU-add', description: 'The ALU performs addition.' }),
    ALUout: Object.freeze({ label: 'ALU-out', description: 'The ALU sends its result.' }),
    R1in: Object.freeze({ label: 'R1-in', description: 'R1 accepts the result.' }),
  });
  const OPCODES = Object.freeze({
    0x3: Object.freeze({ id: 'LOAD', form: 'LOAD R{register}, [0x{operand}]' }),
    0x4: Object.freeze({ id: 'STORE', form: 'STORE [0x{operand}], R{register}' }),
    0x6: Object.freeze({ id: 'ADDI', form: 'ADDI R{register}, #0x{operand}' }),
  });
  const MICRO_OPERATION_LABELS = Object.freeze([
    'Locate the next instruction address',
    'Copy PC into MAR',
    'Read Main Memory into MDR',
    'Transfer MDR into IR',
    'Increment the PC',
    'Decode the instruction',
  ]);
  const EXECUTION_MICRO_OPERATION_LABELS = Object.freeze([
    ...MICRO_OPERATION_LABELS,
    'Send R1 value 5 to ALU input A',
    'Send immediate value 13 to ALU input B',
    'Add 5 + 13 inside the ALU',
    'Write result 18 into R1',
  ]);
  const ANIMATION_STAGES = Object.freeze(['focus', 'arm', 'travel', 'arrive']);
  const ROUTE_IDS = Object.freeze({
    pcMar: 'pc-mar', marMemory: 'mar-memory', memoryMdr: 'memory-mdr', mdrIr: 'mdr-ir',
    irDecoder: 'ir-decoder', r1Alu: 'r1-alu', decoderAlu: 'decoder-alu', aluR1: 'alu-r1',
  });
  const CUE_SPAWN_HOLD_UNITS = 1.54;
  const ANIMATION_TIMING = Object.freeze({
    focus: Object.freeze({ spawnHoldUnits: 0, movementUnits: 0, retainAtEndpoint: false }),
    arm: Object.freeze({ spawnHoldUnits: CUE_SPAWN_HOLD_UNITS, movementUnits: 1.25, retainAtEndpoint: true }),
    travel: Object.freeze({ spawnHoldUnits: CUE_SPAWN_HOLD_UNITS, movementUnits: 1.73, retainAtEndpoint: true }),
    arrive: Object.freeze({ spawnHoldUnits: 0, movementUnits: 0, retainAtEndpoint: false }),
  });
  const DURATION_WEIGHTS = Object.freeze({ focus: 0.87, arm: 2.79, travel: 3.27, arrive: 0.77 });
  const CONTROL_CUE_BY_SIGNAL = Object.freeze({
    PCout: Object.freeze({ routeId: 'control-pc', direction: 'from-cu' }),
    PCinc: Object.freeze({ routeId: 'control-pc', direction: 'from-cu' }),
    MARin: Object.freeze({ routeId: 'control-mar', direction: 'from-cu' }),
    MARout: Object.freeze({ routeId: 'control-mar', direction: 'from-cu' }),
    READ: Object.freeze({ routeId: 'control-memory', direction: 'from-cu' }),
    MFC: Object.freeze({ routeId: 'control-memory', direction: 'to-cu' }),
    MDRin: Object.freeze({ routeId: 'control-mdr', direction: 'from-cu' }),
    MDRout: Object.freeze({ routeId: 'control-mdr', direction: 'from-cu' }),
    IRin: Object.freeze({ routeId: 'control-ir', direction: 'from-cu' }),
    R1out: Object.freeze({ routeId: 'control-r1', direction: 'from-cu' }),
    R1in: Object.freeze({ routeId: 'control-r1', direction: 'from-cu' }),
    IMMout: Object.freeze({ routeId: 'control-decoder', direction: 'from-cu' }),
    ALUinA: Object.freeze({ routeId: 'control-alu', direction: 'from-cu' }),
    ALUinB: Object.freeze({ routeId: 'control-alu', direction: 'from-cu' }),
    ALUadd: Object.freeze({ routeId: 'control-alu', direction: 'from-cu' }),
    ALUout: Object.freeze({ routeId: 'control-alu', direction: 'from-cu' }),
  });

  const PRESETS = Object.freeze([
    Object.freeze({
      id: 'load-r1-a4', label: 'LOAD R1, [0xA4]', pc: 0x12, word: 0x31A4,
      registers: Object.freeze([0x0000, 0x0042, 0x00F0, 0x0007]),
      mnemonic: 'LOAD R1, [0xA4]', description: 'Fetch a direct load instruction from address 0x12.',
    }),
    Object.freeze({
      id: 'store-r2-b0', label: 'STORE [0xB0], R2', pc: 0x7E, word: 0x42B0,
      registers: Object.freeze([0x0000, 0x0042, 0x00F0, 0x0007]),
      mnemonic: 'STORE [0xB0], R2', description: 'Fetch a direct store instruction from address 0x7E.',
    }),
    Object.freeze({
      id: 'addi-r3-07', label: 'ADDI R3, #0x07 · wraparound', pc: 0xFF, word: 0x6307,
      registers: Object.freeze([0x0000, 0x0042, 0x00F0, 0x0010]),
      mnemonic: 'ADDI R3, #0x07', description: 'Fetch an immediate add at 0xFF and watch PC wrap to 0x00.',
    }),
  ]);
  const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));
  const EXECUTION_PRESETS = Object.freeze([
    Object.freeze({
      id: 'addi-five-thirteen', label: '5 + 13 → R1', pc: 0x20, word: 0x610D,
      registers: Object.freeze([0x0000, 0x0005, 0x0000, 0x0000]),
      mnemonic: 'ADDI R1, #0x0D', description: 'Fetch and execute 5 + 13, then write 18 back into R1.',
      equation: Object.freeze({ left: 5, right: 13, result: 18, destination: 'R1' }),
    }),
  ]);
  const EXECUTION_PRESET_BY_ID = new Map(EXECUTION_PRESETS.map((preset) => [preset.id, preset]));

  function assertUnsigned(value, width, label) {
    if (!Number.isInteger(value) || value < 0 || value > (2 ** width) - 1) {
      throw new RangeError(`${label} must be an unsigned ${width}-bit value.`);
    }
    return value;
  }

  function validatePreset(preset) {
    if (!preset || !preset.id || !preset.label) throw new Error('CPU presets require an id and label.');
    assertUnsigned(preset.pc, WIDTHS.PC, 'PC');
    assertUnsigned(preset.word, WIDTHS.memoryWord, 'Instruction word');
    if (!Array.isArray(preset.registers) || preset.registers.length !== 4) throw new Error('CPU presets require four general registers.');
    preset.registers.forEach((value, index) => assertUnsigned(value, 16, `R${index}`));
    return true;
  }

  function hex(value, width) {
    return Number(value).toString(16).toUpperCase().padStart(Math.ceil(width / 4), '0');
  }

  function decodeInstruction(word) {
    assertUnsigned(word, 16, 'Instruction word');
    const opcode = (word >>> 12) & 0xF;
    const register = (word >>> 8) & 0xF;
    const operand = word & 0xFF;
    const definition = OPCODES[opcode] || Object.freeze({ id: 'UNKNOWN', form: 'UNKNOWN 0x{operand}' });
    const mnemonic = definition.form.replace('{register}', String(register)).replace('{operand}', hex(operand, 8));
    return Object.freeze({
      word, opcode, register, operand,
      opcodeName: definition.id,
      mnemonic,
      fields: Object.freeze({
        opcode: Object.freeze({ value: opcode, width: 4, bits: opcode.toString(2).padStart(4, '0') }),
        register: Object.freeze({ value: register, width: 4, bits: register.toString(2).padStart(4, '0') }),
        operand: Object.freeze({ value: operand, width: 8, bits: operand.toString(2).padStart(8, '0') }),
      }),
    });
  }

  function formatValue(value, width, format = 'hex') {
    assertUnsigned(value, width, 'Value');
    if (format === 'bin') return `0b${value.toString(2).padStart(width, '0')}`;
    if (format === 'dec') return String(value);
    return `0x${hex(value, width)}`;
  }

  function fillerWord(address) {
    return ((address * 0x101) ^ 0x5A5A) & 0xFFFF;
  }

  function memoryFor(preset) {
    const addresses = [-2, -1, 0, 1, 2, 3].map((offset) => (preset.pc + offset + 0x100) & 0xFF);
    return Object.freeze(addresses.map((address) => Object.freeze({
      id: `memory:${hex(address, 8)}`,
      address,
      value: address === preset.pc ? preset.word : fillerWord(address),
    })));
  }

  function registerFrame(current, previous) {
    const output = {};
    ['PC', 'MAR', 'MDR', 'IR', 'R0', 'R1', 'R2', 'R3'].forEach((name) => {
      output[name] = Object.freeze({
        id: `register:${name}`,
        width: WIDTHS[name],
        previous: previous[name],
        value: current[name],
        changed: previous[name] !== current[name],
      });
    });
    return Object.freeze(output);
  }

  function signalFrame(activeIds) {
    const active = new Set(activeIds);
    return Object.freeze(SIGNAL_IDS.map((id) => Object.freeze({ id, ...SIGNAL_DEFINITIONS[id], active: active.has(id) })));
  }

  function normalizeGranularity(value) {
    return value === 'micro' ? 'micro' : 'operation';
  }

  function phase(id, label, message, options = {}) {
    return Object.freeze({ id, label, message, durationWeight: options.durationWeight || 1, ...options });
  }

  function animation(stage, sourceId, targetId = null, routeId = null) {
    if (!ANIMATION_STAGES.includes(stage)) throw new Error(`Unsupported CPU animation stage: ${stage}`);
    return Object.freeze({ stage, sourceId, targetId, routeId, timing: ANIMATION_TIMING[stage] });
  }

  function controlCuesFor(signals, phaseId) {
    return Object.freeze(signals.map((signalId, index) => {
      const route = CONTROL_CUE_BY_SIGNAL[signalId];
      if (!route) throw new Error(`Missing control cue route for ${signalId}.`);
      return Object.freeze({
        id: `control-cue:${phaseId}:${signalId}`,
        signalId,
        routeId: route.routeId,
        direction: route.direction,
        originId: route.direction === 'to-cu' ? 'memory' : 'CONTROL',
        order: index + 1,
      });
    }));
  }

  function operationSpecsFor(preset, includeExecution) {
    const decoded = decodeInstruction(preset.word);
    const addressTokenId = `address-token:${preset.id}`;
    const wordTokenId = `instruction-word:${preset.id}`;
    const operations = [
      {
        id: 'locate-pc', label: MICRO_OPERATION_LABELS[0],
        summary: `Begin at PC, which holds the next instruction address ${formatValue(preset.pc, 8)}.`,
        phases: [phase('pc-source', 'Find the source', `PC is the source and currently holds ${formatValue(preset.pc, 8)}.`, { activeComponents: ['PC'], animation: animation('focus', 'PC'), durationWeight: DURATION_WEIGHTS.focus })],
      },
      {
        id: 'copy-pc-mar', label: MICRO_OPERATION_LABELS[1],
        summary: `Copy instruction address ${formatValue(preset.pc, 8)} from PC into MAR.`,
        phases: [
          phase('focus-pc', 'Focus PC', `PC holds the source address ${formatValue(preset.pc, 8)}.`, { activeComponents: ['PC'], animation: animation('focus', 'PC', 'MAR', ROUTE_IDS.pcMar), durationWeight: DURATION_WEIGHTS.focus }),
          phase('enable-pc-mar', 'Enable PC and MAR', 'The control unit turns on PC-out and MAR-in.', { signals: ['PCout', 'MARin'], activeComponents: ['PC', 'MAR'], animation: animation('arm', 'PC', 'MAR', ROUTE_IDS.pcMar), durationWeight: DURATION_WEIGHTS.arm }),
          phase('move-pc-mar', 'Move the address', `The address ${formatValue(preset.pc, 8)} travels from PC to MAR.`, { signals: ['PCout', 'MARin'], transfer: { id: addressTokenId, kind: 'address', role: 'address', width: 8, value: preset.pc, from: 'PC', to: 'MAR' }, animation: animation('travel', 'PC', 'MAR', ROUTE_IDS.pcMar), durationWeight: DURATION_WEIGHTS.travel }),
          phase('capture-mar', 'Capture in MAR', `MAR now holds ${formatValue(preset.pc, 8)}.`, { activeComponents: ['MAR'], animation: animation('arrive', 'PC', 'MAR', ROUTE_IDS.pcMar), mutate(next) { next.MAR = preset.pc; }, durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
      {
        id: 'read-memory-mdr', label: MICRO_OPERATION_LABELS[2],
        summary: 'Read the instruction word from Main Memory into MDR.',
        phases: [
          phase('focus-mar', 'Focus MAR', `MAR supplies memory address ${formatValue(preset.pc, 8)}.`, { activeComponents: ['MAR'], animation: animation('focus', 'MAR', 'memory', ROUTE_IDS.marMemory), durationWeight: DURATION_WEIGHTS.focus }),
          phase('assert-read', 'Request a memory read', 'The control unit turns on MAR-out and READ.', { signals: ['MARout', 'READ'], activeComponents: ['MAR', 'memory'], memoryState: 'addressing', animation: animation('arm', 'MAR', 'memory', ROUTE_IDS.marMemory), durationWeight: DURATION_WEIGHTS.arm }),
          phase('address-memory', 'Send the address', `Address ${formatValue(preset.pc, 8)} travels over the address bus into Main Memory.`, { signals: ['MARout', 'READ'], addressBus: preset.pc, memoryState: 'addressing', transfer: { id: addressTokenId, kind: 'address', role: 'address', width: 8, value: preset.pc, from: 'MAR', to: 'memory' }, animation: animation('travel', 'MAR', 'memory', ROUTE_IDS.marMemory), durationWeight: DURATION_WEIGHTS.travel }),
          phase('select-memory-word', 'Select the memory word', 'Main Memory selects the addressed instruction and begins the read.', { signals: ['READ'], addressBus: preset.pc, memoryState: 'reading', selectedAddress: preset.pc, activeComponents: ['memory'], animation: animation('arrive', 'MAR', 'memory', ROUTE_IDS.marMemory), durationWeight: DURATION_WEIGHTS.arrive }),
          phase('memory-ready', 'Memory finishes the read', `MFC reports that ${formatValue(preset.word, 16)} is ready; the control unit turns on MDR-in.`, { signals: ['MFC', 'MDRin'], dataBus: preset.word, memoryState: 'ready', selectedAddress: preset.pc, activeComponents: ['memory', 'MDR'], animation: animation('arm', 'memory', 'MDR', ROUTE_IDS.memoryMdr), durationWeight: DURATION_WEIGHTS.arm }),
          phase('memory-mdr', 'Move the instruction word', `The word ${formatValue(preset.word, 16)} travels directly from Main Memory to MDR.`, { signals: ['MFC', 'MDRin'], dataBus: preset.word, memoryState: 'ready', selectedAddress: preset.pc, transfer: { id: wordTokenId, kind: 'instruction', role: 'instruction', width: 16, value: preset.word, from: 'memory', to: 'MDR' }, animation: animation('travel', 'memory', 'MDR', ROUTE_IDS.memoryMdr), durationWeight: DURATION_WEIGHTS.travel }),
          phase('capture-mdr', 'Capture in MDR', `MDR captures ${formatValue(preset.word, 16)}.`, { activeComponents: ['MDR'], memoryState: 'idle', selectedAddress: preset.pc, animation: animation('arrive', 'memory', 'MDR', ROUTE_IDS.memoryMdr), mutate(next) { next.MDR = preset.word; }, durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
      {
        id: 'transfer-mdr-ir', label: MICRO_OPERATION_LABELS[3],
        summary: `Transfer instruction word ${formatValue(preset.word, 16)} from MDR into IR.`,
        phases: [
          phase('focus-mdr', 'Focus MDR', `MDR is the source and holds ${formatValue(preset.word, 16)}.`, { activeComponents: ['MDR'], animation: animation('focus', 'MDR', 'IR', ROUTE_IDS.mdrIr), durationWeight: DURATION_WEIGHTS.focus }),
          phase('enable-mdr-ir', 'Enable MDR and IR', 'The control unit turns on MDR-out and IR-in.', { signals: ['MDRout', 'IRin'], activeComponents: ['MDR', 'IR'], animation: animation('arm', 'MDR', 'IR', ROUTE_IDS.mdrIr), durationWeight: DURATION_WEIGHTS.arm }),
          phase('move-mdr-ir', 'Move the instruction word', `The word ${formatValue(preset.word, 16)} travels from MDR to IR.`, { signals: ['MDRout', 'IRin'], transfer: { id: wordTokenId, kind: 'instruction', role: 'instruction', width: 16, value: preset.word, from: 'MDR', to: 'IR' }, animation: animation('travel', 'MDR', 'IR', ROUTE_IDS.mdrIr), durationWeight: DURATION_WEIGHTS.travel }),
          phase('capture-ir', 'Capture in IR', `IR captures ${formatValue(preset.word, 16)}.`, { activeComponents: ['IR'], instructionAvailable: true, animation: animation('arrive', 'MDR', 'IR', ROUTE_IDS.mdrIr), mutate(next) { next.IR = preset.word; }, durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
      {
        id: 'increment-pc', label: MICRO_OPERATION_LABELS[4],
        summary: `Advance PC to ${formatValue((preset.pc + 1) & 0xFF, 8)}.`,
        phases: [
          phase('focus-pc-increment', 'Focus PC', `PC still contains ${formatValue(preset.pc, 8)}.`, { activeComponents: ['PC'], animation: animation('focus', 'PC', 'PC'), durationWeight: DURATION_WEIGHTS.focus }),
          phase('assert-pcinc', 'Enable the increment', 'The control unit turns on PC-inc.', { signals: ['PCinc'], activeComponents: ['PC'], animation: animation('arm', 'PC', 'PC'), durationWeight: DURATION_WEIGHTS.arm }),
          phase('update-pc', 'Store the next address', `PC becomes ${formatValue((preset.pc + 1) & 0xFF, 8)}${preset.pc === 0xFF ? ' after wrapping around' : ''}.`, { activeComponents: ['PC'], animation: animation('arrive', 'PC', 'PC'), mutate(next) { next.PC = (preset.pc + 1) & 0xFF; }, durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
      {
        id: 'decode-instruction', label: MICRO_OPERATION_LABELS[5],
        summary: `Decode ${decoded.mnemonic} from the instruction register.`,
        phases: [
          phase('focus-ir', 'Focus IR', `IR is the source and holds ${formatValue(preset.word, 16)}.`, { activeComponents: ['IR'], animation: animation('focus', 'IR', 'Decoder', ROUTE_IDS.irDecoder), durationWeight: DURATION_WEIGHTS.focus }),
          phase('ir-decoder', 'Send IR to the decoder', 'The instruction fields travel from IR into the decoder.', { transfer: { id: `decode-token:${preset.id}`, kind: 'instruction', role: 'instruction', width: 16, value: preset.word, from: 'IR', to: 'Decoder' }, animation: animation('travel', 'IR', 'Decoder', ROUTE_IDS.irDecoder), durationWeight: DURATION_WEIGHTS.travel }),
          phase('decoded', 'Expose the decoded instruction', `${decoded.mnemonic} is ready for execution.`, { activeComponents: ['Decoder'], decodedAvailable: true, animation: animation('arrive', 'IR', 'Decoder', ROUTE_IDS.irDecoder), durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
    ];

    if (!includeExecution) return operations;
    const { left, right, result } = preset.equation;
    operations.push(
      {
        id: 'r1-alu-a', label: EXECUTION_MICRO_OPERATION_LABELS[6],
        summary: `Send R1 value ${left} to ALU input A.`,
        phases: [
          phase('focus-r1', 'Focus R1', `R1 is the source and holds ${left}.`, { activeComponents: ['R1'], animation: animation('focus', 'R1', 'ALU', ROUTE_IDS.r1Alu), executionPatch: { status: 'loading-operands', activeOperand: 'left' }, durationWeight: DURATION_WEIGHTS.focus }),
          phase('enable-r1-alu', 'Enable R1 and ALU A', 'The control unit turns on R1-out and ALU-A-in.', { signals: ['R1out', 'ALUinA'], activeComponents: ['R1', 'ALU'], animation: animation('arm', 'R1', 'ALU', ROUTE_IDS.r1Alu), durationWeight: DURATION_WEIGHTS.arm }),
          phase('move-r1-alu', 'Move operand 5', `${left} travels from R1 to ALU input A.`, { signals: ['R1out', 'ALUinA'], transfer: { id: `left-operand:${preset.id}`, kind: 'operand', role: 'operand', width: 16, value: left, from: 'R1', to: 'ALU' }, animation: animation('travel', 'R1', 'ALU', ROUTE_IDS.r1Alu), durationWeight: DURATION_WEIGHTS.travel }),
          phase('latch-alu-a', 'Latch ALU input A', `ALU input A now holds ${left}.`, { activeComponents: ['ALU'], animation: animation('arrive', 'R1', 'ALU', ROUTE_IDS.r1Alu), durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
      {
        id: 'immediate-alu-b', label: EXECUTION_MICRO_OPERATION_LABELS[7],
        summary: `Send immediate value ${right} to ALU input B.`,
        phases: [
          phase('focus-immediate', 'Focus the decoded immediate', `The decoder supplies immediate value ${right}.`, { activeComponents: ['Decoder'], animation: animation('focus', 'Decoder', 'ALU', ROUTE_IDS.decoderAlu), executionPatch: { status: 'loading-operands', activeOperand: 'right' }, durationWeight: DURATION_WEIGHTS.focus }),
          phase('enable-immediate-alu', 'Enable immediate and ALU B', 'The control unit turns on IMM-out and ALU-B-in.', { signals: ['IMMout', 'ALUinB'], activeComponents: ['Decoder', 'ALU'], animation: animation('arm', 'Decoder', 'ALU', ROUTE_IDS.decoderAlu), durationWeight: DURATION_WEIGHTS.arm }),
          phase('move-immediate-alu', 'Move operand 13', `${right} travels from the decoder to ALU input B.`, { signals: ['IMMout', 'ALUinB'], transfer: { id: `right-operand:${preset.id}`, kind: 'operand', role: 'operand', width: 16, value: right, from: 'Decoder', to: 'ALU' }, animation: animation('travel', 'Decoder', 'ALU', ROUTE_IDS.decoderAlu), durationWeight: DURATION_WEIGHTS.travel }),
          phase('latch-alu-b', 'Latch ALU input B', `ALU input B now holds ${right}.`, { activeComponents: ['ALU'], animation: animation('arrive', 'Decoder', 'ALU', ROUTE_IDS.decoderAlu), durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
      {
        id: 'add-alu', label: EXECUTION_MICRO_OPERATION_LABELS[8],
        summary: `Add ${left} + ${right} inside the ALU.`,
        phases: [
          phase('focus-alu-inputs', 'Focus both ALU inputs', `The ALU has ${left} and ${right}.`, { activeComponents: ['ALU'], animation: animation('focus', 'ALU', 'ALU'), durationWeight: DURATION_WEIGHTS.focus }),
          phase('assert-aluadd', 'Enable addition', 'The control unit turns on ALU-add.', { signals: ['ALUadd'], activeComponents: ['ALU'], animation: animation('arm', 'ALU', 'ALU'), durationWeight: DURATION_WEIGHTS.arm }),
          phase('alu-result', 'Produce the result', `${left} + ${right} produces ${result}.`, { activeComponents: ['ALU'], animation: animation('arrive', 'ALU', 'ALU'), executionPatch: { status: 'calculated', resultAvailable: true }, durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
      {
        id: 'write-r1', label: EXECUTION_MICRO_OPERATION_LABELS[9],
        summary: `Write ALU result ${result} back into R1.`,
        phases: [
          phase('focus-alu-result', 'Focus the ALU result', `The ALU is the source and holds ${result}.`, { activeComponents: ['ALU'], animation: animation('focus', 'ALU', 'R1', ROUTE_IDS.aluR1), executionPatch: { status: 'write-back', resultAvailable: true }, durationWeight: DURATION_WEIGHTS.focus }),
          phase('enable-alu-r1', 'Enable ALU and R1', 'The control unit turns on ALU-out and R1-in.', { signals: ['ALUout', 'R1in'], activeComponents: ['ALU', 'R1'], animation: animation('arm', 'ALU', 'R1', ROUTE_IDS.aluR1), durationWeight: DURATION_WEIGHTS.arm }),
          phase('move-alu-r1', 'Move result 18', `${result} travels from the ALU to R1.`, { signals: ['ALUout', 'R1in'], transfer: { id: `addition-result:${preset.id}`, kind: 'result', role: 'result', width: 16, value: result, from: 'ALU', to: 'R1' }, animation: animation('travel', 'ALU', 'R1', ROUTE_IDS.aluR1), durationWeight: DURATION_WEIGHTS.travel }),
          phase('capture-r1', 'Capture the result in R1', `R1 now contains ${result}; Main Memory is unchanged.`, { activeComponents: ['R1'], animation: animation('arrive', 'ALU', 'R1', ROUTE_IDS.aluR1), mutate(next) { next.R1 = result; }, executionPatch: { status: 'complete', resultAvailable: true, complete: true }, terminal: true, durationWeight: DURATION_WEIGHTS.arrive }),
        ],
      },
    );
    return operations;
  }

  function buildOperationGraph(preset, includeExecution) {
    validatePreset(preset);
    const decoded = decodeInstruction(preset.word);
    if (decoded.mnemonic !== preset.mnemonic) throw new Error(`Preset ${preset.id} mnemonic does not match its instruction word.`);
    if (includeExecution) {
      const { left, right, result, destination } = preset.equation || {};
      if (decoded.opcodeName !== 'ADDI' || preset.registers[decoded.register] !== left || decoded.operand !== right
        || ((left + right) & 0xFFFF) !== result || destination !== `R${decoded.register}`) {
        throw new Error(`Execution preset ${preset.id} does not match its declared ADDI equation.`);
      }
    }

    const memory = memoryFor(preset);
    const memorySnapshot = Object.freeze(Object.fromEntries(memory.map((cell) => [cell.address, cell.value])));
    const specs = operationSpecsFor(preset, includeExecution);
    let registers = { PC: preset.pc, MAR: 0, MDR: 0, IR: 0, R0: preset.registers[0], R1: preset.registers[1], R2: preset.registers[2], R3: preset.registers[3] };
    let memoryState = 'idle';
    let selectedAddress = null;
    let instructionAvailable = false;
    let decodedAvailable = false;
    let execution = includeExecution ? {
      kind: 'add-immediate', equation: `${preset.equation.left} + ${preset.equation.right}`,
      ...preset.equation, status: 'fetching', activeOperand: null, resultAvailable: false, complete: false,
    } : null;

    const operations = specs.map((operation, operationIndex) => {
      const phases = operation.phases.map((spec) => {
        const previousRegisters = { ...registers };
        const nextRegisters = { ...registers };
        spec.mutate?.(nextRegisters);
        registers = nextRegisters;
        if (spec.memoryState !== undefined) memoryState = spec.memoryState;
        if (spec.selectedAddress !== undefined) selectedAddress = spec.selectedAddress;
        if (spec.instructionAvailable !== undefined) instructionAvailable = spec.instructionAvailable;
        if (spec.decodedAvailable !== undefined) decodedAvailable = spec.decodedAvailable;
        if (execution && spec.executionPatch) execution = { ...execution, ...spec.executionPatch };
        if (execution && spec.id === 'decoded') execution = { ...execution, status: 'decoded' };
        const signals = spec.signals || [];
        const animationMetadata = Object.freeze({
          ...(spec.animation || animation('focus', (spec.activeComponents || [])[0] || null)),
          controlCues: controlCuesFor(signals, spec.id),
        });
        const activeComponents = [
          ...(spec.transfer ? [spec.transfer.from, spec.transfer.to] : []),
          ...(signals.length ? ['CONTROL'] : []),
          ...(spec.activeComponents || []),
        ].filter((id, index, items) => items.indexOf(id) === index);
        const frame = {
          kind: 'cpu-datapath',
          phase: Object.freeze({ id: operationIndex < 6 ? 'fetch' : 'execute', label: operationIndex < 6 ? 'Instruction fetch' : 'Execute ADDI', status: spec.terminal ? 'complete' : 'active' }),
          registers: registerFrame(registers, previousRegisters),
          memory: Object.freeze({ cells: memory, selectedAddress, state: memoryState, unchanged: true, snapshot: memorySnapshot }),
          buses: Object.freeze({
            address: Object.freeze({ id: 'address-bus', width: 8, value: spec.addressBus ?? null, active: spec.addressBus != null }),
            data: Object.freeze({ id: 'data-bus', width: 16, value: spec.dataBus ?? null, active: spec.dataBus != null }),
            control: Object.freeze({ activeSignalIds: Object.freeze([...signals]) }),
          }),
          signals: signalFrame(signals),
          instruction: Object.freeze({ id: `instruction-word:${preset.id}`, word: preset.word, available: instructionAvailable, decoded: decodedAvailable, opcodeName: decoded.opcodeName, mnemonic: decoded.mnemonic, fields: decoded.fields }),
          transfer: spec.transfer ? Object.freeze({ ...spec.transfer, role: spec.transfer.role || spec.transfer.kind }) : null,
          animation: animationMetadata,
          activeComponents: Object.freeze(activeComponents),
          preset: Object.freeze({ id: preset.id, label: preset.label, mnemonic: preset.mnemonic }),
          ...(execution ? { execution: Object.freeze({ ...execution }) } : {}),
        };
        return Object.freeze({ id: `${operation.id}:${spec.id}`, label: spec.label, message: spec.message, durationWeight: spec.durationWeight, terminal: !!spec.terminal, frame: Object.freeze(frame) });
      });
      return Object.freeze({ id: operation.id, index: operationIndex + 1, label: operation.label, summary: operation.summary, phases: Object.freeze(phases) });
    });
    return Object.freeze(operations);
  }

  function evidenceFor(operations, currentOperationIndex, currentMicroIndex, granularity, terminal) {
    let globalStart = 0;
    return Object.freeze(operations.map((operation, operationIndex) => {
      const operationStatus = operationIndex < currentOperationIndex ? 'complete' : operationIndex > currentOperationIndex ? 'upcoming' : terminal ? 'complete' : 'active';
      const parentEvent = granularity === 'operation' ? operationIndex + 1 : globalStart + 1;
      const substeps = Object.freeze(operation.phases.map((item, microIndex) => {
        const status = operationIndex < currentOperationIndex || (operationIndex === currentOperationIndex && microIndex < currentMicroIndex)
          ? 'complete'
          : operationIndex > currentOperationIndex || microIndex > currentMicroIndex ? 'upcoming' : terminal ? 'complete' : 'active';
        return Object.freeze({ id: `micro-step:${item.id}`, index: microIndex + 1, label: item.label, status, activeEvent: granularity === 'micro' ? globalStart + microIndex + 1 : null });
      }));
      const result = Object.freeze({ id: `operation:${operation.id}`, index: operationIndex + 1, label: operation.label, status: operationStatus, activeEvent: parentEvent, substeps });
      globalStart += operation.phases.length;
      return result;
    }));
  }

  function decorateFrame(operations, operationIndex, microIndex, granularity) {
    const operation = operations[operationIndex];
    const micro = operation.phases[microIndex];
    const terminal = operationIndex === operations.length - 1 && microIndex === operation.phases.length - 1;
    return Object.freeze({
      ...micro.frame,
      operation: Object.freeze({ id: operation.id, index: operationIndex + 1, total: operations.length, label: operation.label, status: terminal ? 'complete' : 'active' }),
      microStep: Object.freeze({ id: micro.id, parentOperationId: operation.id, index: microIndex + 1, total: operation.phases.length, label: micro.label, status: terminal ? 'complete' : 'active', durationWeight: micro.durationWeight }),
      displayStep: Object.freeze({ index: operationIndex + 1, total: operations.length, label: operation.label, detail: micro.message }),
      microOperations: evidenceFor(operations, operationIndex, microIndex, granularity, terminal),
      playbackGranularity: granularity,
    });
  }

  function timelineFromGraph(activityId, domain, preset, operations, granularity) {
    const normalized = normalizeGranularity(granularity);
    if (normalized === 'micro') {
      const flattened = [];
      operations.forEach((operation, operationIndex) => {
        operation.phases.forEach((micro, microIndex) => {
          const frame = decorateFrame(operations, operationIndex, microIndex, normalized);
          const globalIndex = flattened.length;
          const sequenceId = `cpu-sequence:${preset.id}:${micro.id}`;
          const transition = globalIndex === 0 ? null : { kind: 'cpu-micro-step', wait: true, sequenceId, durationUnits: micro.durationWeight, phases: [{ id: micro.id, label: micro.label, durationWeight: micro.durationWeight, frame }] };
          flattened.push(BSITPlayback.timelineEvent({
            id: `${activityId}:${preset.id}:micro:${micro.id}`, domain, type: micro.id, message: micro.message, frame, transition,
            source: { line: operationIndex + 1, code: operation.label }, segment: Object.freeze({ id: operation.id, index: operationIndex + 1 }),
            terminal: operationIndex === operations.length - 1 && microIndex === operation.phases.length - 1,
          }));
        });
      });
      return Object.freeze(flattened);
    }

    return Object.freeze(operations.map((operation, operationIndex) => {
      const frames = operation.phases.map((micro, microIndex) => ({ id: micro.id, label: micro.label, durationWeight: micro.durationWeight, frame: decorateFrame(operations, operationIndex, microIndex, normalized) }));
      const sequenceId = `cpu-sequence:${preset.id}:${operation.id}`;
      const transition = operationIndex === 0 ? null : { kind: 'cpu-operation', wait: true, sequenceId, durationUnits: frames.reduce((total, item) => total + item.durationWeight, 0), phases: frames };
      return BSITPlayback.timelineEvent({
        id: `${activityId}:${preset.id}:operation:${operation.id}`, domain, type: operation.id, message: operation.summary, frame: frames.at(-1).frame, transition,
        source: { line: operationIndex + 1, code: operation.label }, segment: Object.freeze({ id: operation.id, index: operationIndex + 1 }), boundary: true,
        terminal: operationIndex === operations.length - 1,
      });
    }));
  }

  function resolveFetchPreset(presetOrId) {
    const preset = typeof presetOrId === 'string' ? PRESET_BY_ID.get(presetOrId) : presetOrId;
    if (!preset) throw new Error(`Unknown CPU preset: ${presetOrId}`);
    return preset;
  }

  function resolveExecutionPreset(presetOrId) {
    const preset = typeof presetOrId === 'string' ? EXECUTION_PRESET_BY_ID.get(presetOrId) : presetOrId;
    if (!preset) throw new Error(`Unknown CPU execution preset: ${presetOrId}`);
    return preset;
  }

  function timelineFor(presetOrId = PRESETS[0].id, options = {}) {
    const preset = resolveFetchPreset(presetOrId);
    return timelineFromGraph('architecture-fetch-cycle', 'cpu-fetch', preset, buildOperationGraph(preset, false), options.granularity);
  }

  function executionTimelineFor(presetOrId = EXECUTION_PRESETS[0].id, options = {}) {
    const preset = resolveExecutionPreset(presetOrId);
    return timelineFromGraph('architecture-add-immediate', 'cpu-execute', preset, buildOperationGraph(preset, true), options.granularity);
  }

  function run(presetOrId, options = {}) {
    const preset = presetOrId ? resolveFetchPreset(presetOrId) : PRESETS[0];
    const events = timelineFor(preset, options);
    return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: true, output: true }, result: Object.freeze({ presetId: preset.id, granularity: normalizeGranularity(options.granularity), finalFrame: events.at(-1).frame }) });
  }

  function runExecution(presetOrId, options = {}) {
    const preset = presetOrId ? resolveExecutionPreset(presetOrId) : EXECUTION_PRESETS[0];
    const events = executionTimelineFor(preset, options);
    return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: true, output: true }, result: Object.freeze({ presetId: preset.id, granularity: normalizeGranularity(options.granularity), finalFrame: events.at(-1).frame }) });
  }

  PRESETS.forEach(validatePreset);
  EXECUTION_PRESETS.forEach(validatePreset);

  return Object.freeze({
    WIDTHS, SIGNAL_IDS, SIGNAL_DEFINITIONS, OPCODES, PRESETS, EXECUTION_PRESETS,
    ANIMATION_STAGES, ROUTE_IDS, DURATION_WEIGHTS,
    MICRO_OPERATION_LABELS, EXECUTION_MICRO_OPERATION_LABELS,
    validatePreset, decodeInstruction, formatValue, normalizeGranularity,
    getPreset(id) { return PRESET_BY_ID.get(id) || null; },
    listPresets() { return PRESETS; },
    getExecutionPreset(id) { return EXECUTION_PRESET_BY_ID.get(id) || null; },
    listExecutionPresets() { return EXECUTION_PRESETS; },
    timelineFor, executionTimelineFor, run, runExecution,
  });
})();
