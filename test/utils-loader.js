/**
 * Utility loader for Jest tests
 * Loads utils.js into the test environment with proper mocking
 */

const fs = require('fs');
const path = require('path');

// Read utils.js content
const utilsPath = path.join(__dirname, '..', 'utils.js');
let utilsCode = fs.readFileSync(utilsPath, 'utf8');

// Create a function wrapper to execute utils.js and return the exports
const loadUtils = () => {
  // Provide globals that utils.js expects
  const globals = {
    chrome: global.chrome,
    navigator: global.navigator,
    console: global.console,
    URL: global.URL,
    Date: global.Date,
    Math: global.Math,
    setTimeout: global.setTimeout,
    clearTimeout: global.clearTimeout,
    crypto: global.crypto || {
      randomUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }
    },
    structuredClone: global.structuredClone || ((obj) => {
      // Fallback implementation
      if (obj === null || typeof obj !== 'object') return obj;
      if (obj instanceof Date) return new Date(obj.getTime());
      if (obj instanceof Array) return obj.map(item => structuredClone(item));
      const cloned = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          cloned[key] = structuredClone(obj[key]);
        }
      }
      return cloned;
    })
  };

  // Execute utils.js in a new Function context with globals
  const wrappedCode = `
    (function(chrome, navigator, console, URL, Date, Math, setTimeout, clearTimeout, crypto, structuredClone) {
      ${utilsCode}
      return {
        NOVATAB_CONSTANTS,
        URLUtils,
        ValidationUtils,
        StorageUtils,
        DOMUtils,
        GeneralUtils,
        ErrorUtils,
        DataSyncUtils: typeof DataSyncUtils !== 'undefined' ? DataSyncUtils : undefined
      };
    })
  `;

  const executor = eval(wrappedCode);
  return executor(
    globals.chrome,
    globals.navigator,
    globals.console,
    globals.URL,
    globals.Date,
    globals.Math,
    globals.setTimeout,
    globals.clearTimeout,
    globals.crypto,
    globals.structuredClone
  );
};

module.exports = loadUtils();
