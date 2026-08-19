const { defineConfig, devices } = require('@playwright/test');

const testPort = Number(process.env.ITCC47_TEST_PORT || 4173);

module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The visualizer cases are rendering-heavy; cap parallel browsers so the
  // longest portfolio audits do not time out under local or CI contention.
  workers: 2,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${testPort}`,
    browserName: 'chromium',
    channel: process.env.CI ? undefined : 'msedge',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1366, height: 768 } } },
    { name: 'phone', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true } },
  ],
  webServer: {
    command: 'node tools/serve.js',
    port: testPort,
    env: { PORT: String(testPort) },
    reuseExistingServer: !process.env.CI,
  },
});
