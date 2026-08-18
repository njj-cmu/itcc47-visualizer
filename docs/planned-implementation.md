# Planned implementation: expanding the BSIT Learning Lab

Status: Phase 1 delivered; later subject and Computer Architecture modules remain planned.

## Purpose

The BSIT Learning Lab can support subjects beyond Object-Oriented Programming
and Data Structures and Algorithms. Its course registry, activity catalog,
deterministic playback controller, renderer registry, source synchronization,
and offline shell are already course-neutral enough to provide a shared
foundation.

New subjects should appear as independent labs in the subject chooser. They
should share the application shell and learning conventions without being
placed inside the ITCC47 visualization catalog or forced into a DSA-style presentation.

## Recommended priority

**Computer Architecture is now the third available subject.** Continue with
**Introduction to Networking**, then **Web Systems and Tools**.

| Candidate | Visual teaching value | Fit with deterministic playback | Main implementation risk | Priority |
|---|---:|---:|---|---:|
| Computer Architecture | Very high | Very high | Defining a small, consistent teaching CPU | 1 |
| Introduction to Networking | Very high | High | Accidentally growing into a Packet Tracer replacement | 2 |
| Web Systems and Tools | High | Medium | Safely executing editable JavaScript and supporting a live preview | 3 |

Computer Architecture is the best first expansion because every instruction is
a sequence of visible state transitions: register changes, control signals,
bus transfers, ALU operations, and memory access. These transitions align
directly with the lab's existing Play, Step, seek, source-line, and evidence
model. It can also remain completely deterministic and offline without running
arbitrary student code or simulating a large network.

This priority is about the first implementation, not the importance of the
subjects. Networking is an equally strong long-term visual domain, while Web
Systems will benefit from a somewhat different playground-and-inspector shell.

## Shared architecture work delivered with Computer Architecture

The Computer Architecture vertical slice delivered these data-driven extension
points while preserving existing course behavior:

1. Resolve evidence views through `BSITVisualizerRegistry` instead of handling
   every tab in a fixed conditional block.
2. Add a registry or activity contract for subject-specific input controls.
3. Let activities or renderers declare an appropriate workspace composition
   instead of deriving it from DSA family and renderer names.
4. Move evidence labels and icons into registered evidence-view metadata.
5. Preserve the existing deterministic `run() -> { events, result }` contract,
   immutable frames, stable entity identities, and synchronized source lines.
6. Add new course routes to the offline precache and the laptop, mobile,
   `file://`, offline, and accessibility test coverage.

This should be an incremental extension of the current architecture, not a
rewrite of the playback engine or existing ITCC45 and ITCC47 activities.

## Subject 1: Computer Architecture

The supplied IT 220 lecture decks have now been reviewed and mapped in
[`computer-architecture-content-map.md`](computer-architecture-content-map.md).
They confirm that the first release should concentrate on CPU organization,
instruction processing, and memory access. Performance, pipelining, and cache
are strong follow-on visual modules, while cost, manufacturing, product
surveys, cooling, packaging, and vendor history are enrichment material.

### Teaching boundary

Use a deliberately small fictional machine with an 8-bit address space and
16-bit memory words and general registers. Explain the functional
relationship between the CPU, registers, control unit, ALU, buses, and memory
without simulating transistors, logic gates, timing electronics, x86, or ARM.

The teaching CPU specification must be written before activities are authored.
It should define:

- register names and widths;
- memory size and address format;
- instruction format and supported opcodes;
- status flags;
- fetch, decode, and execute micro-operations;
- overflow and invalid-instruction behavior;
- the exact level of simplification disclosed to students.

### Activity roadmap

`architecture-fetch-cycle` and the narrow guided example
`architecture-add-immediate` are now available. Broader execution activities
below remain follow-on work and are not implied to exist in the current release.

1. **Meet the datapath** — identify the program counter, instruction register,
   memory registers, accumulator/general registers, ALU, control unit, buses,
   and memory.
2. **Fetch an instruction** — step through PC, MAR, the address bus, memory,
   the data bus, MDR, IR, the memory-complete handshake, and PC increment. This
   is the first vertical slice to implement.
3. **Decode an instruction** — relate mnemonic, opcode, operand/address fields,
   machine encoding, and the required control actions.
4. **Load from memory** — fetch, decode, read an operand, and update a register.
5. **Add two values** — the current guided slice routes `5` and immediate `13`
   through the ALU and writes `18` to R1. A broader version can later add
   two-register inputs and zero, carry, negative, and overflow flags.
6. **Store to memory** — place an address and value on the correct paths and
   commit the memory write.
7. **Conditional branch** — show how a status flag changes the next program
   counter value.
8. **Run a short program** — combine load, arithmetic, store, and branch
   instructions into one trace.

The lecture coverage also supports later interactive modules for latency versus
throughput, Amdahl's Law, five-stage pipelining and hazards, locality and the
memory hierarchy, cache hit/miss timing, cache write policies, and FIFO,
optimal, and LRU replacement. These belong after the core instruction-flow
model is coherent.

