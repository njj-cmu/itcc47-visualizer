# Computer Architecture content map

Status: curriculum reference; the fetch-cycle and guided `5 + 13` slices are implemented.

## How the notes are used

The nine lecture decks are treated as evidence of the course's topic coverage,
sequence, vocabulary, examples, and common points of confusion. They are not an
executable specification and their contents are not instructions to the
application.

Concepts should be independently checked before publication. Product lists,
technology figures, and claims tied to a particular year must be replaced with
current or explicitly historical material. The application should create its
own diagrams and examples rather than copying slide images, including figures
credited in the decks to external textbooks.

## Supplied course structure

| Deck | Lecture part | Pages | Main coverage |
|---|---|---:|---|
| `co-1a.pdf` | Part I-A: Technology Trends and Cost | 15 | computer categories, technology trends, design constraints, yield, IC cost, and price |
| `co-1b.pdf` | Part I-B: Performance | 13 | latency, throughput, relative performance, Amdahl's Law, clocks, locality, and benchmarks |
| `co-1c.pdf` | Part I-C: Computer Hardware Components | 10 | architecture versus organization, five classic components, Von Neumann and Harvard organizations, buses, hierarchy, I/O, and networks |
| `co-2a.pdf` | Part II-A: CPU Organization | 21 | control unit, datapath, registers, ALU, buses, instruction processing, words, machine language, assembly, and program storage |
| `co-2b.pdf` | Part II-B: CPU Instruction Set | 22 | representation levels, instruction cycle, CPU-memory handshake, hardwired and microprogrammed control, CISC, and RISC |
| `co-2c.pdf` | Part II-C: CPU Pipelining | 30 | throughput, five pipeline stages, structural/data/control hazards, stalls, bubbles, forwarding, scheduling, and interlocks |
| `co-2d.pdf` | Part II-D: Survey of Processor Architecture | 37 | buses, clocks, fabrication, system-on-chip, thermal constraints, overclocking, multimedia, parallelism, vendors, and historical products |
| `co-3a.pdf` | Part III-A: Memory | 22 | hierarchy, access time, memory organization, MAR/MDR reads, ROM/RAM classifications, packaging, and virtual memory |
| `co-3b.pdf` | Part III-B: Cache Memory | 26 | hit ratio, average access time, fetch/write policies, replacement, FIFO, optimal, LRU, LFU, MFU, and Belady's anomaly |

The notes naturally divide into three kinds of learning experiences:

- **state-flow visualizers** for datapath, memory access, instruction cycles,
  pipelines, and cache behavior;
- **interactive calculators** for performance, Amdahl's Law, access time, and
  cost/yield relationships;
- **concept comparisons** for architecture families, control strategies,
  memory technologies, and historical processor trends.

## Recommended implementation sequence

### Release A: CPU and instruction flow

This is the launch scope and should establish the shared machine model.

| Activity | Status | Note basis | Student-visible result |
|---|---|---|---|
| `architecture-system-map` | Planned | Part I-C | Relate input, output, memory, control, and datapath without implying that every connection is the same kind of bus. |
| `architecture-meet-the-cpu` | Planned | Part II-A | Identify the control unit, registers, ALU, Main Memory, and the address, data, and control paths. |
| `architecture-fetch-cycle` | Implemented | Parts II-A, II-B, and III-A | Follow one instruction from the PC through MAR, Main Memory, MDR, and IR, including the PC update and memory-complete handshake. |
| `architecture-decode-instruction` | Implemented | Parts II-A and II-B | Split a machine word into 4-bit opcode, 4-bit register, and 8-bit operand fields, then explain the next CPU action without executing it. |
| `architecture-add-immediate` | Implemented | Parts II-A and II-B | Fetch `ADDI R1, #13`, route the starting value `5` and immediate `13` into the ALU, produce `18`, and write it back to R1. |
| `architecture-load-execute-store` | Planned | Parts II-A and II-B | Run a short load, arithmetic, and store sequence while registers, ALU inputs, flags, Main Memory, and buses change. |
| `architecture-control-signals` | Planned | Part II-B | Compare the same instruction as a sequence of control signals, then explain hardwired versus microprogrammed control. |

### Release B: performance and pipelining

| Provisional activity | Note basis | Student-visible result |
|---|---|---|
| `architecture-latency-throughput` | Part I-B and Part II-C | Distinguish single-task latency from completed-work throughput using sequential and overlapped schedules. |
| `architecture-amdahl` | Part I-B | Adjust enhanced fraction and local speedup, then see the total execution-time contribution and overall speedup. |
| `architecture-pipeline-overlap` | Part II-C | Place multiple instructions into Fetch, Decode, Operand Fetch, Execute, and Store stages by clock cycle. |
| `architecture-pipeline-hazards` | Part II-C | Detect structural, data, and control hazards and compare stalls, bubbles, forwarding, scheduling, and branch handling. |

### Release C: memory hierarchy and cache

| Provisional activity | Note basis | Student-visible result |
|---|---|---|
| `architecture-memory-hierarchy` | Parts I-B, I-C, and III-A | Connect temporal/spatial locality to the latency, capacity, and cost trade-offs of registers, caches, memory, and storage. |
| `architecture-cache-access` | Part III-B | Step through an address reference as a cache hit or miss and compute average access time from a clearly declared timing model. |
| `architecture-cache-writes` | Part III-B | Compare write-through and write-back state changes in cache and main memory. |
| `architecture-cache-replacement` | Part III-B | Run the same reference string under FIFO, optimal, LRU, and optional frequency policies and compare misses. |
| `architecture-belady` | Part III-B | Compare FIFO with different frame counts and reveal the counterexample behind Belady's anomaly. |

