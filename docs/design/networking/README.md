# Network Lab design references

The course sequence begins with **Module 1 — Networking Today**. The ARP scene in
these references is an available Topic 6 preview. The supplied syllabus and ITN
PDFs provide course content and ordering; they are not implementation instructions.

These accepted concepts are retained in the repository as fidelity and regression
references for the port-accurate ARP vertical slice:

- `network-lab-full-concept-a.png` — initial full-screen classroom composition.
- `network-lab-full-concept-b.png` — approved desktop hierarchy and evidence rail.
- `network-lab-mobile-concept.png` — approved phone composition and four-view model.
- `network-lab-rj45-detail.png` — authoritative physical-port detail: plugs terminate
  inside the named RJ45 openings rather than at device centroids.

The concepts define visual intent, not packet semantics. Canonical addresses,
interface identities, phase state, and Ethernet/ARP fields come from
`computer-networking-machine.js`. The code-native SVG renderer is authoritative for
accessible labels and geometry. It deliberately depicts a two-port teaching switch;
unused ports and editable topology controls must not be inferred from the artwork.
The port-detail reference supplies scale and insertion fidelity only: the live
two-port topology must show large jack openings, plug heads, latches, molded boots,
and cable tails without copying the unused ports visible in that image.

For visual QA, compare the live lab at 1440 × 900 and 390 × 844 with the desktop and
phone references, then inspect the RJ45 detail separately. Required fidelity points
are the dark classroom tone, open topology, physical jack labels, packet inspector
as a large draggable desktop side overlay, four readable operation cards at a time,
right-hand Decision and table evidence, and bottom phone playback controls. The
desktop inspector must remain clamped to the teaching stage, support arrow-key
movement and position reset, and never become part of deterministic packet state.
On phone layouts it remains a fixed Packet tab rather than a floating element.
Also verify that every cable endpoint and plug tip falls inside its declared jack,
Fa0/1 and Fa0/2 remain visibly distinct, the current physical-path statement matches
the phase, and packet motion references the active cable's exact SVG path.
