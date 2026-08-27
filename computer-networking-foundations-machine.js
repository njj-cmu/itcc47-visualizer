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

  const SITUATIONS_BY_PRESET = freeze({
    'client-server-services': [
      { id: 'send-email', label: 'Send an email', intent: 'send an email', request: 'an SMTP mail submission', protocol: 'SMTP', service: 'email service', sourceDeviceId: 'client-laptop', targetDeviceId: 'email-server', pathDeviceIds: ['client-laptop', 'home-router', 'internet-cloud', 'service-router', 'email-server'], pathLinkIds: ['link-client-home', 'link-home-internet', 'link-internet-service', 'link-service-email'], result: 'The email server accepts the message for delivery.' },
      { id: 'open-website', label: 'Open a website', intent: 'open a website', request: 'an HTTPS page request', protocol: 'HTTPS', service: 'web service', sourceDeviceId: 'client-laptop', targetDeviceId: 'web-server', pathDeviceIds: ['client-laptop', 'home-router', 'internet-cloud', 'service-router', 'web-server'], pathLinkIds: ['link-client-home', 'link-home-internet', 'link-internet-service', 'link-service-web'], result: 'The web server returns the requested page.' },
      { id: 'upload-file', label: 'Upload a file', intent: 'upload a class file', request: 'an authenticated SFTP upload', protocol: 'SFTP', service: 'file service', sourceDeviceId: 'client-laptop', targetDeviceId: 'file-server', pathDeviceIds: ['client-laptop', 'home-router', 'internet-cloud', 'service-router', 'file-server'], pathLinkIds: ['link-client-home', 'link-home-internet', 'link-internet-service', 'link-service-file'], result: 'The file server stores the uploaded file.' },
      { id: 'delete-file', label: 'Delete a file', intent: 'delete a shared file', request: 'an authenticated SFTP delete command', protocol: 'SFTP', service: 'file service', sourceDeviceId: 'client-laptop', targetDeviceId: 'file-server', pathDeviceIds: ['client-laptop', 'home-router', 'internet-cloud', 'service-router', 'file-server'], pathLinkIds: ['link-client-home', 'link-home-internet', 'link-internet-service', 'link-service-file'], result: 'The file server checks permission and removes the file.' },
      { id: 'send-chat-message', label: 'Send a chat message', intent: 'send a chat message', request: 'an HTTPS or WebSocket message', protocol: 'HTTPS / WebSocket', service: 'web application service', sourceDeviceId: 'client-laptop', targetDeviceId: 'web-server', pathDeviceIds: ['client-laptop', 'home-router', 'internet-cloud', 'service-router', 'web-server'], pathLinkIds: ['link-client-home', 'link-home-internet', 'link-internet-service', 'link-service-web'], result: 'The web application accepts the message and makes it available to the recipient.' },
    ],
    'local-peer-sharing': [
      { id: 'request-peer-file', label: 'Request a peer file', intent: 'request a shared file from Peer B', request: 'a local file-sharing request', protocol: 'SMB', service: 'peer file service', sourceDeviceId: 'peer-laptop-a', targetDeviceId: 'peer-laptop-b', pathDeviceIds: ['peer-laptop-a', 'peer-switch', 'peer-laptop-b'], pathLinkIds: ['link-peer-a-switch', 'link-switch-peer-b'], result: 'Peer B returns the shared file without using a router or the Internet.' },
    ],
    'small-office-components': [
      { id: 'save-office-backup', label: 'Save an office backup', intent: 'save a backup on the server laptop', request: 'a protected file copy', protocol: 'SMB', service: 'office file service', sourceDeviceId: 'office-laptop', targetDeviceId: 'server-laptop', pathDeviceIds: ['office-laptop', 'office-ap', 'office-switch', 'server-laptop'], pathLinkIds: ['link-laptop-ap', 'link-ap-switch', 'link-switch-server-laptop'], result: 'The server laptop stores the backup even though it has the same physical form as a client laptop.' },
    ],
    'campus-media': [
      { id: 'open-library-catalog', label: 'Open the library catalog', intent: 'open the library catalog', request: 'an HTTPS catalog request', protocol: 'HTTPS', service: 'library catalog service', sourceDeviceId: 'faculty-pc', targetDeviceId: 'library-server', pathDeviceIds: ['faculty-pc', 'building-a-switch', 'building-b-switch', 'library-server'], pathLinkIds: ['link-faculty-switch-a', 'link-building-fiber', 'link-switch-b-library'], result: 'The library server returns catalog results across the campus fiber backbone.' },
    ],
    'branch-topology': [
      { id: 'open-hq-application', label: 'Open the HQ application', intent: 'open the headquarters application', request: 'an HTTPS application request', protocol: 'HTTPS', service: 'business application', sourceDeviceId: 'branch-laptop', targetDeviceId: 'hq-app-server', pathDeviceIds: ['branch-laptop', 'branch-ap-router', 'branch-internet', 'hq-router', 'hq-switch', 'hq-app-server'], pathLinkIds: ['link-branch-wireless', 'link-branch-provider', 'link-provider-hq', 'link-hq-router-switch', 'link-hq-switch-server'], result: 'The HQ application server returns the business application response to the branch.' },
    ],
  });

  const resolve = (value, preset, situation) => typeof value === 'function' ? value(preset, situation) : value;
  const detail = (id, label, message, evidence = {}) => ({ id, label, message, ...evidence });
  const operation = (id, label, summary, phases) => ({ id, label, summary, phases });

  const sourceFocus = (_preset, situation) => [situation.sourceDeviceId];
  const targetFocus = (_preset, situation) => [situation.targetDeviceId];
  const departureFocus = (_preset, situation) => [situation.pathDeviceIds[1] || situation.sourceDeviceId];
  const transitFocus = (_preset, situation) => situation.pathDeviceIds.length > 4
    ? situation.pathDeviceIds.slice(2, -2)
    : [situation.pathDeviceIds[Math.max(1, situation.pathDeviceIds.length - 2)]];
  const arrivalFocus = (_preset, situation) => [situation.pathDeviceIds.at(-2) || situation.targetDeviceId];
  const fullPathFocus = (_preset, situation) => situation.pathDeviceIds;
  const linksThrough = (count) => (_preset, situation) => situation.pathLinkIds.slice(0, count < 0 ? undefined : count);
  const allPathLinks = (_preset, situation) => situation.pathLinkIds;
  const labelForDevice = (preset, id) => preset.devices.find((item) => item.id === id)?.label || id;
  const callout = (deviceSelector, message) => (preset, situation) => ({
    [deviceSelector(preset, situation)[0]]: resolve(message, preset, situation),
  });
  const sourceCallout = callout(sourceFocus, (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} wants to ${situation.intent}.`);
  const targetCallout = callout(targetFocus, (preset, situation) => `${labelForDevice(preset, situation.targetDeviceId)} provides the ${situation.service}.`);
  const departureCallout = callout(departureFocus, (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds[1])} forwards the request beyond the source network.`);
  const transitCallout = callout(transitFocus, (preset, situation) => `${labelForDevice(preset, transitFocus(preset, situation)[0])} carries the request toward the destination network.`);
  const arrivalCallout = callout(arrivalFocus, (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds.at(-2))} forwards the request to the selected service.`);

  const OPERATIONS = freeze([
    operation('state-task', 'State the task', 'Begin with what the client is trying to accomplish.', [
      detail('identify-client', 'Identify the client', (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} is the client because it starts this request.`, { category: 'Client role', focusDeviceIds: sourceFocus, facts: ['A client starts a service request', 'The client is an end device'], conclusion: 'The communication starts at the client.', movement: (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} prepares to ${situation.intent}.`, callouts: sourceCallout }),
      detail('state-user-goal', 'State the user goal', (_preset, situation) => `The user wants to ${situation.intent}; that goal determines which network service is needed.`, { category: 'Client role', focusDeviceIds: sourceFocus, facts: (_preset, situation) => [`Goal: ${situation.intent}`, `Request: ${situation.request}`], conclusion: 'Start with the user task, not with a cable or protocol name.', movement: (_preset, situation) => `User goal → ${situation.request}`, callouts: sourceCallout }),
      detail('create-application-data', 'Create application data', (_preset, situation) => `The client application creates ${situation.request}.`, { category: 'Application data', focusDeviceIds: sourceFocus, facts: (_preset, situation) => [`Application protocol: ${situation.protocol}`, 'The data still belongs to the client application'], conclusion: 'Applications create the data that the network must deliver.', movement: (_preset, situation) => `${situation.protocol} data is ready at the client.`, callouts: sourceCallout }),
    ]),
    operation('choose-endpoint', 'Choose the endpoint', 'Match the task to the server that provides the required service.', [
      detail('compare-server-roles', 'Compare the server roles', (preset) => preset.id === 'client-server-services' ? 'Email, web, and file servers are separate because each provides different service software.' : preset.learning.serviceRoles, { category: 'Server roles', focusDeviceIds: (preset) => preset.devices.filter((item) => item.tags.includes('server-role') || item.tags.includes('destination')).map((item) => item.id), facts: ['Email server: mail', 'Web server: pages and web applications', 'File server: shared files'], conclusion: 'Server roles are defined by the service they provide.', movement: 'Compare the possible endpoints.' }),
      detail('select-service-server', 'Select the service server', (preset, situation) => `${labelForDevice(preset, situation.targetDeviceId)} is selected because it provides the ${situation.service}.`, { category: 'Server roles', focusDeviceIds: targetFocus, facts: (_preset, situation) => [`Service: ${situation.service}`, `Protocol: ${situation.protocol}`], conclusion: 'The task identifies the correct endpoint.', movement: (preset, situation) => `Highlight ${labelForDevice(preset, situation.targetDeviceId)} as the destination.`, callouts: targetCallout }),
      detail('confirm-endpoint-role', 'Confirm the endpoint role', (preset, situation) => `${labelForDevice(preset, situation.targetDeviceId)} is both an end device and a server for this exchange.`, { category: 'Server roles', focusDeviceIds: targetFocus, facts: ['End device: message endpoint', 'Server: provides the requested service'], conclusion: 'End device and server describe different aspects of the same host.', movement: (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} → ${labelForDevice(preset, situation.targetDeviceId)}`, callouts: targetCallout }),
    ]),
    operation('prepare-request', 'Prepare the request', 'Name the service and prepare the request before it leaves the client.', [
      detail('select-application-protocol', 'Select the protocol', (_preset, situation) => `${situation.protocol} supplies the application rules for this ${situation.service} request.`, { category: 'Application protocol', focusDeviceIds: sourceFocus, facts: (_preset, situation) => [`Selected protocol: ${situation.protocol}`, 'The protocol must match the server role'], conclusion: 'Applications use a protocol understood by the selected server.', movement: (_preset, situation) => `${situation.protocol} selected`, callouts: sourceCallout }),
      detail('name-request', 'Name the request', (_preset, situation) => `The client prepares ${situation.request}.`, { category: 'Application protocol', focusDeviceIds: sourceFocus, facts: (_preset, situation) => [`Request: ${situation.request}`, `Destination service: ${situation.service}`], conclusion: 'A precise request describes what the server should do.', movement: (_preset, situation) => `${situation.request} → ready`, callouts: sourceCallout }),
      detail('queue-request', 'Queue the request', (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} hands the request to its network connection for delivery.`, { category: 'Application protocol', focusDeviceIds: sourceFocus, focusLinkIds: linksThrough(1), facts: ['Application data is ready', 'The first network link is selected'], conclusion: 'The request is ready to leave the client.', movement: (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} → ${labelForDevice(preset, situation.pathDeviceIds[1])}`, callouts: sourceCallout }),
    ]),
    operation('leave-source-network', 'Leave the source network', 'Follow the first link to the device that forwards the request onward.', [
      detail('enter-first-link', 'Enter the first link', (preset, situation) => `The request leaves ${labelForDevice(preset, situation.sourceDeviceId)} on the first link.`, { category: 'Source network', focusDeviceIds: sourceFocus, focusLinkIds: linksThrough(1), facts: (preset) => [preset.learning.media, 'Only the used path is highlighted'], conclusion: 'The physical medium carries bits to the next device.', movement: (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} → first link`, callouts: sourceCallout }),
      detail('reach-source-intermediary', 'Reach the first intermediary', (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds[1])} receives the request and decides where it should continue.`, { category: 'Source network', focusDeviceIds: departureFocus, focusLinkIds: linksThrough(1), facts: ['Intermediary devices receive and forward traffic', 'The next hop follows the destination path'], conclusion: 'The first intermediary moves the request beyond the client.', movement: (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} → ${labelForDevice(preset, situation.pathDeviceIds[1])}`, callouts: departureCallout }),
      detail('forward-beyond-source', 'Forward beyond the source', (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds[1])} forwards the request toward the next network.`, { category: 'Source network', focusDeviceIds: departureFocus, focusLinkIds: linksThrough(Math.min(2, 99)), facts: ['The intermediary does not provide the requested application service', 'It forwards toward the endpoint'], conclusion: 'Forwarding continues the path without changing the user task.', movement: (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds[1])} → ${labelForDevice(preset, situation.pathDeviceIds[2] || situation.targetDeviceId)}`, callouts: departureCallout }),
    ]),
    operation('cross-network-path', 'Cross the network path', 'Trace the request through the transit network one hop at a time.', [
      detail('enter-transit', 'Enter the transit network', (preset, situation) => `${labelForDevice(preset, transitFocus(preset, situation)[0])} carries the request between the source and destination networks.`, { category: 'Transit path', focusDeviceIds: transitFocus, focusLinkIds: linksThrough(Math.max(2, 1)), facts: ['Transit devices carry traffic', 'They are not the application endpoint'], conclusion: 'The request is moving between networks.', movement: (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds[1])} → ${labelForDevice(preset, transitFocus(preset, situation)[0])}`, callouts: transitCallout }),
      detail('follow-transit-hop', 'Follow the transit hop', (preset, situation) => `Each highlighted link advances the same ${situation.protocol} request toward ${labelForDevice(preset, situation.targetDeviceId)}.`, { category: 'Transit path', focusDeviceIds: transitFocus, focusLinkIds: (preset, situation) => situation.pathLinkIds.slice(0, Math.max(2, situation.pathLinkIds.length - 1)), facts: ['The service request remains the same', 'The physical link changes at each hop'], conclusion: 'One application request can cross several network links.', movement: (_preset, situation) => situation.pathDeviceIds.slice(1, -1).join(' → '), callouts: transitCallout }),
      detail('approach-destination-network', 'Approach the destination network', (preset, situation) => `The request is now approaching the network that contains ${labelForDevice(preset, situation.targetDeviceId)}.`, { category: 'Transit path', focusDeviceIds: transitFocus, focusLinkIds: (preset, situation) => situation.pathLinkIds.slice(0, -1), facts: ['The endpoint has not acted yet', 'One destination-side forwarding step remains'], conclusion: 'Transit ends at the destination network edge.', movement: (preset, situation) => `${labelForDevice(preset, transitFocus(preset, situation).at(-1))} → destination network`, callouts: transitCallout }),
    ]),
    operation('reach-destination-network', 'Reach the destination network', 'Let the destination-side intermediary select the final server link.', [
      detail('reach-destination-edge', 'Reach the destination edge', (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds.at(-2))} receives the request for the destination network.`, { category: 'Destination network', focusDeviceIds: arrivalFocus, focusLinkIds: (preset, situation) => situation.pathLinkIds.slice(0, -1), facts: ['The destination network is now reached', 'The final server link is known'], conclusion: 'The destination-side device prepares the final forwarding step.', movement: (preset, situation) => `Transit path → ${labelForDevice(preset, situation.pathDeviceIds.at(-2))}`, callouts: arrivalCallout }),
      detail('select-final-link', 'Select the final link', (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds.at(-2))} selects the link leading to ${labelForDevice(preset, situation.targetDeviceId)}.`, { category: 'Destination network', focusDeviceIds: arrivalFocus, focusLinkIds: allPathLinks, facts: ['The correct server path is selected', 'Unused service links remain inactive'], conclusion: 'The requested service determines the final endpoint link.', movement: (preset, situation) => `${labelForDevice(preset, situation.pathDeviceIds.at(-2))} → ${labelForDevice(preset, situation.targetDeviceId)}`, callouts: arrivalCallout }),
      detail('deliver-to-server', 'Deliver to the server', (preset, situation) => `The request arrives at ${labelForDevice(preset, situation.targetDeviceId)}.`, { category: 'Destination network', focusDeviceIds: targetFocus, focusLinkIds: allPathLinks, facts: (_preset, situation) => [`Delivered request: ${situation.request}`, `Endpoint protocol: ${situation.protocol}`], conclusion: 'The network has delivered the request to the correct endpoint.', movement: (preset, situation) => `Final link → ${labelForDevice(preset, situation.targetDeviceId)}`, callouts: targetCallout }),
    ]),
    operation('server-acts', 'Let the server act', 'Show that the selected server performs the requested service operation.', [
      detail('server-reads-request', 'Read the request', (preset, situation) => `${labelForDevice(preset, situation.targetDeviceId)} reads ${situation.request}.`, { category: 'Server action', focusDeviceIds: targetFocus, facts: ['The server application receives the data', 'The protocol tells it how to interpret the request'], conclusion: 'The network delivers; the server application acts.', movement: (_preset, situation) => `${situation.protocol} request → server application`, callouts: targetCallout }),
      detail('perform-service-action', 'Perform the service action', (_preset, situation) => situation.result, { category: 'Server action', focusDeviceIds: targetFocus, facts: (_preset, situation) => [`Service: ${situation.service}`, `Action: ${situation.intent}`], conclusion: 'Different services perform different work on the same network topology.', movement: (_preset, situation) => `${situation.service} performs the requested action`, callouts: targetCallout }),
      detail('prepare-result', 'Prepare the result', (preset, situation) => `${labelForDevice(preset, situation.targetDeviceId)} prepares a result for the client.`, { category: 'Server action', focusDeviceIds: targetFocus, facts: ['The result becomes new application data', 'The server now sends and the original client receives'], conclusion: 'The response reverses the application roles for the return trip.', movement: (preset, situation) => `${labelForDevice(preset, situation.targetDeviceId)} → response ready`, callouts: targetCallout }),
    ]),
    operation('return-result', 'Return the result', 'Trace the response back to the original client and complete the task.', [
      detail('reverse-the-path', 'Reverse the path', (preset, situation) => `The result follows the network path back from ${labelForDevice(preset, situation.targetDeviceId)} to ${labelForDevice(preset, situation.sourceDeviceId)}.`, { category: 'Response', focusDeviceIds: fullPathFocus, focusLinkIds: allPathLinks, facts: ['The response crosses the same network roles in reverse', 'The server is now the sender'], conclusion: 'The return path carries the service result.', movement: (_preset, situation) => [...situation.pathDeviceIds].reverse().join(' → '), callouts: targetCallout }),
      detail('deliver-result-to-client', 'Deliver the result', (preset, situation) => `${labelForDevice(preset, situation.sourceDeviceId)} receives the result from ${labelForDevice(preset, situation.targetDeviceId)}.`, { category: 'Response', focusDeviceIds: sourceFocus, focusLinkIds: allPathLinks, facts: (_preset, situation) => [`Completed task: ${situation.intent}`, `Application protocol: ${situation.protocol}`], conclusion: 'The client receives the service result.', movement: (preset, situation) => `${labelForDevice(preset, situation.targetDeviceId)} → ${labelForDevice(preset, situation.sourceDeviceId)}`, callouts: sourceCallout }),
      detail('complete-user-task', 'Complete the user task', (_preset, situation) => `The network exchange is complete: the client was able to ${situation.intent}.`, { category: 'Completion', focusDeviceIds: fullPathFocus, focusLinkIds: allPathLinks, facts: ['Client chose a service', 'Intermediaries carried the request', 'The server acted and replied'], conclusion: 'A network connects an application need to the correct service through a traceable path.', movement: (_preset, situation) => `Complete · ${situation.label}`, callouts: sourceCallout }),
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
    const deviceSet = new Set(preset.devices.map((item) => item.id));
    const linkSet = new Set(preset.links.map((item) => item.id));
    const situations = SITUATIONS_BY_PRESET[preset.id];
    if (!Array.isArray(situations) || !situations.length) throw new Error('Every foundation preset requires at least one situation.');
    if (situations.some((item) => !item.id || !item.label || !deviceSet.has(item.sourceDeviceId) || !deviceSet.has(item.targetDeviceId)
      || item.pathDeviceIds.some((id) => !deviceSet.has(id)) || item.pathLinkIds.some((id) => !linkSet.has(id))
      || item.pathDeviceIds[0] !== item.sourceDeviceId || item.pathDeviceIds.at(-1) !== item.targetDeviceId
      || item.pathLinkIds.length !== item.pathDeviceIds.length - 1)) throw new Error('Foundation situations must declare a valid source-to-target path.');
    return true;
  }

  function resolvePreset(presetOrId) {
    const preset = typeof presetOrId === 'string' ? PRESET_BY_ID.get(presetOrId) : presetOrId;
    if (!preset) throw new Error(`Unknown foundation preset: ${presetOrId}`);
    validatePreset(preset);
    return preset;
  }

  function listSituations(presetOrId = PRESETS[0].id) {
    const preset = resolvePreset(presetOrId);
    return SITUATIONS_BY_PRESET[preset.id];
  }

  function resolveSituation(preset, situationId) {
    const situations = listSituations(preset);
    return situations.find((item) => item.id === situationId) || situations[0];
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

  function frameFor(preset, situation, operationIndex, detailIndex, granularity) {
    const item = OPERATIONS[operationIndex];
    const phase = item.phases[detailIndex];
    const globalIndex = FLAT_DETAILS.findIndex((entry) => entry.operationIndex === operationIndex && entry.detailIndex === detailIndex);
    const terminal = globalIndex === FLAT_DETAILS.length - 1;
    const explanation = resolve(phase.message, preset, situation);
    const explicitDeviceIds = resolve(phase.focusDeviceIds, preset, situation);
    const explicitLinkIds = resolve(phase.focusLinkIds, preset, situation);
    return {
      kind: 'network-foundations', presetId: preset.id, situationId: situation.id, playbackGranularity: granularity,
      scene: { id: preset.id, title: preset.title, label: preset.label, description: preset.description, networkType: preset.networkType },
      situation: { id: situation.id, label: situation.label, intent: situation.intent, request: situation.request, protocol: situation.protocol, service: situation.service, sourceDeviceId: situation.sourceDeviceId, targetDeviceId: situation.targetDeviceId, pathDeviceIds: situation.pathDeviceIds, pathLinkIds: situation.pathLinkIds, result: situation.result },
      operation: { id: item.id, index: operationIndex + 1, total: OPERATIONS.length, label: item.label, summary: item.summary },
      detail: { id: phase.id, index: detailIndex + 1, total: item.phases.length, globalIndex: globalIndex + 1, globalTotal: FLAT_DETAILS.length, label: phase.label },
      phase: { id: phase.id, index: globalIndex + 1, total: FLAT_DETAILS.length, label: phase.label, explanation, next: terminal ? 'Continue with practice or preview Topic 6.' : FLAT_DETAILS[globalIndex + 1].phase.label },
      topology: { devices: preset.devices, links: preset.links, zones: preset.zones },
      focus: { deviceIds: explicitDeviceIds || idsForTags(preset, phase.focusTags || []), linkIds: explicitLinkIds || linksForTags(preset, phase.focusLinkTags || []), representation: 'generic' },
      callouts: resolve(phase.callouts, preset, situation) || {},
      movement: { label: phase.label, path: resolve(phase.movement, preset, situation) || explanation },
      evidence: { category: phase.category, facts: [...resolve(phase.facts, preset, situation)], conclusion: resolve(phase.conclusion, preset, situation), quality: phase.quality || null },
      operationTimeline: operationTimeline(operationIndex, detailIndex, granularity, terminal),
    };
  }

  function timelineFor(presetOrId = PRESETS[0].id, options = {}) {
    const preset = resolvePreset(presetOrId);
    const situation = resolveSituation(preset, options.situationId);
    const granularity = normalizeGranularity(options.granularity);
    if (granularity === 'micro') {
      return freeze(FLAT_DETAILS.map(({ item, phase, operationIndex, detailIndex }, eventIndex) => {
        const frame = frameFor(preset, situation, operationIndex, detailIndex, granularity);
        return BSITPlayback.timelineEvent({
          id: `${ACTIVITY_ID}:${preset.id}:${situation.id}:micro:${phase.id}`, domain: DOMAIN, type: phase.id, message: frame.phase.explanation, frame,
          transition: eventIndex === 0 ? null : { kind: 'network-foundation-detail', wait: true, sequenceId: `network-foundation:${preset.id}:${situation.id}:${phase.id}`, durationUnits: 1, phases: [{ id: phase.id, label: phase.label, durationWeight: 1, frame }] },
          source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 }, boundary: detailIndex === item.phases.length - 1, terminal: eventIndex === FLAT_DETAILS.length - 1,
        });
      }));
    }
    return freeze(OPERATIONS.map((item, operationIndex) => {
      const frames = item.phases.map((phase, detailIndex) => ({ id: phase.id, label: phase.label, durationWeight: 1, frame: frameFor(preset, situation, operationIndex, detailIndex, granularity) }));
      return BSITPlayback.timelineEvent({
        id: `${ACTIVITY_ID}:${preset.id}:${situation.id}:operation:${item.id}`, domain: DOMAIN, type: item.id, message: frames.at(-1).frame.phase.explanation, frame: frames.at(-1).frame,
        transition: operationIndex === 0 ? null : { kind: 'network-foundation-operation', wait: true, sequenceId: `network-foundation:${preset.id}:${situation.id}:${item.id}`, durationUnits: frames.length, phases: frames },
        source: { line: operationIndex + 1, code: item.label }, segment: { id: item.id, index: operationIndex + 1 }, boundary: true, terminal: operationIndex === OPERATIONS.length - 1,
      });
    }));
  }

  function finalState(frame) { return freeze({ presetId: frame.presetId, situationId: frame.situationId, operationId: frame.operation.id, detailId: frame.detail.id, topology: frame.topology, evidence: frame.evidence, focus: frame.focus, movement: frame.movement }); }

  function run(presetOrId, options = {}) {
    const preset = presetOrId ? resolvePreset(presetOrId) : PRESETS[0];
    const granularity = normalizeGranularity(options.granularity);
    const situation = resolveSituation(preset, options.situationId);
    const events = timelineFor(preset, { granularity, situationId: situation.id });
    return BSITPlayback.runResult({ events, capabilities: { visualize: true, trace: true, variables: true, operations: true, output: true }, result: freeze({ presetId: preset.id, situationId: situation.id, granularity, finalFrame: events.at(-1).frame, finalState: finalState(events.at(-1).frame) }) });
  }

  PRESETS.forEach(validatePreset);
  return freeze({
    ACTIVITY_ID, DOMAIN, ENTITY_IDS, ENTITY_IDS_BY_PRESET, PRESETS, PHASES, OPERATIONS, DETAILS: FLAT_DETAILS.map(({ phase }) => phase),
    validatePreset, normalizeGranularity, getPreset(id) { return PRESET_BY_ID.get(id) || null; }, listPresets() { return PRESETS; }, listSituations, resolveSituation, timelineFor, run,
  });
})();
