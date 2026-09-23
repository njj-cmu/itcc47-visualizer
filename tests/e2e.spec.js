const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const instructorAccessToken = fs.readFileSync(path.resolve(__dirname, '..', '.instructor-preview-token'), 'utf8').trim();
const instructorAccessRecord = { schemaVersion: 1, profileId: 'itcc47-2026-2027-s1', profileVersion: 6, token: instructorAccessToken };
const instructorPreviewRecord = { schemaVersion: 2, profileId: 'itcc47-2026-2027-s1', profileVersion: 6, currentCheckpointId: 'm8-dp' };

const entries = ['index.html', 'itcc47.html', 'itcc45.html', 'itcc45-topics.html', 'itcc45-practice.html?topic=classes', 'computer-architecture.html', 'computer-architecture-modules.html', 'computer-architecture-practice.html', 'computer-networking.html', 'computer-networking-modules.html', 'computer-networking-practice.html', 'visualizer.html', 'visualizer.html?activity=insertion-sort', 'visualizer.html?activity=deque-sliding-window', 'visualizer.html?course=itcc45&activity=itcc45-classes-blueprint', 'visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle', 'visualizer.html?course=computer-architecture&activity=architecture-decode-instruction', 'visualizer.html?course=computer-architecture&activity=architecture-add-immediate', 'visualizer.html?course=computer-networking&activity=networking-read-classroom-network', 'visualizer.html?course=computer-networking&activity=networking-local-peer-sharing', 'visualizer.html?course=computer-networking&activity=networking-classify-components', 'visualizer.html?course=computer-networking&activity=networking-compare-media', 'visualizer.html?course=computer-networking&activity=networking-read-network-topologies', 'visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery', 'industry-workbench.html', 'industry-workbench.html?scenario=industry-priority-range-recall', 'writer.html', 'tracer.html', 'problems.html', 'problems.html?view=midterm', 'problems.html?view=visualizations', 'problems.html?view=workbenches', 'lesson.html?checkpoint=m2-selection-sort', 'lesson.html?checkpoint=m3-linked-foundations&preview=1', 'student-materials.html', 'problem-list.html?module=1', 'practice.html?module=1', 'practice.html?module=3&problem=linked-node-count', 'practice.html?module=4&problem=stack-reverse'];

const curriculumSource = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'curriculum.public.json'), 'utf8'));
const checkpointById = new Map(curriculumSource.checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]));
const midtermCheckpoints = curriculumSource.checkpoints.filter((checkpoint) => ['m1', 'm2', 'm3', 'm4'].includes(checkpoint.moduleId));
const expectedMidtermPrimaryResources = midtermCheckpoints.flatMap((checkpoint) => {
  const sequenceOrder = new Map(checkpoint.sequence.map((reference, index) => [reference, index]));
  const resources = curriculumSource.resources.filter((resource) => resource.checkpointId === checkpoint.id)
    .sort((left, right) => sequenceOrder.get(`${left.kind}:${left.id}`) - sequenceOrder.get(`${right.kind}:${right.id}`));
  return [resources.find((resource) => resource.kind !== 'problem'), resources.find((resource) => resource.kind === 'problem')].filter(Boolean);
});
const midtermResourcesByModule = new Map([1, 2, 3, 4].map((moduleNumber) => [moduleNumber,
  curriculumSource.resources.filter((resource) => checkpointById.get(resource.checkpointId)?.moduleId === `m${moduleNumber}`),
]));

const studentStateTests = new Set([
  'curriculum roadmap expands the current module and compacts locked modules',
  'student preview query cannot expose instructor controls or locked content',
  'instructor preview is explicit, persistent, and does not change the deployed profile',
]);

test.beforeEach(async ({ page }, testInfo) => {
  if (studentStateTests.has(testInfo.title)) return;
  await page.addInitScript(({ access, preview }) => {
    localStorage.setItem('itcc47.instructor-access:v1', JSON.stringify(access));
    localStorage.setItem('itcc47.release-preview:v1', JSON.stringify(preview));
  }, { access: instructorAccessRecord, preview: instructorPreviewRecord });
});

async function openMobilePlaybackDetails(page) {
  const details = page.locator('.mobile-playback-details');
  if (await details.isVisible() && await details.getAttribute('open') === null) await details.locator('summary').click();
}

async function visualizerTimeline(page) {
  const desktop = page.locator('#step-slider');
  if (await desktop.isVisible()) return desktop;
  await openMobilePlaybackDetails(page);
  return page.getByLabel('Mobile timeline step', { exact: true });
}

async function visualizerMotion(page) {
  const desktop = page.locator('.playback-settings .motion-control select');
  if (await desktop.isVisible()) return desktop;
  if (await page.locator('.mobile-playback-details').isVisible()) {
    await openMobilePlaybackDetails(page);
    return page.locator('.mobile-playback-details .motion-control select');
  }
  if (await page.locator('.playback-settings').getAttribute('open') === null) await page.getByText('Settings', { exact: true }).click();
  return desktop;
}

async function visualizerSpeed(page) {
  const desktop = page.locator('.playback-settings .speed-control select');
  if (await desktop.isVisible()) return desktop;
  if (await page.locator('.mobile-playback-details').isVisible()) {
    await openMobilePlaybackDetails(page);
    return page.locator('.mobile-playback-details .speed-control select');
  }
  if (await page.locator('.playback-settings').getAttribute('open') === null) await page.getByText('Settings', { exact: true }).click();
  return desktop;
}

async function installCpuAnimationProbe(page) {
  await page.evaluate(() => {
    window.__cpuAnimationObserver?.disconnect();
    window.__cpuAnimationSamples = [];
    const record = () => {
      const root = document.querySelector('.cpu-datapath-full');
      if (!root) return;
      const sample = {
        phase: document.querySelector('.cpu-canvas-heading')?.textContent || '',
        stage: document.querySelector('.cpu-datapath-renderer')?.getAttribute('data-animation-stage') || '',
        movingValues: root.querySelectorAll('[data-motion-role="moving-value"]').length,
        movingControlCues: root.querySelectorAll('[data-motion-role="control-signal"]').length,
        activeRoutes: [...root.querySelectorAll('[data-active-route-id]')].map((node) => node.getAttribute('data-active-route-id')),
        activeControlRoutes: [...root.querySelectorAll('[data-active-control-id]')].map((node) => node.getAttribute('data-active-control-id')),
        activeComponents: [...root.querySelectorAll('[data-component-id]:is(.is-source,.is-sent,.is-ready,.is-received)')].map((node) => node.getAttribute('data-component-id')),
        componentStates: Object.fromEntries([...root.querySelectorAll('[data-component-id][data-component-state]')].map((node) => [node.getAttribute('data-component-id'), node.getAttribute('data-component-state')])),
        cueDirections: [...root.querySelectorAll('[data-signal-direction]')].map((node) => node.getAttribute('data-signal-direction')),
        readingRows: root.querySelectorAll('.cpu-main-memory .cpu-memory-row.is-reading').length,
      };
      const previous = window.__cpuAnimationSamples.at(-1);
      if (JSON.stringify(previous) !== JSON.stringify(sample)) window.__cpuAnimationSamples.push(sample);
    };
    const observer = new MutationObserver(record);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });
    window.__cpuAnimationObserver = observer;
    record();
  });
}

async function collectCpuAnimationSamples(page) {
  return page.evaluate(() => {
    window.__cpuAnimationObserver?.disconnect();
    return window.__cpuAnimationSamples || [];
  });
}

async function installITCC45MotionProbe(page) {
  await page.evaluate(() => {
    window.__itcc45MotionObserver?.disconnect();
    window.__itcc45MotionSamples = [];
    const root = document.querySelector('.itcc45-model-pane');
    const record = (element) => {
      if (!(element instanceof Element)) return;
      const kind = element.matches('.object-class-member') ? 'member'
        : element.matches('.object-instance-card') ? 'object'
          : element.matches('[data-field-name] code') ? 'field'
            : null;
      if (!kind) return;
      window.__itcc45MotionSamples.push({ kind, text: element.textContent, style: element.getAttribute('style') || '' });
      if (window.__itcc45MotionSamples.length > 800) window.__itcc45MotionSamples.shift();
    };
    const observer = new MutationObserver((records) => records.forEach((mutation) => {
      if (mutation.type === 'attributes') record(mutation.target);
      mutation.addedNodes.forEach((node) => {
        record(node);
        node.querySelectorAll?.('.object-class-member, .object-instance-card, [data-field-name] code').forEach(record);
      });
    }));
    observer.observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['style'] });
    window.__itcc45MotionObserver = observer;
  });
}

async function expectRecordedMotion(page, kind, text) {
  await expect.poll(() => page.evaluate(({ kind, text }) => {
    const styles = (window.__itcc45MotionSamples || [])
      .filter((sample) => sample.kind === kind && sample.text.includes(text)).map((sample) => sample.style);
    return styles.some((style) => /opacity:\s*0(?:;|$)/.test(style))
      && styles.some((style) => /opacity:\s*1(?:;|$)/.test(style));
  }, { kind, text })).toBeTruthy();
}

for (const entry of entries) {
  test(`${entry} has no horizontal overflow`, async ({ page }) => {
    await page.goto(`/${entry}`);
    await expect(page.locator('body')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
  });
}

test('mobile navigation opens and moves focus', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/itcc47.html');
  const toggle = page.getByRole('button', { name: /menu/i });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'Start', exact: true })).toBeFocused();
});

test('subject chooser launches Computer Architecture and Introduction to Networking', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.locator('.subject-choice')).toHaveCount(4);
  const architectureCard = page.locator('.subject-choice-ca');
  await expect(architectureCard).toContainText('Computer Architecture');
  await architectureCard.click();
  await expect(page).toHaveURL(/computer-architecture\.html$/);
  await expect(page.getByRole('heading', { name: 'Watch one instruction travel through the CPU.' })).toBeVisible();
  await page.goto('/index.html');
  const networkingCard = page.locator('.subject-choice-network');
  await expect(networkingCard).toContainText('Introduction to Networking');
  await networkingCard.click();
  await expect(page).toHaveURL(/computer-networking\.html$/);
  await expect(page.getByRole('heading', { name: 'Start with hosts, roles, and network components.' })).toBeVisible();
});

test('subject chooser remains usable when the catalog grows to ten courses', async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => {
    const catalog = document.querySelector('.subject-choices');
    const seeds = [...catalog.children];
    while (catalog.children.length < 10) {
      const clone = seeds[catalog.children.length % seeds.length].cloneNode(true);
      clone.href = `#future-subject-${catalog.children.length + 1}`;
      clone.setAttribute('aria-label', `Open future subject ${catalog.children.length + 1}`);
      catalog.append(clone);
    }
  });

  const cards = page.locator('.subject-choice');
  await expect(cards).toHaveCount(10);
  const layout = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.subject-choice')];
    return {
      pageFits: document.documentElement.scrollWidth <= window.innerWidth,
      rows: new Set(items.map((item) => Math.round(item.getBoundingClientRect().top))).size,
      widths: items.map((item) => item.getBoundingClientRect().width),
    };
  });
  expect(layout.pageFits).toBe(true);
  expect(layout.rows).toBeGreaterThan(1);
  expect(Math.min(...layout.widths)).toBeGreaterThanOrEqual(280);
});

test('computer architecture roadmap exposes one current module and two non-clickable planned modules', async ({ page }) => {
  await page.goto('/computer-architecture-modules.html');
  await expect(page.locator('.ca-module-card')).toHaveCount(3);
  await expect(page.locator('.ca-module-card.is-current')).toContainText('Fetch one instruction');
  await expect(page.locator('.ca-module-card.is-current')).toContainText('Decode one instruction');
  await expect(page.locator('.ca-module-card.is-current')).toContainText('Add 5 + 13');
  await expect(page.locator('.ca-module-card.is-current .ca-module-activity')).toHaveCount(3);
  await expect(page.locator('.ca-module-card.is-planned')).toHaveCount(2);
  await expect(page.locator('.ca-module-card.is-planned a')).toHaveCount(0);
  await expect(page.locator('.topbar-nav a[href="computer-architecture-modules.html"]')).toHaveAttribute('aria-current', 'page');
});

test('computer architecture practice stores only version and solved IDs and can reset', async ({ page }) => {
  await page.goto('/computer-architecture-practice.html');
  const first = page.locator('.ca-practice-card').first();
  await first.getByLabel('PC → MAR → address bus → memory → MDR → IR → increment PC').check();
  await first.getByRole('button', { name: 'Check answer' }).click();
  await expect(first.locator('.ca-practice-feedback')).toContainText('Correct.');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('computer-architecture.practice:v1')));
  expect(stored).toEqual({ contentVersion: 1, solvedIds: ['fetch-order'] });
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.locator('#ca-practice-progress')).toHaveText('0 / 7 complete');
  expect(await page.evaluate(() => localStorage.getItem('computer-architecture.practice:v1'))).toBeNull();
});

test('networking roadmap follows the supplied IT 53 sequence and preserves explicit non-goals', async ({ page }) => {
  await page.goto('/computer-networking-modules.html');
  await expect(page.locator('.net-module-card')).toHaveCount(12);
  await expect(page.locator('.net-module-card.is-current')).toContainText('Networking Today');
  await expect(page.locator('.net-module-card.is-current')).toContainText('ITN Module 1');
  await expect(page.locator('.net-module-card.is-preview')).toContainText('Network Layer & Address Resolution');
  await expect(page.locator('.net-module-card.is-preview')).toContainText('ITN Modules 8 & 9');
  await expect(page.locator('.net-module-card.is-planned')).toHaveCount(9);
  await expect(page.locator('.net-module-card.is-extension')).toContainText('outside current included sequence');
  await expect(page.locator('.net-module-card.is-extension')).toContainText('VLAN Separation');
  await expect(page.locator('.topbar-nav a[href="computer-networking-modules.html"]')).toHaveAttribute('aria-current', 'page');
});

test('networking practice stores only version and solved IDs and can reset', async ({ page }) => {
  await page.goto('/computer-networking-practice.html');
  const first = page.locator('.net-practice-card').first();
  await expect(page.locator('.net-practice-group-heading')).toHaveCount(2);
  await first.getByLabel(/laptop and learning server are end devices/).check();
  await first.getByRole('button', { name: 'Check answer' }).click();
  await expect(first.locator('.net-practice-feedback')).toContainText('Correct.');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('computer-networking.practice:v1')))).toEqual({ contentVersion: 1, solvedIds: ['identify-network-roles'] });
  await page.getByRole('button', { name: 'Reset progress' }).click();
  await expect(page.locator('#network-practice-progress')).toHaveText('0 / 6 complete');
  expect(await page.evaluate(() => localStorage.getItem('computer-networking.practice:v1'))).toBeNull();
});

