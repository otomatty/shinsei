/**
 * Jest Setup File
 *
 * Global test setup and configuration
 */

// Add custom jest matchers if needed
// import '@testing-library/jest-dom';

// Global test configuration
global.console = {
  ...global.console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock performance API for Node.js environment
if (typeof global.performance === "undefined") {
  global.performance = {
    now: jest.fn(() => Date.now()),
  } as unknown as Performance;
}

// Mock fetch globally for all tests
global.fetch = jest.fn();

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
