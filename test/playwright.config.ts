import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

/**
 * Read environment variables from file (see test/.env.example).
 * https://github.com/motdotla/dotenv
 */
dotenv.config();

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Workers on CI
 * -------------
 * CI intentionally uses a single worker. Several E2E suites (SQLite directory
 * CRUD, persistence, shared auth sessions) mutate the same Compose-backed
 * SQLite databases and demo session state. Parallel workers would race on
 * that shared mutable state and produce flaky failures.
 *
 * Do not raise `workers` above 1 in CI until test data is isolated per worker
 * (e.g. unique database files / namespaces per worker index). Locally, the
 * default (undefined) allows Playwright to parallelize safely when the
 * developer is not hitting a shared long-lived Compose stack.
 *
 * Browser matrix
 * --------------
 * PR CI runs Chromium only (see .github/workflows/build-and-test.yaml).
 * Full matrix (chromium, firefox, webkit, Mobile Chrome) runs on main and
 * workflow_dispatch to keep PR feedback fast (~4× fewer browser installs).
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only — keep low so connection-refused cascades do not multiply runtime */
  retries: process.env.CI ? 1 : 0,
  /* Opt out of parallel tests on CI (shared SQLite / session state — see comment above). */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['list'], // You can combine multiple reporters
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['html', { outputFolder: 'playwright-report/html', open: 'never' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.DEMO_BASE_URL || 'http://localhost:8080',
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'docker compose up -d',
      cwd: '../',
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
});