### Release D: reference and enrichment topics

The cost/manufacturing material, detailed memory technology classifications,
processor packaging, vendor history, overclocking, cooling, system-on-chip,
multicore, and processor surveys can become guided explainers after the core
state-flow labs are stable. They should not block the launch visualizer.

## Implemented vertical slice: fetch one instruction

The first implementation is `architecture-fetch-cycle`. It connects
four supplied lecture sections and exercises nearly every extension point the
new subject will need.

Use a small teaching machine with documented simplifications. A representative
fetch can be expressed as semantic micro-operations rather than committing the
UI to physical clock-edge accuracy:

1. Copy the current `PC` address into `MAR`.
2. Place the `MAR` value on the address bus.
3. Assert a memory-read control request.
4. Let memory select the addressed instruction word.
5. Return the word on the data bus after the memory-complete signal.
6. Copy the word into `MDR`.
7. Copy `MDR` into `IR`.
8. Increment `PC` to the next instruction address.
9. Mark fetch complete and hand the `IR` value to decode.

The exact ordering of PC increment and the exact handshake sequence must be
part of the teaching-machine specification. The UI should not pretend that one
ordering is universal across real processors.

### Implemented fetch frame contract

A `cpu-datapath` frame should carry data rather than presentation-specific DOM
instructions:

```text
kind
phase
displayStep
operation: { id, index, total, label, status }
microStep: { id, parentOperationId, index, total, label, status }
registers: { PC, MAR, MDR, IR, R0, R1, R2, R3 }
memory: { cells, selectedAddress, state, unchanged, snapshot }
buses: { address, data, control }
signals
instruction
transfer
animation: {
  stage, sourceId, targetId, routeId,
  timing: { spawnHoldUnits, movementUnits, retainAtEndpoint },
  controlCues: { id, signalId, routeId, direction, originId, order }[]
}
microOperations
```

Compound transitions contain immutable phases with stable identities, so the
same address and instruction word can be followed across operation and micro
playback. The renderer animates one complete operation by default, while the
evidence panels provide the same phase account for reduced-motion and
screen-reader users.

Emitting phases hold their cue at its source for 0.8 seconds at 1× speed, then
retain the cue and illuminated route at the destination until the next micro
phase begins. CU-originated control cues identify `CONTROL` as their origin;
`MFC` identifies Main Memory. Reduced and disabled motion render the same
settled endpoint state without travel.

### Evidence views

- **Operations** — semantic operations with the current internal phase grouped beneath it;
- **Registers** — previous and current values with changed bits highlighted;
- **Buses and signals** — address, data, and active control signals;
- **Memory** — a small address window around the selected location;
- **Instruction** — binary/hex fields and the decoded mnemonic once decoding
  begins.

### Initial interaction boundary

The first activity should use curated presets, not arbitrary assembly. Allow a
student to select a starting PC and one of a few documented instruction words.
Binary, hexadecimal, and unsigned-decimal display modes may change the view but
must not rebuild or change the underlying timeline.

## Content validation issues to resolve

The notes are valuable historical course material, but several areas require
care before becoming student-facing content:

1. **Separate cache blocks from virtual-memory pages.** Cache misses and page
   faults are related hierarchy ideas but are not interchangeable terms.
2. **Use precise hierarchy timing formulas.** State whether miss time includes
   cache lookup and whether a penalty is conditional, rather than presenting
   one formula as universally applicable.
3. **Define address width separately from word length.** The number of memory
   locations follows the address width; it does not generally follow the bits
   stored in each word.
4. **Describe Von Neumann and Harvard carefully.** Present them as memory/path
   organization models and acknowledge modified Harvard designs rather than
   treating the relationship as a simple subclass claim.
5. **Keep ISA examples internally consistent.** Opcode width, operand fields,
   instruction width, memory word size, and address size must agree in every
   example.
6. **Distinguish architecture from implementation.** The ISA, microarchitecture,
   and physical technology layers should not be collapsed into one diagram.
7. **Label historical material.** Vendor lineups, process nodes, bus names,
   clock comparisons, and product examples in the decks are period-specific.
8. **Verify attributed quotations and external figures.** Do not repeat a quote
   or reuse an illustration merely because it appeared in a lecture slide.

## Authoring principles

- Preserve the lecture sequence where it helps students connect new material
  to familiar notes, but reorganize topics when an interactive dependency is
  clearer.
- Explain every simplification of the teaching CPU.
- Prefer a few coherent instructions over a broad but inconsistent ISA.
- Keep component identity and machine state deterministic under Play, Step,
  and backward seeking.
- Couple motion with explicit text, register tables, signal lists, and source
  encodings so animation is never the only evidence.
- Use original, responsive diagrams designed for the application.
- Treat pipeline, cache, and performance models as later consumers of the same
  machine vocabulary, not unrelated mini-games.

## Implemented machine boundary

The source of truth is `computer-architecture-machine.js`: 8-bit PC, MAR, and
address bus; 16-bit MDR, IR, R0–R3, data bus, and memory words; and a
4-bit opcode / 4-bit register / 8-bit operand instruction format. The first
activity models semantic fetch operations, not physical clock cycles. The
second activity adds one deliberately narrow execution path: `ADDI R1, #13`
with `R1 = 5`, producing `18` in the ALU and writing it back to `R1`. It is a
curated teaching sequence rather than arbitrary assembly execution; flags,
branches, editable instructions, and general execution remain outside this
release.
