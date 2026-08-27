# Computer networking implementation plan

Status: ARP vertical slice implemented; Module 1 sequence and physical-port fidelity correction implemented on `codex/networking-module-1-sequence`.

## 2026-08-27 Module 1 network set

Module 1 now opens with five fixed activities backed by the same deterministic
`ComputerNetworkingFoundationsMachine` contract:

1. `networking-read-classroom-network` — one client reaches distinct email, web,
   and file server roles through a home router, the Internet, and a service router.
2. `networking-local-peer-sharing` — two laptops both request and provide resources
   inside the local `192.168.20.0/24` network; no router or Internet appears.
3. `networking-classify-components` — learners distinguish end devices,
   intermediary devices, and a server role performed by an ordinary laptop.
4. `networking-compare-media` — copper serves room links, fiber spans buildings and
   long distances, and wireless serves a mobile endpoint.
5. `networking-read-network-topologies` — a branch LAN, provider WAN, and HQ LAN
   contrast physical attachment with logical organization.

Each activity preserves the eight-operation Overview and 24-phase Detailed model.
All links terminate at declared named interfaces, the preset selector opens the
matching activity route, and omitted or unknown IDs resolve to the first host-role
activity. The top-right current-movement card precedes Learning Evidence on desktop;
phone Steps contains the same explanation. Operation cards remain a four-at-a-time
carousel. Physical interface names remain attached to the diagram, while the host-role
evidence names the classroom service protocols—SMTP/IMAP, HTTP/HTTPS, and SMB—at the
step where learners match each service to its server instead of crowding the topology.

## 2026-08-19 course-sequence correction

The subject opens with **Module 1 — Networking Today**, following the supplied course
syllabus before exposing the existing ARP activity. The default activity remains
`networking-read-classroom-network`; it begins the five-network sequence and covers
network purpose, host roles, intermediaries, interfaces and media, physical/logical
representations, LAN/WAN scope, reliable-network qualities, and professional practice.

The deterministic ARP activity remains available as a clearly labeled **Topic 6
preview** grounded in ITN Modules 8 and 9. It is not a progression lock and it is no
longer described as Module 1. Topics 2–5 remain visible in their required order as
planned course modules.

The ARP renderer retains the fixed two-port switch and exact interface/link/packet
identities. Its physical treatment now uses large RJ45 openings, visible plug heads,
latches, molded boots, cable tails, insertion anchors, and a synchronized physical-
path statement. The four-port switch in the visual reference is not copied; only
the two interfaces used by the teaching model are rendered.

## Supplied curriculum reconciliation

The implementation was checked against the read-only source set under the main
worktree's `context/NETWORKING` directory. The institutional subject is **IT 53 —
Fundamentals of Networking** (three units; two lecture hours and three laboratory
hours weekly). The learner-facing title remains **Introduction to Networking** and
the compact shell code remains `NET`.

The five Module 1 activities are grounded in ITN Module 1. The ARP slice is grounded in ITN Module 8 (same-network versus remote-network
forwarding decisions) and Module 9 (ARP purpose, lookup, request broadcast, reply,
and learned mapping). Physical NIC, interface, UTP, and RJ45 language is grounded in
Modules 2 and 4. Switch source-MAC learning and flooding appear only as evidence
needed to explain the Module 9 ARP path; the supplied Modules 6, 7, and 16 are marked
not included and are not promoted as standalone roadmap modules.

The reconciled sequence keeps router configuration/default gateways, addressing and
subnetting, ICMP, transport, DNS, DHCP, and small-network troubleshooting as planned
later course modules. IPv6 Neighbor Discovery is a later Module 9 companion activity.
VLAN separation is explicitly labeled a possible extension outside the currently
included IT 53 sequence, pending approved course material.

Accepted implementation and QA references are stored in
[`docs/design/networking/`](design/networking/README.md). The physical-port detail is
authoritative where a full-screen concept is visually ambiguous.

