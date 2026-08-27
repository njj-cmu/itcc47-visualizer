/* Deterministic, framework-neutral teaching model for Networking Today. */
const ComputerNetworkingFoundationsMachine = (() => {
  'use strict';

  const ACTIVITY_ID = 'networking-read-classroom-network';
  const DOMAIN = 'network-foundations';
  const freeze = (value) => BSITPlayback.deepFreeze(value);

  const networkInterface = (id, label, media, tags = []) => ({ id, label, media, tags });
  const device = (id, kind, label, role, interfaces, tags = []) => ({ id, kind, label, role, interfaces, tags });
  const link = (id, fromInterfaceId, toInterfaceId, media, scope, tags = []) => ({ id, fromInterfaceId, toInterfaceId, media, scope, tags: ['connected', media, ...tags] });

  const PRESETS = freeze([
    {
      id: 'client-server-services', activityId: 'networking-read-classroom-network', label: 'Client to three services', title: 'Follow a client to three servers',
      description: 'See one client reach separate email, web, and file services through two routers and the Internet.', networkType: 'Client-server across LANs and the Internet',
      devices: [
        device('client-laptop', 'end-device', 'Client laptop', 'client', [networkInterface('client-laptop-eth0', 'eth0', 'copper')], ['end-device', 'host', 'client', 'source']),
        device('home-router', 'intermediary', 'Home router', 'LAN gateway', [networkInterface('home-router-g0-0', 'G0/0', 'copper'), networkInterface('home-router-wan0', 'WAN0', 'fiber')], ['intermediary', 'router', 'gateway']),
        device('internet-cloud', 'network-cloud', 'Internet', 'public interconnection', [networkInterface('internet-cloud-edge-a', 'edge A', 'fiber'), networkInterface('internet-cloud-edge-b', 'edge B', 'fiber')], ['network', 'internet']),
        device('service-router', 'intermediary', 'Service router', 'service network edge', [networkInterface('service-router-wan0', 'WAN0', 'fiber'), networkInterface('service-router-g0-1', 'G0/1', 'copper'), networkInterface('service-router-g0-2', 'G0/2', 'copper'), networkInterface('service-router-g0-3', 'G0/3', 'copper')], ['intermediary', 'router', 'gateway']),
        device('email-server', 'end-device', 'Email server', 'mail delivery and storage', [networkInterface('email-server-eth0', 'eth0', 'copper')], ['end-device', 'host', 'server-role', 'destination', 'service-email']),
        device('web-server', 'end-device', 'Web server', 'web pages and applications', [networkInterface('web-server-eth0', 'eth0', 'copper')], ['end-device', 'host', 'server-role', 'destination', 'service-web']),
        device('file-server', 'end-device', 'File server', 'shared files and folders', [networkInterface('file-server-eth0', 'eth0', 'copper')], ['end-device', 'host', 'server-role', 'destination', 'service-file']),
      ],
      links: [
        link('link-client-home', 'client-laptop-eth0', 'home-router-g0-0', 'copper', 'LAN', ['local', 'client-path']),
        link('link-home-internet', 'home-router-wan0', 'internet-cloud-edge-a', 'fiber', 'WAN', ['wan', 'long-distance', 'client-path']),
        link('link-internet-service', 'internet-cloud-edge-b', 'service-router-wan0', 'fiber', 'WAN', ['wan', 'long-distance', 'client-path']),
        link('link-service-email', 'service-router-g0-1', 'email-server-eth0', 'copper', 'LAN', ['local', 'service-path']),
        link('link-service-web', 'service-router-g0-2', 'web-server-eth0', 'copper', 'LAN', ['local', 'service-path']),
        link('link-service-file', 'service-router-g0-3', 'file-server-eth0', 'copper', 'LAN', ['local', 'service-path']),
      ],
      zones: [{ id: 'home-lan', label: 'HOME LAN', scope: 'LAN' }, { id: 'public-internet', label: 'INTERNET', scope: 'Internet' }, { id: 'services-lan', label: 'SERVICES LAN', scope: 'LAN' }],
      learning: {
        purpose: 'connect one client to distinct email, web, and file services', source: 'Client laptop', destination: 'Email, web, and file servers',
        clientServer: 'The laptop requests a service. Each server answers only for the service software it runs.',
        serviceRoles: 'Email handles mail with SMTP/IMAP, web serves pages and applications with HTTP/HTTPS, and file service exposes shared folders with SMB in this classroom example. A server role is defined by the service, not by the case shape.',
        peerModel: 'This example uses dedicated servers. The local peer example shows hosts that can request and provide resources at the same time.',
        localBoundary: 'The client and services live on separate LANs; routers and the Internet join those local networks.',
        interfacePath: 'Client eth0 → Home router G0/0 → WAN0 → Internet → Service router WAN0 → G0/1, G0/2, or G0/3 → server eth0',
        media: 'Copper serves the local device links; fiber represents the long-distance WAN path between networks.',
        longDistance: 'Fiber is selected for the long-distance router-to-Internet path because it carries light over much greater distances than a local copper run.',
        physical: 'The physical view shows the exact interfaces and media used by each service path.',
        logical: 'The logical view groups one client LAN, the public Internet, and a separate services LAN.',
        scope: 'Two LANs communicate through WAN infrastructure and the public Internet.',
        reliability: 'Separate service hosts make each role explicit, while resilient real deployments would add redundant links and servers.',
        security: 'Both routers are trust boundaries; service access should be limited to the intended application traffic.',
        summary: 'One client can use several server roles, and each request still crosses a precise chain of interfaces and networks.',
      },
    },
    {
      id: 'local-peer-sharing', activityId: 'networking-local-peer-sharing', label: 'Local peer sharing', title: 'Share on a local peer network',
      description: 'Keep two peer laptops on one local IPv4 network and watch each host act as both client and server.', networkType: 'Peer-to-peer local network',
      devices: [
        device('peer-laptop-a', 'end-device', 'Peer laptop A', 'client + file server', [networkInterface('peer-laptop-a-eth0', 'eth0 · 192.168.20.10/24', 'copper')], ['end-device', 'host', 'client', 'server-role', 'peer', 'source']),
        device('peer-switch', 'intermediary', 'Local switch', 'same-LAN forwarding', [networkInterface('peer-switch-fa0-1', 'Fa0/1', 'copper'), networkInterface('peer-switch-fa0-2', 'Fa0/2', 'copper'), networkInterface('peer-switch-fa0-3', 'Fa0/3', 'copper')], ['intermediary', 'switch']),
        device('peer-laptop-b', 'end-device', 'Peer laptop B', 'client + print server', [networkInterface('peer-laptop-b-eth0', 'eth0 · 192.168.20.11/24', 'copper')], ['end-device', 'host', 'client', 'server-role', 'peer', 'destination']),
        device('shared-printer', 'end-device', 'Shared printer', 'shared local resource', [networkInterface('shared-printer-eth0', 'eth0 · 192.168.20.30/24', 'copper')], ['end-device', 'host', 'destination', 'peripheral']),
      ],
      links: [
        link('link-peer-a-switch', 'peer-laptop-a-eth0', 'peer-switch-fa0-1', 'copper', 'LAN', ['local', 'peer-path']),
        link('link-switch-peer-b', 'peer-switch-fa0-2', 'peer-laptop-b-eth0', 'copper', 'LAN', ['local', 'peer-path']),
        link('link-switch-printer', 'peer-switch-fa0-3', 'shared-printer-eth0', 'copper', 'LAN', ['local', 'peer-path']),
      ],
      zones: [{ id: 'peer-lan', label: 'LOCAL IP NETWORK · 192.168.20.0/24', scope: 'LAN' }],
      learning: {
        purpose: 'share files and a printer inside one small local IPv4 network', source: 'Peer laptop A', destination: 'Peer laptop B or the shared printer',
        clientServer: 'Either laptop can request a resource, and either laptop can provide a shared resource.',
        serviceRoles: 'A laptop becomes a server when it provides a shared folder or printer service; it does not need to look like a rack server.',
        peerModel: 'Both laptops are peers because each can act as client and server. There is no dedicated server or centralized administration.',
        localBoundary: 'Every address is inside 192.168.20.0/24. No router or Internet path is part of this example.',
        interfacePath: 'Peer A eth0 → Switch Fa0/1 → Switch Fa0/2 → Peer B eth0; printer sharing uses Switch Fa0/3.',
        media: 'All links are local copper Ethernet runs inside the same LAN.',
        longDistance: 'This small local network does not need a long-distance medium; a campus example shows where fiber becomes appropriate.',
        physical: 'The physical view shows three copper links seated in the switch interfaces used by the peers and printer.',
        logical: 'The logical view shows one IP subnet with no gateway required for local peer communication.', scope: 'This is one LAN and one local IP network only.',
        reliability: 'Peer sharing is inexpensive and simple, but it is harder to administer, secure, back up, and scale.',
        security: 'Each peer owner controls sharing permissions, so inconsistent settings can expose local resources.',
        summary: 'Peer-to-peer describes host roles on a local network, not a special cable shape or an Internet service.',
      },
    },
    {
      id: 'small-office-components', activityId: 'networking-classify-components', label: 'Classify office components', title: 'Classify network components',
      description: 'Highlight end devices, intermediary devices, and server roles in one small office network.', networkType: 'Small office component map',
      devices: [
        device('office-laptop', 'end-device', 'Staff laptop', 'client', [networkInterface('office-laptop-wlan0', 'wlan0', 'wireless')], ['end-device', 'host', 'client', 'source']),
        device('office-ap', 'intermediary', 'Wireless AP', 'wireless access', [networkInterface('office-ap-radio0', 'radio0', 'wireless'), networkInterface('office-ap-eth0', 'eth0', 'copper')], ['intermediary', 'access-point']),
        device('office-switch', 'intermediary', 'Office switch', 'LAN forwarding', [networkInterface('office-switch-fa0-1', 'Fa0/1', 'copper'), networkInterface('office-switch-fa0-2', 'Fa0/2', 'copper'), networkInterface('office-switch-fa0-3', 'Fa0/3', 'copper')], ['intermediary', 'switch']),
        device('office-router', 'intermediary', 'Edge router', 'LAN gateway and firewall', [networkInterface('office-router-g0-0', 'G0/0', 'copper'), networkInterface('office-router-wan0', 'WAN0', 'fiber')], ['intermediary', 'router', 'gateway']),
        device('server-laptop', 'end-device', 'Backup laptop', 'file server', [networkInterface('server-laptop-eth0', 'eth0', 'copper')], ['end-device', 'host', 'server-role', 'destination']),
        device('office-printer', 'end-device', 'Network printer', 'print destination', [networkInterface('office-printer-eth0', 'eth0', 'copper')], ['end-device', 'host', 'destination', 'peripheral']),
      ],
      links: [
        link('link-laptop-ap', 'office-laptop-wlan0', 'office-ap-radio0', 'wireless', 'LAN', ['local']),
        link('link-ap-switch', 'office-ap-eth0', 'office-switch-fa0-1', 'copper', 'LAN', ['local']),
        link('link-switch-router', 'office-switch-fa0-2', 'office-router-g0-0', 'copper', 'LAN', ['local']),
        link('link-switch-server-laptop', 'office-switch-fa0-3', 'server-laptop-eth0', 'copper', 'LAN', ['local', 'service-path']),
        link('link-router-printer', 'office-router-wan0', 'office-printer-eth0', 'fiber', 'WAN', ['long-distance']),
      ],
      zones: [{ id: 'office-lan', label: 'SMALL OFFICE LAN', scope: 'LAN' }, { id: 'remote-resource', label: 'REMOTE RESOURCE', scope: 'WAN' }],
      learning: {
        purpose: 'connect staff devices to local and remote shared resources', source: 'Staff laptop', destination: 'Backup laptop or network printer',
        clientServer: 'The staff laptop requests resources. The backup laptop provides a file service even though both devices are laptops.',
        serviceRoles: 'End device describes where messages begin or end; server describes a role performed by an end device.',
        peerModel: 'The backup laptop could also request resources, but this scene emphasizes its dedicated file-server role.',
        localBoundary: 'The access point, switch, and LAN-facing router interface make up the local office path.',
        interfacePath: 'Laptop wlan0 → AP radio0 → AP eth0 → Switch Fa0/1; other switch and router ports lead to services.',
        media: 'Wireless joins the staff laptop, copper carries office Ethernet, and fiber represents the remote-resource span.',
        longDistance: 'The fiber link is reserved for the much longer remote-resource connection.',
        physical: 'The physical view answers which named interface and medium each device uses.', logical: 'The logical view separates endpoints, forwarding devices, and service roles.',
        scope: 'The office LAN reaches a remote resource through its edge router.', reliability: 'A single switch and router are easy to understand but are also single points of failure.',
        security: 'The router/firewall protects the office boundary, while end-device permissions protect shared files.',
        summary: 'Device category and host role answer different questions: a laptop can be an end device and a server at the same time.',
      },
    },
    {
      id: 'campus-media', activityId: 'networking-compare-media', label: 'Campus media', title: 'Compare network media',
      description: 'Trace copper inside rooms, fiber between buildings, and wireless at the network edge.', networkType: 'Two-building campus network',
      devices: [
        device('faculty-pc', 'end-device', 'Faculty PC', 'wired client', [networkInterface('faculty-pc-eth0', 'eth0', 'copper')], ['end-device', 'host', 'client', 'source']),
        device('building-a-switch', 'intermediary', 'Building A switch', 'access switching', [networkInterface('building-a-switch-fa0-1', 'Fa0/1', 'copper'), networkInterface('building-a-switch-sfp1', 'SFP1', 'fiber')], ['intermediary', 'switch']),
        device('building-b-switch', 'intermediary', 'Building B switch', 'distribution switching', [networkInterface('building-b-switch-sfp1', 'SFP1', 'fiber'), networkInterface('building-b-switch-fa0-1', 'Fa0/1', 'copper'), networkInterface('building-b-switch-sfp2', 'SFP2', 'fiber')], ['intermediary', 'switch']),
        device('campus-ap', 'intermediary', 'Campus AP', 'wireless access', [networkInterface('campus-ap-eth0', 'eth0', 'copper'), networkInterface('campus-ap-radio0', 'radio0', 'wireless')], ['intermediary', 'access-point']),
        device('student-tablet', 'end-device', 'Student tablet', 'wireless client', [networkInterface('student-tablet-wlan0', 'wlan0', 'wireless')], ['end-device', 'host', 'client', 'destination']),
        device('library-server', 'end-device', 'Library server', 'catalog service', [networkInterface('library-server-sfp0', 'SFP0', 'fiber')], ['end-device', 'host', 'server-role', 'destination']),
      ],
      links: [
        link('link-faculty-switch-a', 'faculty-pc-eth0', 'building-a-switch-fa0-1', 'copper', 'LAN', ['local']),
        link('link-building-fiber', 'building-a-switch-sfp1', 'building-b-switch-sfp1', 'fiber', 'LAN', ['local', 'long-distance', 'building-backbone']),
        link('link-switch-b-ap', 'building-b-switch-fa0-1', 'campus-ap-eth0', 'copper', 'LAN', ['local']),
        link('link-ap-tablet', 'campus-ap-radio0', 'student-tablet-wlan0', 'wireless', 'LAN', ['local']),
        link('link-switch-b-library', 'building-b-switch-sfp2', 'library-server-sfp0', 'fiber', 'LAN', ['local', 'long-distance']),
      ],
      zones: [{ id: 'building-a', label: 'BUILDING A', scope: 'LAN' }, { id: 'campus-backbone', label: 'CAMPUS FIBER BACKBONE', scope: 'LAN' }, { id: 'building-b', label: 'BUILDING B', scope: 'LAN' }],
      learning: {
        purpose: 'connect people and services across two campus buildings', source: 'Faculty PC', destination: 'Student tablet or library server',
        clientServer: 'Clients use the network from either building, while the library server provides the catalog service.',
        serviceRoles: 'The library host is an end device performing a server role.', peerModel: 'Clients could share locally, but this design uses managed infrastructure for a larger campus.',
        localBoundary: 'Both buildings belong to the same managed campus network in this simplified example.',
        interfacePath: 'PC eth0 → Switch A Fa0/1 → Switch A SFP1 → campus fiber → Switch B SFP1 → copper or wireless edge',
        media: 'Copper handles room-length Ethernet, fiber carries light between buildings, and wireless connects the mobile tablet.',
        longDistance: 'Fiber is the deliberate building-to-building and server-backbone medium because it supports long distance and resists electrical interference.',
        physical: 'The physical view reveals building placement, SFP fiber interfaces, copper access ports, and the wireless coverage edge.',
        logical: 'The logical view treats those media as one managed campus communication path.', scope: 'This example is a campus LAN spanning multiple buildings.',
        reliability: 'A real campus would add redundant fiber paths and distribution switches so one cut does not isolate a building.',
        security: 'Managed access points and switches enforce approved attachment while server access remains controlled.',
        summary: 'Media choice follows distance and environment: copper nearby, fiber far away, and wireless for mobility.',
      },
    },
    {
      id: 'branch-topology', activityId: 'networking-read-network-topologies', label: 'Branch and headquarters', title: 'Read network topologies',
      description: 'Compare the physical links and logical LAN/WAN structure of a branch reaching headquarters.', networkType: 'Branch-to-headquarters topology',
      devices: [
        device('branch-laptop', 'end-device', 'Branch laptop', 'client', [networkInterface('branch-laptop-wlan0', 'wlan0', 'wireless')], ['end-device', 'host', 'client', 'source']),
        device('branch-ap-router', 'intermediary', 'Branch router/AP', 'wireless access and gateway', [networkInterface('branch-ap-router-radio0', 'radio0', 'wireless'), networkInterface('branch-ap-router-wan0', 'WAN0', 'fiber')], ['intermediary', 'router', 'access-point', 'gateway']),
        device('branch-internet', 'network-cloud', 'Provider network', 'WAN transport', [networkInterface('branch-internet-edge-a', 'edge A', 'fiber'), networkInterface('branch-internet-edge-b', 'edge B', 'fiber')], ['network', 'internet']),
        device('hq-router', 'intermediary', 'HQ router', 'WAN edge', [networkInterface('hq-router-wan0', 'WAN0', 'fiber'), networkInterface('hq-router-g0-0', 'G0/0', 'copper')], ['intermediary', 'router', 'gateway']),
        device('hq-switch', 'intermediary', 'HQ switch', 'LAN forwarding', [networkInterface('hq-switch-fa0-1', 'Fa0/1', 'copper'), networkInterface('hq-switch-fa0-2', 'Fa0/2', 'copper')], ['intermediary', 'switch']),
        device('hq-app-server', 'end-device', 'HQ application server', 'business application', [networkInterface('hq-app-server-eth0', 'eth0', 'copper')], ['end-device', 'host', 'server-role', 'destination']),
      ],
      links: [
        link('link-branch-wireless', 'branch-laptop-wlan0', 'branch-ap-router-radio0', 'wireless', 'LAN', ['local']),
        link('link-branch-provider', 'branch-ap-router-wan0', 'branch-internet-edge-a', 'fiber', 'WAN', ['wan', 'long-distance']),
        link('link-provider-hq', 'branch-internet-edge-b', 'hq-router-wan0', 'fiber', 'WAN', ['wan', 'long-distance']),
        link('link-hq-router-switch', 'hq-router-g0-0', 'hq-switch-fa0-1', 'copper', 'LAN', ['local']),
        link('link-hq-switch-server', 'hq-switch-fa0-2', 'hq-app-server-eth0', 'copper', 'LAN', ['local', 'service-path']),
      ],
      zones: [{ id: 'branch-lan', label: 'BRANCH LAN', scope: 'LAN' }, { id: 'provider-wan', label: 'PROVIDER WAN', scope: 'WAN' }, { id: 'hq-lan', label: 'HEADQUARTERS LAN', scope: 'LAN' }],
      learning: {
        purpose: 'let a branch user reach an application hosted at headquarters', source: 'Branch laptop', destination: 'HQ application server',
        clientServer: 'The branch laptop requests the application and the HQ server provides it.', serviceRoles: 'The application server is an end device whose role is to answer client requests.',
        peerModel: 'The managed branch design uses a dedicated server rather than local peer sharing.', localBoundary: 'The branch and headquarters are separate local networks.',
        interfacePath: 'Branch wlan0 → router radio0 → branch WAN0 → provider fiber → HQ WAN0 → HQ G0/0 → switch Fa0/1 → switch Fa0/2 → server eth0',
        media: 'Wireless serves the branch user, fiber spans the WAN, and copper connects the headquarters LAN.', longDistance: 'Fiber represents the long provider path between distant sites.',
        physical: 'The physical view follows each port and medium from the branch room to the headquarters server room.',
        logical: 'The logical view groups a branch LAN, provider WAN, and headquarters LAN.', scope: 'A WAN interconnects two independently bounded LANs.',
        reliability: 'A production design would add alternate provider paths or failover access for critical branch work.', security: 'Both site routers enforce the boundary between local devices and the provider network.',
        summary: 'Physical topology answers where and how devices connect; logical topology explains which LANs and WAN path organize communication.',
      },
    },
  ]);
  const PRESET_BY_ID = new Map(PRESETS.map((preset) => [preset.id, preset]));

  const labelsForTag = (preset, tag) => preset.devices.filter((item) => item.tags.includes(tag)).map((item) => item.label);
  const joinedLabels = (items) => items.length > 2 ? `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}` : items.join(' and ');
  const mediaForPreset = (preset) => [...new Set(preset.links.map((item) => item.media))];
  const resolve = (value, preset) => typeof value === 'function' ? value(preset) : value;
  const detail = (id, label, message, evidence = {}) => ({ id, label, message, ...evidence });
  const operation = (id, label, summary, phases) => ({ id, label, summary, phases });

  const OPERATIONS = freeze([
    operation('network-purpose', 'Explain the purpose', 'Begin with the people, resources, and communication need behind the network.', [
      detail('observe-network-need', 'Observe the network need', (preset) => `${preset.title} exists to ${preset.learning.purpose}.`, { category: 'Purpose', focusTags: ['source', 'destination'], facts: (preset) => [`Source: ${preset.learning.source}`, `Destination: ${preset.learning.destination}`], conclusion: 'A network begins with a communication need.', movement: (preset) => `${preset.learning.source} → network path → ${preset.learning.destination}` }),
      detail('identify-communication-ends', 'Find both ends', (preset) => `Communication begins at ${preset.learning.source} and ends at ${preset.learning.destination}.`, { category: 'Purpose', focusTags: ['end-device'], facts: ['Messages originate at an end device', 'Messages are received at an end device'], conclusion: 'End devices are the communication endpoints.', movement: (preset) => `${preset.learning.source} → ${preset.learning.destination}` }),
      detail('state-network-purpose', 'State the purpose', (preset) => `Devices, interfaces, and media work together to ${preset.learning.purpose}.`, { category: 'Purpose', focusTags: ['end-device', 'intermediary', 'network'], focusLinkTags: ['connected'], facts: ['Hosts create or consume data', 'Intermediaries carry it', 'Media carries the signal'], conclusion: 'The network delivers communication between applications.', movement: (preset) => preset.learning.interfacePath }),
    ]),
    operation('host-roles', 'Follow host roles', 'Distinguish hosts from the client and server roles they perform.', [
      detail('mark-end-devices', 'Mark the hosts', (preset) => `${joinedLabels(labelsForTag(preset, 'end-device'))} are end devices because messages begin or end on them.`, { category: 'Host roles', focusTags: ['end-device'], facts: (preset) => labelsForTag(preset, 'end-device').map((label) => `${label}: end device`), conclusion: 'Host and end device describe a communication endpoint.', movement: 'Highlight every message source and destination.' }),
      detail('assign-client-server', 'Assign client and server roles', (preset) => preset.learning.clientServer, { category: 'Host roles', focusTags: ['client', 'server-role'], facts: ['Client: requests a service', 'Server: provides a service'], conclusion: 'Client and server describe roles, not hardware shapes.', movement: (preset) => `${joinedLabels(labelsForTag(preset, 'client'))} request → ${joinedLabels(labelsForTag(preset, 'server-role')) || preset.learning.destination} provide` }),
      detail('match-service-roles', 'Match services to hosts', (preset) => preset.learning.serviceRoles, { category: 'Host roles', focusTags: ['server-role', 'service-email', 'service-web', 'service-file'], facts: (preset) => preset.id === 'client-server-services'
        ? ['Email server: SMTP sends · IMAP retrieves', 'Web server: HTTP/HTTPS', 'File server: SMB shared folders']
        : ['Email service handles mail', 'Web service delivers pages and apps', 'File service stores shared files'], conclusion: 'Different server software provides different network services.', movement: (preset) => preset.id === 'client-server-services' ? 'Client eth0 → service path → SMTP/IMAP, HTTP/HTTPS, or SMB host' : `${preset.learning.source} → requested service host` }),
    ]),
    operation('peer-to-peer', 'Compare peer-to-peer', 'See how a host can request and provide resources on a small local network.', [
      detail('define-local-peer-network', 'Keep peers local', (preset) => preset.learning.localBoundary, { category: 'Peer-to-peer', focusTags: ['peer', 'end-device'], focusLinkTags: ['local'], facts: ['Peers share a local IP network', 'Internet access is not required for local sharing'], conclusion: 'Peer-to-peer communication can stay entirely inside a LAN.', movement: (preset) => preset.id === 'local-peer-sharing' ? '192.168.20.10/24 ↔ local switch ↔ 192.168.20.11/24' : 'Compare this managed design with the Local peer sharing example.' }),
      detail('recognize-both-roles', 'Recognize both roles', (preset) => preset.learning.peerModel, { category: 'Peer-to-peer', focusTags: ['peer', 'client', 'server-role'], facts: ['A peer can request', 'The same peer can provide'], conclusion: 'One host may act as both client and server.', movement: (preset) => preset.id === 'local-peer-sharing' ? 'Peer A requests from Peer B; Peer B can request from Peer A.' : 'Dedicated service role now; peer role in the local example.' }),
      detail('weigh-peer-tradeoffs', 'Weigh the tradeoffs', 'Peer networks are easy and inexpensive for small tasks, but they lack centralized administration, scale, and consistent security.', { category: 'Peer-to-peer', focusTags: ['peer', 'end-device', 'intermediary'], facts: ['Easy to set up', 'Lower cost', 'No central administration', 'Not very scalable'], conclusion: 'Peer-to-peer fits very small networks and simple sharing.', movement: 'Compare simple local sharing with managed client-server service.' }),
    ]),
    operation('network-components', 'Classify components', 'Separate end devices, intermediary devices, and server roles.', [
      detail('classify-end-devices', 'Find end devices', (preset) => `${joinedLabels(labelsForTag(preset, 'end-device'))} originate or receive network messages.`, { category: 'Components', focusTags: ['end-device'], facts: ['Laptop, PC, printer, tablet, and server can be end devices'], conclusion: 'End device is a message-position category.', movement: 'Highlight every endpoint; exclude forwarding-only devices.' }),
      detail('classify-intermediaries', 'Find intermediaries', (preset) => `${joinedLabels(labelsForTag(preset, 'intermediary')) || 'The network devices'} interconnect endpoints and choose how traffic continues.`, { category: 'Components', focusTags: ['intermediary'], facts: ['Switch: forwards inside a LAN', 'Access point: joins wireless hosts', 'Router: connects networks'], conclusion: 'Intermediary devices carry or control traffic between endpoints.', movement: 'Endpoint → intermediary path → endpoint' }),
      detail('separate-device-and-role', 'Separate device and role', (preset) => preset.learning.serviceRoles, { category: 'Components', focusTags: ['server-role', 'end-device'], facts: ['End device says where messages begin or end', 'Server says which service the host provides'], conclusion: 'A laptop can be both an end device and a server.', movement: 'Physical device type ≠ communication role.' }),
    ]),
    operation('interfaces-and-media', 'Trace interfaces and media', 'Follow named attachment points and compare copper, fiber, and wireless signals.', [
      detail('inspect-named-interfaces', 'Inspect named interfaces', (preset) => preset.learning.interfacePath, { category: 'Interfaces', focusTags: ['source', 'destination', 'intermediary'], focusLinkTags: ['connected'], facts: ['NIC connects a host', 'Port is a physical connector', 'Interface names the attachment point'], conclusion: 'Connections belong to interfaces, not device centers.', movement: (preset) => preset.learning.interfacePath }),
      detail('compare-signal-media', 'Compare signal media', (preset) => preset.learning.media, { category: 'Media', focusLinkTags: ['connected'], facts: (preset) => mediaForPreset(preset).map((media) => `${media}: ${media === 'copper' ? 'electrical signals' : media === 'fiber' ? 'pulses of light' : 'radio waves'}`), conclusion: 'The medium determines how bits cross each link.', movement: (preset) => `Trace ${mediaForPreset(preset).join(' → ')} media in this scene.` }),
      detail('choose-long-distance-media', 'Choose for distance', (preset) => preset.learning.longDistance, { category: 'Media', focusLinkTags: ['long-distance'], facts: ['Copper: local runs', 'Fiber: long distance and electrical isolation', 'Wireless: mobility'], conclusion: 'Distance and environment guide the media choice.', movement: (preset) => preset.links.some((item) => item.tags.includes('long-distance')) ? 'Highlight the long-distance fiber span.' : 'This local example has no long-distance span.' }),
    ]),
    operation('network-representations', 'Compare representations', 'Use physical and logical topology views for different questions.', [
      detail('read-physical-topology', 'Read the physical topology', (preset) => preset.learning.physical, { category: 'Representation', representation: 'physical', focusTags: ['end-device', 'intermediary', 'network'], focusLinkTags: ['connected'], facts: ['Where devices are', 'Which interfaces are joined', 'Which medium is installed'], conclusion: 'Physical topology explains placement and attachment.', movement: (preset) => preset.learning.interfacePath }),
      detail('read-logical-topology', 'Read the logical topology', (preset) => preset.learning.logical, { category: 'Representation', representation: 'logical', focusTags: ['end-device', 'intermediary', 'network'], focusLinkTags: ['connected'], facts: ['Which hosts share a LAN', 'Which device marks a boundary', 'How networks are grouped'], conclusion: 'Logical topology explains communication organization.', movement: (preset) => `${preset.zones.map((zone) => zone.label).join(' → ')}` }),
      detail('choose-useful-view', 'Choose the useful view', 'Use physical topology for ports, cables, and location. Use logical topology for addressing, boundaries, and communication paths.', { category: 'Representation', representation: 'split', facts: ['Cable or port question: physical', 'LAN/WAN or addressing question: logical'], conclusion: 'Both views describe the same network from different angles.', movement: 'Physical attachment ↔ logical organization' }),
    ]),
    operation('network-scope', 'Classify network scope', 'Place local networks, WAN links, and Internet interconnection in context.', [
      detail('classify-local-network', 'Classify the LAN', (preset) => preset.learning.localBoundary, { category: 'Scope', focusTags: ['end-device', 'intermediary'], focusLinkTags: ['local'], facts: ['LAN: limited area', 'Common local administration'], conclusion: 'A LAN interconnects devices in a limited managed area.', movement: (preset) => preset.zones.filter((zone) => zone.scope === 'LAN').map((zone) => zone.label).join(' · ') }),
      detail('classify-wide-network', 'Classify the WAN', (preset) => preset.learning.scope, { category: 'Scope', focusTags: ['router', 'internet'], focusLinkTags: ['wan', 'long-distance'], facts: ['WAN: interconnects distant LANs', 'Routers mark network boundaries'], conclusion: 'A WAN joins networks across a wider area.', movement: (preset) => preset.links.some((item) => item.scope === 'WAN') ? 'LAN → edge router → WAN → remote LAN' : 'This example remains inside one LAN.' }),
      detail('place-the-internet', 'Place the Internet', (preset) => preset.devices.some((item) => item.tags.includes('internet')) ? 'The Internet is the public interconnection between independently managed networks in this scene.' : 'This scene does not require the Internet; local communication can remain inside the LAN.', { category: 'Scope', focusTags: ['internet', 'router'], focusLinkTags: ['wan'], facts: ['Internet: public interconnection', 'Intranet: private organizational network', 'Extranet: limited outside access'], conclusion: 'Internet access is not the definition of a network.', movement: (preset) => preset.devices.some((item) => item.tags.includes('internet')) ? 'Local edge → public interconnection → remote edge' : 'Local source → local destination' }),
    ]),
    operation('reliable-network', 'Evaluate the design', 'Connect fault tolerance, scalability, QoS, security, and professional practice to the scene.', [
      detail('check-fault-tolerance', 'Check fault tolerance', (preset) => preset.learning.reliability, { category: 'Reliable networks', quality: 'fault-tolerance', focusTags: ['intermediary', 'server-role'], facts: ['Avoid one critical failure point', 'Recover service predictably'], conclusion: 'Fault tolerance limits disruption.', movement: 'Identify the path or device whose failure would stop service.' }),
      detail('check-scale-and-quality', 'Check scale and quality', 'A dependable network must add users and services without rebuilding everything, while prioritizing delay-sensitive voice or video when links are busy.', { category: 'Reliable networks', quality: 'scale-qos', focusTags: ['intermediary', 'end-device'], facts: ['Scalability supports growth', 'QoS protects time-sensitive traffic'], conclusion: 'Scalability and QoS protect the user experience.', movement: 'More hosts and services → managed capacity and priority.' }),
      detail('check-security-and-practice', 'Check security and practice', (preset) => `${preset.learning.security} An IT professional documents interfaces, verifies operation, protects access, and communicates changes.`, { category: 'Security and profession', quality: 'security', focusTags: ['router', 'gateway', 'server-role'], facts: ['Confidentiality', 'Integrity', 'Availability', 'Document and verify'], conclusion: (preset) => preset.learning.summary, movement: 'Document → secure → verify → communicate' }),
    ]),
  ]);

  const FLAT_DETAILS = freeze(OPERATIONS.flatMap((item, operationIndex) => item.phases.map((phase, detailIndex) => ({ item, phase, operationIndex, detailIndex }))));
  const PHASES = freeze(OPERATIONS.map((item) => ({ id: item.id, label: item.label, explanation: item.summary })));
  const entityIdsFor = (preset) => freeze({ devices: preset.devices.map((item) => item.id), interfaces: preset.devices.flatMap((item) => item.interfaces.map((entry) => entry.id)), links: preset.links.map((item) => item.id) });
  const ENTITY_IDS_BY_PRESET = freeze(Object.fromEntries(PRESETS.map((preset) => [preset.id, entityIdsFor(preset)])));
  const ENTITY_IDS = ENTITY_IDS_BY_PRESET[PRESETS[0].id];

  function validatePreset(preset) {
    if (!preset?.id || !preset?.label || !preset?.title || !preset?.activityId) throw new Error('Foundation presets require ids, labels, titles, and activity ids.');
    if (!Array.isArray(preset.devices) || !preset.devices.length || !Array.isArray(preset.links) || !preset.links.length) throw new Error('Foundation presets require devices and links.');
    const interfaces = preset.devices.flatMap((item) => item.interfaces.map((entry) => entry.id));
    const allIds = [...preset.devices.map((item) => item.id), ...interfaces, ...preset.links.map((item) => item.id)];
    if (allIds.some((id) => !id) || new Set(allIds).size !== allIds.length) throw new Error('Foundation entity IDs must be present and unique.');
    const interfaceSet = new Set(interfaces);
    if (preset.links.some((item) => !interfaceSet.has(item.fromInterfaceId) || !interfaceSet.has(item.toInterfaceId))) throw new Error('Every foundation link must terminate at declared interfaces.');
    return true;
  }

  function resolvePreset(presetOrId) {
    const preset = typeof presetOrId === 'string' ? PRESET_BY_ID.get(presetOrId) : presetOrId;
    if (!preset) throw new Error(`Unknown foundation preset: ${presetOrId}`);
    validatePreset(preset);
    return preset;
  }

  function normalizeGranularity(value) { return value === 'micro' ? 'micro' : 'operation'; }

  function idsForTags(preset, tags = []) {
    const wanted = new Set(tags);
    const deviceIds = preset.devices.filter((item) => item.tags.some((tag) => wanted.has(tag))).map((item) => item.id);
    const interfaceIds = preset.devices.flatMap((item) => item.interfaces.filter((entry) => entry.tags?.some((tag) => wanted.has(tag))).map((entry) => entry.id));
    return [...deviceIds, ...interfaceIds];
  }

  function linksForTags(preset, tags = []) {
    const wanted = new Set(tags);
    const matches = preset.links.filter((item) => item.tags.some((tag) => wanted.has(tag))).map((item) => item.id);
    return matches.length || !tags.length ? matches : preset.links.map((item) => item.id);
  }

  function operationTimeline(currentOperationIndex, currentDetailIndex, granularity, terminal) {
    let detailedStart = 0;
    return OPERATIONS.map((item, operationIndex) => {
      const status = operationIndex < currentOperationIndex ? 'complete' : operationIndex > currentOperationIndex ? 'upcoming' : terminal ? 'complete' : 'active';
      const marker = {
        id: `operation:${item.id}`, index: operationIndex + 1, label: item.label, status,
        activeEvent: granularity === 'operation' ? operationIndex + 1 : detailedStart + 1,
        details: item.phases.map((phase, detailIndex) => ({
          id: `detail:${phase.id}`, index: detailIndex + 1, label: phase.label,
          status: operationIndex < currentOperationIndex || (operationIndex === currentOperationIndex && detailIndex < currentDetailIndex) ? 'complete'
            : operationIndex > currentOperationIndex || detailIndex > currentDetailIndex ? 'upcoming' : terminal ? 'complete' : 'active',
          activeEvent: granularity === 'micro' ? detailedStart + detailIndex + 1 : null,
        })),
      };
      detailedStart += item.phases.length;
      return marker;
    });
  }

  function frameFor(preset, operationIndex, detailIndex, granularity) {
    const item = OPERATIONS[operationIndex];
    const phase = item.phases[detailIndex];
    const globalIndex = FLAT_DETAILS.findIndex((entry) => entry.operationIndex === operationIndex && entry.detailIndex === detailIndex);
    const terminal = globalIndex === FLAT_DETAILS.length - 1;
    const explanation = resolve(phase.message, preset);
    return {
      kind: 'network-foundations', presetId: preset.id, playbackGranularity: granularity,
      scene: { id: preset.id, title: preset.title, label: preset.label, description: preset.description, networkType: preset.networkType },
      operation: { id: item.id, index: operationIndex + 1, total: OPERATIONS.length, label: item.label, summary: item.summary },
      detail: { id: phase.id, index: detailIndex + 1, total: item.phases.length, globalIndex: globalIndex + 1, globalTotal: FLAT_DETAILS.length, label: phase.label },
      phase: { id: phase.id, index: globalIndex + 1, total: FLAT_DETAILS.length, label: phase.label, explanation, next: terminal ? 'Continue with practice or preview Topic 6.' : FLAT_DETAILS[globalIndex + 1].phase.label },
      topology: { devices: preset.devices, links: preset.links, zones: preset.zones },
      focus: { deviceIds: idsForTags(preset, phase.focusTags || []), linkIds: linksForTags(preset, phase.focusLinkTags || []), representation: phase.representation || 'physical' },
      movement: { label: phase.label, path: resolve(phase.movement, preset) || explanation },
      evidence: { category: phase.category, facts: [...resolve(phase.facts, preset)], conclusion: resolve(phase.conclusion, preset), quality: phase.quality || null },
      operationTimeline: operationTimeline(operationIndex, detailIndex, granularity, terminal),
    };
  }

  function timelineFor(presetOrId = PRESETS[0].id, options = {}) {
    const preset = resolvePreset(presetOrId);
    const granularity = normalizeGranularity(options.granularity);
    if (granularity === 'micro') {
      return freeze(FLAT_DETAILS.map(({ item, phase, operationIndex, detailIndex }, eventIndex) => {
        const frame = frameFor(preset, operationIndex, detailIndex, granularity);
        return BSITPlayback.timelineEvent({
          id: `${ACTIVITY_ID}:${preset.id}:micro:${phase.id}`, domain: DOMAIN, type: phase.id, message: frame.phase.explanation, frame,
          transition: eventIndex === 0 ? null : { kind: 'network-foundation-detail', wait: true, sequenceId: `network-foundation:${preset.id}:${phase.id}`, durationUnits: 1, phases: [{ id: phase.id, label: phase.label, durationWeight: 1, frame }] },
          source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 }, boundary: detailIndex === item.phases.length - 1, terminal: eventIndex === FLAT_DETAILS.length - 1,
        });
      }));
    }
    return freeze(OPERATIONS.map((item, operationIndex) => {
      const frames = item.phases.map((phase, detailIndex) => ({ id: phase.id, label: phase.label, durationWeight: 1, frame: frameFor(preset, operationIndex, detailIndex, granularity) }));
      return BSITPlayback.timelineEvent({
        id: `${ACTIVITY_ID}:${preset.id}:operation:${item.id}`, domain: DOMAIN, type: item.id, message: frames.at(-1).frame.phase.explanation, frame: frames.at(-1).frame,
        transition: operationIndex === 0 ? null : { kind: 'network-foundation-operation', wait: true, sequenceId: `network-foundation:${preset.id}:${item.id}`, durationUnits: frames.length, phases: frames },
        source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 }, boundary: true, terminal: operationIndex === OPERATIONS.length - 1,
      });
    }));
  }

  function finalState(frame) { return freeze({ presetId: frame.presetId, operationId: frame.operation.id, detailId: frame.detail.id, topology: frame.topology, evidence: frame.evidence, focus: frame.focus, movement: frame.movement }); }

  function run(presetOrId, options = {}) {
    const preset = presetOrId ? resolvePreset(presetOrId) : PRESETS[0];
    const granularity = normalizeGranularity(options.granularity);
    const events = timelineFor(preset, { granularity });
    return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: true, output: true }, result: freeze({ presetId: preset.id, granularity, finalFrame: events.at(-1).frame, finalState: finalState(events.at(-1).frame) }) });
  }

  PRESETS.forEach(validatePreset);
  return freeze({
    ACTIVITY_ID, DOMAIN, ENTITY_IDS, ENTITY_IDS_BY_PRESET, PRESETS, PHASES, OPERATIONS, DETAILS: FLAT_DETAILS.map(({ phase }) => phase),
    validatePreset, normalizeGranularity, getPreset(id) { return PRESET_BY_ID.get(id) || null; }, listPresets() { return PRESETS; }, timelineFor, run,
  });
})();
