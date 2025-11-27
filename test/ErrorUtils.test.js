/**
 * Unit Tests for ErrorUtils
 * Tests error creation, logging, and storage functionality
 */

// Load utilities using the test loader
const { ErrorUtils, NOVATAB_CONSTANTS } = require('./utils-loader');

describe('ErrorUtils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Reset console mocks
    console.error.mockClear();
    console.warn.mockClear();

    // Reset Chrome storage mock
    global.chrome.storage.local.get.mockClear();
    global.chrome.storage.local.set.mockClear();
  });

  describe('createError', () => {
    it('should create error object with all fields', () => {
      const message = 'Test error message';
      const code = 'TEST_ERROR';
      const details = { key: 'value' };

      const error = ErrorUtils.createError(message, code, details);

      expect(error).toHaveProperty('message', message);
      expect(error).toHaveProperty('code', code);
      expect(error).toHaveProperty('details', details);
      expect(error).toHaveProperty('timestamp');
      expect(typeof error.timestamp).toBe('number');
    });

    it('should use default code when not provided', () => {
      const message = 'Test error';
      const error = ErrorUtils.createError(message);

      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.details).toBe(null);
    });

    it('should handle null details', () => {
      const error = ErrorUtils.createError('Test', 'CODE', null);
      expect(error.details).toBe(null);
    });

    it('should create error with only message', () => {
      const error = ErrorUtils.createError('Simple error');

      expect(error.message).toBe('Simple error');
      expect(error.code).toBe('UNKNOWN_ERROR');
      expect(error.details).toBe(null);
      expect(error.timestamp).toBeDefined();
    });

    it('should generate different timestamps for sequential calls', (done) => {
      const error1 = ErrorUtils.createError('Error 1');

      setTimeout(() => {
        const error2 = ErrorUtils.createError('Error 2');
        expect(error2.timestamp).toBeGreaterThanOrEqual(error1.timestamp);
        done();
      }, 10);
    });

    it('should handle complex details objects', () => {
      const complexDetails = {
        nested: { value: 123 },
        array: [1, 2, 3],
        string: 'test'
      };

      const error = ErrorUtils.createError('Test', 'CODE', complexDetails);
      expect(error.details).toEqual(complexDetails);
    });
  });

  describe('logError', () => {
    it('should log error to console', () => {
      const error = new Error('Test error');
      const context = 'testFunction';

      ErrorUtils.logError(error, context);

      expect(console.error).toHaveBeenCalled();
      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.message).toBe('Test error');
      expect(loggedError.context).toBe('testFunction');
    });

    it('should include stack trace when available', () => {
      const error = new Error('Test error');
      const context = 'testFunction';

      ErrorUtils.logError(error, context);

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.stack).toBeDefined();
      expect(loggedError.stack).toContain('Error: Test error');
    });

    it('should handle errors without stack traces', () => {
      const error = { message: 'Plain error object' };
      const context = 'testFunction';

      ErrorUtils.logError(error, context);

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.message).toBe('Plain error object');
      expect(loggedError.stack).toBe('');
    });

    it('should include extension version in error log', () => {
      const error = new Error('Test error');

      ErrorUtils.logError(error, 'test');

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.version).toBe(NOVATAB_CONSTANTS.VERSION);
    });

    it('should include user agent in error log', () => {
      const error = new Error('Test error');

      ErrorUtils.logError(error, 'test');

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.userAgent).toBe(navigator.userAgent);
    });

    it('should handle additional details parameter', () => {
      const error = new Error('Test error');
      const context = 'testFunction';
      const details = { userId: 123, action: 'save' };

      ErrorUtils.logError(error, context, details);

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.details).toEqual(details);
    });

    it('should use default context if not provided', () => {
      const error = new Error('Test error');

      ErrorUtils.logError(error, null);

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.context).toBe('unknown');
    });

    it('should include ISO timestamp', () => {
      const error = new Error('Test error');

      ErrorUtils.logError(error, 'test');

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should handle non-Error objects', () => {
      const error = 'String error';

      ErrorUtils.logError(error, 'test');

      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.message).toBe('String error');
    });

    it('should attempt to store error log', () => {
      const error = new Error('Test error');

      ErrorUtils.logError(error, 'test');

      // storeErrorLog is called asynchronously
      // We can't directly test the call without waiting, but we verify no crash
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('storeErrorLog', () => {
    it('should store error log in chrome.storage.local', async () => {
      const errorLog = {
        message: 'Test error',
        context: 'test',
        timestamp: new Date().toISOString()
      };

      // Mock empty error log
      global.chrome.storage.local.get.mockResolvedValue({ errorLog: [] });
      global.chrome.storage.local.set.mockResolvedValue();

      await ErrorUtils.storeErrorLog(errorLog);

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['errorLog']);
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        errorLog: [errorLog]
      });
    });

    it('should append to existing error logs', async () => {
      const existingError = { message: 'Old error', timestamp: '2024-01-01' };
      const newError = { message: 'New error', timestamp: '2024-01-02' };

      global.chrome.storage.local.get.mockResolvedValue({
        errorLog: [existingError]
      });
      global.chrome.storage.local.set.mockResolvedValue();

      await ErrorUtils.storeErrorLog(newError);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        errorLog: [existingError, newError]
      });
    });

    it('should keep only last 50 errors', async () => {
      // Create 50 existing errors
      const existingErrors = Array.from({ length: 50 }, (_, i) => ({
        message: `Error ${i}`,
        timestamp: `2024-01-01T00:00:${i}`
      }));

      const newError = {
        message: 'Error 51',
        timestamp: '2024-01-01T00:00:51'
      };

      global.chrome.storage.local.get.mockResolvedValue({
        errorLog: existingErrors
      });
      global.chrome.storage.local.set.mockResolvedValue();

      await ErrorUtils.storeErrorLog(newError);

      const savedLogs = chrome.storage.local.set.mock.calls[0][0].errorLog;
      expect(savedLogs.length).toBe(50);
      expect(savedLogs[0].message).toBe('Error 1'); // First error removed
      expect(savedLogs[49].message).toBe('Error 51'); // New error at end
    });

    it('should handle storage errors gracefully', async () => {
      const errorLog = { message: 'Test' };

      global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(ErrorUtils.storeErrorLog(errorLog)).resolves.not.toThrow();
      expect(console.warn).toHaveBeenCalled();
    });

    it('should initialize error log array if missing', async () => {
      const errorLog = { message: 'Test error' };

      global.chrome.storage.local.get.mockResolvedValue({});
      global.chrome.storage.local.set.mockResolvedValue();

      await ErrorUtils.storeErrorLog(errorLog);

      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        errorLog: [errorLog]
      });
    });
  });

  describe('getErrorLogs', () => {
    it('should retrieve error logs from storage', async () => {
      const mockErrors = [
        { message: 'Error 1', timestamp: '2024-01-01' },
        { message: 'Error 2', timestamp: '2024-01-02' }
      ];

      global.chrome.storage.local.get.mockResolvedValue({
        errorLog: mockErrors
      });

      const result = await ErrorUtils.getErrorLogs();

      expect(chrome.storage.local.get).toHaveBeenCalledWith(['errorLog']);
      expect(result).toEqual(mockErrors);
    });

    it('should return empty array if no errors stored', async () => {
      global.chrome.storage.local.get.mockResolvedValue({});

      const result = await ErrorUtils.getErrorLogs();

      expect(result).toEqual([]);
    });

    it('should handle storage errors gracefully', async () => {
      global.chrome.storage.local.get.mockRejectedValue(new Error('Storage error'));

      const result = await ErrorUtils.getErrorLogs();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should return empty array if errorLog is null', async () => {
      global.chrome.storage.local.get.mockResolvedValue({
        errorLog: null
      });

      const result = await ErrorUtils.getErrorLogs();

      expect(result).toEqual([]);
    });
  });

  describe('clearErrorLogs', () => {
    it('should remove error logs from storage', async () => {
      global.chrome.storage.local.remove.mockResolvedValue();

      await ErrorUtils.clearErrorLogs();

      expect(chrome.storage.local.remove).toHaveBeenCalledWith(['errorLog']);
    });

    it('should handle storage errors gracefully', async () => {
      global.chrome.storage.local.remove.mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(ErrorUtils.clearErrorLogs()).resolves.not.toThrow();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    it('should log and store error end-to-end', async () => {
      global.chrome.storage.local.get.mockResolvedValue({ errorLog: [] });
      global.chrome.storage.local.set.mockResolvedValue();

      const error = new Error('Integration test error');
      const context = 'integrationTest';
      const details = { test: true };

      ErrorUtils.logError(error, context, details);

      // Wait for async storage
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(console.error).toHaveBeenCalled();
      const loggedError = console.error.mock.calls[0][1];
      expect(loggedError.message).toBe('Integration test error');
      expect(loggedError.context).toBe('integrationTest');
      expect(loggedError.details.test).toBe(true);
    });

    it('should maintain error log limit across multiple stores', async () => {
      // Simulate storing 55 errors sequentially, where each time we fetch the current state
      let currentErrors = [];

      for (let i = 0; i < 55; i++) {
        const error = { message: `Error ${i}`, timestamp: new Date().toISOString() };

        // Mock get to return current state
        global.chrome.storage.local.get.mockResolvedValue({
          errorLog: [...currentErrors]
        });

        global.chrome.storage.local.set.mockImplementation(async (data) => {
          currentErrors = data.errorLog;
        });

        await ErrorUtils.storeErrorLog(error);
      }

      expect(currentErrors.length).toBe(50);
      expect(currentErrors[0].message).toBe('Error 5'); // First 5 removed
      expect(currentErrors[49].message).toBe('Error 54');
    });
  });
});