## Outcome

Add **Introduction to Networking** as an independent BSIT Learning Lab subject.
The first course activity teaches learners how a client uses separate server roles,
and the following four activities make peers, device categories, media, and topology
explicit. The
available Topic 6 preview teaches how a host discovers a same-subnet peer with ARP,
using a deterministic, curated topology and a packet inspector. Neither activity is
a general network simulator or a Packet Tracer replacement.

The vertical slice is complete when a learner can step from an empty ARP cache
through request broadcast, switch flooding, reply unicast, and cache update;
inspect the Ethernet and ARP fields at each step; scrub backward without state
drift; and use the same activity on laptop, phone, `file://`, and offline.

### Workspace presentation contract

- Every networking activity retains eight operations, presented as a carousel of
  four readable operation cards at a time. The visible page follows the active
  operation while previous/next controls let learners inspect the other group.
- On desktop ARP routes, the topology owns the full teaching stage. Packet details
  begin as a large side overlay and can be dragged within that stage, moved with
  arrow keys, or returned with Reset position. This position is transient view
  state and never changes an immutable machine frame or saved course progress.
- On phone routes, Packet remains a dedicated fixed tab with vertically stacked
  Ethernet and ARP fields. No draggable overlay is introduced on small screens.
- On desktop, Current movement is a separate card above Learning Evidence. On phone,
  the same explanation appears first in Steps.

## Product and curriculum boundary

- Public title: **Introduction to Networking**.
- Internal course ID: `computer-networking`.
- Compact shell code: `NET`; the supplied institutional course code is `IT 53`.
- Short title: **Network Lab**.
- Initial module: **Networking Today**.
- First activity: **Follow a client to three servers**.
- Module 1 activity set: host roles, local peer sharing, component classification,
  campus media, and physical/logical topology.
- Available preview: **Topic 6 — Discover a neighbor with ARP**.
- Curated topology: Host A, one Layer 2 switch, and Host B on one `/24` subnet.
- No editable topology, arbitrary packet construction, vendor CLI emulation,
  STP, dynamic routing, wireless behavior, or real socket/network access.

Before broader modules receive stable activity IDs, compare the roadmap with
the institution's current CCNA-aligned outline. That review may reorder later
topics, but it must not expand the first slice beyond its teaching boundary.

## Learner story

The activity starts with Host A needing Host B's destination MAC address before
it can send an IPv4 packet on the local LAN. The learner follows these decisions:

1. Host A applies its subnet mask and concludes that Host B is local.
2. Host A checks its ARP cache and finds no matching entry.
3. Host A creates an ARP Request inside a broadcast Ethernet frame.
4. The teaching switch learns Host A's source MAC address and floods the
   broadcast to its only other port as narrow evidence for the ARP lesson.
5. Host B recognizes its IPv4 address and creates an ARP Reply.
6. The switch learns Host B's source MAC address and unicasts the reply.
7. Host A records the IP-to-MAC mapping in its ARP cache.
8. The closing explanation states that Host A can now build the intended IPv4
   frame; sending the ping itself belongs to the next activity.

Each step must answer three questions in plain language: **What changed? Why
did this device make that decision? What happens next?**

## Deterministic domain contract

Create `computer-networking-machine.js` as a framework-neutral model with no
DOM or timer access. Its public contract should mirror the existing CPU model:

```js
ComputerNetworkingMachine.run(presetId, playbackOptions)
// => { events, result }
```

Every emitted event contains an immutable frame. Re-running the same preset
and granularity must produce structurally equal frames.

### Stable identities

- Devices: `host-a`, `switch-1`, `host-b`.
- Interfaces: `host-a-eth0`, `switch-1-p1`, `switch-1-p2`, `host-b-eth0`.
- Links: `link-host-a-switch`, `link-switch-host-b`.
- Packets: `arp-request-1`, `arp-reply-1`.
- ARP entries: `host-a-arp-host-b`, `host-b-arp-host-a`.
- MAC entries: `switch-1-mac-host-a`, `switch-1-mac-host-b`.

