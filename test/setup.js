/**
 * Jest Test Setup
 * Provides Chrome API mocks and global test utilities
 */

// Mock Chrome Storage API
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => {
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      remove: jest.fn((keys, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
      getBytesInUse: jest.fn((keys, callback) => {
        if (callback) {
          callback(0);
        }
        return Promise.resolve(0);
      }),
    },
    sync: {
      get: jest.fn((keys, callback) => {
        if (callback) {
          callback({});
        }
        return Promise.resolve({});
      }),
      set: jest.fn((items, callback) => {
        if (callback) {
          callback();
        }
        return Promise.resolve();
      }),
    },
  },
  runtime: {
    lastError: null,
    getManifest: jest.fn(() => ({
      version: '1.1.1',
      manifest_version: 3,
    })),
    sendMessage: jest.fn((message, callback) => {
      if (callback) {
        callback({});
      }
      return Promise.resolve({});
    }),
  },
  bookmarks: {
    get: jest.fn((id, callback) => {
      if (callback) {
        callback([]);
      }
      return Promise.resolve([]);
    }),
    getTree: jest.fn((callback) => {
      if (callback) {
        callback([]);
      }
      return Promise.resolve([]);
    }),
  },
};

// Mock navigator
global.navigator = {
  userAgent: 'Mozilla/5.0 (Test) Chrome/120.0.0.0',
};

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
};

// Mock URL constructor for browser environment
global.URL = URL;

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.chrome.runtime.lastError = null;
});

// Helper function to set mock storage data
global.setMockStorageData = (data) => {
  global.chrome.storage.local.get.mockImplementation((keys, callback) => {
    const result = Array.isArray(keys)
      ? keys.reduce((acc, key) => {
          if (data[key] !== undefined) acc[key] = data[key];
          return acc;
        }, {})
      : typeof keys === 'string'
      ? { [keys]: data[keys] }
      : data;

    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  });
};

// Helper function to simulate Chrome runtime error
global.setMockChromeError = (message) => {
  global.chrome.runtime.lastError = { message };
};

// Helper function to clear Chrome runtime error
global.clearMockChromeError = () => {
  global.chrome.runtime.lastError = null;
};
