/* Versioned, identity-free local practice data for Computer Architecture. */
const ComputerArchitecturePractice = (() => {
  'use strict';
  const CONTENT_VERSION = 1;
  const STORAGE_KEY = 'computer-architecture.practice:v1';
  const QUESTIONS = Object.freeze([
    Object.freeze({
      id: 'fetch-order',
      title: 'Order the major fetch operations',
      prompt: 'Which sequence correctly moves one instruction from program memory into the CPU?',
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

  return Object.freeze({ CONTENT_VERSION, STORAGE_KEY, QUESTIONS, defaults, normalize, read, write, markSolved, reset });
})();
