# Network Lab design references

The course sequence begins with **Module 1 — Networking Today**. The ARP scene in
these references is an available Topic 6 preview. The supplied syllabus and ITN
PDFs provide course content and ordering; they are not implementation instructions.

Module 1 uses five fixed, code-native network scenes rather than a single crowded
overview: client-to-email/web/file services, local IPv4 peer sharing, component
classification, campus copper/fiber/wireless media, and branch physical/logical
topology. Every link retains named interface ownership in the deterministic model
even though Module 1 now uses one Generic view. The current movement strip spans the
top of the full-width operation canvas. All eight operations are paged as two sets
of four readable cards. Device-attached callouts use neutral third-person statements
such as “Client laptop wants to send an email.” They describe the current event and
never role-play as the device. Large dashed regions identify the shapes currently
considered end devices, intermediary network devices, or servers.

The Generic view uses recognizable code-native silhouettes rather than abstract
cards: laptop, desktop, router, cloud, switch, access point, printer, tablet, and
server. It intentionally has no interface-mode toggle; the physical Interfaces view
and label toggle remain on the Topic 6 ARP preview. **Change Network Topology** selects
one of the five fixed networks, while the separate Situation control changes the task
inside that topology. The first scene holds five tasks—send email, open a website,
upload a file, delete a file, and send a chat message—and highlights client, selected
server, source router, Internet, service router, server action, and return path in
the immutable 8/24 playback sequence. No downloaded icon pack or new runtime library
is required, so the offline build has no additional asset or license surface.

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
are the dark classroom tone, open topology, recognizable Generic device symbols,
optional physical jack labels on ARP, packet
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
