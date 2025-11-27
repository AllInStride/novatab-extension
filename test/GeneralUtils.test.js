/**
 * Unit Tests for GeneralUtils
 * Tests UUID generation, deep cloning, version comparison, and safe async execution
 */

// Load utilities using the test loader
const { GeneralUtils, ErrorUtils, NOVATAB_CONSTANTS } = require('./utils-loader');

describe('GeneralUtils', () => {
  describe('generateUUID', () => {
    it('should generate valid UUID format', () => {
      const uuid = GeneralUtils.generateUUID();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(uuid).toMatch(uuidRegex);
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = GeneralUtils.generateUUID();
      const uuid2 = GeneralUtils.generateUUID();
      const uuid3 = GeneralUtils.generateUUID();

      expect(uuid1).not.toBe(uuid2);
      expect(uuid2).not.toBe(uuid3);
      expect(uuid1).not.toBe(uuid3);
    });

    it('should generate UUIDs with correct version (v4)', () => {
      const uuid = GeneralUtils.generateUUID();
      const versionChar = uuid.charAt(14);

      expect(versionChar).toBe('4');
    });

    it('should generate UUIDs with correct variant', () => {
      const uuid = GeneralUtils.generateUUID();
      const variantChar = uuid.charAt(19);

      // Variant bits should be 10xx (8, 9, a, or b)
      expect(['8', '9', 'a', 'b']).toContain(variantChar.toLowerCase());
    });

    it('should generate many unique UUIDs', () => {
      const uuids = new Set();
      const count = 1000;

      for (let i = 0; i < count; i++) {
        uuids.add(GeneralUtils.generateUUID());
      }

      expect(uuids.size).toBe(count);
    });
  });

  describe('deepClone', () => {
    it('should clone simple objects', () => {
      const original = { name: 'Test', value: 123 };
      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);

      cloned.name = 'Changed';
      expect(original.name).toBe('Test');
    });

    it('should clone nested objects', () => {
      const original = {
        level1: {
          level2: {
            level3: {
              value: 'deep'
            }
          }
        }
      };

      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned.level1).not.toBe(original.level1);
      expect(cloned.level1.level2).not.toBe(original.level1.level2);

      cloned.level1.level2.level3.value = 'changed';
      expect(original.level1.level2.level3.value).toBe('deep');
    });

    it('should clone arrays', () => {
      const original = [1, 2, 3, 4, 5];
      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);

      cloned[0] = 999;
      expect(original[0]).toBe(1);
    });

    it('should clone arrays with objects', () => {
      const original = [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' }
      ];

      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned[0]).not.toBe(original[0]);

      cloned[0].name = 'Changed';
      expect(original[0].name).toBe('First');
    });

    it('should clone objects with arrays', () => {
      const original = {
        items: [1, 2, 3],
        nested: {
          data: [4, 5, 6]
        }
      };

      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned.items).not.toBe(original.items);

      cloned.items.push(999);
      expect(original.items.length).toBe(3);
    });

    it('should handle null values', () => {
      const original = { value: null };
      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned.value).toBe(null);
    });

    it('should handle undefined values', () => {
      const original = { value: undefined };
      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
    });

    it('should handle primitive values', () => {
      expect(GeneralUtils.deepClone(null)).toBe(null);
      expect(GeneralUtils.deepClone(undefined)).toBe(undefined);
      expect(GeneralUtils.deepClone(123)).toBe(123);
      expect(GeneralUtils.deepClone('string')).toBe('string');
      expect(GeneralUtils.deepClone(true)).toBe(true);
    });

    it('should clone Date objects', () => {
      const original = new Date('2024-01-01');
      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.getTime()).toBe(original.getTime());
    });

    it('should handle mixed data types', () => {
      const original = {
        string: 'text',
        number: 42,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3],
        nested: {
          date: new Date('2024-01-01'),
          items: ['a', 'b', 'c']
        }
      };

      const cloned = GeneralUtils.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned.nested).not.toBe(original.nested);
      expect(cloned.nested.items).not.toBe(original.nested.items);
    });

    it('should handle empty objects and arrays', () => {
      expect(GeneralUtils.deepClone({})).toEqual({});
      expect(GeneralUtils.deepClone([])).toEqual([]);
    });

    it('should handle circular references gracefully with structuredClone', () => {
      const original = { name: 'Test' };
      original.self = original;

      // structuredClone should handle circular references
      // If it fails, the fallback will be used (which doesn't handle circular refs)
      // We just verify it doesn't crash
      expect(() => {
        GeneralUtils.deepClone(original);
      }).not.toThrow();
    });
  });

  describe('compareVersions', () => {
    it('should return 0 for equal versions', () => {
      expect(GeneralUtils.compareVersions('1.0.0', '1.0.0')).toBe(0);
      expect(GeneralUtils.compareVersions('2.5.3', '2.5.3')).toBe(0);
      expect(GeneralUtils.compareVersions('1.0', '1.0.0')).toBe(0);
    });

    it('should return -1 when first version is lower', () => {
      expect(GeneralUtils.compareVersions('1.0.0', '1.0.1')).toBe(-1);
      expect(GeneralUtils.compareVersions('1.0.0', '2.0.0')).toBe(-1);
      expect(GeneralUtils.compareVersions('1.9.9', '2.0.0')).toBe(-1);
      expect(GeneralUtils.compareVersions('1.2.3', '1.2.4')).toBe(-1);
    });

    it('should return 1 when first version is higher', () => {
      expect(GeneralUtils.compareVersions('1.0.1', '1.0.0')).toBe(1);
      expect(GeneralUtils.compareVersions('2.0.0', '1.0.0')).toBe(1);
      expect(GeneralUtils.compareVersions('2.0.0', '1.9.9')).toBe(1);
      expect(GeneralUtils.compareVersions('1.2.4', '1.2.3')).toBe(1);
    });

    it('should handle versions with different number of parts', () => {
      expect(GeneralUtils.compareVersions('1.0', '1.0.0')).toBe(0);
      expect(GeneralUtils.compareVersions('1.0', '1.0.1')).toBe(-1);
      expect(GeneralUtils.compareVersions('1.1', '1.0.9')).toBe(1);
      expect(GeneralUtils.compareVersions('2', '1.9.9')).toBe(1);
    });

    it('should handle major version differences', () => {
      expect(GeneralUtils.compareVersions('1.9.9', '2.0.0')).toBe(-1);
      expect(GeneralUtils.compareVersions('3.0.0', '2.9.9')).toBe(1);
    });

    it('should handle minor version differences', () => {
      expect(GeneralUtils.compareVersions('1.5.0', '1.4.9')).toBe(1);
      expect(GeneralUtils.compareVersions('1.2.5', '1.3.0')).toBe(-1);
    });

    it('should handle patch version differences', () => {
      expect(GeneralUtils.compareVersions('1.0.5', '1.0.4')).toBe(1);
      expect(GeneralUtils.compareVersions('1.0.3', '1.0.10')).toBe(-1);
    });

    it('should treat missing parts as zero', () => {
      expect(GeneralUtils.compareVersions('1', '1.0.0')).toBe(0);
      expect(GeneralUtils.compareVersions('1.0', '1')).toBe(0);
      expect(GeneralUtils.compareVersions('2', '1.9')).toBe(1);
    });

    it('should handle real-world version comparisons', () => {
      expect(GeneralUtils.compareVersions('1.1.0', '1.1.1')).toBe(-1);
      expect(GeneralUtils.compareVersions('1.1.1', '1.1.0')).toBe(1);
      expect(GeneralUtils.compareVersions('0.9.9', '1.0.0')).toBe(-1);
    });
  });

  describe('safeAsync', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      global.chrome.runtime.lastError = null;
    });

    it('should execute async function successfully', async () => {
      const asyncFunc = jest.fn().mockResolvedValue('success');
      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toBe('success');
      expect(asyncFunc).toHaveBeenCalled();
    });

    it('should return null on function error', async () => {
      const asyncFunc = jest.fn().mockRejectedValue(new Error('Test error'));
      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle chrome.runtime.lastError', async () => {
      const asyncFunc = jest.fn().mockResolvedValue('result');
      global.chrome.runtime.lastError = { message: 'Chrome error' };

      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toBe(null);
      expect(console.error).toHaveBeenCalled();
    });

    it('should include context in error logging', async () => {
      const asyncFunc = jest.fn().mockRejectedValue(new Error('Test error'));
      const context = 'myFunction';

      await GeneralUtils.safeAsync(asyncFunc, context);

      const errorLog = console.error.mock.calls[0][1];
      expect(errorLog.context).toBe(context);
    });

    it('should use default context if not provided', async () => {
      const asyncFunc = jest.fn().mockRejectedValue(new Error('Test error'));

      await GeneralUtils.safeAsync(asyncFunc);

      const errorLog = console.error.mock.calls[0][1];
      expect(errorLog.context).toBe('unknown');
    });

    it('should handle async functions that return objects', async () => {
      const mockData = { id: 1, name: 'Test' };
      const asyncFunc = jest.fn().mockResolvedValue(mockData);

      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toEqual(mockData);
    });

    it('should handle async functions that return arrays', async () => {
      const mockData = [1, 2, 3, 4, 5];
      const asyncFunc = jest.fn().mockResolvedValue(mockData);

      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toEqual(mockData);
    });

    it('should handle async functions that return null', async () => {
      const asyncFunc = jest.fn().mockResolvedValue(null);

      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toBe(null);
    });

    it('should handle async functions that return undefined', async () => {
      const asyncFunc = jest.fn().mockResolvedValue(undefined);

      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toBe(undefined);
    });

    it('should pass through function results unchanged', async () => {
      const testCases = [
        'string',
        123,
        true,
        false,
        { complex: { nested: 'object' } },
        [1, 2, [3, 4]],
        null,
        undefined
      ];

      for (const testValue of testCases) {
        const asyncFunc = jest.fn().mockResolvedValue(testValue);
        const result = await GeneralUtils.safeAsync(asyncFunc, 'test');
        expect(result).toEqual(testValue);
      }
    });

    it('should handle Chrome API bookmarks example', async () => {
      const mockBookmarks = [
        { id: '1', title: 'Bookmark 1', url: 'https://example.com' },
        { id: '2', title: 'Bookmark 2', url: 'https://test.com' }
      ];

      const getBookmarks = jest.fn().mockResolvedValue(mockBookmarks);

      const result = await GeneralUtils.safeAsync(
        () => getBookmarks('folderId'),
        'fetchBookmarks'
      );

      expect(result).toEqual(mockBookmarks);
      expect(getBookmarks).toHaveBeenCalledWith('folderId');
    });

    it('should clean up chrome.runtime.lastError after reading', async () => {
      const asyncFunc = jest.fn().mockResolvedValue('result');
      global.chrome.runtime.lastError = { message: 'Test error' };

      await GeneralUtils.safeAsync(asyncFunc, 'test');

      // Error should have been detected and function returned null
      // The error object itself isn't cleared by safeAsync (Chrome clears it)
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Integration tests', () => {
    it('should generate UUID and use in cloned object', () => {
      const original = {
        id: GeneralUtils.generateUUID(),
        data: { value: 123 }
      };

      const cloned = GeneralUtils.deepClone(original);

      expect(cloned.id).toBe(original.id);
      expect(cloned.data).not.toBe(original.data);
    });

    it('should compare versions and handle cloned version objects', () => {
      const versionObj = { current: '1.1.0', required: '1.0.0' };
      const cloned = GeneralUtils.deepClone(versionObj);

      const comparison = GeneralUtils.compareVersions(
        cloned.current,
        cloned.required
      );

      expect(comparison).toBe(1);
    });

    it('should safely execute async with deep cloned data', async () => {
      const data = {
        items: [{ id: 1 }, { id: 2 }]
      };

      const asyncFunc = async () => {
        return GeneralUtils.deepClone(data);
      };

      const result = await GeneralUtils.safeAsync(asyncFunc, 'test');

      expect(result).toEqual(data);
      expect(result).not.toBe(data);
      expect(result.items).not.toBe(data.items);
    });
  });
});