Entities move or change state by ID; they are never recreated merely because
the timeline advances.

### Frame shape

Each frame should expose only serializable data:

```js
{
  phase: { id, label, explanation, next },
  topology: {
    devices: [{ id, kind, label, interfaces, state }],
    links: [{ id, endpointIds, active, direction }]
  },
  packets: [{
    id, kind, location, direction, status,
    ethernet: { source, destination, etherType },
    arp: { operation, senderMac, senderIp, targetMac, targetIp }
  }],
  tables: {
    arp: [{ id, deviceId, ip, mac, state }],
    mac: [{ id, deviceId, mac, interfaceId, state }]
  },
  decision: { deviceId, question, facts, outcome },
  console: [{ id, deviceId, text }]
}
```

Use explicit symbolic states such as `absent`, `learning`, and `confirmed`.
Do not infer table changes from animation position in the renderer.

## Activity and catalog contract

Create `computer-networking-activities.js` and register it through
`BSITLearningLab.registerActivities('computer-networking', ...)`.

The Topic 6 ARP preview uses:

- ID `networking-arp-neighbor-discovery`;
- engine `guided-network-model`;
- renderer `network-topology`;
- workspace kind/composition `network-lab`;
- input kind `network-preset` with curated, non-editable presets;
- evidence views `packet-inspector`, `network-decisions`, `arp-table`, and
  `mac-table`;
- mobile views `topology`, `packet`, `tables`, and `steps`.

Start with one canonical preset so the explanation and tests have a single
source of truth:

- Host A: `192.168.10.10/24`, MAC `02:00:00:00:10:0A`.
- Host B: `192.168.10.20/24`, MAC `02:00:00:00:10:14`.
- Switch ports: Host A on `Fa0/1`, Host B on `Fa0/2`.
- Initial ARP and MAC tables: empty.

The addresses are documentation ranges/private examples and the locally
administered MAC bit is set. The model never transmits real traffic.

## Workspace and visual system

Design the complete desktop and mobile Network Lab surface before coding the
React renderer. Use an image-generated concept as the visual reference, then
extract tokens and component rules from it while preserving the current app
shell and playback controls.

The desktop workspace has three primary regions:

1. **Topology canvas** — an open diagram, not a grid of cards. It shows device
   roles, interface labels, link activity, broadcast fan-out, and packet travel.
2. **Packet inspector** — a layered Ethernet/ARP view whose selected fields
   correspond to the current decision. Broadcast and unknown target fields are
   presented in both readable labels and exact values.
3. **Decision and tables evidence** — explains the active device's reasoning
   and shows ARP/MAC mutations with stable row identities.

Use a distinct networking accent that remains legible in the existing dark
shell. Broadcast, unicast, learned, and pending states must differ by more than
color. Device icons and packet arrows remain code-native SVG/React UI so labels,
focus states, motion preferences, and exact packet state stay accessible.

On phone, the four mobile views replace simultaneous columns. The current step
and playback controls remain reachable without covering the topology or final
table row.

## Renderer and evidence implementation

- Add `visualizer-src/network-topology.jsx` and register the lazy renderer as
  `network-topology`.
- Keep layout deterministic: fixed teaching coordinates per curated preset;
  no force-directed graph and no random placement.
- Render packet movement from frame location/direction, not elapsed wall time.
- Preserve the settled packet and active link at the end of a micro step.
- Honor On, Reduced, and Off motion modes; seek/load shows the settled frame
  immediately.
- Add packet-inspector and table evidence components to the workspace registry.
- Pair every field highlight with an accessible current-step explanation.
- Never rely on an animation alone to communicate a broadcast, lookup miss,
  learning action, or table update.

## Subject routes

Add the same minimal route family used by Computer Architecture:

