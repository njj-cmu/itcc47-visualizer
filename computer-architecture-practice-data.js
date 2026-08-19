/* Versioned, identity-free local practice data for Computer Architecture. */
const ComputerArchitecturePractice = (() => {
  'use strict';
  const CONTENT_VERSION = 1;
  const STORAGE_KEY = 'computer-architecture.practice:v1';
  const SECTIONS = Object.freeze([
    Object.freeze({ id: 'fetch', title: 'Fetch', description: 'Trace the address and instruction word through the fetch path.' }),
    Object.freeze({ id: 'decode', title: 'Decode', description: 'Read the opcode, register, and operand fields inside IR.' }),
    Object.freeze({ id: 'execute', title: 'Execute', description: 'Check the guided 5 + 13 ADDI result and its machine-state effects.' }),
  ]);
  const QUESTIONS = Object.freeze([
    Object.freeze({
      id: 'fetch-order',
      section: 'fetch',
      title: 'Order the major fetch operations',
      prompt: 'Which sequence correctly moves one instruction from Main Memory into the CPU?',
      choices: Object.freeze([
        'PC → MAR → address bus → memory → MDR → IR → increment PC',
        'IR → PC → memory → MAR → MDR → increment PC',
        'PC → MDR → ALU → MAR → memory → IR',
      ]),
      answer: 0,
      explanation: 'The PC supplies the address, MAR holds it, memory returns the word through MDR, and IR receives the fetched instruction before the PC advances.',
    }),
    Object.freeze({
      id: 'mar-versus-mdr',
      section: 'fetch',
      title: 'Distinguish MAR from MDR',
      prompt: 'During the fetch, what is the key difference between MAR and MDR?',
      choices: Object.freeze([
        'MAR stores an address; MDR stores the word read from or written to memory.',
        'MAR stores the instruction opcode; MDR stores only the register number.',
        'MAR and MDR are two names for the same 16-bit register.',
      ]),
      answer: 0,
      explanation: 'MAR is 8 bits in this teaching machine because it selects one of 256 addresses. MDR is 16 bits because it carries a full memory word.',
    }),
    Object.freeze({
      id: 'predict-final-state',
      section: 'fetch',
      title: 'Predict the final fetch state',
      prompt: 'Preset LOAD begins with PC = 0x12 and memory[0x12] = 0x31A4. What is true after fetch finishes?',
      choices: Object.freeze([
        'PC=0x13, MAR=0x12, MDR=0x31A4, IR=0x31A4',
        'PC=0x12, MAR=0x13, MDR=0x31A4, IR=0x0000',
        'PC=0x13, MAR=0xA4, MDR=0x0012, IR=0x31A4',
      ]),
      answer: 0,
      explanation: 'MAR retains the original instruction address. MDR and IR retain the fetched word, while PC advances to the next 8-bit address.',
    }),
    Object.freeze({
      id: 'decode-field-layout',
      section: 'decode',
      title: 'Identify the instruction fields',
      prompt: 'How is one 16-bit instruction divided in this teaching CPU?',
      choices: Object.freeze([
        '4-bit opcode, 4-bit register, 8-bit operand',
        '8-bit opcode, 4-bit register, 4-bit operand',
        '4-bit opcode, 8-bit register, 4-bit operand',
      ]),
      answer: 0,
      explanation: 'Bits 15–12 hold the opcode, bits 11–8 identify a register, and bits 7–0 hold an operand or address.',
    }),
    Object.freeze({
      id: 'decode-operand-kind',
      section: 'decode',
      title: 'Interpret the operand field',
      prompt: 'How should the final eight bits be interpreted for LOAD R1, [0xA4] and ADDI R3, #0x07?',
      choices: Object.freeze([
        '0xA4 is a memory address; 0x07 is an immediate value.',
        'Both values always identify memory addresses.',
        'Both values always identify general registers.',
      ]),
      answer: 0,
      explanation: 'The opcode determines the meaning of the operand field. LOAD uses it as an address, while ADDI uses it as a value embedded in the instruction.',
    }),
    Object.freeze({
      id: 'addi-final-r1',
      section: 'execute',
      title: 'Predict the ADDI result',
      prompt: 'The guided example begins with R1 = 5 and executes ADDI R1, #13. What does R1 contain afterward?',
      choices: Object.freeze([
        '18 (0x0012)',
        '13 (0x000D)',
        '5 (0x0005)',
      ]),
      answer: 0,
      explanation: 'The ALU adds the current R1 value 5 and immediate value 13, then writes the 16-bit result 18 back into R1.',
    }),
    Object.freeze({
      id: 'addi-memory-unchanged',
      section: 'execute',
      title: 'Separate register write-back from memory',
      prompt: 'What happens to Main Memory during the guided ADDI operation?',
      choices: Object.freeze([
        'It is unchanged; the result is written back only into R1.',
        'Address 0x20 is overwritten with the result 18.',
        'Every visible memory word increases by 13.',
      ]),
      answer: 0,
      explanation: 'The activity fetches its instruction from Main Memory, but the arithmetic result follows the ALU-to-R1 path and does not perform a memory write.',
    }),
  ]);
  const VALID_IDS = new Set(QUESTIONS.map((question) => question.id));

  function defaults() { return { contentVersion: CONTENT_VERSION, solvedIds: [] }; }
  function normalize(value) {
    if (!value || value.contentVersion !== CONTENT_VERSION || !Array.isArray(value.solvedIds)) return defaults();
    return {
      contentVersion: CONTENT_VERSION,
      solvedIds: [...new Set(value.solvedIds.filter((id) => typeof id === 'string' && VALID_IDS.has(id)))],
    };
  }
  function read(storage = localStorage) {
    try { return normalize(JSON.parse(storage.getItem(STORAGE_KEY))); }
    catch { return defaults(); }
  }
  function write(storage = localStorage, value) {
    const next = normalize(value);
    try { storage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* in-memory feedback still works */ }
    return next;
  }
  function markSolved(storage, current, id) {
    return write(storage, { contentVersion: CONTENT_VERSION, solvedIds: [...current.solvedIds, id] });
  }
  function reset(storage = localStorage) {
    try { storage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
    return defaults();
  }

  return Object.freeze({ CONTENT_VERSION, STORAGE_KEY, SECTIONS, QUESTIONS, defaults, normalize, read, write, markSolved, reset });
})();
