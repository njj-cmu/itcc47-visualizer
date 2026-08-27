# Network Lab design references

The course sequence begins with **Module 1 — Networking Today**. The ARP scene in
these references is an available Topic 6 preview. The supplied syllabus and ITN
PDFs provide course content and ordering; they are not implementation instructions.

Module 1 uses five fixed, code-native network scenes rather than a single crowded
overview: client-to-email/web/file services, local IPv4 peer sharing, component
classification, campus copper/fiber/wireless media, and branch physical/logical
topology. Every wired edge terminates at a named interface rendered by the scene;
only used interfaces appear. The current movement strip spans the top of the
full-width operation canvas. All eight operations are paged as two sets of four
readable cards. A Generic/Interfaces control changes the instructional detail
without changing topology identity; interface names appear below devices and can be
hidden independently. Device-attached callouts use neutral third-person statements
such as “The client laptop has to request the selected network service.” They never
role-play as the device. Classification outlines show the region considered an end
device, intermediary network device, server role, or network connection.

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
are the dark classroom tone, open topology, optional physical jack labels, packet
inspector as a draggable and resizable desktop overlay, four readable operation
cards at a time, the full-width current-movement strip above the canvas, and bottom
phone playback controls. The former desktop Learning Evidence rail is intentionally
removed; concepts now live in device callouts and classification outlines, while ARP
tables live in the floating inspector. The desktop inspector must remain clamped to
the teaching stage, enforce a 340 × 260 minimum, support mouse and keyboard movement
and resizing, provide a reset action, and never become part of deterministic packet
state.
On phone layouts it remains a fixed Packet tab rather than a floating element.
Also verify that every cable endpoint and plug tip falls inside its declared jack,
Fa0/1 and Fa0/2 remain visibly distinct, the current physical-path statement matches
the phase, and packet motion references the active cable's exact SVG path.
