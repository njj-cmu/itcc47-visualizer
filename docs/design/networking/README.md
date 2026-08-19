# Network Lab design references

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

For visual QA, compare the live lab at 1440 × 900 and 390 × 844 with the desktop and
phone references, then inspect the RJ45 detail separately. Required fidelity points
are the dark classroom tone, open topology, physical jack labels, packet inspector
below the topology on desktop, persistent eight-marker timeline, right-hand Decision
and table evidence, and bottom phone playback controls.