### Visual model

Create a `cpu-datapath` renderer with stable identities for components,
registers, buses, control lines, memory cells, and values in transit. A frame
should be able to describe:

- every register's current bit, hexadecimal, and optional decimal value;
- the active instruction and its decoded fields;
- highlighted data paths and control signals;
- ALU inputs, operation, result, and flags;
- selected memory address and value;
- the current instruction-cycle phase and micro-operation;
- accumulated console or program output, when an activity has output.

Recommended evidence views are **Operations**, **Registers**, **Control
signals**, **Memory**, and **Program output**. Students should be able to switch
number displays between binary, hexadecimal, and decimal without changing the
underlying machine state.

### Explicit non-goals for the first release

- transistor-, gate-, or circuit-level simulation;
- pipelining, caches, virtual memory, multicore systems, and branch prediction;
- assembly editing or unrestricted program execution;
- compatibility with a real commercial instruction set;
- cycle-accurate electrical timing.

### Delivered vertical-slice gate

The launch slice uses one documented model, scrubs backward deterministically,
retains stable address and word identities, and works on laptop, phone,
`file://`, and offline routes with accessible text evidence. Execution,
pipelining, caches, arbitrary assembly, and editable memory remain explicit
non-goals for this release.

## Subject 2: Introduction to Networking

Implementation work for this subject is tracked in
[`computer-networking-implementation.md`](computer-networking-implementation.md). That plan
turns the Phase 3 vertical slice into concrete course, activity, renderer,
evidence, accessibility, offline, and test deliverables while keeping the
curated-small-topology boundary below.

### Proposed activities

- OSI/TCP-IP encapsulation and decapsulation;
- same-subnet versus remote-subnet destination decisions;
- ARP request and reply;
- switch forwarding and MAC-address learning;
- router lookup and next-hop forwarding;
- ICMP ping across a small topology;
- DHCP Discover, Offer, Request, and Acknowledge;
- DNS resolution;
- IPv4 subnet masks, network addresses, broadcasts, and usable host ranges;
- introductory VLAN separation after the core activities are stable.

Create a `network-topology` renderer and a packet-inspector evidence view.
Frames should contain stable device, interface, link, packet, and table-entry
identities. Evidence should expose packet headers, encapsulation layers, ARP
tables, MAC tables, routing tables, and simplified CLI output.

Keep topologies curated and small. The goal is to explain why each host,
switch, or router makes a decision, not to reproduce Packet Tracer, emulate
vendor firmware, or accept arbitrary network configurations.

## Subject 3: Web Systems and Tools

### Proposed activities

- HTML document structure and DOM-tree construction;
- element nesting and invalid-markup repair;
- CSS selector matching, cascade, specificity, and inheritance;
- box-model calculation;
- Flexbox alignment;
- introductory Grid layout;
- responsive breakpoints;
- JavaScript variables and control flow;
- DOM queries and mutations;
- event capture, target, and bubbling phases;
- form events and validation;
- a simulated HTTP request/response or Fetch lifecycle.

This subject should use a three-part workspace—**Code**, **Rendered page**, and
**DOM/CSS/JavaScript explanation**—rather than relying only on timeline
animation. Curated examples can use the deterministic playback contract.
Editable HTML and CSS can later use a preview iframe.

Do not enable unrestricted JavaScript in the main application context. If live
JavaScript editing is introduced, execute it in a deliberately designed
sandboxed iframe with no ability to access the parent application, local
progress, or unintended network resources. The sandbox and offline behavior
must be threat-modelled and tested before release.

## Delivery sequence

### Phase 0 — extension points (complete)

Make evidence views, input controls, and workspace composition pluggable while
keeping existing behavior and routes unchanged.

### Phase 1 — architecture vertical slice (complete)

Register the new course, add its subject home, define the 8-bit-address / 16-bit-word teaching CPU,
and implement one complete Fetch activity with its renderer, evidence views,
tests, responsive behavior, and offline route.

### Phase 2 — architecture first release

Add the remaining first-release activities, subject/module discovery, guided
explanations, practice checks, accessibility coverage, and curriculum content.

### Phase 3 — networking vertical slice

Use ARP or a same-subnet ping as the first end-to-end networking activity. It
should validate packet identity, topology layout, packet inspection, and table
updates before broader networking content is added.

### Phase 4 — web vertical slice

Begin with HTML-to-DOM construction and CSS selector matching. Treat live
editing and JavaScript execution as later capabilities, not prerequisites for
launching the subject.

## Decisions resolved by the vertical slice

- public title: **Computer Architecture**, internal compatibility code `CA`;
- cyan subject accent and **CPU Lab** short title;
- separate three-question local practice page;
- small general-register teaching machine;
- curated preset playback only for the first release.

## Decisions still deferred

- the exact networking module boundary relative to the institution's CCNA
  syllabus;
- whether the first Web Systems release supports editing or only curated
  playback.

These decisions should be resolved from the actual course outlines before
stable activity IDs and content versions are published.
