/* Versioned, identity-free local practice data for Introduction to Networking. */
const ComputerNetworkingPractice = (() => {
  'use strict';
  const CONTENT_VERSION = 1;
  const STORAGE_KEY = 'computer-networking.practice:v1';
  const QUESTIONS = Object.freeze([
    Object.freeze({
      id: 'classify-local-peer',
      title: 'Classify the destination',
      prompt: 'Host A is 192.168.10.10/24 and Host B is 192.168.10.20/24. Where must Host A send the frame?',
      choices: Object.freeze([
        'Directly to Host B on the local network after resolving Host B’s MAC address.',
        'To the default gateway because every IPv4 packet first visits a router.',
        'To DNS so it can translate Host B’s IPv4 address into a MAC address.',
      ]),
      answer: 0,
      explanation: 'Both addresses share the 192.168.10.0/24 network. Host A therefore resolves the local peer’s MAC address; a router is not part of this delivery.',
    }),
    Object.freeze({
      id: 'arp-request-fields',
      title: 'Inspect the ARP request',
      prompt: 'Which Ethernet and ARP destination values are correct while Host A asks for Host B?',
      choices: Object.freeze([
        'Ethernet destination ff:ff:ff:ff:ff:ff; ARP target IP 192.168.10.20; target MAC unknown.',
        'Ethernet destination 02:00:00:00:00:0b; ARP target IP 192.168.10.10; target MAC already known.',
        'Ethernet destination 00:00:00:00:00:00; ARP target IP 255.255.255.255; target MAC broadcast.',
      ]),
      answer: 0,
      explanation: 'An ARP request is carried in a broadcast Ethernet frame because the requested target MAC is the missing fact. The target protocol address is Host B’s IPv4 address.',
    }),
    Object.freeze({
      id: 'predict-learned-state',
      title: 'Predict the learned state',
      prompt: 'After Host B replies, which entries should this two-host lab contain?',
      choices: Object.freeze([
        'Host A maps 192.168.10.20 to 02:00:00:00:10:14; the switch maps Host A to Fa0/1 and Host B to Fa0/2.',
        'Host A maps 192.168.10.20 to ff:ff:ff:ff:ff:ff; the switch maps both hosts to Fa0/1.',
        'Host A stores only Host B’s IP address; switches do not learn source MAC addresses.',
      ]),
      answer: 0,
      explanation: 'Host A learns the reply’s IP-to-MAC mapping. The switch has observed each frame’s source MAC on its ingress port, so the two hosts remain associated with separate physical jacks.',
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