test('Network Lab follows five client-server situations step by step and preserves Detailed position', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-networking');
  await expect(page).toHaveURL(/activity=networking-read-classroom-network/);
  await expect(page.getByRole('heading', { name: 'Follow a client to three servers' })).toBeVisible();
  await expect(page.locator('.activity-heading')).toContainText('Module 1 / Networking Today');
  if (testInfo.project.name === 'phone') await openMobilePlaybackDetails(page);
  await expect(page.getByRole('button', { name: 'Detailed', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 24');
  await expect(page.locator('.network-operation-item')).toHaveCount(4);
  await expect(page.locator('.network-operation-carousel')).toHaveAttribute('data-operation-total', '8');
  await expect(page.locator('.network-carousel-range')).toHaveText('Steps 1–4 of 8');
  await expect(page.getByRole('button', { name: /Change Network Topology/ })).toBeVisible();
  await expect(page.getByRole('combobox', { name: 'Situation' }).locator('option')).toHaveCount(5);
  await expect(page.locator('.network-foundations-renderer')).toHaveAttribute('data-display-mode', 'generic');
  await expect(page.getByRole('button', { name: 'Interfaces', exact: true })).toHaveCount(0);
  await expect(page.locator('[data-device-id="client-laptop"]')).toHaveClass(/is-focused/);
  await expect(page.locator('[data-callout-device-id="client-laptop"]')).toHaveAttribute('aria-label', 'Client laptop wants to send an email.');
  if (testInfo.project.name === 'laptop') {
    const movement = page.locator('.workspace-main > .network-current-movement');
    const workbench = page.locator('.network-workbench');
    await expect(movement).toBeVisible();
    await expect(page.locator('.network-evidence-panel')).toHaveCount(0);
    const movementBox = await movement.boundingBox();
    const workbenchBox = await workbench.boundingBox();
    expect(movementBox.y + movementBox.height).toBeLessThanOrEqual(workbenchBox.y);
    const calloutsAvoidOtherDevices = await page.locator('.network-foundations-svg').evaluate((svg) => {
      const intersects = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
      const devices = [...svg.querySelectorAll('.network-foundation-device')].map((item) => ({ id: item.dataset.deviceId, box: item.getBoundingClientRect() }));
      return [...svg.querySelectorAll('.network-device-callout')].every((callout) => {
        const targetId = callout.dataset.calloutDeviceId;
        const calloutBox = callout.getBoundingClientRect();
        return devices.filter((device) => device.id !== targetId).every((device) => !intersects(calloutBox, device.box));
      });
    });
    expect(calloutsAvoidOtherDevices).toBe(true);
  }
  await page.getByRole('button', { name: 'Show next four steps' }).click();
  await expect(page.locator('.network-carousel-range')).toHaveText('Steps 5–8 of 8');
  await expect(page.locator('.network-operation-item').first()).toContainText('5');
  await page.getByRole('button', { name: 'Show previous four steps' }).click();
  await expect(page.locator('.network-carousel-range')).toHaveText('Steps 1–4 of 8');
  await expect(page.locator('[data-link-id="link-client-home"]')).toHaveAttribute('data-from-interface-id', 'client-laptop-eth0');
  await expect(page.locator('[data-link-id="link-client-home"]')).toHaveAttribute('data-to-interface-id', 'home-router-g0-0');
  await page.getByRole('combobox', { name: 'Situation' }).selectOption('open-website');
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 24');
  await expect(page.locator('.network-foundations-renderer')).toHaveAttribute('data-situation-id', 'open-website');
  const timeline = await visualizerTimeline(page);
  await timeline.fill('4');
  await expect(page.locator('[data-device-id="web-server"]')).toHaveClass(/is-focused/);
  await expect(page.locator('[data-callout-device-id="web-server"]')).toHaveAttribute('aria-label', 'Web server provides the web service.');
  await timeline.fill('10');
  await expect(page.locator('[data-device-id="home-router"]')).toHaveClass(/is-focused/);
  await timeline.fill('12');
  await expect(page.locator('[data-device-id="internet-cloud"]')).toHaveClass(/is-focused/);
  await timeline.fill('15');
  await expect(page.locator('[data-device-id="service-router"]')).toHaveClass(/is-focused/);
  await timeline.fill('17');
  await expect(page.locator('[data-device-id="web-server"]')).toHaveClass(/is-focused/);
  const calloutText = await page.locator('.network-device-callout').first().getAttribute('aria-label');
  expect(calloutText).not.toMatch(/\bI am\b|\bI have\b|\bmy\b/i);
  await (await visualizerTimeline(page)).fill('16');
  await expect(page.locator('.network-detail-label')).toContainText('Detail 2 of 3 · Select the final link');
  await expect(page.locator('.network-carousel-range')).toHaveText('Steps 5–8 of 8');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('6 / 8');
  await page.getByRole('button', { name: 'Detailed', exact: true }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('17 / 24');
  if (testInfo.project.name === 'phone') {
    for (const name of ['Diagram', 'Concepts', 'Evidence', 'Steps']) await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Concepts', exact: true }).click();
    await expect(page.locator('.network-foundation-concepts')).toContainText('selects the link leading to Web server');
    await page.getByRole('tab', { name: 'Evidence', exact: true }).click();
    await expect(page.locator('.network-foundation-evidence')).toContainText('Open a website');
    await page.getByRole('tab', { name: 'Steps', exact: true }).click();
    await expect(page.locator('.network-current-movement')).toContainText('Service router → Web server');
  } else {
    const desktopMovement = page.locator('.workspace-main > .network-current-movement');
    await expect(desktopMovement).toContainText('Service router → Web server');
    const movementBox = await desktopMovement.boundingBox();
    const workbenchBox = await page.locator('.network-workbench').boundingBox();
    expect(movementBox.y + movementBox.height).toBeLessThanOrEqual(workbenchBox.y);
  }
});

test('Module 1 topology chooser opens five fixed networks with named interfaces and distinct roles', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-read-classroom-network');
  const examples = [
    { label: 'Local peer sharing', activity: 'networking-local-peer-sharing', heading: 'Share on a local peer network', scene: 'local-peer-sharing', device: 'peer-laptop-a', text: '192.168.20.0/24' },
    { label: 'Classify office components', activity: 'networking-classify-components', heading: 'Classify network components', scene: 'small-office-components', device: 'server-laptop', text: 'server laptop' },
    { label: 'Campus media', activity: 'networking-compare-media', heading: 'Compare network media', scene: 'campus-media', device: 'building-a-switch', text: 'CAMPUS FIBER BACKBONE' },
    { label: 'Branch and headquarters', activity: 'networking-read-network-topologies', heading: 'Read network topologies', scene: 'branch-topology', device: 'hq-app-server', text: 'BRANCH LAN' },
  ];
  await page.getByRole('button', { name: /Change Network Topology/ }).click();
  await expect(page.getByRole('dialog', { name: 'Change Network Topology' })).toBeVisible();
  await expect(page.locator('.network-topology-choices button')).toHaveCount(5);
  await page.getByRole('button', { name: 'Close topology chooser' }).click();
  for (const example of examples) {
    await page.getByRole('button', { name: /Change Network Topology/ }).click();
    await page.locator('.network-topology-choices button').filter({ hasText: example.label }).click();
    await expect(page).toHaveURL(new RegExp(`activity=${example.activity}`));
    await expect(page.getByRole('heading', { name: example.heading })).toBeVisible();
    await expect(page.locator('.network-foundations-renderer')).toHaveAttribute('data-scene-id', example.scene);
    await expect(page.locator(`[data-device-id="${example.device}"]`)).toBeVisible();
    await expect(page.locator('.network-foundations-renderer')).toContainText(example.text);
    const attached = await page.locator('.network-foundation-link').evaluateAll((paths) => paths.every((path) => {
      const screenPoint = (offset) => {
        const point = path.getPointAtLength(offset);
        return new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
      };
      const inside = (point, bounds) => point.x >= bounds.left - 1 && point.x <= bounds.right + 1 && point.y >= bounds.top - 1 && point.y <= bounds.bottom + 1;
      const fromPort = document.querySelector(`[data-interface-id="${path.dataset.fromInterfaceId}"] .network-foundation-port`)?.getBoundingClientRect();
      const toPort = document.querySelector(`[data-interface-id="${path.dataset.toInterfaceId}"] .network-foundation-port`)?.getBoundingClientRect();
      return fromPort && toPort && inside(screenPoint(0), fromPort) && inside(screenPoint(path.getTotalLength()), toPort);
    }));
    expect(attached).toBe(true);
  }
  await page.getByRole('button', { name: /Change Network Topology/ }).click();
  await page.locator('.network-topology-choices button').filter({ hasText: 'Local peer sharing' }).click();
  await expect(page.locator('[data-device-id="internet-cloud"]')).toHaveCount(0);
  await expect(page.locator('[data-device-id="peer-laptop-a"]')).toContainText('client + file server');
  await expect(page.locator('[data-device-id="peer-laptop-b"]')).toContainText('client + print server');
});

test('Network Lab defaults to Detailed, preserves its phase through Overview, and synchronizes evidence', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery');
  await expect(page.getByRole('heading', { name: 'Discover a neighbor with ARP' })).toBeVisible();
  const timeline = await visualizerTimeline(page);
  if (testInfo.project.name === 'phone') await openMobilePlaybackDetails(page);
  await expect(page.getByRole('button', { name: 'Detailed', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 24');
  await expect(page.locator('.network-operation-item')).toHaveCount(4);
  await expect(page.locator('.network-operation-carousel')).toHaveAttribute('data-operation-total', '8');
  await expect(page.locator('.network-carousel-range')).toHaveText('Steps 1–4 of 8');
  if (testInfo.project.name === 'laptop') {
    const movement = page.locator('.workspace-main > .network-current-movement');
    const workbench = page.locator('.network-workbench');
    const movementBox = await movement.boundingBox();
    const workbenchBox = await workbench.boundingBox();
    expect(movementBox.y + movementBox.height).toBeLessThanOrEqual(workbenchBox.y);
    await expect(page.locator('.network-evidence-panel')).toHaveCount(0);
  }
  await timeline.fill('11');
  await expect(page.locator('.network-detail-label')).toContainText('Detail 4 of 4 · Flood Fa0/2 → Host B eth0');
  await expect(page.locator('path[data-link-id="link-switch-host-b"]')).toHaveClass(/is-broadcast/);
  await expect(page.locator('.network-packet')).toHaveAttribute('data-packet-id', 'arp-request-1');
  await expect(page.locator('.network-packet')).toHaveAttribute('data-motion-path-id', `network-path-${testInfo.project.name === 'phone' ? 'mobile' : 'desktop'}-link-switch-host-b`);
  await expect(page.locator('.network-packet-inspector')).toContainText('FF:FF:FF:FF:FF:FF');
  await page.getByRole('button', { name: 'Overview', exact: true }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('4 / 8');
  await expect(page.locator('.network-operation-item')).toHaveCount(4);
  await page.getByRole('button', { name: 'Detailed', exact: true }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('12 / 24');
  await expect(page.locator('.network-detail-label')).toContainText('Flood Fa0/2 → Host B eth0');
  await (await visualizerTimeline(page)).fill('22');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Tables', exact: true }).click();
  if (testInfo.project.name === 'laptop') await page.getByRole('tab', { name: 'ARP table', exact: true }).click();
  const arpTable = page.locator(testInfo.project.name === 'phone' ? '.network-tables-surface .network-arp-table' : '[data-floating-packet-inspector] .network-arp-table');
  await expect(arpTable.locator('[data-row-id="host-a-arp-host-b"]')).toContainText('192.168.10.20');
  await expect(arpTable.locator('[data-row-id="host-a-arp-host-b"]')).toContainText('02:00:00:00:10:14');
  await (await visualizerTimeline(page)).fill('21');
  await expect(arpTable.locator('[data-row-id="host-a-arp-host-b"]')).toHaveCount(0);
});

test('ARP packet inspector floats within the desktop stage and remains keyboard movable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery');
  const floating = page.locator('[data-floating-packet-inspector]');
  await expect(floating).toBeVisible();
  await expect(page.locator('.network-packet-surface')).toHaveCount(0);
  await (await visualizerTimeline(page)).fill('7');
  await expect(floating.locator('.network-packet-inspector')).toContainText('Address Resolution Protocol');
  await expect(floating.locator('.network-packet-inspector')).toContainText('FF:FF:FF:FF:FF:FF');

  const handle = page.getByRole('group', { name: 'Move or resize packet inspector. Arrow keys move, Shift plus arrow keys resize, and Home resets.' });
  await handle.focus();
  const beforeResizeBox = await floating.boundingBox();
  await handle.press('Shift+ArrowRight');
  await handle.press('Shift+ArrowDown');
  const resizedBox = await floating.boundingBox();
  expect(resizedBox.width).toBeGreaterThanOrEqual(340);
  expect(resizedBox.height).toBeGreaterThanOrEqual(260);
  expect(resizedBox.width).toBeGreaterThan(beforeResizeBox.width);
  expect(resizedBox.height).toBeGreaterThan(beforeResizeBox.height);
  await page.getByRole('button', { name: 'Reset window' }).click();

  const workbenchBox = await page.locator('.network-workbench').boundingBox();
  const initialBox = await floating.boundingBox();
  await page.mouse.move(initialBox.x + 180, initialBox.y + 24);
  await page.mouse.down();
  await page.mouse.move(workbenchBox.x + 210, workbenchBox.y + 190, { steps: 5 });
  await page.mouse.up();
  await expect(floating).toHaveAttribute('data-position-mode', 'custom');
  const draggedBox = await floating.boundingBox();
  expect(Math.abs(draggedBox.x - initialBox.x)).toBeGreaterThan(40);
  expect(draggedBox.x).toBeGreaterThanOrEqual(workbenchBox.x);
  expect(draggedBox.y).toBeGreaterThanOrEqual(workbenchBox.y);
  expect(draggedBox.x + draggedBox.width).toBeLessThanOrEqual(workbenchBox.x + workbenchBox.width);
  expect(draggedBox.y + draggedBox.height).toBeLessThanOrEqual(workbenchBox.y + workbenchBox.height);

  await handle.focus();
  await handle.press('ArrowRight');
  const keyboardBox = await floating.boundingBox();
  expect(keyboardBox.x).toBeGreaterThan(draggedBox.x);
  await page.getByRole('tab', { name: 'ARP table', exact: true }).click();
  await expect(floating.locator('.network-arp-table')).toBeVisible();
  await page.getByRole('tab', { name: 'MAC table', exact: true }).click();
  await expect(floating.locator('.network-mac-table')).toBeVisible();
  await page.getByRole('button', { name: 'Reset window' }).click();
  await expect(floating).toHaveAttribute('data-position-mode', 'default');
});

test('Network Lab cable endpoints stay inside declared RJ45 jacks at laptop and phone geometry', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery');
  const geometry = await page.evaluate(() => {
    const ports = Object.fromEntries([...document.querySelectorAll('[data-interface-id]')].map((port) => [port.dataset.interfaceId, {
      x: Number(port.dataset.jackX), y: Number(port.dataset.jackY), width: Number(port.dataset.jackWidth), height: Number(port.dataset.jackHeight),
      opening: { x: Number(port.dataset.jackOpeningX), y: Number(port.dataset.jackOpeningY), width: Number(port.dataset.jackOpeningWidth), height: Number(port.dataset.jackOpeningHeight) },
    }]));
    const inside = (point, bounds) => point.x >= bounds.x && point.x <= bounds.x + bounds.width && point.y >= bounds.y && point.y <= bounds.y + bounds.height;
    const links = [...document.querySelectorAll('path[data-link-id]')].map((link) => {
      const numbers = link.getAttribute('d').match(/-?\d+(?:\.\d+)?/g).map(Number);
      const start = { x: numbers[0], y: numbers[1] };
      const end = { x: numbers.at(-2), y: numbers.at(-1) };
      const declared = new Set([link.dataset.fromInterfaceId, link.dataset.toInterfaceId]);
      const wrongPortHits = Object.entries(ports).filter(([id, bounds]) => !declared.has(id) && (inside(start, bounds) || inside(end, bounds))).map(([id]) => id);
      return { id: link.dataset.linkId, from: link.dataset.fromInterfaceId, to: link.dataset.toInterfaceId, startInside: inside(start, ports[link.dataset.fromInterfaceId]), endInside: inside(end, ports[link.dataset.toInterfaceId]), wrongPortHits };
    });
    const labels = [...document.querySelectorAll('.network-port-label')].map((label) => ({ text: label.textContent, box: label.getBoundingClientRect().toJSON() }));
    const plugs = [...document.querySelectorAll('[data-plug-interface-id]')].map((plug) => ({
      interfaceId: plug.dataset.plugInterfaceId, linkId: plug.dataset.plugLinkId,
      tipInsideOpening: inside({ x: Number(plug.dataset.plugTipX), y: Number(plug.dataset.plugTipY) }, ports[plug.dataset.plugInterfaceId].opening),
    }));
    const firstCable = document.querySelector('path[data-link-id]');
    const firstDevice = document.querySelector('.network-device');
    return { layout: document.querySelector('.network-topology-renderer').dataset.layout, links, labels, plugs, cablesAreBehindDeviceShells: Boolean(firstCable.compareDocumentPosition(firstDevice) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  expect(geometry.layout).toBe(testInfo.project.name === 'phone' ? 'mobile' : 'desktop');
  expect(geometry.links).toEqual([
    expect.objectContaining({ id: 'link-host-a-switch', from: 'host-a-eth0', to: 'switch-1-p1', startInside: true, endInside: true, wrongPortHits: [] }),
    expect.objectContaining({ id: 'link-switch-host-b', from: 'switch-1-p2', to: 'host-b-eth0', startInside: true, endInside: true, wrongPortHits: [] }),
  ]);
  expect(geometry.cablesAreBehindDeviceShells).toBe(true);
  expect(geometry.plugs).toHaveLength(4);
  expect(geometry.plugs.every((plug) => plug.tipInsideOpening)).toBe(true);
  expect(new Set(geometry.plugs.map((plug) => plug.interfaceId)).size).toBe(4);
  expect(geometry.labels.map((item) => item.text)).toEqual(['eth0', 'Fa0/1 · Port 1', 'Fa0/2 · Port 2', 'eth0']);
  const [port1, port2] = geometry.labels.slice(1, 3).map((item) => item.box);
  expect(port1.right <= port2.left || port2.right <= port1.left || port1.bottom <= port2.top || port2.bottom <= port1.top).toBe(true);
});

test('Network Lab phone views, motion alternatives, keyboard controls, and console remain healthy', async ({ page }, testInfo) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'reduced'));
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery');
  const timeline = await visualizerTimeline(page);
  await timeline.fill('11');
  await expect(page.locator('.network-topology-renderer')).toHaveAttribute('data-motion-mode', 'reduced');
  await expect(page.locator('.network-reduced-cues circle')).toHaveCount(2);
  await expect(page.locator('.network-packet animateMotion')).toHaveCount(0);
  await page.getByRole('button', { name: 'Previous', exact: true }).focus();
  await expect(page.getByRole('button', { name: 'Previous', exact: true })).toBeFocused();
  if (testInfo.project.name === 'phone') {
    await expect(page.locator('[data-floating-packet-inspector]')).toHaveCount(0);
    for (const name of ['Topology', 'Packet', 'Tables', 'Steps']) await expect(page.getByRole('tab', { name, exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Packet', exact: true }).click();
    await expect(page.locator('.network-packet-surface')).toBeVisible();
    await page.getByRole('tab', { name: 'Tables', exact: true }).click();
    await expect(page.locator('.network-tables-surface')).toBeVisible();
    await (await visualizerTimeline(page)).fill('23');
    const finalArpRow = page.locator('.network-tables-surface [data-row-id="host-a-arp-host-b"]');
    await expect(finalArpRow).toContainText('02:00:00:00:10:14');
    const finalArpCell = finalArpRow.locator('code').last();
    await finalArpCell.scrollIntoViewIfNeeded();
    const finalRowBox = await finalArpCell.boundingBox();
    const dockBox = await page.locator('.integrated-playback').boundingBox();
    expect(finalRowBox.y + finalRowBox.height).toBeLessThanOrEqual(dockBox.y);
    await page.getByRole('tab', { name: 'Steps', exact: true }).click();
    await expect(page.locator('.network-steps-surface')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('Network Lab 1x motion holds for 0.8 seconds and travels on the exact cable for 0.9 seconds', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'on'));
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery');
  await (await visualizerSpeed(page)).selectOption('6');
  const timeline = await visualizerTimeline(page);
  await timeline.fill('10');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  const motion = page.locator('.network-packet animateMotion');
  await expect(motion).toHaveCount(1);
  await expect(motion).toHaveAttribute('begin', '0.8s');
  await expect(motion).toHaveAttribute('dur', '0.9s');
  await expect(motion.locator('mpath')).toHaveAttribute('href', '#network-path-desktop-link-switch-host-b');
  await expect(page.locator('.network-packet')).toHaveAttribute('data-motion-link-id', 'link-switch-host-b');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '1.7');
});

test('CPU Lab preset rebuilds playback while number format remains view-only', async ({ page }, testInfo) => {
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await expect(page.getByRole('heading', { name: 'Fetch one instruction' })).toBeVisible();
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 5');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('2 / 5');
  await page.getByRole('button', { name: 'BIN' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('2 / 5');
  await expect(page.locator('.cpu-register-box').first()).toContainText('0b');
  await page.getByLabel('Instruction preset').selectOption('addi-r3-07');
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 5');
  await expect(page.locator(testInfo.project.name === 'phone' ? '.cpu-memory-pane' : '.cpu-main-memory')).toContainText('0b11111111');
  const timeline = await visualizerTimeline(page);
  await timeline.fill('4');
  await expect(page.locator('.integrated-step strong')).toHaveText('5 / 5');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Instruction' }).click();
  await expect(page.locator(testInfo.project.name === 'phone' ? '.mobile-evidence .cpu-instruction-evidence' : '.desktop-evidence .cpu-instruction-evidence')).toContainText('not been interpreted');
});

test('CPU Lab starts at the source and treats the memory handshake as one operation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'on'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await (await visualizerSpeed(page)).selectOption('3');

  await expect(page.locator('.cpu-main-memory')).toHaveCount(1);
  await expect(page.locator('.cpu-memory-surface')).toBeHidden();
  await expect(page.locator('.cpu-datapath-full [data-component-id].is-source')).toHaveCount(1);
  await expect(page.locator('[data-component-id="PC"]')).toHaveClass(/is-source/);
  await expect(page.locator('.cpu-main-memory .cpu-memory-row.is-selected')).toHaveCount(0);
  await expect(page.locator('[data-route-id="mar-memory"]')).toHaveAttribute('d', 'M590 72 V60 H246');
  await expect(page.locator('[data-route-id="memory-mdr"]')).toHaveAttribute('d', 'M246 372 H350');

  const timeline = await visualizerTimeline(page);
  await timeline.fill('1');
  await expect(page.locator('.integrated-step strong')).toHaveText('2 / 5');
  await installCpuAnimationProbe(page);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('3 / 5');
  await expect(page.getByRole('button', { name: 'Step' })).toBeEnabled({ timeout: 15000 });
  await expect(page.locator('[data-component-id="MDR"]')).toContainText('0x31A4');
  const samples = await collectCpuAnimationSamples(page);
  const transferSample = samples.find((sample) => sample.phase.includes('Move the instruction word'));
  expect(transferSample, `Recorded CPU animation samples: ${JSON.stringify(samples)}`).toBeDefined();
  expect(transferSample).toMatchObject({
    stage: 'travel',
    movingValues: 1,
    activeRoutes: ['memory-mdr'],
    readingRows: 1,
  });
  expect(transferSample.activeComponents).toEqual(expect.arrayContaining(['memory', 'MDR']));
  expect(transferSample.componentStates).toMatchObject({ memory: 'is-sent', MDR: 'is-ready' });
  const mfcSample = samples.find((sample) => sample.phase.includes('Memory finishes the read'));
  expect(mfcSample, `Recorded CPU animation samples: ${JSON.stringify(samples)}`).toBeDefined();
  expect(mfcSample).toMatchObject({ stage: 'arm', movingControlCues: 2 });
  expect(mfcSample.cueDirections).toEqual(expect.arrayContaining(['to-cu', 'from-cu']));
});

test('CPU Lab stages source, control cues, value travel, and target arrival without premature highlighting', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'on'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await (await visualizerSpeed(page)).selectOption('3');
  await page.getByRole('button', { name: 'Micro', exact: true }).click();
  const timeline = await visualizerTimeline(page);
  await timeline.fill('1');

  await page.getByRole('button', { name: 'Step' }).click();
  const renderer = page.locator('.cpu-datapath-renderer');
  await expect(renderer).toHaveAttribute('data-animation-stage', 'arm');
  await expect(renderer).toHaveAttribute('data-spawn-hold-ms', '1232');
  const firstCue = page.locator('.cpu-control-cue [data-motion-role="control-signal"]').first();
  const spawnBox = await firstCue.boundingBox();
  await page.waitForTimeout(200);
  const heldBox = await firstCue.boundingBox();
  const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  expect(Math.abs(center(heldBox).x - center(spawnBox).x) + Math.abs(center(heldBox).y - center(spawnBox).y)).toBeLessThan(2);

  await expect(page.locator('.cpu-control-cue')).toHaveCount(2);
  await expect(page.locator('.cpu-control-cue[data-control-signal-id="PCout"]')).toHaveAttribute('data-cue-order', '1');
  await expect(page.locator('.cpu-control-cue[data-control-signal-id="MARin"]')).toHaveAttribute('data-cue-order', '2');
  await expect(page.locator('.cpu-control-cue[data-control-signal-id="PCout"]')).toHaveAttribute('data-cue-role', 'source-enable');
  await expect(page.locator('.cpu-control-cue[data-control-signal-id="MARin"]')).toHaveAttribute('data-cue-role', 'destination-latch');
  await expect(page.locator('[data-component-id="PC"]')).toHaveClass(/is-source/);
  await expect(page.locator('[data-component-id="MAR"]')).toHaveClass(/is-ready/);
  await expect(page.locator('[data-source-pulse^="CONTROL:"]')).toHaveCount(2);
  expect(await page.locator('[data-source-pulse^="CONTROL:"]').first().evaluate((node) => getComputedStyle(node).animationName)).toBe('cpu-source-pop');

  await expect(page.getByRole('button', { name: 'Step' })).toBeEnabled({ timeout: 5000 });
  const latchedBox = await firstCue.boundingBox();
  expect(Math.abs(center(latchedBox).x - center(spawnBox).x) + Math.abs(center(latchedBox).y - center(spawnBox).y)).toBeGreaterThan(3);
  await expect(page.locator('.cpu-control-cue')).toHaveCount(2);
  await expect(page.locator('[data-active-control-id]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.cpu-datapath-renderer')).toHaveAttribute('data-animation-stage', 'travel');
  await expect(page.locator('.cpu-control-cue')).toHaveCount(0);
  await expect(page.locator('[data-active-control-id]')).toHaveCount(0);
  await expect(page.locator('.cpu-value-cue')).toHaveCount(1);
  await expect(page.locator('[data-active-route-id="pc-mar"]')).toHaveCount(1);
  await expect(page.locator('[data-source-pulse="PC"]')).toHaveCount(1);
  await expect(page.locator('[data-component-id="PC"]')).toHaveClass(/is-sent/);
  await expect(page.locator('[data-component-id="MAR"]')).toHaveClass(/is-ready/);

  await expect(page.getByRole('button', { name: 'Step' })).toBeEnabled({ timeout: 5000 });
  await expect(page.locator('.cpu-value-cue')).toHaveCount(1);
  await expect(page.locator('[data-active-route-id="pc-mar"]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.cpu-datapath-renderer')).toHaveAttribute('data-animation-stage', 'arrive');
  await expect(page.locator('[data-component-id="PC"]')).toHaveClass(/is-sent/);
  await expect(page.locator('[data-component-id="MAR"]')).toHaveClass(/is-received/);
  await expect(page.locator('.cpu-value-cue')).toHaveCount(0);
  await expect(page.locator('[data-active-route-id="pc-mar"]')).toHaveCount(0);

  await timeline.fill('9');
  await expect(page.locator('[data-control-cue-id$=":MFC"]')).toHaveAttribute('data-signal-direction', 'to-cu');
  await expect(page.locator('[data-control-cue-id$=":MFC"]')).toHaveAttribute('data-cue-origin', 'memory');
  await expect(page.locator('[data-control-cue-id$=":MDRin"]')).toHaveAttribute('data-signal-direction', 'from-cu');
  await expect(page.locator('[data-control-cue-id$=":MDRin"]')).toHaveAttribute('data-cue-origin', 'CONTROL');
});

test('CPU settled cues remain visible when motion is reduced or off', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  for (const motion of ['reduced', 'off']) {
    await page.addInitScript((mode) => localStorage.setItem('itcc47:visualizer-motion:v1', mode), motion);
    await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
    await page.getByRole('button', { name: 'Micro', exact: true }).click();
    const timeline = await visualizerTimeline(page);
    await timeline.fill('2');
    await expect(page.locator('.cpu-datapath-renderer')).toHaveAttribute('data-animation-stage', 'arm');
    await expect(page.locator('.cpu-control-cue [data-motion-role="control-signal"]')).toHaveCount(2);
    await expect(page.locator('[data-active-control-id]')).toHaveCount(2);
    await timeline.fill('3');
    await expect(page.locator('.cpu-datapath-renderer')).toHaveAttribute('data-animation-stage', 'travel');
    await expect(page.locator('.cpu-value-cue [data-motion-role="moving-value"]')).toHaveCount(1);
    await expect(page.locator('[data-active-route-id="pc-mar"]')).toHaveCount(1);
  }
});

test('CPU desktop datapath remains a collision-free one-screen scene at supported widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1905, height: 921 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
    await expect(page.locator('.cpu-datapath-full')).toBeVisible();
    await expect(page.locator('.cpu-phase-panel')).toHaveCount(0);
    await page.getByRole('button', { name: 'BIN' }).click();
    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return box ? { left: box.left, right: box.right, top: box.top, bottom: box.bottom } : null;
      };
      const overlaps = (a, b) => a && b && a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
      const svg = rect('.cpu-datapath-full');
      const componentText = [...document.querySelectorAll('.cpu-component [data-component-id] text, [data-component-id].cpu-component text')];
      const clippedText = componentText.filter((node) => {
        const box = node.getBoundingClientRect();
        return svg && (box.left < svg.left - 1 || box.right > svg.right + 1 || box.top < svg.top - 1 || box.bottom > svg.bottom + 1);
      }).length;
      const binaryTextOverflow = [...document.querySelectorAll('.cpu-register-box, .cpu-register-cell, .cpu-memory-row')].filter((component) => {
        const shell = component.querySelector('rect')?.getBoundingClientRect();
        return shell && [...component.querySelectorAll('text')].some((node) => {
          const box = node.getBoundingClientRect();
          return box.left < shell.left - 1 || box.right > shell.right + 1 || box.top < shell.top - 1 || box.bottom > shell.bottom + 1;
        });
      }).length;
      const pathCrosses = (pathSelector, componentSelector) => {
        const path = document.querySelector(pathSelector);
        const component = rect(componentSelector);
        return path && component ? Array.from({ length: 121 }, (_, index) => {
          const point = path.getPointAtLength((path.getTotalLength() * index) / 120);
          const screenPoint = new DOMPoint(point.x, point.y).matrixTransform(path.getScreenCTM());
          return screenPoint.x > component.left + 1 && screenPoint.x < component.right - 1 && screenPoint.y > component.top + 1 && screenPoint.y < component.bottom - 1;
        }).some(Boolean) : true;
      };
      return {
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
        cuRegisterOverlap: overlaps(rect('.cpu-control-unit'), rect('.cpu-register-bank')),
        cuAluOverlap: overlaps(rect('.cpu-control-unit'), rect('.cpu-alu-unit')),
        cuMdrOverlap: overlaps(rect('.cpu-control-unit'), rect('[data-component-id="MDR"]')),
        cuSequenceOverlap: Boolean(overlaps(rect('.cpu-control-unit .cpu-svg-sequence-note'), rect('.cpu-control-unit .cpu-svg-label'))
          || overlaps(rect('.cpu-control-unit .cpu-svg-sequence-note'), rect('.cpu-control-unit .cpu-svg-signal-label'))),
        clippedText,
        binaryTextOverflow,
        marMemoryCrossesPc: pathCrosses('[data-route-id="mar-memory"]', '[data-component-id="PC"]'),
        controlMemoryCrossesAlu: pathCrosses('[data-control-id="control-memory"]', '.cpu-alu-unit'),
        controlMemoryCrossesMdr: pathCrosses('[data-control-id="control-memory"]', '[data-component-id="MDR"]'),
        controlMemoryCrossesRegisters: pathCrosses('[data-control-id="control-memory"]', '.cpu-register-bank'),
        controlMdrCrossesAlu: pathCrosses('[data-control-id="control-mdr"]', '.cpu-alu-unit'),
        controlMdrCrossesRegisters: pathCrosses('[data-control-id="control-mdr"]', '.cpu-register-bank'),
        mdrIrCrossesAlu: pathCrosses('[data-route-id="mdr-ir"]', '.cpu-alu-unit'),
        mdrIrCrossesCu: pathCrosses('[data-route-id="mdr-ir"]', '.cpu-control-unit'),
        aluR1CrossesMdr: pathCrosses('[data-route-id="alu-r1"]', '[data-component-id="MDR"]'),
        aluR1CrossesCu: pathCrosses('[data-route-id="alu-r1"]', '.cpu-control-unit'),
        cuSvgHeight: Number(document.querySelector('.cpu-control-unit > rect')?.getAttribute('height')),
        aluWidth: rect('.cpu-alu-unit')?.right - rect('.cpu-alu-unit')?.left,
        aluParts: document.querySelectorAll('.cpu-alu-slot').length,
        layers: [...document.querySelectorAll('.cpu-datapath-full [data-layer]')].map((node) => node.getAttribute('data-layer')),
      };
    });
    expect(geometry).toEqual({
      horizontalOverflow: 0,
      cuRegisterOverlap: false,
      cuAluOverlap: false,
      cuMdrOverlap: false,
      cuSequenceOverlap: false,
      clippedText: 0,
      binaryTextOverflow: 0,
      marMemoryCrossesPc: false,
      controlMemoryCrossesAlu: false,
      controlMemoryCrossesMdr: false,
      controlMemoryCrossesRegisters: false,
      controlMdrCrossesAlu: false,
      controlMdrCrossesRegisters: false,
      mdrIrCrossesAlu: false,
      mdrIrCrossesCu: false,
      aluR1CrossesMdr: false,
      aluR1CrossesCu: false,
      cuSvgHeight: 242,
      aluWidth: expect.any(Number),
      aluParts: 4,
      layers: ['structural-connections', 'active-connections', 'components-and-text', 'traveling-cues-and-arrivals'],
    });
  }
});

test('CPU Lab switches between operation and micro playback without returning to step one', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  const timeline = await visualizerTimeline(page);
  await timeline.fill('2');
  await expect(page.locator('.integrated-step strong')).toHaveText('3 / 5');

  await page.getByRole('button', { name: 'Micro', exact: true }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('6 / 19');
  await expect(page.locator('.cpu-canvas-heading')).toContainText('Operation 3 / 5');
  await expect(page.locator('.cpu-canvas-heading')).toContainText('1 / 7 · Focus MAR');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('7 / 19');

  await page.getByRole('button', { name: 'Operation', exact: true }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('3 / 5');
  await expect(page.locator('[data-component-id="MDR"]')).toContainText('0x31A4');
});

test('CPU control unit explains readable signals, the current action, and what happens next', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await page.getByRole('button', { name: 'Micro', exact: true }).click();
  const timeline = await visualizerTimeline(page);
  await timeline.fill('2');

  const controlUnit = page.locator('.cpu-control-unit');
  await expect(controlUnit).toContainText('PC-out');
  await expect(controlUnit).toContainText('MAR-in');
  await expect(controlUnit).toContainText('WHAT IS HAPPENING');
  await expect(controlUnit.locator('.cpu-svg-guidance').first()).toHaveAttribute('aria-label', 'First: PC sends its address. Then: MAR accepts the address.');
  await expect(controlUnit).toContainText('UP NEXT');
  await expect(controlUnit.locator('.cpu-svg-next')).toHaveAttribute('aria-label', 'Move the address.');
  await expect(controlUnit).not.toContainText('ANIMATION STAGE');

  await timeline.fill('18');
  await expect(controlUnit.locator('.cpu-svg-guidance').first()).toHaveAttribute('aria-label', 'PC becomes 0x13.');
  await expect(controlUnit.locator('.cpu-svg-next')).toHaveAttribute('aria-label', 'Decode the word 0x31A4 now stored in IR.');

  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-add-immediate');
  await page.getByRole('button', { name: 'Micro', exact: true }).click();
  await (await visualizerTimeline(page)).fill('36');
  await expect(page.locator('.cpu-control-unit .cpu-svg-next')).toHaveAttribute('aria-label', 'Fetch the next instruction at PC 0x21.');
});

test('CPU mobile datapath keeps the next-action note without exposing animation-stage jargon', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await openMobilePlaybackDetails(page);
  await page.locator('.mobile-playback-details').getByRole('button', { name: 'Micro', exact: true }).click();
  const timeline = await visualizerTimeline(page);
  await timeline.fill('18');
  await page.locator('.mobile-playback-details > summary').click();

  await expect(page.locator('.cpu-mobile-phase')).toContainText('Operation 5 / 5 · Increment the PC');
  await expect(page.locator('.cpu-mobile-phase')).not.toContainText('arrive');
  await expect(page.locator('.cpu-mobile-next')).toContainText('Decode the word 0x31A4 now stored in IR.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Decode activity starts from completed fetch state and progressively explains 4 / 4 / 8 fields', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-decode-instruction');
  await expect(page.getByRole('heading', { name: 'Decode one instruction' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Micro', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 17');
  await expect(page.locator('.cpu-decode-full')).toBeVisible();
  await expect(page.locator('.cpu-decode-renderer')).toHaveAttribute('data-board-stage', 'empty');
  await expect(page.locator('.cpu-decode-bit')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-whole-word')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-field-header')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-field-card[data-card-content="empty"]')).toHaveCount(3);
  await expect(page.locator('.cpu-decode-field-card .cpu-decode-card-label')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-field-card .cpu-decode-card-bits')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-components [data-component-state="is-source"]')).toHaveCount(2);
  await expect(page.locator('.cpu-decode-ir')).toHaveClass(/is-source/);
  await expect(page.locator('.cpu-decode-callout')).toContainText('PC advanced · memory idle');
  await expect(page.locator('.cpu-decode-context-cell').filter({ hasText: 'PC' })).toContainText('0x13');
  await expect(page.locator('.cpu-control-cue')).toHaveCount(0);
  await expect(page.locator('.cpu-completion-actions')).toHaveCount(0);

  await page.getByRole('button', { name: 'DEC' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 17');
  await expect(page.locator('.cpu-decode-bit')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-ir')).toContainText('12708');

  const timeline = await visualizerTimeline(page);
  await timeline.fill('16');
  await expect(page.locator('.cpu-decode-summary')).toContainText('LOAD R1, [0xA4]');
  await expect(page.locator('.cpu-decode-summary')).toContainText('Read Main Memory');
  await expect(page.locator('.cpu-completion-actions')).toBeVisible();
  await expect(page.getByRole('link', { name: /Run 5 \+ 13/ })).toHaveAttribute('href', /architecture-add-immediate/);
  await expect(page.getByRole('link', { name: /Practice decoding/ })).toHaveAttribute('href', /#decode$/);
  await page.getByRole('tab', { name: 'Fields' }).click();
  await expect(page.locator('.desktop-evidence .cpu-decode-evidence-fields')).toContainText('destination');
  await page.getByRole('tab', { name: 'Machine state' }).click();
  await expect(page.locator('.desktop-evidence .cpu-register-evidence')).toContainText('MAR');
  await page.getByRole('tab', { name: 'Meaning' }).click();
  await expect(page.locator('.desktop-evidence .cpu-decode-meaning-evidence')).toContainText('does not execute');

  await page.getByLabel('Instruction preset').selectOption('store-r2-b0');
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 17');
  await expect(page.locator('.cpu-decode-ir')).toContainText('17072');
  await expect(page.locator('.cpu-completion-actions')).toHaveCount(0);
});

test('Decode activity exposes seventeen progressive micro-steps without control signals', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-decode-instruction');
  await expect(page.getByRole('button', { name: 'Micro', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 17');
  const timeline = await visualizerTimeline(page);
  await timeline.fill('1');
  await expect(page.locator('.cpu-decode-renderer')).toHaveAttribute('data-animation-stage', 'travel');
  await expect(page.locator('.cpu-decode-renderer')).toHaveAttribute('data-board-stage', 'empty');
  await expect(page.locator('[data-active-route-id="decode-word"]')).toHaveCount(1);
  await expect(page.locator('.cpu-value-cue')).toHaveCount(1);
  const travelingWordId = await page.locator('.cpu-value-cue').getAttribute('data-transfer-id');
  await expect(page.locator('.cpu-decode-bit')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-whole-word')).toHaveCount(0);
  await expect(page.locator('.cpu-control-cue')).toHaveCount(0);
  await timeline.fill('2');
  await expect(page.locator('.cpu-decode-renderer')).toHaveAttribute('data-board-stage', 'whole-word');
  await expect(page.locator('.cpu-decode-whole-word')).toHaveCount(1);
  await expect(page.locator('.cpu-decode-whole-word')).toHaveAttribute('data-word-token-id', travelingWordId);
  await expect(page.locator('.cpu-decode-whole-word')).toContainText('0x31A4');
  await expect(page.locator('.cpu-decode-bit')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-field-header')).toHaveCount(0);
  await timeline.fill('3');
  await expect(page.locator('.cpu-decode-renderer')).toHaveAttribute('data-board-stage', 'segmented');
  await expect(page.locator('.cpu-decode-whole-word')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-bit')).toHaveCount(16);
  expect(await page.locator('.cpu-decode-bit').allTextContents()).toEqual('0011000110100100'.split(''));
  await expect(page.locator('.cpu-decode-group-size')).toHaveCount(3);
  await expect(page.locator('.cpu-decode-field-name')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-range')).toHaveCount(0);
  const binaryBits = await page.locator('.cpu-decode-bit').allTextContents();
  await page.getByRole('button', { name: 'DEC' }).click();
  expect(await page.locator('.cpu-decode-bit').allTextContents()).toEqual(binaryBits);
  await timeline.fill('4');
  await expect(page.locator('.cpu-decode-renderer')).toHaveAttribute('data-board-stage', 'labeled');
  await expect(page.locator('.cpu-decode-field-name')).toHaveCount(3);
  await expect(page.locator('.cpu-decode-range')).toHaveCount(3);
  await expect(page.locator('.cpu-decode-group-size')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-field-card .cpu-decode-card-bits')).toHaveCount(0);
  await timeline.fill('6');
  await expect(page.locator('.cpu-decode-renderer')).toHaveAttribute('data-active-field', 'opcode');
  await expect(page.locator('[data-active-route-id="decode-opcode"]')).toHaveCount(1);
  await expect(page.locator('.cpu-value-cue')).toHaveCount(1);
  await expect(page.locator('.cpu-decode-field-card.field-opcode')).toHaveAttribute('data-card-content', 'empty');
  await expect(page.locator('.cpu-decode-field-card.field-opcode .cpu-decode-card-bits')).toHaveCount(0);
  await timeline.fill('7');
  await expect(page.locator('.cpu-decode-field-card.field-opcode')).toHaveAttribute('data-card-content', 'committed');
  await expect(page.locator('.cpu-decode-field-card.field-opcode .cpu-decode-card-bits')).toHaveText('0011');
  await expect(page.locator('.cpu-decode-field-card.field-register')).toHaveAttribute('data-card-content', 'empty');
  await expect(page.locator('.cpu-decode-field-card.field-operand')).toHaveAttribute('data-card-content', 'empty');
  await timeline.fill('16');
  await expect(page.locator('.integrated-step strong')).toHaveText('17 / 17');
  await expect(page.locator('.cpu-decode-summary')).toContainText('LOAD R1, [0xA4]');
});

test('Decode desktop board stays collision-free at both supported desktop widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  for (const viewport of [{ width: 1366, height: 768 }, { width: 1905, height: 921 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-decode-instruction');
    await expect(page.locator('.cpu-decode-full')).toBeVisible();
    await (await visualizerTimeline(page)).fill('4');
    const geometry = await page.evaluate(() => {
      const svg = document.querySelector('.cpu-decode-full').getBoundingClientRect();
      const texts = [...document.querySelectorAll('.cpu-decode-full text')];
      const clippedText = texts.filter((node) => {
        const box = node.getBoundingClientRect();
        return box.left < svg.left - 1 || box.right > svg.right + 1 || box.top < svg.top - 1 || box.bottom > svg.bottom + 1;
      }).length;
      const cards = [...document.querySelectorAll('.cpu-decode-field-card > rect')].map((node) => node.getBoundingClientRect());
      const cardCollisions = cards.some((box, index) => cards.some((other, otherIndex) => otherIndex > index && box.left < other.right - 1 && box.right > other.left + 1 && box.top < other.bottom - 1 && box.bottom > other.top + 1));
      const headers = [...document.querySelectorAll('.cpu-decode-field-header')].map((node) => node.getBoundingClientRect());
      const headerCollisions = headers.some((box, index) => headers.some((other, otherIndex) => otherIndex > index && box.left < other.right - 1 && box.right > other.left + 1 && box.top < other.bottom - 1 && box.bottom > other.top + 1));
      const bitCells = [...document.querySelectorAll('.cpu-decode-bit > rect')].map((node) => node.getBoundingClientRect());
      const headerBitCollisions = headers.some((box) => bitCells.some((cell) => box.left < cell.right - 1 && box.right > cell.left + 1 && box.top < cell.bottom - 1 && box.bottom > cell.top + 1));
      return {
        bits: document.querySelectorAll('.cpu-decode-bit').length,
        markers: document.querySelectorAll('.cpu-decode-full marker').length,
        horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
        clippedText,
        cardCollisions,
        headerCollisions,
        headerBitCollisions,
      };
    });
    expect(geometry).toEqual({ bits: 16, markers: 0, horizontalOverflow: 0, clippedText: 0, cardCollisions: false, headerCollisions: false, headerBitCollisions: false });
  }
});

test('Decode mobile tabs preserve playback and never overflow the page', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-decode-instruction');
  await expect(page.locator('.cpu-decode-mobile')).toBeVisible();
  await expect(page.locator('.cpu-decode-mobile-board')).toHaveAttribute('data-board-stage', 'empty');
  await expect(page.locator('.cpu-decode-mobile-bit-groups b')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-mobile-whole-word')).toHaveCount(0);
  await expect(page.locator('.cpu-decode-mobile-cards [data-card-content="empty"]')).toHaveCount(3);
  await expect(page.locator('.cpu-decode-mobile-cards code')).toHaveCount(0);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('2 / 17');
  await expect(page.locator('.cpu-decode-mobile-board')).toHaveAttribute('data-board-stage', 'empty');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('3 / 17');
  await expect(page.locator('.cpu-decode-mobile-whole-word')).toHaveCount(1);
  const timeline = await visualizerTimeline(page);
  await timeline.fill('3');
  await expect(page.locator('.cpu-decode-mobile-board')).toHaveAttribute('data-board-stage', 'segmented');
  await expect(page.locator('.cpu-decode-mobile-bit-groups > section')).toHaveCount(3);
  await expect(page.locator('.cpu-decode-mobile-bit-groups b')).toHaveCount(16);
  await expect(page.locator('.cpu-decode-mobile-bit-groups header')).toHaveText(['4 bits', '4 bits', '8 bits']);
  await page.getByRole('tab', { name: 'Fields' }).click();
  await expect(page.locator('.cpu-decode-fields-pane')).toBeVisible();
  await page.getByRole('tab', { name: 'Steps' }).click();
  await expect(page.locator('.mobile-evidence .cpu-micro-operations')).toBeVisible();
  await page.getByRole('tab', { name: 'Decode' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('4 / 17');
  await expect(page.getByRole('button', { name: 'Step' })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('Computer Architecture terminal actions connect Fetch, Decode, Add, and Practice', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await (await visualizerTimeline(page)).fill('4');
  await expect(page.getByRole('link', { name: /Decode this instruction/ })).toHaveAttribute('href', /architecture-decode-instruction/);
  await expect(page.getByRole('link', { name: /Practice fetch/ })).toHaveAttribute('href', /#fetch$/);
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-add-immediate');
  await (await visualizerTimeline(page)).fill('9');
  await expect(page.getByRole('link', { name: /Practice execution/ })).toHaveAttribute('href', /#execute$/);
  await expect(page.getByRole('link', { name: /Fetch another instruction/ })).toHaveAttribute('href', /architecture-fetch-cycle/);
});

test('CPU Lab animates active-only paths and executes the guided 5 + 13 operation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'on'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-add-immediate');
  await (await visualizerSpeed(page)).selectOption('3');
  await expect(page.getByRole('heading', { name: 'Add 5 + 13' })).toBeVisible();
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 10');
  await expect(page.locator('.cpu-datapath-full marker')).toHaveCount(0);
  await expect(page.locator('.cpu-register-bank')).toContainText('R1 0x0005');

  const timeline = await visualizerTimeline(page);
  await timeline.fill('5');
  await expect(page.locator('.integrated-step strong')).toHaveText('6 / 10');
  await installCpuAnimationProbe(page);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('7 / 10');
  await expect(page.getByRole('button', { name: 'Step' })).toBeEnabled({ timeout: 10000 });
  const samples = await collectCpuAnimationSamples(page);
  const operandSample = samples.find((sample) => sample.phase.includes('Move operand 5'));
  expect(operandSample, `Recorded CPU animation samples: ${JSON.stringify(samples)}`).toBeDefined();
  expect(operandSample).toMatchObject({
    stage: 'travel',
    movingValues: 1,
    activeRoutes: ['r1-alu'],
  });
  expect(operandSample.activeComponents).toEqual(expect.arrayContaining(['R1', 'ALU']));

  await timeline.fill('8');
  await expect(page.locator('.integrated-step strong')).toHaveText('9 / 10');
  await expect(page.locator('.cpu-alu-unit')).toHaveClass(/is-received/);
  await expect(page.locator('.cpu-alu-unit')).toContainText('5 + 13 = 18');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-result', '18');
  expect(await page.locator('.cpu-alu-unit').evaluate((node) => node.getBoundingClientRect().width)).toBeGreaterThan(190);

  await timeline.fill('9');
  await page.getByRole('tab', { name: 'Registers' }).click();
  const r1Evidence = page.locator('.desktop-evidence .cpu-register-evidence > div').filter({ hasText: 'R1' });
  await expect(r1Evidence).toContainText('0x0012');
});

test('ADDI teaches ALU internals progressively and fires ALU-out before R1-in', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'on'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-add-immediate');
  await (await visualizerSpeed(page)).selectOption('3');
  await page.getByRole('button', { name: 'Micro', exact: true }).click();
  const timeline = await visualizerTimeline(page);

  await timeline.fill('25');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-stage', 'input-a');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-input-a', '5');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-input-b', '');
  await timeline.fill('29');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-stage', 'inputs-ready');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-input-b', '13');
  await timeline.fill('31');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-operation', 'ADD');
  await timeline.fill('32');
  await expect(page.locator('.cpu-alu-unit')).toHaveAttribute('data-alu-result', '18');

  await timeline.fill('33');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.cpu-datapath-renderer')).toHaveAttribute('data-animation-stage', 'arm');
  const aluOut = page.locator('.cpu-control-cue[data-control-signal-id="ALUout"]');
  const r1In = page.locator('.cpu-control-cue[data-control-signal-id="R1in"]');
  await expect(aluOut).toHaveAttribute('data-cue-order', '1');
  await expect(aluOut).toHaveAttribute('data-cue-role', 'source-enable');
  await expect(aluOut).toHaveAttribute('data-activation-delay-ms', '0');
  await expect(r1In).toHaveAttribute('data-cue-order', '2');
  await expect(r1In).toHaveAttribute('data-cue-role', 'destination-latch');
  await expect(r1In).toHaveAttribute('data-activation-delay-ms', '464');
  await page.waitForTimeout(520);
  expect(await r1In.locator('[data-motion-role="control-signal"]').evaluate((node) => Number(getComputedStyle(node).opacity))).toBeGreaterThan(.9);
  await expect(page.locator('.cpu-control-unit')).toContainText('Teaching order · one operation');
  await expect(page.locator('.cpu-control-unit')).toContainText('First');
  await expect(page.locator('.cpu-control-unit')).toContainText('Then');
  expect(await page.locator('.cpu-control-unit').evaluate((controlUnit) => {
    const overlaps = (left, right) => left.left < right.right - 1 && left.right > right.left + 1 && left.top < right.bottom - 1 && left.bottom > right.top + 1;
    const sequence = controlUnit.querySelector('.cpu-svg-sequence-note')?.getBoundingClientRect();
    const title = controlUnit.querySelector('.cpu-svg-label')?.getBoundingClientRect();
    const signalLabel = controlUnit.querySelector('.cpu-svg-signal-label')?.getBoundingClientRect();
    return sequence && title && signalLabel ? overlaps(sequence, title) || overlaps(sequence, signalLabel) : true;
  })).toBe(false);
  await expect(page.getByRole('button', { name: 'Step' })).toBeEnabled({ timeout: 6000 });
  await expect(aluOut).toHaveCount(1);
  await expect(r1In).toHaveCount(1);
});

test('CPU Lab evidence is registered, collapsible, and keyboard reachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await expect(page.getByRole('tab', { name: 'Operations' })).toBeVisible();
  await page.getByRole('tab', { name: 'Registers' }).click();
  await expect(page.locator('.desktop-evidence .cpu-register-evidence')).toBeVisible();
  await page.getByRole('tab', { name: 'Buses' }).click();
  await expect(page.locator('.desktop-evidence .cpu-signal-grid')).toBeVisible();
  await page.getByRole('button', { name: 'Collapse learning evidence' }).click();
  await expect(page.getByRole('button', { name: 'Expand learning evidence' })).toBeVisible();
  await page.getByRole('button', { name: 'Expand learning evidence' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Collapse learning evidence' })).toBeVisible();
});

test('CPU Lab mobile tabs keep playback state and the sticky dock reachable', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('2 / 5');
  await page.getByRole('tab', { name: 'Memory' }).click();
  await expect(page.locator('.cpu-memory-pane')).toBeVisible();
  await page.getByRole('tab', { name: 'Steps' }).click();
  await expect(page.locator('.mobile-evidence .cpu-micro-operations')).toBeVisible();
  await page.getByRole('tab', { name: 'Datapath' }).click();
  await expect(page.locator('.cpu-mobile-transfer')).toBeVisible();
  await expect(page.locator('.integrated-step strong')).toHaveText('2 / 5');
  await expect(page.getByRole('button', { name: 'Step' })).toBeInViewport();
});

test('ADDI mobile datapath exposes the progressive ALU without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.addInitScript(() => localStorage.setItem('itcc47:visualizer-motion:v1', 'off'));
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-add-immediate');
  await page.getByRole('tab', { name: 'Steps', exact: true }).click();
  await page.getByRole('button', { name: /9 Add 5 \+ 13 inside the ALU/ }).click();
  await page.getByRole('tab', { name: 'Datapath', exact: true }).click();
  const mobileAlu = page.locator('.cpu-mobile-alu');
  await expect(mobileAlu).toBeVisible();
  await expect(mobileAlu).toHaveAttribute('data-alu-stage', 'result');
  await expect(mobileAlu).toContainText('Input A5');
  await expect(mobileAlu).toContainText('Input B13');
  await expect(mobileAlu).toContainText('OperationADD');
  await expect(mobileAlu).toContainText('Result18');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Step' })).toBeInViewport();
});

test('CPU Lab respects reduced motion and direct file operation', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const fileUrl = `file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=computer-architecture&activity=architecture-fetch-cycle`;
  await page.goto(fileUrl);
  await expect(page.getByRole('heading', { name: 'Fetch one instruction' })).toBeVisible();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText('2 / 5');
});

test('start page gives students a clear route into the current practice bank', async ({ page }) => {
  await page.goto('/itcc47.html');
  await expect(page.getByRole('heading', { name: /Learn the idea/ })).toBeVisible();
  const workflow = page.getByRole('list', { name: 'Midterm learning workflow' });
  for (const step of ['Learn the purpose', 'Visualize the state', 'Practice with checks']) await expect(workflow).toContainText(step);
  await expect(page.locator('#current-checkpoint')).toContainText('Queues and deques');
  await page.getByRole('link', { name: /Open current practice bank/ }).click();
  await expect(page).toHaveURL(/problem-list\.html\?module=4$/);
  await expect(page.getByRole('heading', { name: /Stacks, Queues, and Deques: select a problem/ })).toBeVisible();
});

test('curriculum roadmap expands the current module and compacts locked modules', async ({ page }) => {
  await page.goto('/problems.html');
  await expect(page.locator('.module-card')).toHaveCount(8);
  await expect(page.locator('.module-card-current')).toContainText('Stacks, Queues, and Deques');
  await expect(page.locator('.module-card-current .module-problem-card')).toHaveCount(6);
  await expect(page.locator('.checkpoint-list, .module-lessons, .module-outline')).toHaveCount(0);
  await expect(page.locator('.module-card-locked')).toHaveCount(4);
  await expect(page.locator('.module-card-locked .module-problem-card')).toHaveCount(0);
  await expect(page.getByText('Instructor preview', { exact: true })).toHaveCount(0);
  await expect(page.locator('#release-controls')).toHaveCount(0);
});

test('Midterm Review presents every reviewed checkpoint and resource on laptop and phone', async ({ page }) => {
  await page.goto('/itcc47.html');
  await page.getByRole('link', { name: 'Open Midterm Review' }).click();
  await expect(page).toHaveURL(/problems\.html\?view=midterm$/);
  await expect(page.getByRole('tab', { name: 'Midterm Review' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('[data-midterm-module]')).toHaveCount(4);
  await expect(page.locator('[data-midterm-checkpoint]')).toHaveCount(18);
  await expect(page.locator('[data-midterm-resource]')).toHaveCount(64);
  await expect(page.locator('[data-midterm-placement="primary"]')).toHaveCount(expectedMidtermPrimaryResources.length);
  const summary = page.locator('#midterm-review-summary');
  for (const item of ['18 reviewed checkpoints', '2 local learning tools', '29 guided activities', '33 checked problems']) await expect(summary).toContainText(item);
  await expect(page.locator('.midterm-module-locked, .curriculum-lock')).toHaveCount(0);
  const deployedModuleNumber = await page.evaluate(() => {
    const profile = ITCC47Curriculum.activeProfile({ preview: false, search: '' });
    return ITCC47Curriculum.getModule(ITCC47Curriculum.getCheckpoint(profile.currentCheckpointId).moduleId).number;
  });
  expect(deployedModuleNumber).toBe(4);
  await expect(page.locator('.midterm-module-body:not([hidden])')).toHaveCount(1);
  await expect(page.locator(`[data-midterm-module="${deployedModuleNumber}"] [data-midterm-module-toggle]`)).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator(`[data-midterm-module="${deployedModuleNumber}"] .midterm-module-body`)).toBeVisible();

  const module2 = page.locator('[data-midterm-module="2"]');
  const module2Toggle = module2.locator('[data-midterm-module-toggle="2"]');
  await module2Toggle.focus();
  await page.keyboard.press('Enter');
  await expect(module2Toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(module2.locator('.midterm-module-body')).toBeVisible();
  await expect(page.locator('[data-midterm-module="4"] [data-midterm-module-toggle]')).toHaveAttribute('aria-expanded', 'false');
  await expect(module2Toggle).toHaveAccessibleName(/Module 2.*Arrays, Lists, Searching, and Sorting.*Selected module/i);
  const moreExamples = module2.locator('[data-midterm-checkpoint="m2-binary-search"] [data-midterm-more="examples"]');
  await moreExamples.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(moreExamples).toHaveAttribute('open', '');
  await expect(moreExamples.locator('summary')).toHaveAccessibleName('More examples 1');

  const reachedResources = [];
  for (const moduleNumber of [1, 2, 3, 4]) {
    const module = page.locator(`[data-midterm-module="${moduleNumber}"]`);
    await module.locator('[data-midterm-module-toggle]').click();
    await expect(module.locator('.midterm-module-body')).toBeVisible();
    await module.locator('.midterm-more').evaluateAll((items) => items.forEach((item) => { item.open = true; }));
    reachedResources.push(...await module.locator('[data-midterm-resource]').evaluateAll((links) => links.filter((link) => link.getClientRects().length > 0).map((link) => link.dataset.midtermResource)));
  }
  expect(new Set(reachedResources).size).toBe(64);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  await page.locator('[data-midterm-resource="activity:deque-end-operations"]').click();
  await expect(page.getByRole('heading', { name: 'Use both ends of a deque' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
});

test('desktop Midterm navigator selects every module and browser history restores the prior selection', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/problems.html?view=midterm');
  const navigator = page.getByRole('navigation', { name: 'Midterm module navigator' });
  await expect(navigator).toBeVisible();
  await expect(page.locator('.midterm-module-jump')).toBeHidden();
  for (const moduleNumber of [1, 2, 3, 4]) {
    const navButton = navigator.locator(`[data-midterm-nav-module="${moduleNumber}"]`);
    await navButton.focus();
    await page.keyboard.press('Enter');
    await expect(navButton).toHaveAttribute('aria-current', 'true');
    await expect(navButton.locator('.midterm-nav-selected')).toHaveText('Selected');
    await expect(page.locator(`[data-midterm-module="${moduleNumber}"] [data-midterm-module-toggle]`)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(`[data-midterm-module="${moduleNumber}"] .midterm-module-body`)).toBeVisible();
    await expect(page.locator('.midterm-module-body:not([hidden])')).toHaveCount(1);
    expect(new URL(page.url()).searchParams.get('module')).toBe(String(moduleNumber));
    const headingBox = await page.locator(`[data-midterm-module="${moduleNumber}"] [data-midterm-module-toggle]`).boundingBox();
    expect(headingBox.y).toBeGreaterThanOrEqual(0);
    expect(headingBox.y).toBeLessThan(220);
  }
  await page.goBack();
  await expect(page.locator('[data-midterm-module="3"] [data-midterm-module-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await expect(navigator.locator('[data-midterm-nav-module="3"]')).toHaveAttribute('aria-current', 'true');
});

test('mobile Midterm jump control selects every module without horizontal overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/problems.html?view=midterm');
  const jump = page.locator('#midterm-module-select');
  await expect(page.getByRole('navigation', { name: 'Midterm module navigator' })).toBeHidden();
  await expect(jump).toBeVisible();
  await expect(jump).toHaveValue('4');
  for (const moduleNumber of [1, 2, 3, 4]) {
    await jump.selectOption(String(moduleNumber));
    await expect(page.locator(`[data-midterm-module="${moduleNumber}"] [data-midterm-module-toggle]`)).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator(`[data-midterm-module="${moduleNumber}"] .midterm-module-body`)).toBeVisible();
    await expect(page.locator('.midterm-module-body:not([hidden])')).toHaveCount(1);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
});

test('Midterm stage numbers follow only the stages that exist', async ({ page }) => {
  await page.goto('/problems.html?view=midterm&module=1');
  const expectStages = async (checkpointId, expectedTypes) => {
    const path = page.locator(`[data-midterm-checkpoint="${checkpointId}"] .midterm-core-path`);
    await expect(path).toHaveAttribute('data-stage-count', String(expectedTypes.length));
    expect(await path.locator('[data-midterm-stage]').evaluateAll((stages) => stages.map((stage) => stage.dataset.midtermStage))).toEqual(expectedTypes);
    expect(await path.locator('.midterm-flow-label > span').allTextContents()).toEqual(expectedTypes.map((_, index) => String(index + 1)));
  };
  await expectStages('orientation', ['learn']);
  await expect(page.locator('[data-midterm-checkpoint="orientation"] [data-midterm-stage="learn"] [data-midterm-resource="tool:writer"]')).toBeVisible();
  await expectStages('m1-ipo', ['learn', 'practice']);
  await expect(page.locator('[data-midterm-checkpoint="m1-ipo"] [data-midterm-stage="visualize"]')).toHaveCount(0);
  await page.locator('[data-midterm-module="2"] [data-midterm-module-toggle]').click();
  await expectStages('m2-linear-search', ['learn', 'visualize', 'practice']);
  await expectStages('m2-industry-workbench', ['learn', 'visualize']);
  await expect(page.locator('[data-midterm-checkpoint="m2-arrays"] [data-midterm-stage="visualize"]')).toHaveCount(0);
});

test('Midterm Review derives core choices from checkpoint sequence and frames Module 3 around references', async ({ page }) => {
  await page.goto('/problems.html?view=midterm');
  const module3 = page.locator('[data-midterm-module="3"]');
  await module3.locator('[data-midterm-module-toggle="3"]').click();
  const foundation = module3.locator('[data-midterm-checkpoint="m3-linked-foundations"]');
  await expect(foundation).toContainText('Linked storage, identity, and reachability');
  await expect(foundation).toContainText('contiguous storage with explicit links');
  await expect(foundation.locator('[data-midterm-placement="primary"][data-midterm-resource^="activity:"]')).toHaveAttribute('data-midterm-resource', 'activity:array-linked-comparison');
  const moreExamples = foundation.locator('[data-midterm-more="examples"]');
  await moreExamples.locator('summary').click();
  await expect(moreExamples.locator('[data-midterm-resource="activity:linked-list-traversal"]')).toBeVisible();
  const mutation = module3.locator('[data-midterm-checkpoint="m3-linked-mutation"]');
  await expect(mutation).toContainText('relinking in a safe order');
  await expect(mutation).toContainText('mutation invariants');
});

test('Midterm Review shows neutral progress in a fresh browser', async ({ page }) => {
  await page.goto('/problems.html?view=midterm');
  await expect(page.locator('.midterm-progress-badge.is-new')).toHaveCount(29);
  await expect(page.locator('.midterm-progress-badge.is-start')).toHaveCount(33);
  await expect(page.locator('.midterm-progress-badge.is-visited, .midterm-progress-badge.is-reviewed, .midterm-progress-badge.is-continue, .midterm-progress-badge.is-completed')).toHaveCount(0);
  await expect(page.locator('[data-midterm-module="2"] .midterm-module-progress')).toContainText('0 reviewed · 0 visited · 13 new');
  await expect(page.locator('[data-midterm-module="3"] .midterm-module-progress')).toContainText('0 completed · 0 continue · 6 start');
});

test('Midterm Review reflects existing visualization and practice records', async ({ page }) => {
  await page.goto('/problems.html?view=midterm');
  await page.evaluate(() => {
    const versionFor = (id) => PROBLEMS.find((problem) => problem.id === id).contentVersion;
    localStorage.setItem('itcc47.visualizer-progress:v1', JSON.stringify({
      schemaVersion: 1,
      activities: {
        'bubble-sort': { lastVisitedAt: '2026-09-01T01:02:03.000Z', reviewedAt: '2026-09-01T01:02:03.000Z' },
        'selection-sort': { lastVisitedAt: '2026-09-01T02:03:04.000Z' },
      },
    }));
    localStorage.setItem('itcc47.practice-records:v2', JSON.stringify({
      schemaVersion: 2,
      records: {
        'linked-node-count': { contentVersion: versionFor('linked-node-count'), draft: 'completed draft', completed: true },
        'linked-find-value': { contentVersion: versionFor('linked-find-value'), draft: 'work in progress', completed: false },
      },
    }));
  });
  await page.reload();
  await expect(page.locator('[data-midterm-resource="activity:bubble-sort"] [data-progress-state]')).toHaveText('Reviewed');
  await expect(page.locator('[data-midterm-resource="activity:selection-sort"] [data-progress-state]')).toHaveText('Visited');
  await expect(page.locator('[data-midterm-resource="problem:linked-node-count"] [data-progress-state]')).toHaveText('Completed');
  await expect(page.locator('[data-midterm-resource="problem:linked-find-value"] [data-progress-state]')).toHaveText('Continue');
  await expect(page.locator('[data-midterm-module="2"] .midterm-module-progress')).toContainText('1 reviewed · 1 visited · 11 new');
  await expect(page.locator('[data-midterm-module="3"] .midterm-module-progress')).toContainText('1 completed · 1 continue · 4 start');
  await expect(page.locator('[data-progress-state="reviewed"]')).toHaveAttribute('aria-label', 'Review status: Reviewed');
});

for (const moduleNumber of [1, 2, 3, 4]) {
  test(`every Module ${moduleNumber} public resource resolves through its canonical direct route`, async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'laptop');
    test.setTimeout(60_000);
    for (const resource of midtermResourcesByModule.get(moduleNumber)) {
      const route = resource.kind === 'tool' ? `/${resource.route}`
        : resource.kind === 'problem' ? `/practice.html?module=${moduleNumber}&problem=${encodeURIComponent(resource.id)}`
          : resource.id.startsWith('industry-') ? `/industry-workbench.html?scenario=${encodeURIComponent(resource.id)}`
            : `/visualizer.html?activity=${encodeURIComponent(resource.id)}`;
      const response = await page.goto(route);
      expect(response?.ok(), `${resource.kind}:${resource.id} did not load`).toBe(true);
      await expect(page.locator('.curriculum-lock'), `${resource.kind}:${resource.id} was unexpectedly locked`).toHaveCount(0);
      if (resource.kind === 'tool') await expect(page.locator('main')).toBeVisible();
      if (resource.kind === 'problem') {
        await expect(page.locator('#p-statement')).toBeVisible();
        await expect(page.locator('#code-box')).toBeVisible();
      }
      if (resource.kind === 'activity') {
        await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
        await expect(page.locator(resource.id.startsWith('industry-') ? '.industry-workbench' : '.visualizer-workspace')).toBeVisible();
      }
    }
  });
}

test('student preview query cannot expose instructor controls or locked content', async ({ page }) => {
  await page.addInitScript((preview) => localStorage.setItem('itcc47.release-preview:v1', JSON.stringify(preview)), instructorPreviewRecord);
  await page.goto('/problems.html?preview=1');
  await expect(page.getByText('Instructor preview', { exact: true })).toHaveCount(0);
  await expect(page.locator('#release-controls, .draft-preview-indicator')).toHaveCount(0);
  await expect(page.locator('.module-card-current')).toContainText('Stacks, Queues, and Deques');
  await page.goto('/visualizer.html?activity=recursive-range-search&preview=1');
  await expect(page.locator('.curriculum-lock')).toContainText('Recursive duplicate-range search is coming later');
  await expect(page.locator('.curriculum-lock')).not.toContainText('Practice release');
  await expect(page.locator('.curriculum-lock .release-badge')).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Continue with Module 4/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore available visualizations' })).toBeVisible();
  await expect(page.locator('.visualizer-workspace, .source-panel')).toHaveCount(0);
  await page.goto('/practice.html?module=5&problem=recursive-sum&preview=1');
  await expect(page.locator('.curriculum-lock')).toContainText('Recursive range sum is coming later');
  await expect(page.locator('#p-statement, #code-box')).toHaveCount(0);
});

test('locked visualization cards use a compact icon and border state', async ({ page }) => {
  await page.goto('/problems.html?view=visualizations');
  await expect(page.getByRole('tab', { name: 'Visualizations' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.industry-catalog-feature')).toBeHidden();
  await expect(page.locator('.visualization-card')).toHaveCount(35);
  await expect(page.locator('.visualization-card.visualization-available')).toHaveCount(19);
  await expect(page.locator('.visualization-card.visualization-current')).toHaveCount(6);
  await expect(page.locator('.visualization-card.visualization-locked')).toHaveCount(10);
  await expect(page.locator('.visualization-lock')).toHaveCount(10);
  await expect(page.locator('.visualization-card .release-badge')).toHaveCount(0);
  await expect(page.locator('.visualization-card').first().locator('.visualization-card-meta')).toContainText('Module 2');
  const familyOrder = await page.locator('.visualization-group h2').allTextContents();
  expect(familyOrder.slice(0, 7)).toEqual(['Sorting', 'Searching', 'Array Lists', 'Linked Lists', 'Stacks', 'Queues', 'Deques']);
  expect(familyOrder.indexOf('Deques')).toBeLessThan(familyOrder.indexOf('Recursion'));
});

test('focused visualizations remember visits and fade only after the final step', async ({ page }) => {
  await page.goto('/problems.html?view=visualizations');
  await page.evaluate(() => localStorage.removeItem('itcc47.visualizer-progress:v1'));
  await page.reload();
  await expect(page.getByRole('heading', { name: '0 of 25 available visualizations reviewed' })).toBeVisible();
  let bubbleCard = page.locator('.visualization-card', { hasText: 'Bubble Sort' });
  await expect(bubbleCard).not.toHaveClass(/visualization-visited/);
  await bubbleCard.click();
  await expect(page.getByRole('heading', { name: 'Bubble Sort' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => Boolean(JSON.parse(localStorage.getItem('itcc47.visualizer-progress:v1'))?.activities?.['bubble-sort']?.lastVisitedAt))).toBe(true);
  await page.getByRole('link', { name: 'All visualizations' }).click();
  bubbleCard = page.locator('.visualization-card', { hasText: 'Bubble Sort' });
  await expect(bubbleCard).toHaveClass(/visualization-visited/);
  await expect(bubbleCard).not.toHaveClass(/visualization-reviewed/);
  await expect(bubbleCard).toContainText('Visited');
  await expect(bubbleCard).toContainText(/Last visited at: \d{2}\/\d{2}\/\d{4}/);
  await bubbleCard.click();
  await expect(page.getByRole('heading', { name: 'Bubble Sort' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  const slider = await visualizerTimeline(page);
  await slider.fill(await slider.getAttribute('max'));
  await expect.poll(() => page.evaluate(() => Boolean(JSON.parse(localStorage.getItem('itcc47.visualizer-progress:v1'))?.activities?.['bubble-sort']?.reviewedAt))).toBe(true);
  await page.getByRole('link', { name: 'All visualizations' }).click();
  bubbleCard = page.locator('.visualization-card', { hasText: 'Bubble Sort' });
  await expect(bubbleCard).toHaveClass(/visualization-reviewed/);
  await expect(bubbleCard).toContainText('Reviewed');
  await expect(page.getByRole('heading', { name: '1 of 25 available visualizations reviewed' })).toBeVisible();
  await expect(bubbleCard).toHaveCSS('background-color', 'rgb(32, 33, 38)');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc47.visualizer-progress:v1')));
  expect(stored.schemaVersion).toBe(1);
  expect(Object.keys(stored.activities['bubble-sort']).sort()).toEqual(['lastVisitedAt', 'reviewedAt']);
});

test('workbench samples are separate from focused visualizations', async ({ page }) => {
  await page.goto('/problems.html?view=workbenches');
  await expect(page.getByRole('tab', { name: 'Workbench Samples' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'See how algorithms support real data decisions' })).toBeVisible();
  await expect(page.locator('.industry-catalog-feature')).toHaveCount(1);
  await expect(page.locator('.industry-catalog-feature')).toContainText('Industry Data Workbench Sample');
  await expect(page.locator('.industry-catalog-feature')).toContainText('Choose a scenario');
  await expect(page.locator('.visualization-card').first()).toBeHidden();
  await expect(page.locator('.topbar-nav a', { hasText: 'Visualize' })).toHaveAttribute('aria-current', 'page');
  await expect(page.locator('.topbar-nav a', { hasText: 'Modules' })).not.toHaveAttribute('aria-current', 'page');
  const layout = await page.locator('.industry-catalog-feature').evaluate((feature) => {
    const stream = feature.querySelector('.industry-catalog-stream')?.getBoundingClientRect();
    const action = feature.querySelector('.industry-catalog-action')?.getBoundingClientRect();
    const overlap = stream && action
      ? stream.left < action.right && stream.right > action.left && stream.top < action.bottom && stream.bottom > action.top
      : true;
    return { overlap, pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1 };
  });
  expect(layout).toEqual({ overlap: false, pageOverflow: false });
});

test('released Module 2 workbench hub previews records without initializing playback', async ({ page }) => {
  await page.goto('/industry-workbench.html');
  await expect(page.getByRole('heading', { name: 'Industry Data Workbench' })).toBeVisible();
  await expect(page.locator('.industry-scenario-row')).toHaveCount(4);
  await expect(page.locator('.industry-scenario-row')).toContainText(['SLA Breach Scan', 'Priority Range Recall', 'Stable Priority Dispatch', 'Review Queue Mutation']);
  await expect(page.locator('.industry-scenario-row').first()).toContainText('Linear search');
  await expect(page.locator('.industry-record')).toHaveCount(0);
  await expect(page.locator('.industry-scenario-preview')).toHaveCount(4);
  await expect(page.getByRole('region', { name: 'Playback controls' })).toHaveCount(0);
  await expect(page.locator('.industry-release-note')).toHaveCount(0);
});

test('direct Module 2 workbench scenario routes are available', async ({ page }) => {
  await page.goto('/industry-workbench.html?scenario=industry-priority-range-recall');
  await expect(page.getByRole('heading', { name: 'Priority Range Recall' })).toBeVisible();
  await expect(page.locator('.curriculum-lock')).toHaveCount(0);
  await expect(page.locator('.industry-record-rail')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
});

test('instructor preview opens deterministic workbench playback and record inspection', async ({ page }) => {
  await page.goto('/industry-workbench.html?scenario=industry-priority-range-recall&preview=1');
  await expect(page.getByRole('heading', { name: 'Priority Range Recall' })).toBeVisible();
  await expect(page.locator('.industry-record-rail')).toBeVisible();
  await expect(page.locator('.source-panel, .evidence-drawer, .desktop-evidence')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  const firstRecord = page.locator('[data-record-button]').first();
  await firstRecord.focus();
  await expect(page.locator('.industry-record-inspector')).toBeVisible();
  await firstRecord.press('Enter');
  await expect(firstRecord).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(page.locator('.industry-record-inspector')).toHaveCount(0);
  const slider = await visualizerTimeline(page);
  await slider.fill('1');
  const transientMid = page.locator('[data-record-index="6199"]');
  await transientMid.click();
  await expect(page.locator('.industry-record-inspector')).toBeVisible();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.industry-record-inspector')).toHaveCount(0);
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('.industry-facts')).toContainText('3,100');
  await expect(page.locator('.industry-record-pointers', { hasText: 'first P2' })).toHaveCount(1);
  await slider.fill('0');
  await expect(page.locator('.industry-teaching-heading')).toContainText('Validate stable priority order');
});

test('all four workbench scenarios use the shared visualization-only shell', async ({ page }) => {
  const scenarios = [
    ['industry-sla-breach-scan', 'SLA Breach Scan'],
    ['industry-priority-range-recall', 'Priority Range Recall'],
    ['industry-stable-priority-dispatch', 'Stable Priority Dispatch'],
    ['industry-review-queue-mutation', 'Review Queue Mutation'],
  ];
  for (const [id, title] of scenarios) {
    await page.goto(`/industry-workbench.html?scenario=${id}&preview=1`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('.industry-record-rail')).toBeVisible();
    await expect(page.locator('.industry-state-evidence')).toContainText('Metrics');
    await expect(page.locator('.industry-state-evidence')).toContainText('Invariants');
    await expect(page.locator('.source-panel, .evidence-drawer, .desktop-evidence')).toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  }
});

test('compressed mutation stages name every covered operation span', async ({ page }) => {
  await page.goto('/industry-workbench.html?scenario=industry-stable-priority-dispatch&preview=1');
  let slider = await visualizerTimeline(page);
  await slider.fill('3');
  await expect(page.locator('.industry-operation-span')).toContainText('8,678 repeated operations compressed');
  await expect(page.locator('.industry-operation-span')).toContainText('indexes 3,721…12,398');
  await page.goto('/industry-workbench.html?scenario=industry-review-queue-mutation&preview=1');
  slider = await visualizerTimeline(page);
  await slider.fill('2');
  await expect(page.locator('.industry-operation-span')).toContainText('1,406 repeated operations compressed');
  await expect(page.locator('.industry-record.is-hole')).toContainText('OPEN');
});

test('workbench structural moves reuse transition gating and motion preferences', async ({ page }) => {
  await page.goto('/industry-workbench.html?scenario=industry-stable-priority-dispatch&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  let slider = await visualizerTimeline(page);
  await slider.fill('1');
  const step = page.getByRole('button', { name: 'Step', exact: true });
  await step.click();
  await expect(step).toBeDisabled();
  await expect(step).toBeEnabled({ timeout: 1600 });
  await (await visualizerMotion(page)).selectOption('off');
  slider = await visualizerTimeline(page);
  await slider.fill('1');
  await step.click();
  await expect(step).toBeEnabled();
});

test('the legacy visualizer discovery route redirects to the canonical catalog', async ({ page }) => {
  await page.goto('/visualizer.html');
  await expect(page).toHaveURL(/problems\.html\?view=visualizations$/);
  await expect(page.getByRole('tab', { name: 'Visualizations' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.visualization-card')).toHaveCount(35);
  await expect(page.locator('.industry-catalog-feature')).toBeHidden();
  await expect(page.locator('#visualizer-root')).toHaveCount(0);
});

test('phone playback stays sticky without covering the final workbench evidence', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/industry-workbench.html?scenario=industry-priority-range-recall&preview=1');
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const geometry = await page.evaluate(() => {
    const footer = document.querySelector('.industry-complexity')?.getBoundingClientRect();
    const playback = document.querySelector('.integrated-playback')?.getBoundingClientRect();
    return footer && playback ? { footerBottom: footer.bottom, playbackTop: playback.top } : null;
  });
  expect(geometry).not.toBeNull();
  expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.playbackTop + 1);
});

test('workbench activity aliases redirect before the standard workspace initializes', async ({ page }) => {
  await page.goto('/visualizer.html?activity=industry-sla-breach-scan&preview=1');
  await expect(page).toHaveURL(/industry-workbench\.html\?scenario=industry-sla-breach-scan&preview=1$/);
  await expect(page.getByRole('heading', { name: 'SLA Breach Scan' })).toBeVisible();
  await expect(page.locator('.visualizer-workspace, .source-panel')).toHaveCount(0);
});

test('locked visualizer route renders requirements without source or playback', async ({ page }) => {
  await page.goto('/visualizer.html?activity=recursive-range-search');
  await expect(page.locator('.curriculum-lock')).toContainText('Recursive duplicate-range search is coming later');
  await expect(page.locator('.curriculum-lock')).not.toContainText('Practice release');
  await expect(page.locator('.curriculum-lock .release-badge')).toHaveCount(0);
  const actions = page.locator('.curriculum-lock-actions .btn');
  await expect(actions).toHaveCount(2);
  await expect(actions.first()).toContainText('Continue with Module 4');
  await expect(actions.nth(1)).toHaveText('Explore available visualizations');
  expect(await actions.evaluateAll((links) => links.every((link) => getComputedStyle(link).textDecorationLine === 'none'))).toBe(true);
  await expect(actions.first()).toHaveCSS('min-height', '46px');
  await expect(page.locator('.source-panel')).toHaveCount(0);
  await expect(page.getByRole('slider', { name: /Timeline/ })).toHaveCount(0);
  await expect(page.locator('.visualizer-workspace')).toHaveCount(0);
});

test('locked planned practice route exposes no problem statement or editor', async ({ page }) => {
  await page.goto('/practice.html?module=5&problem=recursive-sum');
  await expect(page.locator('.curriculum-lock')).toContainText('Recursive range sum is coming later');
  await expect(page.locator('#p-statement')).toHaveCount(0);
  await expect(page.locator('#code-box')).toHaveCount(0);
});

test('instructor preview is explicit, persistent, and does not change the deployed profile', async ({ page }) => {
  await page.goto('/problems.html');
  await page.evaluate(({ access, preview }) => {
    localStorage.setItem('itcc47.instructor-access:v1', JSON.stringify(access));
    localStorage.setItem('itcc47.release-preview:v1', JSON.stringify(preview));
  }, { access: instructorAccessRecord, preview: instructorPreviewRecord });
  await page.goto('/problems.html?preview=1');
  await page.getByText('Instructor preview', { exact: true }).click();
  await page.getByLabel('Preview checkpoint').selectOption('m8-dp');
  await page.getByRole('button', { name: 'Apply preview' }).click();
  await expect(page).toHaveURL(/preview=1/);
  await page.goto('/visualizer.html?activity=recursive-range-search&preview=1');
  await expect(page.getByRole('heading', { name: 'Recursive duplicate-range search' })).toBeVisible();
  await expect(page.locator('.draft-preview-indicator')).toContainText('Draft preview');
  await page.goto('/visualizer.html?activity=recursive-range-search');
  await expect(page.locator('.curriculum-lock')).toBeVisible();
  await page.goto('/problems.html?preview=1');
  await page.getByText('Instructor preview', { exact: true }).click();
  await page.getByRole('button', { name: 'Exit instructor mode' }).click();
  await expect(page).not.toHaveURL(/preview=1/);
  await expect(page.getByText('Instructor preview', { exact: true })).toHaveCount(0);
  await page.goto('/visualizer.html?activity=recursive-range-search&preview=1');
  await expect(page.locator('.curriculum-lock')).toBeVisible();
});

test('former materials route redirects without exposing downloads or metadata', async ({ page }) => {
  await page.goto('/student-materials.html');
  await expect(page).toHaveURL(/problems\.html$/);
  await expect(page.locator('a[download]')).toHaveCount(0);
  await expect(page.locator('script[src*="student-materials"],script[src*="student-bundles"]')).toHaveCount(0);
  await expect(page.locator('.topbar-nav a', { hasText: 'Materials' })).toHaveCount(0);
});

test('instructor preview renders every Module 5-8 teaching activity', async ({ page }) => {
  const activities = ['recursive-range-search','stable-merge-sort','tree-traversals','bst-insert-search','bst-height-shape','graph-representation','bfs-shortest-path','dfs-reachability','greedy-dp-coin-change','knapsack-dp'];
  for (const activity of activities) {
    await page.goto(`/visualizer.html?activity=${activity}&preview=1`);
    await expect(page.locator('.visualizer-workspace')).toBeVisible();
    await expect(page.locator('.source-line')).not.toHaveCount(0);
    await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
    await expect(page.locator('.concept-domain')).toBeVisible();
    await expect(page.locator('.draft-preview-indicator')).toContainText('Draft preview');
  }
});

test('instructor preview reaches Module 5-8 practice without publishing it', async ({ page }) => {
  const problems = [
    [5, 'recursive-sum', 'Recursive range sum'],
    [6, 'bst-insert-order', 'Build a BST in order'],
    [7, 'graph-degree', 'Compute graph degrees'],
    [8, 'greedy-coin-count', 'Greedy coin count'],
  ];
  for (const [moduleNumber, problemId, title] of problems) {
    await page.goto(`/practice.html?module=${moduleNumber}&problem=${problemId}&preview=1`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.locator('#p-statement')).toBeVisible();
    await expect(page.locator('.draft-preview-indicator')).toContainText('Draft preview');
    await expect(page.locator('.curriculum-lock')).toHaveCount(0);
  }
});

test('relocking instructor-preview practice preserves browser-local progress', async ({ page }) => {
  const savedDraft = 'READ n\nWRITE n';
  await page.addInitScript((draft) => localStorage.setItem('itcc47.practice-records:v2', JSON.stringify({
    schemaVersion: 2,
    records: { 'recursive-sum': { contentVersion: 1, draft, completed: false } },
    recovery: {},
  })), savedDraft);
  await page.goto('/practice.html?module=5&problem=recursive-sum&preview=1');
  await expect(page.getByRole('heading', { name: 'Recursive range sum' })).toBeVisible();
  await page.goto('/problems.html?preview=1');
  await page.getByText('Instructor preview', { exact: true }).click();
  await page.getByRole('button', { name: 'Exit instructor mode' }).click();
  await page.goto('/practice.html?module=5&problem=recursive-sum');
  await expect(page.locator('.curriculum-lock')).toBeVisible();
  const record = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc47.practice-records:v2')).records['recursive-sum']);
  expect(record).toEqual({ contentVersion: 1, draft: savedDraft, completed: false });
});

test('public release exposes ten line-by-line Module 4 examples', async ({ page }) => {
  const activities = ['stack-lifo-basics','stack-postfix-evaluator','stack-delimiter-audit','stack-editor-undo','queue-fifo-basics','queue-round-robin','queue-printer-jobs','deque-end-operations','deque-sliding-window','deque-service-lane'];
  await page.goto('/problems.html?view=visualizations');
  await expect(page.locator('.visualization-group', { hasText: 'Stacks' }).locator('.visualization-card')).toHaveCount(4);
  await expect(page.locator('.visualization-group', { hasText: 'Queues' }).locator('.visualization-card')).toHaveCount(3);
  await expect(page.locator('.visualization-group', { hasText: 'Deques' }).locator('.visualization-card')).toHaveCount(3);
  for (const activity of activities) {
    await page.goto(`/visualizer.html?activity=${activity}`);
    const workbench = activity === 'stack-lifo-basics' ? '.stack-execution-workbench' : activity === 'stack-postfix-evaluator' ? '.postfix-workbench' : activity === 'stack-delimiter-audit' ? '.delimiter-workbench' : activity === 'stack-editor-undo' ? '.undo-redo-workbench' : activity === 'queue-fifo-basics' ? '.queue-workbench' : activity === 'queue-round-robin' ? '.rr-workbench' : '.linear-adt';
    const teaching = activity === 'stack-lifo-basics' ? '.stack-execution-header' : activity === 'stack-postfix-evaluator' ? '.postfix-operation' : activity === 'stack-delimiter-audit' ? '.delimiter-current-token' : activity === 'stack-editor-undo' ? '.undo-redo-operation' : activity === 'queue-fifo-basics' ? '.queue-operation' : activity === 'queue-round-robin' ? '.rr-operation' : '.linear-teaching';
    await expect(page.locator(workbench)).toBeVisible();
    await expect(page.locator(teaching)).toBeVisible();
    await expect(page.locator('.source-line.is-current')).toHaveCount(1);
    await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  }
});

test('delimiter debugger separates source character, comparison, POP, and final validation', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/visualizer.html?activity=stack-delimiter-audit');
  const workbench = page.locator('.delimiter-workbench');
  const step = page.getByRole('button', { name: 'Step', exact: true });
  const stackItems = page.getByRole('region', { name: 'Unmatched Openers Stack' }).getByRole('listitem');
  const parserStatus = page.getByRole('region', { name: 'Parser Status' });
  const expected = [[1,0,1]];
  for (let character = 1; character <= 6; character++) {
    if (character <= 3) expected.push(...Array.from({ length: 4 }, (_, phase) => [4,character,phase + 1]));
    else {
      expected.push(...Array.from({ length: 4 }, (_, phase) => [6,character,phase + 1]));
      expected.push(...Array.from({ length: 4 }, (_, phase) => [9,character,phase + 1]));
    }
  }
  expected.push(...Array.from({ length: 4 }, (_, phase) => [12,0,phase + 1]));
  const mutations = { 0:[], 4:['('], 8:['(','['], 12:['(','[','{'], 18:['(','['], 26:['('], 34:[] };
  let values = [];
  for (let index = 0; index < expected.length; index++) {
    if (index) await step.click();
    const [line, character, phase] = expected[index];
    await expect(workbench).toHaveAttribute('data-line', String(line));
    await expect(workbench).toHaveAttribute('data-character', String(character));
    await expect(workbench).toHaveAttribute('data-phase', String(phase));
    await expect(page.locator('.delimiter-source .source-line.is-current > span')).toHaveText(String(line));
    await expect(page.locator('.delimiter-steps [aria-current="step"]')).toHaveCount(1);
    if (mutations[index]) values = mutations[index];
    await expect(stackItems).toHaveCount(values.length);
    for (let item = 0; item < values.length; item++) await expect(stackItems.nth(item)).toContainText(values[item]);
    if (index < expected.length - 1) await expect(parserStatus).toContainText('RUNNING');
    if (line === 6 && phase < 3) await expect(page.locator('.delimiter-matching')).not.toHaveClass(/is-success/);
    if (line === 6 && phase >= 3) await expect(page.locator('.delimiter-matching')).toHaveClass(/is-success/);
    if (index === 17) await expect(stackItems).toHaveCount(3);
    if (index === 18) await expect(page.getByRole('region', { name: 'Outgoing Value' })).toContainText('Popped (matched)');
    if (index === 19) await expect(page.locator('.delimiter-stream li.is-resolved')).toHaveCount(2);
    if (index === 39) await expect(parserStatus).toContainText('RUNNING');
  }
  await expect(step).toBeDisabled();
  await expect(parserStatus).toContainText('VALID');
  await expect(page.getByRole('region', { name: 'Final Stack Validation' })).toContainText('TRUE');
  await expect(page.locator('.delimiter-stream li.is-resolved')).toHaveCount(6);
  for (let count = 0; count < 2; count++) await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(parserStatus).toContainText('RUNNING');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Timeline step', { exact: true }).fill('16');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await expect(workbench).toHaveAttribute('data-line', '6');
  await expect(stackItems).toHaveCount(3);
  await expect(page.locator('.delimiter-matching')).toContainText('Match found');

  const seekEnd = async () => {
    await page.getByLabel('Playback settings', { exact: true }).click();
    const slider = page.getByLabel('Timeline step', { exact: true });
    await slider.fill(await slider.getAttribute('max'));
    await page.getByLabel('Playback settings', { exact: true }).click();
  };
  await page.getByLabel('Delimiter example').selectOption('mismatch');
  await expect(workbench).toHaveAttribute('data-operation', 'initialize');
  await seekEnd();
  await expect(parserStatus).toContainText('INVALID');
  await expect(page.getByRole('region', { name: 'Matching Information' })).toContainText('Mismatch');
  await expect(stackItems).toHaveCount(2);
  await page.getByLabel('Delimiter example').selectOption('extra-closer');
  await seekEnd();
  await expect(parserStatus).toContainText('No unmatched opener exists');
  await expect(page.getByRole('region', { name: 'Matching Information' })).toContainText('No opener is available');
  await expect(stackItems).toHaveCount(0);
  await page.getByLabel('Delimiter example').selectOption('unclosed');
  await seekEnd();
  await expect(parserStatus).toContainText('One or more opening delimiters were never closed');
  await expect(page.getByRole('region', { name: 'Final Stack Validation' })).toContainText('FALSE');
  await expect(stackItems).toHaveCount(2);
  await page.getByLabel('Delimiter example').selectOption('balanced');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Speed', { exact: true }).selectOption('9');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const pausedPhase = await workbench.getAttribute('data-phase');
  const pausedOperation = await workbench.getAttribute('data-operation');
  await page.waitForTimeout(350);
  await expect(workbench).toHaveAttribute('data-phase', pausedPhase);
  await expect(workbench).toHaveAttribute('data-operation', pausedOperation);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(step).toBeDisabled({ timeout: 20000 });
  await expect(parserStatus).toContainText('VALID');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'laptop') {
    const left = await page.locator('.delimiter-left').boundingBox(), right = await page.locator('.delimiter-right').boundingBox();
    expect(left.width / (left.width + right.width)).toBeGreaterThanOrEqual(.30);
    expect(left.width / (left.width + right.width)).toBeLessThanOrEqual(.34);
    expect(right.x).toBeGreaterThan(left.x + left.width);
  }
});

test('delimiter opener and matched POP animate stable values from offline file URLs', async ({ page }) => {
  const { pathToFileURL } = require('url');
  await page.context().setOffline(true);
  await page.goto(`${pathToFileURL(path.resolve(__dirname, '..', 'visualizer.html')).href}?activity=stack-delimiter-audit`);
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('on');
  await page.getByLabel('Speed', { exact: true }).selectOption('3');
  await page.getByLabel('Timeline step', { exact: true }).fill('2');
  await page.getByLabel('Playback settings', { exact: true }).click();
  const opener = page.locator('[data-value-id="opener-0"]');
  const before = await opener.boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.delimiter-pending')).toBeVisible();
  await expect.poll(() => opener.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await expect.poll(async () => Math.abs((await opener.boundingBox()).x - before.x), { timeout: 2500 }).toBeGreaterThan(40);
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Timeline step', { exact: true }).fill('17');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  const outgoing = page.getByRole('region', { name: 'Outgoing Value' }).locator('[data-value-id="opener-2"]');
  await expect(outgoing).toHaveCount(1);
  await expect.poll(() => outgoing.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await expect.poll(() => outgoing.evaluate(element => getComputedStyle(element).transform)).toBe('none');
});

test('undo redo debugger separates history transfer, command holding, document APPLY, and RETURN output', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/visualizer.html?activity=stack-editor-undo');
  const workbench = page.locator('.undo-redo-workbench');
  const step = page.getByRole('button', { name: 'Step', exact: true });
  const undoItems = page.getByRole('region', { name: 'Undo Stack', exact: true }).getByRole('listitem');
  const redoItems = page.getByRole('region', { name: 'Redo Stack', exact: true }).getByRole('listitem');
  const command = page.getByRole('region', { name: 'Command Register', exact: true });
  const documentState = page.getByRole('region', { name: 'Document State', exact: true });
  const seek = async (index) => {
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByLabel('Timeline step', { exact: true }).fill(String(index));
    await page.getByLabel('Playback settings', { exact: true }).click();
  };

  await expect(page.getByRole('heading', { name: 'Undo and redo an edit' })).toBeVisible();
  await expect(workbench).toHaveAttribute('data-line', '1');
  await expect(undoItems).toHaveCount(2);
  await expect(redoItems).toHaveCount(0);
  await expect(command).toContainText('EMPTY');
  await expect(documentState.getByLabel('Current document content')).toHaveText('AB');

  await seek(3);
  await expect(workbench).toHaveAttribute('data-line', '3');
  await expect(workbench).toHaveAttribute('data-phase', '2');
  await expect(workbench).toHaveAttribute('data-command-location', 'IN_TRANSIT');
  await expect(undoItems).toHaveCount(1);
  await expect(page.locator('.history-transfer-left')).toHaveClass(/is-active/);
  await expect(documentState.getByLabel('Current document content')).toHaveText('AB');

  await step.click();
  await expect(workbench).toHaveAttribute('data-phase', '3');
  await expect(workbench).toHaveAttribute('data-command-location', 'COMMAND');
  await expect(command).toContainText('Type B');
  await expect(documentState.getByLabel('Current document content')).toHaveText('AB');

  await seek(8);
  await expect(workbench).toHaveAttribute('data-line', '4');
  await expect(workbench).toHaveAttribute('data-phase', '3');
  await expect(documentState).toContainText('Previewing the change');
  await expect(documentState.getByLabel('Current document content')).toHaveText('AB');
  await step.click();
  await expect(documentState.getByLabel('Current document content')).toHaveText('A');
  await expect(command).toContainText('Type B');

  await seek(11);
  await expect(workbench).toHaveAttribute('data-operation', 'push-redo');
  await expect(workbench).toHaveAttribute('data-command-location', 'IN_TRANSIT');
  await expect(page.locator('.history-transfer-right')).toHaveClass(/is-active/);
  await expect(documentState.getByLabel('Current document content')).toHaveText('A');
  await step.click();
  await expect(redoItems).toHaveCount(1);
  await expect(redoItems).toContainText(['Type B']);

  await seek(15);
  await expect(workbench).toHaveAttribute('data-operation', 'pop-redo');
  await expect(workbench).toHaveAttribute('data-context', 'REDO');
  await expect(redoItems).toHaveCount(0);
  await expect(documentState.getByLabel('Current document content')).toHaveText('A');
  await step.click();
  await expect(command).toContainText('Type B');

  await seek(20);
  await expect(workbench).toHaveAttribute('data-line', '7');
  await expect(workbench).toHaveAttribute('data-phase', '3');
  await expect(documentState.getByLabel('Current document content')).toHaveText('A');
  await step.click();
  await expect(documentState.getByLabel('Current document content')).toHaveText('AB');
  await expect(command).toContainText('Type B');

  await seek(23);
  await expect(workbench).toHaveAttribute('data-operation', 'push-undo');
  await expect(workbench).toHaveAttribute('data-command-location', 'IN_TRANSIT');
  await expect(documentState.getByLabel('Current document content')).toHaveText('AB');
  await step.click();
  await expect(undoItems).toHaveCount(2);
  await expect(redoItems).toHaveCount(0);
  await expect(command).toContainText('EMPTY');

  await seek(27);
  await expect(workbench).toHaveAttribute('data-line', '9');
  await expect(workbench).toHaveAttribute('data-phase', '2');
  await expect(documentState).toContainText('Prepared: AB');
  await expect(documentState).toContainText('empty');
  await step.click();
  await expect(documentState).toContainText('Program / Return output');
  await expect(documentState).toContainText('AB');
  await step.click();
  await expect(step).toBeDisabled();
  await expect(workbench).toHaveAttribute('data-context', 'COMPLETE');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(workbench).toHaveAttribute('data-phase', '3');

  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('reduced');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await page.getByLabel('Motion preference', { exact: true }).selectOption('off');
  await page.getByLabel('Speed', { exact: true }).selectOption('9');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-off/);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const pausedLine = await workbench.getAttribute('data-line');
  const pausedPhase = await workbench.getAttribute('data-phase');
  await page.waitForTimeout(300);
  await expect(workbench).toHaveAttribute('data-line', pausedLine);
  await expect(workbench).toHaveAttribute('data-phase', pausedPhase);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(step).toBeDisabled({ timeout: 20000 });
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'laptop') {
    const left = await page.locator('.undo-redo-left').boundingBox();
    const right = await page.locator('.undo-redo-right').boundingBox();
    expect(left.width / (left.width + right.width)).toBeGreaterThanOrEqual(.30);
    expect(left.width / (left.width + right.width)).toBeLessThanOrEqual(.34);
    expect(right.x).toBeGreaterThan(left.x + left.width);
  }
});

test('undo redo transfers animate the stable Type B identity from offline file URLs', async ({ page }) => {
  const { pathToFileURL } = require('url');
  await page.context().setOffline(true);
  await page.goto(`${pathToFileURL(path.resolve(__dirname, '..', 'visualizer.html')).href}?activity=stack-editor-undo`);
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('on');
  await page.getByLabel('Speed', { exact: true }).selectOption('3');
  await page.getByLabel('Timeline step', { exact: true }).fill('2');
  await page.getByLabel('Playback settings', { exact: true }).click();
  const commandB = page.locator('[data-command-id="cmd-b"]');
  const beforePop = await commandB.boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.history-transfer-left [data-command-id="cmd-b"]')).toHaveCount(1);
  await expect.poll(() => commandB.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await expect.poll(async () => Math.abs((await commandB.boundingBox()).x - beforePop.x), { timeout: 2500 }).toBeGreaterThan(25);
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Timeline step', { exact: true }).fill('10');
  await page.getByLabel('Playback settings', { exact: true }).click();
  const beforePush = await commandB.boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.history-transfer-right [data-command-id="cmd-b"]')).toHaveCount(1);
  await expect.poll(() => commandB.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await expect.poll(async () => Math.abs((await commandB.boundingBox()).x - beforePush.x), { timeout: 2500 }).toBeGreaterThan(25);
});

test('queue debugger separates physical circular storage, logical FIFO order, runtime values, and return output', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/visualizer.html?activity=queue-fifo-basics');
  const workbench = page.locator('.queue-workbench');
  const step = page.getByRole('button', { name: 'Step', exact: true });
  const physical = page.getByRole('region', { name: 'Physical Circular Array', exact: true });
  const logical = page.getByRole('region', { name: 'Logical Queue Order', exact: true });
  const runtime = page.getByRole('region', { name: 'Runtime Values', exact: true });
  const output = page.getByRole('region', { name: 'Program / Return Output', exact: true });
  const slot = (index) => physical.locator(`[data-slot-index="${index}"]`);
  const seek = async (index) => {
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByLabel('Timeline step', { exact: true }).fill(String(index));
    await page.getByLabel('Playback settings', { exact: true }).click();
  };

  await expect(page.getByRole('heading', { name: 'Enqueue, front, and dequeue' })).toBeVisible();
  await expect(workbench).toHaveAttribute('data-line', '1');
  await expect(workbench).toHaveAttribute('data-slots', '_,_,_');
  await expect(workbench).toHaveAttribute('data-front', 'none');
  await expect(workbench).toHaveAttribute('data-back', 'none');
  await expect(physical.locator('[data-slot-index]')).toHaveCount(3);

  await seek(6);
  await expect(workbench).toHaveAttribute('data-operation', 'underflow-guard');
  await expect(page.getByRole('region', { name: 'Underflow Check', exact: true })).toContainText('DEQUEUE would cause UNDERFLOW');
  await expect(workbench).toHaveAttribute('data-slots', '_,_,_');

  await seek(10);
  await expect(workbench).toHaveAttribute('data-line', '3');
  await expect(workbench).toHaveAttribute('data-phase', '3');
  await expect(slot(0)).toHaveAttribute('data-slot-value', 'A');
  await expect(slot(0)).toHaveAttribute('data-committed-value', 'empty');
  await expect(workbench).toHaveAttribute('data-size', '0');
  await step.click();
  await expect(workbench).toHaveAttribute('data-slots', 'A,_,_');
  await expect(workbench).toHaveAttribute('data-front', '0');
  await expect(workbench).toHaveAttribute('data-back', '0');
  await expect(workbench).toHaveAttribute('data-size', '1');
  await expect(slot(0).locator('.queue-pointer-markers')).toContainText('FRONT');
  await expect(slot(0).locator('.queue-pointer-markers')).toContainText('BACK');

  await seek(19);
  await expect(workbench).toHaveAttribute('data-slots', 'A,B,C');
  await expect(workbench).toHaveAttribute('data-front', '0');
  await expect(workbench).toHaveAttribute('data-back', '2');
  await expect(workbench).toHaveAttribute('data-size', '3');
  await expect(logical).toContainText('A');
  await expect(logical).toContainText('B');
  await expect(logical).toContainText('C');

  await seek(21);
  await expect(workbench).toHaveAttribute('data-operation', 'front');
  await expect(workbench).toHaveAttribute('data-slots', 'A,B,C');
  await expect(workbench).toHaveAttribute('data-front', '0');
  await expect(workbench).toHaveAttribute('data-back', '2');
  await expect(workbench).toHaveAttribute('data-size', '3');
  await expect(runtime.locator('article').filter({ has: page.locator('code', { hasText: /^next$/ }) })).toContainText('A');
  await expect(page.getByRole('region', { name: 'Explanation', exact: true })).toContainText('Queue unchanged');
  await expect(output).toContainText('No output yet.');

  await seek(24);
  await expect(workbench).toHaveAttribute('data-operation', 'dequeue');
  await expect(slot(0)).toHaveAttribute('data-slot-value', 'empty');
  await expect(slot(0)).toHaveAttribute('data-committed-value', 'A');
  await expect(workbench).toHaveAttribute('data-front', '0');
  await expect(workbench).toHaveAttribute('data-size', '3');
  await expect(runtime.locator('article').filter({ has: page.locator('code', { hasText: /^served$/ }) })).toContainText('receiving A');
  await expect(page.getByRole('region', { name: 'Queue State', exact: true })).toContainText('pending');
  await step.click();
  await expect(runtime.locator('article').filter({ has: page.locator('code', { hasText: /^served$/ }) })).toContainText('assigned');
  await step.click();
  await expect(workbench).toHaveAttribute('data-slots', '_,B,C');
  await expect(workbench).toHaveAttribute('data-front', '1');
  await expect(workbench).toHaveAttribute('data-back', '2');
  await expect(workbench).toHaveAttribute('data-size', '2');
  await expect(workbench).toHaveAttribute('data-logical-order', 'B,C');

  await seek(28);
  await expect(workbench).toHaveAttribute('data-operation', 'wrap-enqueue');
  await expect(page.locator('.queue-wrap-cue')).toContainText('(2 + 1) MOD 3 = 0');
  await expect(workbench).toHaveAttribute('data-slots', '_,B,C');
  await step.click();
  await expect(slot(0)).toHaveAttribute('data-slot-value', 'D');
  await expect(slot(0)).toHaveAttribute('data-committed-value', 'empty');
  await expect(workbench).toHaveAttribute('data-back', '2');
  await step.click();
  await expect(workbench).toHaveAttribute('data-slots', 'D,B,C');
  await expect(workbench).toHaveAttribute('data-front', '1');
  await expect(workbench).toHaveAttribute('data-back', '0');
  await expect(workbench).toHaveAttribute('data-size', '3');
  await expect(workbench).toHaveAttribute('data-logical-order', 'B,C,D');
  await expect(slot(0).locator('.queue-pointer-markers')).toContainText('BACK');
  await expect(slot(1).locator('.queue-pointer-markers')).toContainText('FRONT');

  await seek(32);
  await expect(workbench).toHaveAttribute('data-line', '9');
  await expect(workbench).toHaveAttribute('data-phase', '2');
  await expect(output).toContainText('Prepared: [B, C, D]');
  await expect(output).toContainText('No output yet.');
  await step.click();
  await expect(output).toContainText('Return Value');
  await expect(output).toContainText('[B, C, D]');
  await step.click();
  await expect(step).toBeDisabled();
  await expect(workbench).toHaveAttribute('data-context', 'COMPLETE');
  await expect(page.getByRole('region', { name: 'Explanation', exact: true })).toContainText('physical array wrapped around');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(workbench).toHaveAttribute('data-phase', '3');

  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('reduced');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await page.getByLabel('Speed', { exact: true }).selectOption('9');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(step).toBeDisabled({ timeout: 25000 });
  await expect(workbench).toHaveAttribute('data-slots', 'D,B,C');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'laptop') {
    const left = await page.locator('.queue-left').boundingBox();
    const right = await page.locator('.queue-right').boundingBox();
    expect(left.width / (left.width + right.width)).toBeGreaterThanOrEqual(.30);
    expect(left.width / (left.width + right.width)).toBeLessThanOrEqual(.34);
    expect(right.x).toBeGreaterThan(left.x + left.width);
  }
});

test('queue enqueue and dequeue animate stable value identities from offline file URLs', async ({ page }) => {
  const { pathToFileURL } = require('url');
  await page.context().setOffline(true);
  await page.goto(`${pathToFileURL(path.resolve(__dirname, '..', 'visualizer.html')).href}?activity=queue-fifo-basics`);
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('on');
  await page.getByLabel('Speed', { exact: true }).selectOption('3');
  await page.getByLabel('Timeline step', { exact: true }).fill('13');
  await page.getByLabel('Playback settings', { exact: true }).click();
  const ticketB = page.locator('[data-queue-value-id="ticket-b"]');
  const beforeEnqueue = await ticketB.boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('[data-slot-index="1"] [data-queue-value-id="ticket-b"]')).toHaveCount(1);
  await expect.poll(() => ticketB.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await expect.poll(async () => {
    const after = await ticketB.boundingBox();
    return Math.hypot(after.x - beforeEnqueue.x, after.y - beforeEnqueue.y);
  }, { timeout: 2500 }).toBeGreaterThan(35);

  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Timeline step', { exact: true }).fill('23');
  await page.getByLabel('Playback settings', { exact: true }).click();
  const ticketA = page.locator('[data-queue-value-id="ticket-a"]:not(.is-copy)');
  const beforeDequeue = await ticketA.boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Runtime Values', exact: true }).locator('[data-queue-value-id="ticket-a"]:not(.is-copy)')).toHaveCount(1);
  await expect.poll(() => ticketA.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await expect.poll(async () => {
    const after = await ticketA.boundingBox();
    return Math.hypot(after.x - beforeDequeue.x, after.y - beforeDequeue.y);
  }, { timeout: 2500 }).toBeGreaterThan(35);
});

test('round robin debugger separates Ready, CPU, Completed, scheduler turns, line 5 assignment, and return output', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto('/visualizer.html?activity=queue-round-robin');
  const workbench = page.locator('.rr-workbench');
  const ready = page.getByRole('region', { name: 'Ready Queue', exact: true });
  const cpu = page.getByRole('region', { name: 'CPU / Running', exact: true });
  const completed = page.getByRole('region', { name: 'Completed Processes', exact: true });
  const runtime = page.getByRole('region', { name: 'Runtime State', exact: true });
  const output = page.getByRole('region', { name: 'Program / Return Output', exact: true });
  const step = page.getByRole('button', { name: 'Step', exact: true });
  const seek = async (index) => {
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByLabel('Timeline step', { exact: true }).fill(String(index));
    await page.getByLabel('Playback settings', { exact: true }).click();
  };
  await expect(page.getByRole('heading', { name: 'Round-robin CPU scheduling' })).toBeVisible();
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-workspace-composition', 'round-robin-execution');
  await seek(3);
  await expect(workbench).toHaveAttribute('data-line', '1');
  await expect(workbench).toHaveAttribute('data-turn', '0');
  await expect(workbench).toHaveAttribute('data-ready', 'P1,P2');
  await expect(ready.locator('[data-location="READY"]')).toHaveCount(2);
  await expect(ready.locator('[data-process-id="P1"]')).toHaveAttribute('data-remaining', '5');
  await expect(ready.locator('[data-process-id="P2"]')).toHaveAttribute('data-remaining', '2');
  await expect(cpu).toContainText('Idle');
  await expect(completed).toContainText('No completed processes');
  await expect(output).toContainText('No return value yet');
  await expect(page.getByRole('region', { name: 'Round-Robin concept reminder' })).toContainText('2 ms');

  await seek(7);
  await expect(workbench).toHaveAttribute('data-line', '3');
  await expect(workbench).toHaveAttribute('data-phase', '3');
  await expect(workbench).toHaveAttribute('data-turn', '1');
  await expect(workbench).toHaveAttribute('data-ready', 'P2');
  await expect(workbench).toHaveAttribute('data-cpu', 'P1');
  await expect(cpu.locator('[data-process-id="P1"]')).toHaveAttribute('data-remaining', '5');
  await expect(cpu).toContainText('not running yet');
  await expect(runtime).toContainText('5 ms');

  await seek(11);
  await expect(workbench).toHaveAttribute('data-line', '4');
  await expect(cpu).toContainText('RUNNING');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('MIN(2, 5) = 2 ms');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('Predicted remaining: 5 → 3 ms');
  await expect(runtime).toContainText('5 ms');
  await expect(cpu.locator('[data-process-id="P1"]')).toHaveAttribute('data-remaining', '5');

  await seek(15);
  await expect(workbench).toHaveAttribute('data-line', '5');
  await expect(workbench).toHaveAttribute('data-phase', '3');
  await expect(runtime).toContainText('5 ms');
  await step.click();
  await expect(runtime).toContainText('3 ms');
  await expect(cpu.locator('[data-process-id="P1"]')).toHaveAttribute('data-remaining', '3');

  await seek(19);
  await expect(workbench).toHaveAttribute('data-line', '6');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('3 > 0 → TRUE');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('RE-ENQUEUE AT BACK');
  await expect(workbench).toHaveAttribute('data-ready', 'P2');
  await expect(workbench).toHaveAttribute('data-cpu', 'P1');

  await seek(22);
  await expect(workbench).toHaveAttribute('data-line', '7');
  await expect(workbench).toHaveAttribute('data-moving', 'P1');
  await expect(workbench).toHaveAttribute('data-ready', 'P2');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('Before: [P2]');
  await step.click();
  await expect(workbench).toHaveAttribute('data-ready', 'P2,P1');
  await expect(workbench).toHaveAttribute('data-cpu', 'idle');
  await expect(ready.locator('[data-process-id="P1"]')).toHaveAttribute('data-remaining', '3');
  await expect(ready.locator('[data-process-id="P2"]')).toContainText('2 ms remaining');

  await seek(28);
  await expect(workbench).toHaveAttribute('data-line', '3');
  await expect(workbench).toHaveAttribute('data-turn', '2');
  await expect(workbench).toHaveAttribute('data-ready', 'P1');
  await expect(workbench).toHaveAttribute('data-cpu', 'P2');
  await expect(cpu.locator('[data-process-id="P2"]')).toHaveAttribute('data-remaining', '2');
  await expect(ready.locator('[data-process-id="P1"]')).toHaveAttribute('data-remaining', '3');
  await expect(cpu).toContainText('not running yet');

  await seek(32);
  await expect(workbench).toHaveAttribute('data-line', '4');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('MIN(2, 2) = 2 ms');
  await expect(runtime).toContainText('2 ms');
  await seek(37);
  await expect(workbench).toHaveAttribute('data-line', '5');
  await expect(runtime).toContainText('0 ms');
  await expect(cpu.locator('[data-process-id="P2"]')).toHaveAttribute('data-remaining', '0');

  await seek(40);
  await expect(workbench).toHaveAttribute('data-line', '6');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('0 > 0 → FALSE');
  await expect(page.getByRole('region', { name: 'Contextual teaching panel' })).toContainText('DO NOT RE-ENQUEUE');
  await expect(workbench).toHaveAttribute('data-cpu', 'P2');
  await expect(workbench).toHaveAttribute('data-completed', '');
  await step.click();
  await expect(workbench).toHaveAttribute('data-cpu', 'idle');
  await expect(workbench).toHaveAttribute('data-completed', 'P2');
  await expect(completed.locator('[data-process-id="P2"]')).toBeVisible();
  await expect(workbench).toHaveAttribute('data-ready', 'P1');
  await expect(output).toContainText('No return value yet');

  await seek(44);
  await expect(workbench).toHaveAttribute('data-line', '9');
  await expect(output).toContainText('Prepared: [P1 · 3 ms]');
  await expect(output).toContainText('No return value yet');
  await step.click();
  await expect(output).toContainText('[P1 · 3 ms]');
  await step.click();
  await expect(step).toBeDisabled();
  await expect(workbench).toHaveAttribute('data-turn', 'complete');
  await expect(runtime).toContainText('Scenario complete');
  await expect(runtime).toContainText('—');
  await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(workbench).toHaveAttribute('data-phase', '3');
  await expect(workbench).toHaveAttribute('data-ready', 'P1');
  await expect(workbench).toHaveAttribute('data-completed', 'P2');

  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('reduced');
  await page.getByLabel('Speed', { exact: true }).selectOption('9');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(step).toBeDisabled({ timeout: 40000 });
  await expect(workbench).toHaveAttribute('data-ready', 'P1');
  await expect(workbench).toHaveAttribute('data-completed', 'P2');
  await expect(output).toContainText('[P1 · 3 ms]');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'laptop') {
    const left = await page.locator('.rr-left').boundingBox();
    const right = await page.locator('.rr-right').boundingBox();
    expect(left.width / (left.width + right.width)).toBeGreaterThan(.30);
    expect(left.width / (left.width + right.width)).toBeLessThan(.38);
    expect(right.x).toBeGreaterThan(left.x + left.width);
  }
});

test('round robin process identities animate between Ready, CPU, and Completed in offline file mode', async ({ page }) => {
  test.setTimeout(60000);
  const { pathToFileURL } = require('url');
  await page.context().setOffline(true);
  await page.goto(`${pathToFileURL(path.resolve(__dirname, '..', 'visualizer.html')).href}?activity=queue-round-robin`);
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('on');
  await page.getByLabel('Speed', { exact: true }).selectOption('3');
  await page.getByLabel('Playback settings', { exact: true }).click();
  const seek = async (index) => {
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByLabel('Timeline step', { exact: true }).fill(String(index));
    await page.getByLabel('Playback settings', { exact: true }).click();
  };
  const movement = async (id, from, to, index) => {
    await seek(index);
    const card = page.locator(`[data-process-id="${id}"]`);
    await expect(card).toHaveAttribute('data-location', from);
    const before = await card.boundingBox();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(card).toHaveAttribute('data-location', to);
    await expect.poll(async () => {
      const after = await card.boundingBox();
      return Math.hypot(after.x - before.x, after.y - before.y);
    }, { timeout: 2500 }).toBeGreaterThan(15);
  };
  await movement('P1', 'MOVING', 'CPU', 6);
  await movement('P1', 'MOVING', 'READY', 22);
  await movement('P2', 'MOVING', 'CPU', 27);
  await movement('P2', 'CPU', 'COMPLETED', 40);
});

test('visualizer workspaces choose a structure-aware desktop composition', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=stack-lifo-basics&preview=1');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-workspace-composition', 'stack-execution');
  if (testInfo.project.name === 'laptop') {
    const stackPanels = await page.locator('.stack-execution-workbench').evaluate((workbench) => {
      const source = workbench.querySelector('.stack-source-panel').getBoundingClientRect();
      const visual = workbench.querySelector('.stack-execution-right').getBoundingClientRect();
      return { sourceTop: source.top, visualTop: visual.top, sourceRight: source.right, visualLeft: visual.left, ratio: source.width / (source.width + visual.width) };
    });
    expect(Math.abs(stackPanels.sourceTop - stackPanels.visualTop)).toBeLessThan(3);
    expect(stackPanels.visualLeft).toBeGreaterThan(stackPanels.sourceRight);
    expect(stackPanels.ratio).toBeGreaterThanOrEqual(.32);
    expect(stackPanels.ratio).toBeLessThanOrEqual(.36);
    const stackSections = await page.locator('.stack-execution-surface').evaluate((renderer) => {
      const operation = renderer.querySelector('.stack-execution-header').getBoundingClientRect();
      const lane = renderer.querySelector('.stack-visual').getBoundingClientRect();
      return { operationBottom: operation.bottom, laneTop: lane.top };
    });
    expect(stackSections.laneTop).toBeGreaterThanOrEqual(stackSections.operationBottom);
  }

  await page.goto('/visualizer.html?activity=queue-fifo-basics&preview=1');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-workspace-composition', 'queue-execution');
  if (testInfo.project.name === 'laptop') {
    const queuePanels = await page.locator('.queue-workbench').evaluate((workbench) => {
      const source = workbench.querySelector('.queue-left').getBoundingClientRect();
      const visual = workbench.querySelector('.queue-right').getBoundingClientRect();
      return { sourceTop: source.top, visualTop: visual.top, sourceRight: source.right, visualLeft: visual.left, ratio: source.width / (source.width + visual.width) };
    });
    expect(Math.abs(queuePanels.sourceTop - queuePanels.visualTop)).toBeLessThan(3);
    expect(queuePanels.visualLeft).toBeGreaterThan(queuePanels.sourceRight);
    expect(queuePanels.ratio).toBeGreaterThanOrEqual(.30);
    expect(queuePanels.ratio).toBeLessThanOrEqual(.34);
  }

  await page.goto('/visualizer.html?activity=tree-traversals&preview=1');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-workspace-composition', 'wide-hierarchy');
  await expect(page.locator('.concept-domain-trees')).toBeVisible();
});

test('stack execution phases stage, commit, observe, remove, assign, and return with reversible playback', async ({ page }) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/visualizer.html?activity=stack-lifo-basics');
  const workbench = page.locator('.stack-execution-workbench');
  const step = page.getByRole('button', { name: 'Step', exact: true });
  const items = page.locator('.stack-tower').getByRole('listitem');
  const runtime = page.getByRole('region', { name: 'Runtime Values', exact: true });
  const output = page.getByRole('region', { name: 'Program Output', exact: true });
  const expected = [
    [1,1,[],false,false], [2,1,[],false,false],
    [3,1,[],false,false], [3,2,[],false,false], [3,3,['A'],false,false], [3,4,['A'],false,false],
    [4,1,['A'],false,false], [4,2,['A'],false,false], [4,3,['A','B'],false,false], [4,4,['A','B'],false,false],
    [5,1,['A','B'],false,false], [5,2,['A','B'],false,false], [5,3,['A','B'],true,false], [5,4,['A','B'],true,false],
    [6,1,['A','B'],true,false], [6,2,['A'],true,false], [6,3,['A'],true,true], [6,4,['A'],true,true], [7,1,['A'],true,true],
  ];
  for (let index = 0; index < expected.length; index++) {
    const [line, phase, values, hasPeek, hasPop] = expected[index];
    if (index) await step.click();
    await expect(workbench).toHaveAttribute('data-line', String(line));
    await expect(workbench).toHaveAttribute('data-phase', String(phase));
    await expect(page.locator('.stack-source-panel .source-line.is-current > span')).toHaveText(String(line));
    await expect(page.locator('.stack-phase-stepper [aria-current="step"]')).toHaveCount(1);
    await expect(items).toHaveCount(values.length);
    for (let item = 0; item < values.length; item++) await expect(items.nth(item)).toContainText(`"${values[item]}"`);
    await expect(runtime.locator('.stack-runtime-variable').filter({ has: page.locator('code', { hasText: /^topValue$/ }) }).locator('.stack-value')).toHaveCount(hasPeek ? 1 : 0);
    await expect(runtime.locator('.stack-runtime-variable').filter({ has: page.locator('code', { hasText: /^popped$/ }) }).locator('.stack-value')).toHaveCount(hasPop ? 1 : 0);
    if (line < 7) await expect(output).toContainText('No output yet.');
    if ((line === 3 || line === 4) && phase < 3) await expect(page.locator('.stack-working-area .stack-value')).toHaveText(new RegExp(line === 3 ? 'A' : 'B'));
    if ((line === 3 || line === 4) && phase === 4) await expect(page.locator('.stack-working-area .stack-value')).toHaveCount(0);
    if (line === 6 && phase === 2) {
      await expect(page.locator('.stack-working-area')).toContainText('"B"');
      await expect(runtime).toContainText('receiving "B"');
      await expect(page.locator('.stack-new-top')).toHaveText('New top: A');
      const evidence = page.locator('.stack-evidence-details');
      await evidence.locator('summary').click();
      await evidence.getByRole('tab', { name: 'Output', exact: true }).click();
      await expect(evidence.getByLabel('Program output', { exact: true })).toHaveText('No output yet — advance to RETURN.');
      await evidence.locator('summary').click();
    }
  }
  await expect(output).toContainText('RETURN popped');
  await expect(output.locator('strong')).toHaveText('B');
  await expect(step).toBeDisabled();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(workbench).toHaveAttribute('data-line', '6');
  await expect(workbench).toHaveAttribute('data-phase', '1');
  await expect(items).toHaveCount(2);
  await expect(runtime).not.toContainText('popped');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByLabel('Speed', { exact: true }).selectOption('9');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await expect(workbench).toHaveAttribute('data-line', '1');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(workbench).toHaveAttribute('data-line', '7', { timeout: 15000 });
  await expect(output.locator('strong')).toHaveText('B');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('stack phase workspace runs in offline file mode', async ({ page }) => {
  const { pathToFileURL } = require('url');
  await page.context().setOffline(true);
  await page.goto(`${pathToFileURL(path.resolve(__dirname, '..', 'visualizer.html')).href}?activity=stack-lifo-basics`);
  await expect(page.locator('.stack-execution-workbench')).toHaveAttribute('data-line', '1');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Timeline step', { exact: true }).fill('15');
  await expect(page.locator('.stack-execution-workbench')).toHaveAttribute('data-phase', '2');
  await expect(page.getByRole('region', { name: 'Runtime Values', exact: true })).toContainText('receiving "B"');
  await expect(page.getByRole('region', { name: 'Program Output', exact: true })).toContainText('No output yet.');
});

test('postfix separates source, tokens, and phases through both operators and final return', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/visualizer.html?activity=stack-postfix-evaluator');
  const workbench = page.locator('.postfix-workbench');
  const step = page.getByRole('button', { name: 'Step', exact: true });
  const items = page.locator('.postfix-stack').getByRole('listitem');
  const output = page.getByRole('region', { name: 'Program Output', exact: true });
  const runtime = page.getByRole('region', { name: 'Runtime Values', exact: true });
  // Independent classroom trace: source/token groups and actual mutations.
  const groups = [[1,0,1]];
  for (const token of [1,2,3,4,5]) {
    groups.push([2,token,1], [3,token,1]);
    if (token === 3 || token === 5) groups.push([5,token,1], [6,token,4], [7,token,4], [8,token,4], [8,token,4]);
    else groups.push([4,token,4]);
    groups.push([9,token,1], [10,token,1]);
  }
  groups.push([11,0,4]);
  const expected = groups.flatMap(([line, token, count]) => Array.from({ length: count }, (_, phase) => [line,token,phase + 1]));
  const mutations = { 0:[], 5:['5'], 13:['5','2'], 21:['5'], 25:[], 34:['7'], 42:['7','3'], 50:['7'], 54:[], 63:['21'], 68:[] };
  const assignments = { 21:['right','2','receiving'], 22:['right','2','assigned'], 25:['left','5','receiving'], 26:['left','5','assigned'], 30:['result','7','assigned'], 50:['right','3','receiving'], 51:['right','3','assigned'], 54:['left','7','receiving'], 55:['left','7','assigned'], 59:['result','21','assigned'] };
  let values = [];
  for (let index = 0; index < expected.length; index++) {
    if (index) await step.click();
    const [line, token, phase] = expected[index];
    await expect(workbench).toHaveAttribute('data-line', String(line));
    await expect(workbench).toHaveAttribute('data-token', String(token));
    await expect(workbench).toHaveAttribute('data-phase', String(phase));
    await expect(page.locator('.postfix-source .source-line.is-current > span')).toHaveText(String(line));
    await expect(page.locator('.postfix-operation [aria-current="step"]')).toHaveCount(1);
    if (mutations[index]) values = mutations[index];
    await expect(items).toHaveCount(values.length);
    for (let item = 0; item < values.length; item++) await expect(items.nth(item)).toHaveText(values[item]);
    if (index < 69) await expect(output).toHaveText(/No output yet/);
    else await expect(output.locator('.postfix-value')).toHaveText('21');
    if (assignments[index]) {
      const [variable,value,status] = assignments[index];
      await expect(runtime.locator(`[data-runtime="${variable}"]`)).toHaveClass(`is-${status}`);
      await expect(runtime.locator(`[data-runtime="${variable}"] .postfix-value`)).toHaveText(value);
    }
    if ([3,11,40].includes(index)) await expect(page.locator('.postfix-staging .postfix-value')).toHaveCount(1);
    if ([4,12,33,41,62].includes(index)) await expect(page.locator('.postfix-pending')).toHaveCount(1);
    if ([6,14,35,43,64].includes(index)) await expect(page.locator('.postfix-tokens li.is-processed')).toHaveCount(token);
    if (line === 6) await expect(page.locator('.postfix-operation')).toContainText('right operand first');
    if (line === 7) await expect(page.locator('.postfix-operation')).toContainText('left operand second');
  }
  await expect(step).toBeDisabled();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Previous', exact: true }).click();
  await expect(items).toHaveText(['21']);
  await expect(output).toContainText('No output yet');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Timeline step', { exact: true }).fill('20');
  await expect(items).toHaveText(['5','2']);
  await expect(runtime.locator('[data-runtime="right"]')).toHaveClass('is-unassigned');
  await page.getByRole('button', { name: 'Restart', exact: true }).click();
  await page.getByLabel('Speed', { exact: true }).selectOption('9');
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await workbench.getAttribute('data-operation');
  await page.waitForTimeout(350);
  await expect(workbench).toHaveAttribute('data-operation', paused);
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(step).toBeDisabled({ timeout: 35000 });
  await expect(output.locator('.postfix-value')).toHaveText('21');
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  if (testInfo.project.name === 'laptop') {
    const left = await page.locator('.postfix-left').boundingBox(), right = await page.locator('.postfix-right').boundingBox();
    expect(left.width / (left.width + right.width)).toBeGreaterThanOrEqual(.35);
    expect(left.width / (left.width + right.width)).toBeLessThanOrEqual(.38);
    expect(right.x).toBeGreaterThan(left.x + left.width);
  }
});

test('postfix phases animate real values and run from offline file URLs', async ({ page }) => {
  const { pathToFileURL } = require('url');
  await page.context().setOffline(true);
  await page.goto(`${pathToFileURL(path.resolve(__dirname, '..', 'visualizer.html')).href}?activity=stack-postfix-evaluator`);
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('on');
  await page.getByLabel('Speed', { exact: true }).selectOption('3');
  await page.getByLabel('Timeline step', { exact: true }).fill('3');
  await page.getByLabel('Playback settings', { exact: true }).click();
  const value = page.locator('[data-value-id="token-0"]');
  const before = await value.boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.postfix-pending')).toBeVisible();
  await expect.poll(async () => value.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
  await expect.poll(async () => Math.abs((await value.boundingBox()).x - before.x), { timeout: 2500 }).toBeGreaterThan(50);
  for (const [index, selector] of [[20, '[data-runtime="right"] .postfix-value'], [67, '.postfix-staging .postfix-value'], [68, '.postfix-output .postfix-value']]) {
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByLabel('Timeline step', { exact: true }).fill(String(index));
    await page.getByLabel('Playback settings', { exact: true }).click();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    const moving = page.locator(selector);
    await expect(moving).toHaveCount(1);
    await expect.poll(() => moving.evaluate(element => getComputedStyle(element).transform)).not.toBe('none');
    await expect.poll(() => moving.evaluate(element => getComputedStyle(element).transform)).toBe('none');
  }
  await page.getByLabel('Playback settings', { exact: true }).click();
  await page.getByLabel('Motion preference', { exact: true }).selectOption('off');
  await page.getByLabel('Timeline step', { exact: true }).fill('70');
  await expect(page.getByRole('region', { name: 'Program Output', exact: true }).locator('.postfix-value')).toHaveText('21');
});

test('deque foundation names both ends and changes state line by line', async ({ page }) => {
  await page.goto('/visualizer.html?activity=deque-end-operations');
  await expect(page.getByRole('heading', { name: 'Use both ends of a deque' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Practice this module' })).toHaveAttribute('href', /problem-list\.html\?module=4$/);
  await expect(page.locator('.linear-end-label.end-front')).toContainText('front');
  await expect(page.locator('.linear-end-label.end-back')).toContainText('back');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.linear-item')).toContainText('A');
  await expect(page.locator('.source-line.is-current')).toContainText('ADD_BACK deque, A');
});

test('public release opens the six-problem Module 3 practice bank', async ({ page }, testInfo) => {
  await page.goto('/problem-list.html?module=3');
  await expect(page.locator('.problem-choice')).toHaveCount(6);
  await page.locator('.problem-choice-action').first().click();
  await expect(page.getByRole('heading', { name: /Count Reachable Linked Nodes/i })).toBeVisible();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByLabel('Problem solution pseudocode')).toBeVisible();
  await expect(page.locator('#p-statement')).not.toBeEmpty();
});

test('public Module 3 opens all linked practice and mutation visualizations', async ({ page }) => {
  await page.goto('/problem-list.html?module=3');
  await expect(page.locator('.problem-choice')).toHaveCount(6);
  await expect(page.locator('.problem-choice-available')).toHaveCount(6);
  await expect(page.locator('.problem-choice-locked')).toHaveCount(0);
  for (const [problemId, title] of [['linked-node-count', /Count Reachable Linked Nodes/i], ['linked-find-value', /Lookup and Update a Node/i]]) {
    await page.goto(`/practice.html?module=3&problem=${problemId}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    if ((await page.viewportSize()).width <= 620) await page.getByRole('tab', { name: 'Code' }).click();
    await page.getByRole('button', { name: 'Run Checks' }).click();
    await expect(page.locator('#results-body .case')).not.toHaveCount(0);
    await expect(page.locator('#results-body .hidden-pill')).not.toHaveCount(0);
  }

  await page.goto('/visualizer.html?activity=linked-list-traversal');
  await expect(page.getByRole('heading', { name: 'Traverse a singly linked list' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit pseudocode' })).toHaveAttribute('href', 'tracer.html?activity=linked-list-traversal');
  await page.goto('/visualizer.html?activity=linked-list-insert-head');
  await expect(page.getByRole('heading', { name: 'Insert at the head' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  await expect(page.locator('.curriculum-lock')).toHaveCount(0);
});

test('legacy checkpoint-guide routes redirect to module practice without companion content', async ({ page }) => {
  await page.goto('/lesson.html?checkpoint=m2-binary-search&preview=1');
  await expect(page).toHaveURL(/problem-list\.html\?module=2&preview=1$/);
  await expect(page.getByRole('heading', { name: /Arrays, Lists, Searching, and Sorting: select a problem/ })).toBeVisible();
  await expect(page.locator('.lesson-companion, .companion-mental, .companion-trace, .lesson-sequence')).toHaveCount(0);
});

test('practice contract changes preserve the old draft and clear only that completion', async ({ page }, testInfo) => {
  const earlierDraft = 'READ n\nWRITE n';
  await page.addInitScript((draft) => localStorage.setItem('itcc47.practice-records:v2', JSON.stringify({
    schemaVersion: 2,
    records: {
      'linked-node-count': { contentVersion: 1, draft, completed: true },
      'linked-find-value': { contentVersion: 2, draft: 'READ target\nWRITE -1', completed: true },
    },
    recovery: {},
  })), earlierDraft);
  await page.goto('/practice.html?module=3&problem=linked-node-count&preview=1');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByLabel('Problem solution pseudocode')).not.toHaveValue(earlierDraft);
  await expect(page.locator('#draft-recovery')).toContainText('Recover an earlier draft (1)');
  await expect(page.locator('#progress-line')).toContainText('1 of 6 solved');
  await page.locator('#draft-recovery summary').click();
  await page.getByRole('button', { name: 'Restore this draft for editing' }).click();
  await expect(page.getByLabel('Problem solution pseudocode')).toHaveValue(earlierDraft);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc47.practice-records:v2')));
  expect(stored.records['linked-node-count'].completed).toBe(false);
  expect(stored.records['linked-find-value'].completed).toBe(true);
});

test('Explore the Tools performs a guided transition and moves focus', async ({ page }) => {
  await page.goto('/itcc47.html');
  await page.getByRole('link', { name: 'Explore the Tools' }).click();
  await expect(page).toHaveURL(/#tools$/);
  await expect(page.getByRole('heading', { name: 'Open a tool' })).toBeFocused();
});

test('subject chooser routes to both course homes', async ({ page }) => {
  await page.goto('/index.html');
  await expect(page.getByRole('heading', { name: 'Choose a subject and start exploring.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open ITCC45/ })).toHaveAttribute('href', 'itcc45.html');
  await expect(page.getByRole('link', { name: /Open ITCC47/ })).toHaveAttribute('href', 'itcc47.html');
  await page.getByRole('link', { name: /Open ITCC45/ }).click();
  await expect(page).toHaveURL(/itcc45\.html$/);
  await expect(page.getByRole('heading', { name: /See what Python objects are doing/ })).toBeVisible();
});

test('ITCC45 exposes six ordered topics with three audited examples each', async ({ page }) => {
  await page.goto('/itcc45-topics.html');
  await expect(page.getByRole('heading', { name: 'Build object-oriented thinking step by step.' })).toBeVisible();
  await expect(page.locator('.oop-topic-group')).toHaveCount(6);
  await expect(page.locator('.oop-topic-group h2')).toHaveText(['Classes', 'Objects', 'Encapsulation', 'Inheritance', 'Class Abstraction', 'Polymorphism']);
  await expect(page.locator('.oop-example-card')).toHaveCount(18);
  for (const group of await page.locator('.oop-topic-group').all()) {
    await expect(group.locator('.oop-example-card')).toHaveCount(3);
    await expect(group.getByRole('link', { name: 'Practice 3 tasks' })).toHaveCount(1);
  }
  await page.getByRole('link', { name: 'Open example' }).first().click();
  await expect(page).toHaveURL(/visualizer\.html\?course=itcc45&activity=itcc45-classes-blueprint$/);
});

test('ITCC45 lab identifies and navigates examples within a topic', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await expect(page.getByText('Topic 1 / Classes / Example 1 of 3')).toBeVisible();
  await expect(page.getByText('Read a class as a blueprint and follow self through initialization.')).toBeVisible();
  await page.getByRole('link', { name: /Next example:/ }).click();
  await expect(page).toHaveURL(/activity=itcc45-classes-instance-shadowing/);
  await expect(page.getByText('Topic 1 / Classes / Example 2 of 3')).toBeVisible();
  await expect(page.getByRole('link', { name: /Previous example:/ })).toBeVisible();
});

test('ITCC45 attempt and repair phases stay synchronized with source and output', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-shared-mutable');
  await expect(page.getByText('Attempt', { exact: true }).first()).toBeVisible();
  const slider = page.locator('#step-slider');
  await slider.fill('4');
  await expect(page.getByText('Repair', { exact: true }).first()).toBeVisible();
  await expect(page.getByLabel('Rendered program output')).toContainText('shared second: Notebook');
  await slider.fill('5');
  await expect(page.getByLabel('Rendered program output')).toContainText('fixed second: empty');
  await expect(page.getByLabel('Concept evidence')).toContainText('Per-instance owner');
});

test('Classes source and rendered output advance together through both print statements', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  const slider = page.locator('#step-slider');
  await slider.fill('7');
  await expect(page.locator('.source-line.is-current')).toContainText('print(Student.school)');
  await expect(page.getByLabel('Rendered program output')).toContainText('CMU');
  await expect(page.getByLabel('Rendered program output')).not.toContainText('Ana studies BSIT');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('.source-line.is-current')).toContainText('print(student.describe())');
  await expect(page.getByLabel('Rendered program output')).toContainText('Ana studies BSIT');
});

test('Classes model grows members and fields with semantic change labels', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  const slider = page.locator('#step-slider');
  const studentClass = page.locator('[data-class-id="class:Student"]');
  await expect(studentClass).toBeVisible();
  await expect(studentClass.locator('.object-class-member')).toHaveCount(0);
  await slider.fill('1');
  await expect(studentClass.locator('.member-attribute')).toContainText('school = "CMU"');
  await slider.fill('3');
  await expect(studentClass.locator('.member-method')).toHaveCount(2);
  await slider.fill('4');
  const studentObject = page.locator('[data-object-id="student:1"]');
  await expect(studentObject).toBeVisible();
  await expect(studentObject.locator('[data-field-name]')).toHaveCount(0);
  await slider.fill('5');
  await expect(studentObject.locator('[data-field-name="name"]')).toContainText('new');
  await slider.fill('6');
  await expect(studentObject.locator('[data-field-name="program"]')).toContainText('new');
  await expect(studentObject.locator('[data-field-name="name"]')).not.toContainText('new');
});

test('ITCC45 Motion animates blueprint growth, object creation, and field updates', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await page.getByLabel('Motion preference').selectOption('on');
  await installITCC45MotionProbe(page);
  const slider = page.locator('#step-slider');
  const step = page.getByRole('button', { name: 'Step', exact: true });

  await step.click();
  const schoolMember = page.locator('[data-class-id="class:Student"] .member-attribute');
  await expect(schoolMember).toBeVisible();
  await expectRecordedMotion(page, 'member', 'school = "CMU"');

  await expect(step).toBeEnabled({ timeout: 1600 });
  await slider.fill('3');
  await page.evaluate(() => { window.__itcc45MotionSamples = []; });
  await step.click();
  const studentObject = page.locator('[data-object-id="student:1"]');
  await expect(studentObject).toBeVisible();
  await expectRecordedMotion(page, 'object', 'student:1');

  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-encapsulation-property');
  await page.getByRole('button', { name: 'Edit scenario' }).click();
  await page.getByLabel('Proposed score').fill('92');
  await page.getByRole('button', { name: 'Apply scenario' }).click();
  const encapsulationSlider = page.locator('#step-slider');
  await encapsulationSlider.fill('2');
  const scoreField = page.locator('[data-object-id="record:1"] [data-field-name="_score"]');
  await expect(scoreField.locator('code')).toHaveText('88');
  await installITCC45MotionProbe(page);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expectRecordedMotion(page, 'field', '92');
  await expect(scoreField).toContainText('updated');
});

test('Python Object Lab synchronizes source, object state, lookup, output, and editable inputs', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await expect(page.getByRole('heading', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page.getByLabel('Python source')).toContainText('class Student');
  await expect(page.getByLabel('Rendered program output')).toContainText('No output yet');
  await page.getByRole('button', { name: 'Edit scenario' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit scenario' })).toBeVisible();
  await page.getByLabel('Student name').fill('Lia');
  await page.getByRole('button', { name: 'Apply scenario' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit scenario' })).toBeHidden();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Visualize' }).click();
  await expect(page.locator('.object-instance-card')).toContainText('Lia');
  await expect(page.getByLabel('Rendered program output')).toContainText('Lia studies BSIT');
  await expect(page.locator('.visual-canvas .object-canvas')).toHaveCSS('overflow-y', 'auto');
  await page.getByRole('button', { name: 'Expand model' }).click();
  await expect(page.getByRole('dialog', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page.getByRole('dialog', { name: /Classes: turn a blueprint/ }).getByLabel('Class blueprints')).toContainText('Student');
  await page.getByRole('button', { name: 'Close full model view' }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Call path' }).click();
  await expect(page.locator('.evidence-drawer:visible')).toContainText('Student.describe');
  await page.getByRole('tab', { name: 'Output' }).click();
  await expect(page.locator('.evidence-drawer:visible pre')).toContainText('Lia studies BSIT');
  if (testInfo.project.name !== 'phone') {
    await page.getByRole('button', { name: 'Copy Python' }).click();
    await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  }
});

test('ITCC45 desktop workspace resizes, focuses panels, and preserves playback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  const stage = page.locator('.itcc45-lab-stage');
  const separator = page.getByRole('separator', { name: 'Resize code and model panels' });
  await expect(separator).toHaveAttribute('aria-valuenow', '40');
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  await expect(separator).toHaveAttribute('aria-valuenow', '45');

  const bounds = await stage.boundingBox();
  await separator.hover();
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.5, bounds.y + bounds.height * 0.5);
  await page.mouse.up();
  await expect(separator).toHaveAttribute('aria-valuenow', '50');

  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  const finalStep = await slider.inputValue();
  await page.getByRole('button', { name: 'Focus source' }).click();
  await expect(stage).toHaveClass(/focus-source/);
  await expect(page.locator('#itcc45-model-pane')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(stage).toHaveClass(/focus-split/);
  await page.getByRole('button', { name: 'Focus model' }).click();
  await expect(stage).toHaveClass(/focus-model/);
  await page.getByRole('button', { name: 'Exit model focus' }).click();
  await expect(slider).toHaveValue(finalStep);
  await expect(page.getByLabel('Rendered program output')).toContainText('Ana studies BSIT');
  await page.getByRole('button', { name: 'Expand output' }).click();
  await expect(page.getByLabel('Rendered program output').locator('pre')).toContainText('CMU');
});

test('ITCC45 source fills the lab stage at short desktop heights', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.setViewportSize({ width: 1600, height: 520 });
  const url = process.platform === 'win32'
    ? `file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=itcc45&activity=itcc45-classes-blueprint`
    : '/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint';
  await page.goto(url);

  const geometry = await page.evaluate(() => {
    const sourcePane = document.querySelector('.itcc45-source-pane');
    const sourcePanel = sourcePane?.querySelector('.source-panel');
    const modelPane = document.querySelector('.itcc45-model-pane');
    if (!sourcePane || !sourcePanel || !modelPane) return null;
    const sourcePaneRect = sourcePane.getBoundingClientRect();
    const sourcePanelRect = sourcePanel.getBoundingClientRect();
    const modelPaneRect = modelPane.getBoundingClientRect();
    return {
      sourcePaneHeight: sourcePaneRect.height,
      sourcePanelHeight: sourcePanelRect.height,
      modelPaneHeight: modelPaneRect.height,
      sourceClientHeight: sourcePanel.clientHeight,
      sourceScrollHeight: sourcePanel.scrollHeight,
      sourceMaxHeight: getComputedStyle(sourcePanel).maxHeight,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry.sourceMaxHeight).toBe('none');
  expect(Math.abs(geometry.sourcePaneHeight - geometry.modelPaneHeight)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.sourcePanelHeight - geometry.sourcePaneHeight)).toBeLessThanOrEqual(1);
  expect(geometry.sourceScrollHeight).toBeGreaterThan(geometry.sourceClientHeight);
});

test('ITCC45 evidence rail uses adaptive defaults and remembers learner choice', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/visualizer.html?course=itcc45&activity=itcc45-classes-blueprint');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  await expect(page.getByLabel('Collapsed learning evidence')).toBeVisible();
  await page.getByRole('tab', { name: 'Object state' }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
  await expect(page.getByRole('tab', { name: 'Object state' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Collapse learning evidence' }).click();
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  await page.getByRole('button', { name: 'Expand learning evidence' }).click();
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc45.workspace-layout:v1')));
  expect(saved).toEqual({ version: 1, evidence: 'expanded', sourceRatio: 0.4 });

  await page.evaluate(() => localStorage.removeItem('itcc45.workspace-layout:v1'));
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

  await page.setViewportSize({ width: 1600, height: 900 });
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
});

test('ITCC45 topics use distinct real-world scenarios', async ({ page }) => {
  const scenarios = [
    ['itcc45-object-state', 'class LibraryBook', /track two library books/],
    ['itcc45-encapsulation-property', 'class GradeRecord', /protect a valid score/],
    ['itcc45-inheritance-lookup', 'class Delivery', /calculate an express delivery/],
    ['itcc45-abstraction-contract', 'class PaymentMethod', /require a payment contract/],
    ['itcc45-polymorphic-dispatch', 'class EmailNotification', /send one alert two ways/],
  ];
  for (const [activity, source, title] of scenarios) {
    await page.goto(`/visualizer.html?course=itcc45&activity=${activity}`);
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
    await expect(page.getByLabel('Python source')).toContainText(source);
  }
});

test('every retained ITCC45 example route renders a deterministic source and model', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/itcc45-topics.html');
  const links = await page.locator('.oop-example-link').evaluateAll((items) => items.map((item) => item.getAttribute('href')));
  expect(links).toHaveLength(18);
  for (const href of links) {
    await page.goto(`/${href}`);
    await expect(page.getByLabel('Python source')).toContainText('class');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByLabel(/visualization canvas/)).toBeVisible();
  }
});

test('ITCC45 practice gives rationale and persists only solved progress', async ({ page }) => {
  await page.goto('/itcc45-practice.html?topic=classes');
  await page.evaluate(() => localStorage.removeItem('itcc45.practice:v1'));
  await page.reload();
  await page.getByLabel('CMU').check();
  await page.getByRole('button', { name: 'Check answer' }).click();
  await expect(page.getByRole('status')).toContainText('That reasoning holds.');
  await expect(page.locator('#practice-progress-count')).toHaveText('1 / 18 complete');
  await page.reload();
  await expect(page.locator('#practice-progress-count')).toHaveText('1 / 18 complete');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('itcc45.practice:v1')));
  expect(Object.keys(stored).sort()).toEqual(['contentVersion', 'solvedIds']);
});

test('mismatched ITCC45 activity falls back and normalizes the URL', async ({ page }) => {
  await page.goto('/visualizer.html?course=itcc45&activity=bubble-sort');
  await expect(page.getByRole('heading', { name: /Classes: turn a blueprint/ })).toBeVisible();
  await expect(page).toHaveURL(/course=itcc45&activity=itcc45-classes-blueprint/);
});

test('Visualize opens the canonical Modules visualization catalog', async ({ page }) => {
  await page.goto('/itcc47.html');
  await page.getByRole('link', { name: /Visualize an algorithm/ }).click();
  await expect(page).toHaveURL(/problems\.html\?view=visualizations$/);
  await expect(page.getByRole('tab', { name: 'Visualizations' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.visualization-card')).toHaveCount(35);
  await expect(page.locator('.industry-catalog-feature')).toBeHidden();
  await expect(page.locator('#visualizer-root')).toHaveCount(0);
  await expect(page.locator('.visualizer-workspace')).toHaveCount(0);
  await page.getByRole('link', { name: /Selection Sort/ }).click();
  await expect(page).toHaveURL(/visualizer\.html\?activity=selection-sort$/);
  await expect(page.getByRole('heading', { name: 'Selection Sort' })).toBeVisible();
});

test('sorting can step, play, pause, and scrub backward', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  const slider = await visualizerTimeline(page);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(slider).toHaveValue('1');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  await page.getByRole('button', { name: 'Pause' }).click();
  await slider.fill('0');
  await expect(slider).toHaveValue('0');
});

test('binary search explains its sorted copy before searching', async ({ page }) => {
  await page.goto('/visualizer.html?activity=binary-search&preview=1');
  await expect(page.locator('#result-caption')).toContainText('Set target');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#result-caption')).toContainText('sorted copy');
  await expect(page.locator('.source-line.is-current')).toContainText('values <- sorted copy');
});

test('every curated array algorithm exposes its real loop line and boundary', async ({ page }, testInfo) => {
  const cases = [
    ['bubble-sort', 1, 'FOR end <- n - 1 DOWNTO 1 DO', 'unsorted range'],
    ['selection-sort', 1, 'FOR i <- 0 TO n - 2 DO', 'search range'],
    ['insertion-sort', 1, 'FOR i <- 1 TO n - 1 DO', 'sorted insertion range'],
    ['linear-search', 2, 'FOR i <- 0 TO n - 1 DO', null],
    ['binary-search', 4, 'WHILE low <= high DO', 'search range'],
  ];
  for (const [activity, steps, sourceLine, boundaryLabel] of cases) {
    await page.goto(`/visualizer.html?activity=${activity}&preview=1`);
    await (await visualizerMotion(page)).selectOption('off');
    for (let step = 0; step < steps; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
    if (boundaryLabel) await expect(page.locator('.array-loop-boundary')).toContainText(boundaryLabel);
    if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
    await expect(page.locator('.source-line.is-current')).toContainText(sourceLine);
  }
});

const teachingShellCases = [
  ['bubble-sort', 4, 'Adjacent comparison', ['values[j]', 'values[j + 1]']],
  ['selection-sort', 4, 'Current selection', ['minIndex', 'values[j]']],
  ['insertion-sort', 4, 'Insertion state', ['key', 'values[j]']],
  ['linear-search', 3, 'Current scan', ['target', 'values[i]']],
  ['binary-search', 6, 'Search window', ['target', 'low', 'mid', 'high']],
  ['array-list-insert', 4, 'Insertion shift', ['value', 'shift from', 'shift to']],
  ['array-list-remove', 3, 'Removal shift', ['removed', 'shift from', 'shift to']],
  ['linked-list-traversal', 4, 'Traversal pointer', ['current']],
  ['linked-list-insert-head', 2, 'Head pointer update', ['newNode']],
];
for (const [activity, steps, title, labels] of teachingShellCases) {
  test(`${activity} exposes its focused teaching shell`, async ({ page }) => {
    await page.goto(`/visualizer.html?activity=${activity}&preview=1`);
    await (await visualizerMotion(page)).selectOption('off');
    for (let step = 0; step < steps; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
    const teaching = page.locator('.teaching-strip');
    await expect(teaching.getByRole('heading', { name: title })).toBeVisible();
    for (const label of labels) await expect(teaching.getByText(label, { exact: true })).toBeVisible();
  });
}

test('ITCC47 integrates playback and remembers the evidence rail', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=selection-sort&preview=1');
  await expect(page.locator('.playback-dock')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();
  if (testInfo.project.name === 'phone') {
    await expect(page.locator('.integrated-playback')).toHaveCSS('position', 'sticky');
    await expect(page.locator('.desktop-evidence, .mobile-evidence, .trace-item')).toHaveCount(0);
    await page.getByRole('tab', { name: 'Code' }).click();
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.locator('#result-caption')).toContainText('Set i to 0');
    return;
  }
  await expect(page.locator('.desktop-evidence')).toHaveCount(1);
  await expect(page.locator('.mobile-evidence')).toHaveCount(0);
  expect(await page.locator('.trace-item').count()).toBeLessThanOrEqual(80);
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  await page.getByRole('button', { name: 'Expand learning evidence' }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
  await page.getByRole('button', { name: 'Collapse learning evidence' }).click();
  const split = await page.evaluate(() => {
    const code = document.querySelector('.desktop-source').getBoundingClientRect();
    const visual = document.querySelector('.itcc47-visual-shell').getBoundingClientRect();
    return { code, visual, scrollbar: getComputedStyle(document.querySelector('.source-panel')).scrollbarWidth };
  });
  expect(Math.abs(split.code.y - split.visual.y)).toBeLessThan(2);
  expect(split.visual.x).toBeGreaterThan(split.code.x + split.code.width);
  expect(split.scrollbar).toBe('thin');
  await page.reload();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);
  await page.getByRole('tab', { name: 'Variables' }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
});

test('array-list removal shows setup, loop entry, and the target to remove', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=array-list-remove&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  await expect(page.locator('.source-line.is-current')).toContainText('index <- 1');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-marker')).toContainText('remove here');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-loop-boundary')).toContainText('shift boundary: i = 1');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('FOR i <- index TO size - 2 DO');
});

test('custom signed data is rendered and oversized data is rejected inline', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  const controls = page.getByText('Data and inputs', { exact: true });
  if (!(await page.locator('.data-controls').evaluate((element) => element.open))) await controls.click();
  const input = page.getByLabel('Custom values (comma-separated)');
  await input.fill('-8, -2, 0, 5');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('.array-cell')).toHaveCount(4);
  await expect(page.locator('.array-cell').nth(0)).toContainText('-8');
  await expect(page.locator('.array-cell').nth(2)).toContainText('0');
  await input.fill(Array.from({ length: 19 }, (_, i) => i).join(','));
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('#data-error')).toContainText('at most 18 values');
});

test('array-list activity synchronizes source, structure, trace, and metrics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=array-list-insert&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  await expect(page.getByRole('heading', { name: 'Insert at an index' })).toBeVisible();
  await expect(page.locator('.source-line code').nth(0)).toContainText('index <- 2');
  await expect(page.locator('.source-line code').nth(1)).toContainText('value <- 24');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(await visualizerTimeline(page)).toHaveValue('1');
  await expect(page.locator('.source-line.is-current')).toContainText('value <- 24');
  await expect(page.locator('.array-held-value strong')).toHaveText('24');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('size <- size + 1');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('FOR i <- size - 2');
  await expect(page.locator('.array-loop-boundary')).toContainText('index 2 … i = 3');
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(page.locator('.source-line.is-current')).toContainText('values[i + 1] <- values[i]');
  await expect(page.locator('.array-cell.bar-move')).toHaveCount(1);
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Operations' }).click();
  const visibleEvidence = page.locator('.evidence-drawer:visible');
  await expect(visibleEvidence.locator('.metric-summary')).toContainText('Moves');
  await expect(visibleEvidence.locator('.metric-summary')).toContainText('1');
  await visibleEvidence.getByRole('button', { name: 'Primitive model' }).click();
  await expect(visibleEvidence.getByText('These algorithm metrics are never added to it.')).toBeVisible();
});

test('insertion shifts stage one held entity and one explicit hole without visual overwrite', async ({ page }) => {
  await page.goto('/visualizer.html?activity=insertion-sort&preview=1');
  const slider = await visualizerTimeline(page);
  await slider.fill('5');
  await expect(page.locator('.array-held-value strong')).toHaveText('17');
  await expect(page.locator('.array-held-value')).toHaveAttribute('aria-label', 'Held insertion value 17');
  await expect(page.locator('[data-entity-id="item:0"]')).toContainText('42');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
  const geometry = await page.evaluate(() => {
    const indices = [...document.querySelectorAll('.array-index')].map((node) => node.getBoundingClientRect().bottom);
    const connector = document.querySelector('.array-connector').getBoundingClientRect();
    return { lowestIndex: Math.max(...indices), connectorTop: connector.top };
  });
  expect(geometry.connectorTop).toBeGreaterThan(geometry.lowestIndex + 8);
  await slider.fill('11');
  await expect(page.locator('.array-held-value strong')).toHaveText('8');
  await expect(page.locator('.array-cell-slot.is-empty')).toHaveCount(1);
});

test('scope lines anchor to their slots while the legend stays in an accessible disclosure', async ({ page }) => {
  await page.goto('/visualizer.html?activity=array-list-insert&preview=1');
  await (await visualizerMotion(page)).selectOption('off');
  await (await visualizerTimeline(page)).fill('4');

  const legend = page.locator('.visualization-legend');
  const legendSummary = legend.locator('summary');
  await expect(legendSummary).toBeVisible();
  await expect(legend).not.toHaveAttribute('open', '');
  await expect(page.locator('.array-legend')).toHaveCount(0);

  const geometry = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.array-item')].map((node) => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left, right: rect.right, center: rect.left + rect.width / 2 };
    });
    const box = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
    };
    const boundary = box('.array-loop-boundary');
    const route = box('.array-connector-route');
    const summary = box('.visualization-legend > summary');
    const connector = box('.array-connector');
    const intersectionArea = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
      * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const canvas = box('.visual-canvas');
    return {
      boundaryStartError: boundary.left - (items[2].left + 6),
      boundaryEndError: boundary.right - (items[3].right - 6),
      routeStartError: route.left - items[3].center,
      routeEndError: route.right - items[4].center,
      connectorLegendOverlap: intersectionArea(connector, summary),
      legendVisibleInCanvas: summary.left >= canvas.left && summary.right <= canvas.right,
      pageOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
    };
  });
  expect(Math.abs(geometry.boundaryStartError)).toBeLessThan(0.75);
  expect(Math.abs(geometry.boundaryEndError)).toBeLessThan(0.75);
  expect(Math.abs(geometry.routeStartError)).toBeLessThan(0.75);
  expect(Math.abs(geometry.routeEndError)).toBeLessThan(0.75);
  expect(geometry.connectorLegendOverlap).toBe(0);
  expect(geometry.legendVisibleInCanvas).toBe(true);
  expect(geometry.pageOverflow).toBe(false);

  await legendSummary.focus();
  await page.keyboard.press('Enter');
  await expect(legend).toHaveAttribute('open', '');
  await expect(legend.locator('.visualization-legend-panel')).toContainText('Loop / search scope');
  await page.keyboard.press('Enter');
  await expect(legend).not.toHaveAttribute('open', '');

  await page.goto('/visualizer.html?activity=linked-list-traversal&preview=1');
  const linkedLegend = page.locator('.visualization-legend');
  await expect(linkedLegend.locator('summary')).toBeVisible();
  await linkedLegend.locator('summary').click();
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Head');
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Current');
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Visited');
  await expect(linkedLegend.locator('.visualization-legend-panel')).toContainText('Pointer write');
});

test('Motion swaps stable entities and gates rapid structural steps', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  const slider = await visualizerTimeline(page);
  await slider.fill('4');
  const before = await page.locator('[data-entity-id="item:0"]').boundingBox();
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeDisabled();
  await expect(slider).toHaveValue('5');
  const during = await page.locator('[data-entity-id="item:0"]').boundingBox();
  expect(during.x).toBeGreaterThan(before.x);
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeEnabled({ timeout: 1200 });
  await expect(slider).toHaveValue('5');
});

test('array-list shifts identify the moving value and its exact destination', async ({ page }) => {
  await page.goto('/visualizer.html?activity=array-list-insert&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  for (let step = 0; step < 4; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-connector span')).toHaveText('shift 12: [3] → [4]');
  await expect(page.locator('[data-motion-role="moving"]')).toHaveAttribute('data-entity-id', 'item:3');
  await expect(page.locator('.array-held-value strong')).toHaveText('24');

  await page.goto('/visualizer.html?activity=array-list-remove&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  for (let step = 0; step < 3; step += 1) await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.array-connector span')).toHaveText('shift 31: [2] → [1]');
  await expect(page.locator('[data-motion-role="moving"]')).toHaveAttribute('data-entity-id', 'item:2');
  await expect(page.locator('.array-connector')).toHaveClass(/moves-left/);
});

test('Motion duration follows speed while direct seeking stays immediate', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await (await visualizerMotion(page)).selectOption('on');
  const speed = await visualizerSpeed(page);
  await speed.selectOption('3');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.8');
  await speed.selectOption('6');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.52');
  await speed.selectOption('9');
  await expect(page.locator('.visualizer-workspace')).toHaveAttribute('data-motion-duration', '0.3');
  await (await visualizerTimeline(page)).fill('2');
  await expect(page.getByRole('button', { name: 'Step', exact: true })).toBeEnabled();
});

test('motion preferences persist, reduce, turn off, and reset to the device', async ({ page }) => {
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  let control = await visualizerMotion(page);
  await control.selectOption('reduced');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await page.reload();
  control = await visualizerMotion(page);
  await expect(control).toHaveValue('reduced');
  await control.selectOption('off');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-off/);
  await control.selectOption('device');
  await expect(control).toHaveValue('device');
});

test('OS reduced motion becomes the default when no override is saved', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  await context.addInitScript(({ access, preview }) => {
    localStorage.setItem('itcc47.instructor-access:v1', JSON.stringify(access));
    localStorage.setItem('itcc47.release-preview:v1', JSON.stringify(preview));
  }, { access: instructorAccessRecord, preview: instructorPreviewRecord });
  const page = await context.newPage();
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await expect(await visualizerMotion(page)).toHaveValue('device');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
  await context.close();
});

test('Recent Documents what-if controls keep one selected representation synchronized with playback', async ({ page }) => {
  await page.goto('/visualizer.html?activity=array-linked-comparison&preview=1');
  await expect(page.getByRole('heading', { name: 'Recent Documents: positions versus relationships' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review mental model' })).toHaveAttribute('href', /lesson\.html\?checkpoint=m3-linked-foundations/);
  await expect(page.getByText('Curated pseudocode activity', { exact: true })).toHaveCount(0);
  await expect(page.locator('.data-controls')).toHaveCount(0);
  const documentChoice = page.getByLabel('Document', { exact: true });
  const structureChoice = page.getByLabel('Data structure', { exact: true });
  await expect(documentChoice).toHaveValue('attendance');
  await expect(documentChoice.locator('option')).toHaveCount(5);
  await expect(structureChoice).toHaveValue('array');
  await expect(structureChoice.locator('option', { hasText: 'Python List (Dynamic Array)' })).toHaveCount(1);
  await expect(page.getByLabel('Python source')).toContainText('opened = "Attendance.xlsx"');
  await expect(page.getByLabel('Python source')).toContainText('index = recent.index(opened)');
  await expect(page.getByLabel('Python source')).toContainText('document = recent.pop(index)');
  await expect(page.getByLabel('Python source')).toContainText('recent.insert(0, document)');
  await expect(page.locator('.sequence-array-panel [data-record-id]')).toHaveCount(5);
  await expect(page.locator('.sequence-linked-panel')).toHaveCount(0);
  await expect(page.locator('.sequence-array-panel [data-record-id="doc:attendance"]')).toHaveClass(/is-opened/);
  await expect(page.locator('.sequence-scenario')).toContainText('Opened: Attendance.xlsx');
  for (const filename of ['Grades.xlsx', 'Syllabus.docx', 'Attendance.xlsx', 'Module3.pptx', 'Notes.txt']) {
    await expect(page.locator('.sequence-array-panel')).toContainText(filename);
  }

  await (await visualizerMotion(page)).selectOption('off');
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await documentChoice.selectOption('notes');
  await expect(documentChoice).toHaveValue('notes');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await expect(await visualizerTimeline(page)).toHaveValue('0');
  await expect(page.locator('.sequence-scenario')).toContainText('Opened: Notes.txt');
  await expect(page.getByLabel('Python source')).toContainText('opened = "Notes.txt"');

  let timeline = await visualizerTimeline(page);
  await timeline.fill('6');
  await expect(page.locator('.source-line.is-current')).toContainText('document = recent.pop(index)');
  await timeline.fill('7');
  await expect(page.locator('.source-line.is-current')).toContainText('document = recent.pop(index)');
  await timeline.fill(await timeline.getAttribute('max'));
  await expect(page.locator('.sequence-array-track')).toHaveAttribute('data-array-order', 'Notes.txt, Grades.xlsx, Syllabus.docx, Attendance.xlsx, Module3.pptx');
  await expect(page.locator('.sequence-array-panel > header')).toContainText(/4\s*shifts/);
  await expect(page.locator('.sequence-array-panel > header')).toContainText(/1\s*placement/);

  await structureChoice.selectOption('linked');
  await expect(structureChoice).toHaveValue('linked');
  await expect(documentChoice).toHaveValue('notes');
  await expect(page.getByLabel('Python source')).toContainText('current = find_node(head, opened)');
  await expect(page.getByLabel('Python source')).toContainText('if current.next is None:');
  await expect(page.getByLabel('Python source')).toContainText('tail = current.prev');
  await expect(page.getByLabel('Python source')).not.toContainText('class Node');
  await expect(page.locator('.sequence-array-panel')).toHaveCount(0);
  await expect(page.locator('.sequence-linked-panel [data-linked-node-id]')).toHaveCount(5);
  await expect(page.locator('.sequence-scenario')).toContainText('Opened: Notes.txt');
  await expect(await visualizerTimeline(page)).toHaveValue('0');
  timeline = await visualizerTimeline(page);
  await timeline.fill(await timeline.getAttribute('max'));
  await expect(page.locator('.sequence-linked-track')).toHaveAttribute('data-linked-order', 'Notes.txt, Grades.xlsx, Syllabus.docx, Attendance.xlsx, Module3.pptx');
  await expect(page.locator('.sequence-linked-track')).toHaveAttribute('data-head-id', 'doc:notes');
  await expect(page.locator('.sequence-linked-track')).toHaveAttribute('data-tail-id', 'doc:module3');
  await expect(page.locator('.sequence-linked-node').first()).toContainText('HEAD');
  await expect(page.locator('.sequence-linked-node').last()).toContainText('TAIL');
  await expect(page.locator('.sequence-linked-panel > header')).toContainText(/6\s*pointer writes/);
  await expect(page.locator('.sequence-caveat')).toContainText('finding Notes.txt from head still requires O(n) traversal');
  await expect(page.locator('.sequence-takeaway')).toContainText('POSITION');
  await expect(page.locator('.sequence-takeaway')).toContainText('RELATIONSHIPS');
  await expect(page.locator('.source-line.is-current')).toContainText('head = current');

  await documentChoice.selectOption('grades');
  timeline = await visualizerTimeline(page);
  await timeline.fill('5');
  await expect(page.locator('.integrated-step span')).toContainText('No detach, neighbor rewrite, or head update is necessary');
  await expect(page.locator('.sequence-linked-panel > header')).toContainText(/0\s*pointer writes/);
  await structureChoice.selectOption('array');
  timeline = await visualizerTimeline(page);
  await timeline.fill('6');
  await expect(page.locator('.integrated-step span')).toContainText('No reordering is necessary');
  await expect(page.locator('.sequence-array-panel > header')).toContainText(/0\s*shifts/);
  await expect(page.locator('.sequence-array-panel > header')).toContainText(/0\s*placements/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('Recent Documents keeps source and visualization side by side with evidence collapsed or expanded', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'phone');
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => localStorage.removeItem('itcc47.workspace-layout:v1'));
  await page.goto('/visualizer.html?activity=array-linked-comparison&preview=1');
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-collapsed/);

  async function splitGeometry() {
    return page.evaluate(() => {
      const source = document.querySelector('.desktop-source').getBoundingClientRect();
      const visual = document.querySelector('.itcc47-visual-shell').getBoundingClientRect();
      return { source: { x: source.x, y: source.y, width: source.width }, visual: { x: visual.x, y: visual.y, width: visual.width } };
    });
  }

  let split = await splitGeometry();
  expect(Math.abs(split.source.y - split.visual.y)).toBeLessThan(2);
  expect(split.visual.x).toBeGreaterThan(split.source.x + split.source.width);
  expect(split.source.width / (split.source.width + split.visual.width)).toBeGreaterThan(0.3);
  expect(split.source.width / (split.source.width + split.visual.width)).toBeLessThan(0.42);

  await page.getByRole('button', { name: 'Expand learning evidence' }).click();
  await expect(page.locator('.visualizer-workspace')).toHaveClass(/evidence-expanded/);
  split = await splitGeometry();
  expect(Math.abs(split.source.y - split.visual.y)).toBeLessThan(2);
  expect(split.visual.x).toBeGreaterThan(split.source.x + split.source.width);
  expect(split.source.width).toBeGreaterThan(220);
  expect(split.visual.width).toBeGreaterThan(360);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('linked foundations companion teaches Recent Documents and the reference progression', async ({ page }) => {
  await page.goto('/lesson.html?checkpoint=m3-linked-foundations&preview=1');
  await expect(page.getByRole('heading', { name: 'Linked storage, identity, and reachability' })).toBeVisible();
  await expect(page.locator('.companion-thesis')).toHaveText('DATA + REFERENCES = STRUCTURE');
  await expect(page.locator('.companion-code')).toContainText('recent.remove(document)');
  await expect(page.locator('.companion-code')).toContainText('simple Python-list implementation is probably the sensible choice');
  await expect(page.locator('.companion-progression li')).toHaveCount(4);
  for (const structure of ['Array', 'Linked list', 'Tree', 'Graph']) await expect(page.locator('.companion-progression')).toContainText(structure);
  await expect(page.locator('.companion-progression')).toContainText('folder structure belongs to the tree model');
  await expect(page.locator('.lesson-sequence')).toContainText('Recent Documents: positions versus relationships');
  await expect(page.locator('.lesson-sequence a[href*="array-linked-comparison"]')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
});

test('linked foundation visualizations respect reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => localStorage.removeItem('itcc47:visualizer-motion:v1'));
  for (const activity of ['linked-list-traversal', 'array-linked-comparison']) {
    await page.goto(`/visualizer.html?activity=${activity}`);
    await expect(page.locator('.visualizer-workspace')).toHaveClass(/motion-reduced/);
    await page.getByRole('button', { name: 'Step', exact: true }).click();
    await expect(page.locator('.integrated-step strong')).toHaveText(/2 \/ /);
  }
});

test('linked-list head insertion synchronizes references, links, source, and metrics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=linked-list-insert-head&preview=1');
  await expect(page.getByRole('heading', { name: 'Insert at the head' })).toBeVisible();
  const slider = await visualizerTimeline(page);
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('.linked-node')).toHaveCount(3);
  await expect(page.locator('.linked-node').first()).toContainText('24');
  await expect(page.locator('.pointer-labels').first()).toContainText('head');
  await expect(page.locator('.linked-arrow')).toHaveCount(2);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Operations' }).click();
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('Pointer writes');
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('2');
});

test('linked-list structure, head, and current pointer have distinct visual roles', async ({ page }) => {
  await page.goto('/visualizer.html?activity=linked-list-traversal&preview=1');
  await (await visualizerTimeline(page)).fill('9');
  await expect(page.locator('.linked-node-wrap.has-head')).toHaveCount(1);
  await expect(page.locator('.linked-node-wrap.is-current')).toHaveCount(1);
  await expect(page.locator('.pointer-head')).toHaveText('head');
  await expect(page.locator('.pointer-current')).toHaveText('current');
  await expect(page.locator('.linked-node-wrap.is-current .linked-node')).toHaveAttribute('aria-label', /current node/);
});

test('linked-list traversal presets cover multi-node, singleton, and empty termination', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=linked-list-traversal');
  await (await visualizerMotion(page)).selectOption('off');
  const preset = page.getByLabel('Case preset');
  await expect(preset).toHaveValue('default');
  await expect(preset.locator('option')).toHaveCount(3);
  const defaultTimeline = await visualizerTimeline(page);
  await defaultTimeline.fill(await defaultTimeline.getAttribute('max'));
  await expect(page.locator('.linked-node')).toHaveCount(3);
  await expect(page.locator('.linked-null')).toContainText('current');

  await preset.selectOption('singleton');
  await expect(page.locator('.integrated-step strong')).toHaveText(/1 \/ /);
  await expect(page.locator('.linked-node')).toHaveCount(1);
  await expect(page.locator('.source-line.is-current')).toContainText('head <- NEW NODE(7)');

  await preset.selectOption('empty');
  await expect(page.locator('.linked-node')).toHaveCount(0);
  await expect(page.locator('.source-line.is-current')).toContainText('head <- NULL');
  await expect(page.locator('.linked-null')).toContainText('head');
  const timeline = await visualizerTimeline(page);
  await timeline.fill(await timeline.getAttribute('max'));
  await expect(page.locator('.integrated-step span')).toHaveText('Condition is FALSE');
  await expect(page.locator('.source-line.is-current')).toContainText('WHILE current <> NULL DO');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'More' }).click();
  await page.getByRole('tab', { name: 'Operations' }).click();
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('Node visits');
  await expect(page.locator('.evidence-drawer:visible .metric-summary')).toContainText('0');
});

test('linked foundations keep the active pointer and comparison readable on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/visualizer.html?activity=linked-list-traversal');
  await (await visualizerMotion(page)).selectOption('off');
  const activeIndex = await page.evaluate(() => {
    const events = ITCC47Activities.get('linked-list-traversal').run({ preset: 'default' }).events;
    let match = 0;
    events.forEach((event, index) => { if (event.frame.pointers.current === 'node:3') match = index; });
    return match;
  });
  await (await visualizerTimeline(page)).fill(String(activeIndex));
  await expect(page.locator('[data-follow-target="true"]')).toHaveAttribute('data-node-id', 'node:3');
  await expect.poll(() => page.locator('.linked-canvas').evaluate((canvas) => canvas.scrollLeft)).toBeGreaterThan(0);
  const followGeometry = await page.evaluate(() => {
    const canvas = document.querySelector('.linked-canvas').getBoundingClientRect();
    const target = document.querySelector('[data-follow-target="true"]').getBoundingClientRect();
    return { visible: target.left >= canvas.left && target.right <= canvas.right, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(followGeometry).toEqual({ visible: true, overflow: 0 });
  const stepText = await page.locator('.integrated-step strong').innerText();
  await page.getByRole('tab', { name: 'Code' }).click();
  await page.getByRole('tab', { name: 'Visualize' }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText(stepText);

  await page.goto('/visualizer.html?activity=array-linked-comparison');
  await expect(page.locator('.sequence-array-panel')).toBeVisible();
  await expect(page.locator('.sequence-linked-panel')).toHaveCount(0);
  const arrayGeometry = await page.evaluate(() => {
    const canvas = document.querySelector('.visual-canvas').getBoundingClientRect();
    const array = document.querySelector('.sequence-array-panel').getBoundingClientRect();
    const scroll = document.querySelector('.sequence-array-scroll');
    return {
      height: canvas.height,
      arrayFitsWidth: array.left >= canvas.left && array.right <= canvas.right,
      structureScrollsHorizontally: scroll.scrollWidth > scroll.clientWidth,
      overflow: document.documentElement.scrollWidth - innerWidth,
    };
  });
  expect(arrayGeometry.height).toBe(560);
  expect(arrayGeometry.arrayFitsWidth).toBe(true);
  expect(arrayGeometry.structureScrollsHorizontally).toBe(true);
  expect(arrayGeometry.overflow).toBe(0);
  await page.getByLabel('Data structure', { exact: true }).selectOption('linked');
  await expect(page.locator('.sequence-array-panel')).toHaveCount(0);
  await expect(page.locator('.sequence-linked-panel')).toBeVisible();
  const linkedGeometry = await page.evaluate(() => {
    const canvas = document.querySelector('.visual-canvas').getBoundingClientRect();
    const linked = document.querySelector('.sequence-linked-panel').getBoundingClientRect();
    return { linkedFitsWidth: linked.left >= canvas.left && linked.right <= canvas.right, overflow: document.documentElement.scrollWidth - innerWidth };
  });
  expect(linkedGeometry).toEqual({ linkedFitsWidth: true, overflow: 0 });
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('.integrated-step strong')).toHaveText(/2 \/ \d+/);
});

test('curated linked-list pseudocode opens in the lab and retains trace, output, and diagnostics', async ({ page }, testInfo) => {
  await page.goto('/visualizer.html?activity=linked-list-traversal&preview=1');
  await page.getByRole('link', { name: /Edit pseudocode/ }).click();
  await expect(page).toHaveURL(/tracer\.html\?activity=linked-list-traversal/);
  await expect(page.getByLabel('Pseudocode editor')).toHaveValue(/head <- NEW NODE\(18\)/);
  await expect(page.locator('#status-line')).toContainText('loaded from the Visualizer');
  await page.getByRole('button', { name: /run/i }).click();
  await expect(page.locator('#status-line')).toContainText('step(s) recorded');
  await expect(page.locator('#trace-body tr')).not.toHaveCount(0);
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('#output-box')).toContainText('31');
});

test('pseudocode lab shows node references in scoped runtime state', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  await page.getByLabel('Pseudocode editor').fill(`FUNCTION Echo(node)
 RETURN node
ENDFUNCTION
head <- NEW NODE(4)
CALL Echo(head) INTO alias
WRITE alias = head`);
  await page.getByRole('button', { name: /run/i }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  const slider = page.locator('#step-slider');
  await slider.fill(await slider.getAttribute('max'));
  await expect(page.locator('#vars-box')).toContainText('&node:1');
  await expect(page.locator('#output-box')).toContainText('true');
});

test('mobile visualizer tabs replace the central surface without resetting playback', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/visualizer.html?activity=bubble-sort&preview=1');
  await expect(page.locator('.integrated-step span')).toBeVisible();
  await expect(page.locator('.integrated-step span')).toContainText('Set n to 10');
  await expect(page.locator('.array-scroll-hint')).toBeVisible();
  await expect(page.locator('.visualization-legend > summary')).toBeInViewport();
  await expect(page.locator('.desktop-evidence, .mobile-evidence, .trace-item')).toHaveCount(0);
  const initialVisualHeight = await page.locator('.visual-canvas').evaluate((element) => Math.round(element.getBoundingClientRect().height));
  expect(initialVisualHeight).toBeLessThanOrEqual(310);
  await page.getByRole('button', { name: 'Step' }).click();
  await expect(await visualizerTimeline(page)).toHaveValue('1');
  const timeline = await visualizerTimeline(page);
  await timeline.fill('34');
  await expect(page.locator('.integrated-step strong')).toHaveText('35 / 155');
  await expect(page.locator('[data-follow-target="true"]')).toHaveAttribute('data-slot', 'slot:9');
  await expect.poll(() => page.locator('.visual-canvas').evaluate((element) => Math.round(element.scrollLeft))).toBeGreaterThan(0);
  await expect.poll(() => page.evaluate(() => {
    const viewport = document.querySelector('.visual-canvas').getBoundingClientRect();
    const target = document.querySelector('[data-follow-target="true"]').getBoundingClientRect();
    return target.left >= viewport.left && target.right <= viewport.right;
  })).toBe(true);
  await page.locator('.mobile-playback-details > summary').click();
  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('.desktop-source')).toBeVisible();
  await expect(page.locator('.visual-canvas')).toBeHidden();
  await page.getByRole('tab', { name: 'Trace' }).click();
  await expect(page.locator('.mobile-evidence')).toBeVisible();
  await expect(page.locator('.desktop-evidence')).toHaveCount(0);
  await expect(page.locator('.evidence-drawer')).toHaveCount(1);
  await expect(page.locator('.trace-item')).toHaveCount(80);
  await expect(page.locator('.trace-item.is-current')).toContainText('63 > 76 is FALSE');
  await page.getByRole('tab', { name: 'Visualize' }).click();
  await expect(page.locator('.mobile-evidence, .evidence-drawer, .trace-item')).toHaveCount(0);
  await expect(page.locator('.integrated-step strong')).toHaveText('35 / 155');
});

test('tracer runs and its result tabs work from the keyboard', async ({ page }) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: /run/i }).click();
  await expect(page.locator('#status-line')).toContainText('step(s) recorded');
  const traceTab = page.getByRole('tab', { name: /trace/i });
  await traceTab.focus();
  await traceTab.press('ArrowRight');
  await expect(page.getByRole('tab', { name: /operations/i })).toHaveAttribute('aria-selected', 'true');
});

test('tracer delegates editor and trace overflow to their parent surfaces', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  const source = ['x <- 0', ...Array.from({ length: 48 }, () => 'x <- x + 1'), 'WRITE x'].join('\n');
  await page.getByLabel('Pseudocode editor').fill(source);
  const editorScroll = await page.evaluate(() => {
    const editor = document.querySelector('#code-box');
    const parent = document.querySelector('.editor-card');
    return {
      editorOverflow: getComputedStyle(editor).overflowY,
      editorClient: editor.clientHeight,
      editorScroll: editor.scrollHeight,
      parentOverflow: getComputedStyle(parent).overflowY,
    };
  });
  expect(editorScroll.editorOverflow).toBe('hidden');
  expect(editorScroll.editorScroll).toBeLessThanOrEqual(editorScroll.editorClient + 2);
  expect(editorScroll.parentOverflow).toBe(testInfo.project.name === 'phone' ? 'visible' : 'auto');

  await page.getByRole('button', { name: 'Run', exact: true }).click();
  const traceScroll = await page.evaluate(() => ({
    panel: getComputedStyle(document.querySelector('#panel-trace')).overflowY,
    table: getComputedStyle(document.querySelector('#panel-trace .trace-table-wrap')).overflowY,
  }));
  expect(traceScroll.table).toBe('visible');
  expect(traceScroll.panel).toBe(testInfo.project.name === 'phone' ? 'visible' : 'auto');
});

test('tracer explains exact symbolic FOR-loop counts and explicit control costs', async ({ page }) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: sum of n values/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();

  await expect(page.locator('#ops-total-value')).toHaveText('30');
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n + 6');
  await expect(page.locator('#ops-growth')).toHaveText('O(n)');
  await expect(page.locator('.loop-explanation').first()).toContainText('= n iterations');

  const bodyRow = page.locator('.ops-row').filter({ hasText: 'total <- total + i' });
  await bodyRow.click();
  await expect(page.locator('.code-line.count-line')).toHaveAttribute('data-line', '4');
  await expect(page.locator('.code-line.count-loop-line')).toHaveCount(3);

  await page.getByText('Full Control', { exact: true }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 11n + 12');
  await expect(page.locator('.ops-row-kind')).toHaveCount(3);
  await expect(page.locator('.ops-row').filter({ hasText: 'condition' })).toContainText('n + 1');
});

test('recursive functions expose call frames and guided recurrence assumptions', async ({ page }, testInfo) => {
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Recursive Factorial/ }).click();
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code & Run' }).click();
  await page.locator('#step-slider').fill('8');
  await expect(page.locator('#call-stack-box')).toContainText('Factorial');
  await expect(page.locator('#call-stack-box')).toContainText('depth 3');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Results' }).click();
  await page.getByRole('tab', { name: 'Recurrence' }).click();
  await page.getByRole('button', { name: 'Confirm size measure' }).click();
  await expect(page.locator('#recurrence-assumptions')).toContainText('non-recursive work');
  await page.locator('input[name="recurrence-combine"][value="constant"]').click();
  await expect(page.locator('#recurrence-formula')).toContainText('T(n)');
  await expect(page.locator('#recurrence-big-o')).toHaveText('O(n)');
});

test('symbolic operation counting is touch-readable without horizontal page overflow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/tracer.html');
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: nested loops/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n² + 6');
  await expect(page.locator('.loop-explanation').first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test('problem work tabs reach code and results on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/practice.html?module=1');
  await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('#code-box')).toBeVisible();
  await expect(page.locator('#problem-pane')).toBeHidden();
  await page.getByRole('button', { name: 'Run Checks' }).click();
  await expect(page.getByRole('tab', { name: 'Results' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#results-body')).toBeVisible();
});

test('module catalog exposes current practice and retains the full problem list', async ({ page }, testInfo) => {
  await page.goto('/problems.html');
  await expect(page.getByRole('heading', { name: 'Choose how to review' })).toBeVisible();
  await expect(page.locator('.module-card')).toHaveCount(8);
  await expect(page.locator('.module-card-current')).toContainText('Stacks, Queues, and Deques');
  await expect(page.locator('.module-card-locked')).not.toHaveCount(0);
  await expect(page.locator('.module-card-current .module-problem-card')).toHaveCount(6);
  await page.getByRole('link', { name: /Browse all Module 4 practice/ }).click();
  await expect(page).toHaveURL(/problem-list\.html\?module=4$/);
  await expect(page.getByRole('heading', { name: 'Stacks, Queues, and Deques: select a problem' })).toBeVisible();
  await page.locator('.problem-choice-action').first().click();
  await expect(page).toHaveURL(/practice\.html\?module=4&problem=/);
  await expect(page.locator('#p-module')).toHaveText('Module 4');
  await expect(page.locator('#progress-line')).toContainText('of 6 solved');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.getByRole('link', { name: 'Back to Problem List' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'All Problems' })).toHaveCount(0);
});

test('modules catalog opens visualizations in the shared navigation shell', async ({ page }) => {
  await page.goto('/problems.html?view=visualizations&preview=1');
  await expect(page.getByRole('tab', { name: 'Visualizations' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('.visualization-card')).toHaveCount(35);
  await page.getByRole('link', { name: /Bubble Sort/ }).click();
  await expect(page).toHaveURL(/visualizer\.html\?activity=bubble-sort&preview=1$/);
  await expect(page.locator('.topbar-nav a', { hasText: 'Visualize' })).toHaveAttribute('aria-current', 'page');
});

test('difficulty tags use a distinct increasing-intensity palette', async ({ page }) => {
  await page.goto('/problem-list.html?module=1');
  await expect(page.locator('.diff-warmup').first()).toBeVisible();
  await expect(page.locator('.diff-core').first()).toBeVisible();
  await expect(page.locator('.diff-challenge').first()).toBeVisible();
  await expect(page.locator('.diff-medium').first()).toBeVisible();
  await expect(page.locator('.diff-mediumhard').first()).toBeVisible();
  await expect(page.locator('.diff-hard').first()).toBeVisible();
  const colors = await page.locator('.chip-diff').evaluateAll((chips) => chips.map((chip) => getComputedStyle(chip).backgroundColor));
  expect(new Set(colors).size).toBeGreaterThan(2);
});

test('touch indentation works in both structured and pseudocode editors', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'phone');
  await page.goto('/writer.html');
  const secondStep = page.locator('.step-input').nth(1);
  await secondStep.focus();
  const writerIndent = page.getByRole('button', { name: 'Indent step' });
  await writerIndent.evaluate((element) => element.scrollIntoView({ block: 'center' }));
  const writerScrollBefore = await page.evaluate(() => window.scrollY);
  await writerIndent.click();
  await expect(page.locator('.step-row').nth(1)).toHaveCSS('padding-left', '20px');
  expect(await page.evaluate(() => window.scrollY)).toBe(writerScrollBefore);
  const writerOutdent = page.getByRole('button', { name: 'Outdent step' });
  const writerOutdentScrollBefore = await page.evaluate(() => window.scrollY);
  await writerOutdent.click();
  await expect(page.locator('.step-row').nth(1)).toHaveCSS('padding-left', '6px');
  expect(await page.evaluate(() => window.scrollY)).toBe(writerOutdentScrollBefore);

  await page.goto('/tracer.html');
  const editor = page.locator('#code-box');
  const longProgram = ['IF ready THEN', ...Array.from({ length: 40 }, () => 'WRITE "yes"'), 'ENDIF'].join('\n');
  await editor.fill(longProgram);
  await editor.evaluate((element) => {
    const endifStart = element.value.lastIndexOf('ENDIF');
    element.setSelectionRange(endifStart, element.value.length);
  });
  await page.evaluate(() => window.scrollTo(0, Math.min(136, document.documentElement.scrollHeight - innerHeight)));
  const tracerScrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Indent', exact: true }).click();
  expect(await page.evaluate(() => window.scrollY)).toBe(tracerScrollBefore);
  const toolbarBox = await page.locator('.editor-toolbar').boundingBox();
  expect(toolbarBox).not.toBeNull();
  expect(toolbarBox.y).toBeGreaterThanOrEqual(0);
  expect(toolbarBox.y + toolbarBox.height).toBeLessThanOrEqual(844);
  expect((await editor.inputValue()).split('\n').at(-1)).toBe('    ENDIF');
  const tracerOutdentScrollBefore = await page.evaluate(() => window.scrollY);
  await page.getByRole('button', { name: 'Outdent', exact: true }).click();
  expect(await page.evaluate(() => window.scrollY)).toBe(tracerOutdentScrollBefore);
  expect((await editor.inputValue()).split('\n').at(-1)).toBe('ENDIF');
});

test('all entry pages open from file URLs and permit an interaction', async ({ page }) => {
  test.skip(process.platform !== 'win32');
  for (const entry of entries) {
    const fileUrl = `file:///${path.resolve(__dirname, '..', entry).replace(/\\/g, '/')}`;
    await page.goto(fileUrl);
    await expect(page.locator('body')).toBeVisible();
  }
  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?activity=bubble-sort&preview=1`);
  await (await visualizerMotion(page)).selectOption('off');
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(await visualizerTimeline(page)).toHaveValue('1');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?activity=linked-list-traversal`);
  await page.getByLabel('Case preset').selectOption('empty');
  await expect(page.getByRole('heading', { name: 'Traverse a singly linked list' })).toBeVisible();
  await expect(page.locator('.source-line.is-current')).toContainText('head <- NULL');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?activity=array-linked-comparison&preview=1`);
  await expect(page.getByRole('heading', { name: 'Recent Documents: positions versus relationships' })).toBeVisible();
  await (await visualizerMotion(page)).selectOption('off');
  const recentTimeline = await visualizerTimeline(page);
  await recentTimeline.fill(await recentTimeline.getAttribute('max'));
  await expect(page.locator('.sequence-array-track')).toHaveAttribute('data-array-order', 'Attendance.xlsx, Grades.xlsx, Syllabus.docx, Module3.pptx, Notes.txt');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'lesson.html').replace(/\\/g, '/')}?checkpoint=m3-linked-foundations&preview=1`);
  await expect(page.locator('.companion-thesis')).toHaveText('DATA + REFERENCES = STRUCTURE');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'problems.html').replace(/\\/g, '/')}?view=midterm`);
  await expect(page.getByRole('heading', { name: /Move from understanding/ })).toBeVisible();
  await expect(page.locator('[data-midterm-module]')).toHaveCount(4);
  await page.locator('[data-midterm-module="4"] [data-midterm-module-toggle="4"]').click();
  await page.locator('[data-midterm-resource="activity:stack-lifo-basics"]').click();
  await expect(page.getByRole('heading', { name: 'Push, peek, and pop' })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Playback controls' })).toBeVisible();

  await page.goto(`file:///${path.resolve(__dirname, '..', 'industry-workbench.html').replace(/\\/g, '/')}?scenario=industry-priority-range-recall&preview=1`);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(await visualizerTimeline(page)).toHaveValue('1');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'tracer.html').replace(/\\/g, '/')}`);
  await page.getByRole('button', { name: 'Load Example' }).click();
  await page.getByRole('button', { name: /Counting: sum of n values/ }).click();
  await page.getByRole('button', { name: /run/i }).click();
  await page.getByRole('tab', { name: /operations/i }).click();
  await page.getByRole('button', { name: 'Symbolic' }).click();
  await page.getByRole('button', { name: 'Confirm dimensions' }).click();
  await expect(page.locator('#ops-total-value')).toHaveText('T(n) = 4n + 6');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=itcc45&activity=itcc45-object-state`);
  await page.getByRole('button', { name: 'Step', exact: true }).click();
  await expect(page.locator('#step-slider')).toHaveValue('1');

  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=computer-networking&activity=networking-read-classroom-network`);
  await expect(page.getByRole('heading', { name: 'Follow a client to three servers' })).toBeVisible();
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 24');
  await page.goto(`file:///${path.resolve(__dirname, '..', 'visualizer.html').replace(/\\/g, '/')}?course=computer-networking&activity=networking-arp-neighbor-discovery`);
  await (await visualizerMotion(page)).selectOption('off');
  const networkingTimeline = await visualizerTimeline(page);
  await networkingTimeline.fill('11');
  await expect(page.locator('.network-detail-label')).toContainText('Flood Fa0/2 → Host B eth0');
  await expect(page.locator('.network-packet')).toHaveAttribute('data-motion-link-id', 'link-switch-host-b');
});

test('cached navigation remains available offline', async ({ page, context }, testInfo) => {
  await page.goto('/index.html');
  await page.evaluate(async () => {
    if ('serviceWorker' in navigator) await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto('/industry-workbench.html?scenario=industry-priority-range-recall&preview=1');
  await expect(page.getByRole('heading', { name: 'Priority Range Recall' })).toBeVisible();
  await page.goto('/visualizer.html?course=computer-architecture&activity=architecture-fetch-cycle');
  await expect(page.getByRole('heading', { name: 'Fetch one instruction' })).toBeVisible();
  await page.goto('/computer-architecture-practice.html');
  await expect(page.getByRole('heading', { name: 'Practice the instruction flow.' })).toBeVisible();
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-read-classroom-network');
  await expect(page.getByRole('heading', { name: 'Follow a client to three servers' })).toBeVisible();
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 24');
  await page.goto('/visualizer.html?course=computer-networking&activity=networking-arp-neighbor-discovery');
  await expect(page.getByRole('heading', { name: 'Discover a neighbor with ARP' })).toBeVisible();
  await expect(page.locator('.integrated-step strong')).toHaveText('1 / 24');
  await page.goto('/computer-networking-practice.html');
  await expect(page.getByRole('heading', { name: 'Check the network from foundations to ARP.' })).toBeVisible();
  await page.goto('/visualizer.html?activity=linked-list-traversal');
  await expect(page.getByRole('heading', { name: 'Traverse a singly linked list' })).toBeVisible();
  await page.goto('/visualizer.html?activity=array-linked-comparison&preview=1');
  await expect(page.getByRole('heading', { name: 'Recent Documents: positions versus relationships' })).toBeVisible();
  await page.goto('/lesson.html?checkpoint=m3-linked-foundations&preview=1');
  await expect(page.locator('.companion-thesis')).toHaveText('DATA + REFERENCES = STRUCTURE');
  await page.goto('/problems.html?view=midterm');
  await expect(page.locator('[data-midterm-checkpoint]')).toHaveCount(18);
  await page.goto('/visualizer.html?activity=deque-service-lane');
  await expect(page.getByRole('heading', { name: 'Priority service lane' })).toBeVisible();
  await page.goto('/problem-list.html?module=4');
  await expect(page.locator('.problem-choice-current')).toHaveCount(3);
  await expect(page.locator('.problem-choice-available')).toHaveCount(3);
  await page.goto('/practice.html?module=1');
  if (testInfo.project.name === 'phone') await page.getByRole('tab', { name: 'Code' }).click();
  await expect(page.locator('#code-box')).toBeVisible();
});

test('service-worker updates remove only obsolete practice caches', async ({ page }) => {
  await page.goto('/missing-test-entry');
  await page.evaluate(async () => {
    await caches.open('another-app-cache');
    await caches.open('itcc47-practice-obsolete');
  });
  await page.goto('/index.html');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await expect.poll(() => page.evaluate(async () => await caches.keys())).toContain('another-app-cache');
  expect(await page.evaluate(async () => (await caches.keys()).includes('itcc47-practice-obsolete'))).toBe(false);
});
