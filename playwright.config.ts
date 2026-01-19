import { defineConfig, devices } from '@playwright/test';

// Check if we should use Firebase emulators
const useEmulators = process.env.USE_FIREBASE_EMULATORS === 'true';

/**
 * Playwright configuration for Word Trace e2e tests.
 * See https://playwright.dev/docs/test-configuration
 *
 * To run with Firebase emulators (recommended for avoiding rate limits):
 *   USE_FIREBASE_EMULATORS=true npm run test:e2e
 *
 * Or use the npm script:
 *   npm run test:e2e:emulators
 */
export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Limit workers - with emulators we can run more in parallel
  workers: useEmulators ? 4 : (process.env.CI ? 1 : 3),

  // Reporter to use
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL to use in tests
    baseURL: 'http://localhost:8877',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'on-first-retry',
  },

  // Timeouts
  timeout: 30000, // 30 seconds per test
  expect: {
    timeout: 10000, // 10 seconds for assertions
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to test on more browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // Mobile viewports
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Run servers before starting the tests
  webServer: useEmulators
    ? [
        // Firebase emulators (auth + database)
        {
          command: 'npx firebase emulators:start --only auth,database',
          url: 'http://127.0.0.1:9099',
          reuseExistingServer: !process.env.CI,
          timeout: 60000,
        },
        // Dev server with emulator env var (uses .env.test)
        {
          command: 'npx vite --mode test --port 8877',
          url: 'http://localhost:8877',
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      ]
    : {
        // Just the dev server (uses production Firebase)
        command: 'npm run dev',
        url: 'http://localhost:8877',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },
});