- `computer-networking.html` — subject home and learning path;
- `computer-networking-modules.html` — current and planned modules;
- `computer-networking-practice.html` plus local data/controller files — three
  Module 1 checks followed by three Topic 6 checks covering local-subnet choice,
  Ethernet broadcast destination, and ARP cache outcome;
- `visualizer.html?course=computer-networking&activity=networking-read-classroom-network`;
- `visualizer.html?course=computer-networking&activity=networking-local-peer-sharing`;
- `visualizer.html?course=computer-networking&activity=networking-classify-components`;
- `visualizer.html?course=computer-networking&activity=networking-compare-media`;
- `visualizer.html?course=computer-networking&activity=networking-read-network-topologies`;
- `visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery`.

Register the course in `course-catalog.js`, add it to the subject chooser and
navigation, document it in `README.md`, and include every required static asset
in the service-worker manifest.

## Delivery order

### Slice A — contract and fixtures

- Add the course/activity registrations and canonical preset.
- Implement immutable frame generation and validation helpers.
- Unit-test subnet comparison, ARP field values, switch source-MAC learning,
  flooding/unicast decisions, table transitions, and deterministic replay.

### Slice B — complete visual concept

- Generate and inspect a desktop concept for the complete topology/inspector/
  evidence workspace and a corresponding mobile state.
- Record exact palette, typography, spacing, canvas geometry, icons, packet
  treatment, table anatomy, and responsive behavior before renderer coding.

### Slice C — renderer and evidence

- Implement topology, packet travel, packet inspector, decision narrative,
  ARP/MAC tables, playback integration, and reduced/off motion states.
- Compare browser captures against the accepted concepts at their native sizes
  and iterate until no material visual mismatch remains.

### Slice D — discovery and learning routes

- Add subject home, module roadmap, chooser entry, practice checks, nav, README,
  and offline precache.
- Clearly mark ping, routing, DHCP, DNS, subnetting, and VLANs as later modules.

### Slice E — release gate

- Run the full build, unit, Python, browser, and accessibility suites.
- Verify desktop, phone, keyboard-only use, screen-reader text, reduced/off
  motion, timeline seek/backward scrub, refresh persistence, `file://`, offline,
  no horizontal overflow, and no console errors.

## Test acceptance criteria

- The ARP Request Ethernet destination is exactly
  `FF:FF:FF:FF:FF:FF`; its ARP target MAC is represented as unknown/zero.
- Host A does not learn Host B's MAC before receiving the reply.
- The switch learns only from source MAC addresses and floods the request only
  to eligible ports other than the ingress port.
- The reply is unicast to the learned Host A port.
- Host A's final ARP table maps `192.168.10.20` to
  `02:00:00:00:10:14`.
- Backward seek restores earlier table states exactly; replay creates no
  duplicate rows or packet identities.
- Packet headers, device decision, and highlighted path always describe the
  same frame.
- All interactive controls have keyboard-visible focus and accessible names.
- Color contrast meets WCAG AA and no teaching distinction is color-only.
- The activity loads through HTTP, `file://`, and a warmed offline cache.

## Follow-on roadmap

After this vertical slice is stable:

1. Same-subnet ICMP ping using the completed ARP mapping.
2. Remote-subnet decision and default-gateway ARP.
3. Router longest-prefix/next-hop lookup.
4. DHCP DORA.
5. DNS resolution.
6. IPv4 masks, networks, broadcasts, and usable ranges.
7. Introductory VLAN separation.

Each follow-on activity should reuse the same device/interface/link/packet/table
contracts. Add capabilities only when a concrete teaching activity needs them.

## Definition of done

The networking vertical slice is done only when the model, renderer, evidence,
subject routes, practice, offline behavior, responsive behavior, accessibility,
documentation, and full repository test gate all ship together. A static
topology illustration without deterministic packet state and device reasoning
does not satisfy this plan.
