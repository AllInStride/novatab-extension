# NovaTab Extension - Automated Testing Plan

**Date:** 2025-11-24
**Current Status:** No automated tests
**Goal:** Implement comprehensive automated testing

---

## Executive Summary

**YES, testing CAN be automated!** Chrome extensions can be tested using several established frameworks and tools. This document outlines what can be automated, recommended tools, and implementation priorities.

---

## 🎯 What Can Be Automated

### ✅ Fully Automatable (High Confidence)

1. **Unit Tests**
   - Utility functions (URLUtils, ErrorUtils, GeneralUtils, etc.)
   - Data transformation functions
   - Validation logic
   - Deep clone operations
   - String constants usage

2. **Integration Tests**
   - Storage operations (chrome.storage.local)
   - Bookmark API interactions (chrome.bookmarks)
   - Message passing (chrome.runtime.sendMessage)
   - Data sync utilities

3. **DOM Manipulation Tests**
   - Category rendering
   - Site card creation
   - Modal behavior
   - Event delegation
   - CSS class toggling

4. **Performance Tests**
   - Algorithm complexity (category ordering)
   - Memory leak detection
   - Storage quota checking
   - Debouncing behavior

5. **Accessibility Tests**
   - ARIA attributes present
   - Keyboard navigation structure
   - Focus management
   - Tab order correctness

### ⚠️ Partially Automatable (Medium Confidence)

6. **Visual Tests**
   - Screenshot comparison
   - Layout validation
   - Responsive design
   - CSS loading states

7. **End-to-End Tests**
   - User workflows (add category, add site, save)
   - Bookmark sync flows
   - Export/import data
   - Custom icon setting

8. **Browser API Tests**
   - Extension installation
   - Permission handling
   - Context menu interactions

### ❌ Difficult to Automate (Manual Better)

9. **Subjective UX Tests**
   - Visual appeal
   - Transition smoothness subjective assessment
   - Icon quality
   - Font rendering quality

10. **Screen Reader Testing**
   - Actual screen reader experience
   - Voice output quality
   - Announcement clarity
   - (Can verify ARIA attributes, but not actual SR experience)

11. **Cross-Browser Compatibility**
   - Can automate, but requires CI/CD setup
   - Manual testing faster for initial validation

---

## 🛠️ Recommended Testing Stack

### Option 1: Jest + Chrome Extension Testing Library (RECOMMENDED)

**Best for:** Unit tests, integration tests, DOM manipulation

**Pros:**
- Most popular JavaScript testing framework
- Excellent mocking capabilities for Chrome APIs
- Fast execution
- Great developer experience
- Rich ecosystem

**Setup:**
```bash
npm install --save-dev jest @types/chrome
npm install --save-dev @testing-library/dom @testing-library/jest-dom
```

**Example Test:**
```javascript
// utils.test.js
import { URLUtils } from '../utils.js';

describe('URLUtils', () => {
  describe('isValidImageUrl', () => {
    test('should accept valid HTTPS URLs', () => {
      expect(URLUtils.isValidImageUrl('https://example.com/icon.png')).toBe(true);
    });

    test('should reject javascript: URLs', () => {
      expect(URLUtils.isValidImageUrl('javascript:alert(1)')).toBe(false);
    });

    test('should accept data:image URLs', () => {
      expect(URLUtils.isValidImageUrl('data:image/png;base64,abc123')).toBe(true);
    });

    test('should reject data:text URLs', () => {
      expect(URLUtils.isValidImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });
  });
});
```

### Option 2: Playwright (RECOMMENDED for E2E)

**Best for:** End-to-end tests, browser automation

**Pros:**
- Supports Chrome extensions natively
- Cross-browser testing
- Visual comparison
- Network interception
- Powerful API

**Setup:**
```bash
npm install --save-dev @playwright/test
```

**Example Test:**
```javascript
// e2e/new-tab.spec.js
import { test, expect } from '@playwright/test';
import path from 'path';

test.beforeEach(async ({ context }) => {
  // Load extension
  await context.addInitScript({ path: path.join(__dirname, '../new_tab.js') });
});

test('should load new tab page', async ({ page }) => {
  await page.goto('chrome-extension://[ID]/new_tab.html');

  // Verify no console errors
  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  expect(errors).toHaveLength(0);
});

test('should render categories', async ({ page }) => {
  await page.goto('chrome-extension://[ID]/new_tab.html');

  const categories = await page.locator('.category-section').count();
  expect(categories).toBeGreaterThan(0);
});
```

### Option 3: Puppeteer

**Best for:** Chrome-specific E2E tests

**Pros:**
- Chrome DevTools Protocol
- Maintained by Google
- Excellent Chrome extension support
- Performance profiling

**Cons:**
- Chrome-only (vs Playwright multi-browser)

### Option 4: Axe-Core (ACCESSIBILITY)

**Best for:** Automated accessibility testing

**Pros:**
- Industry standard for a11y testing
- Integrates with Jest, Playwright, Puppeteer
- Catches 30-50% of WCAG issues automatically

**Setup:**
```bash
npm install --save-dev axe-core @axe-core/playwright
```

**Example Test:**
```javascript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test('should have no accessibility violations', async ({ page }) => {
  await page.goto('chrome-extension://[ID]/new_tab.html');
  await injectAxe(page);

  await checkA11y(page, null, {
    detailedReport: true,
    detailedReportOptions: { html: true }
  });
});
```

---

## 📋 Implementation Phases

### Phase 1: Core Unit Tests (HIGH PRIORITY) ⭐

**Estimated Time:** 4-6 hours
**Impact:** High - Catches bugs early, fast execution

**Tests to Implement:**

1. **URLUtils Tests** (30-60 min)
   - `isValidImageUrl()` - all protocols
   - `getEffectiveHostname()` - various URL formats
   - `getFaviconUrl()` - custom icons, fallbacks

2. **ErrorUtils Tests** (30-60 min)
   - `logError()` - stores errors correctly
   - `storeErrorLog()` - keeps last 50 only
   - `getErrorLogs()` - retrieves correctly
   - `clearErrorLogs()` - clears storage

3. **GeneralUtils Tests** (60 min)
   - `deepClone()` - handles all types
   - `compareVersions()` - version comparison
   - `generateUUID()` - format validation
   - `escapeHTML()` - XSS prevention

4. **DOMUtils Tests** (30-60 min)
   - `debounce()` - timing behavior
   - `showStatus()` - DOM manipulation

5. **DataSyncUtils Tests** (60-90 min)
   - `generateActiveDisplayData()` - manual mode
   - `generateActiveDisplayData()` - bookmark mode
   - Category ordering logic

6. **NOVATAB_MESSAGES Tests** (30 min)
   - All constants defined
   - No duplicates
   - All used in code

**Setup:**
```bash
npm init -y
npm install --save-dev jest @types/chrome jsdom
```

**package.json:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "jsdom",
    "setupFiles": ["./test/setup.js"],
    "collectCoverageFrom": [
      "*.js",
      "!node_modules/**",
      "!test/**"
    ]
  }
}
```

**test/setup.js** (Mock Chrome APIs):
```javascript
// Mock chrome.storage
global.chrome = {
  storage: {
    local: {
      get: jest.fn((keys, callback) => callback({})),
      set: jest.fn((data, callback) => callback && callback()),
      remove: jest.fn((keys, callback) => callback && callback())
    }
  },
  runtime: {
    getManifest: jest.fn(() => ({ version: '1.1.1' })),
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn()
    }
  },
  bookmarks: {
    getTree: jest.fn(),
    getChildren: jest.fn()
  }
};
```

### Phase 2: DOM & Integration Tests (MEDIUM PRIORITY)

**Estimated Time:** 4-6 hours
**Impact:** Medium - Validates UI behavior

**Tests to Implement:**

1. **Site Card Rendering** (60 min)
   - Creates correct HTML structure
   - Applies lazy loading classes
   - Sets correct attributes

2. **Category Rendering** (60 min)
   - Orders categories correctly
   - Handles empty categories
   - Respects category order

3. **Modal Behavior** (60 min)
   - Opens/closes correctly
   - Focus management
   - Keyboard handlers

4. **Storage Integration** (60-90 min)
   - Saves settings correctly
   - Loads settings on init
   - Handles quota exceeded

5. **Event Delegation** (60 min)
   - Context menu triggers
   - Button clicks propagate
   - No memory leaks

### Phase 3: E2E Tests (MEDIUM PRIORITY)

**Estimated Time:** 6-8 hours
**Impact:** Medium-High - Validates full workflows

**Tests to Implement:**

1. **Extension Installation** (60 min)
   - Loads without errors
   - Default settings applied
   - All resources load

2. **Add Category Flow** (60 min)
   - Add manual category
   - Add sites to category
   - Save and verify

3. **Bookmark Sync Flow** (90 min)
   - Select bookmark folder
   - Sync categories
   - Verify display

4. **Custom Icon Flow** (60 min)
   - Open modal
   - Set custom icon
   - Verify icon updates

5. **Settings Flow** (60 min)
   - Change appearance settings
   - Save settings
   - Verify changes persist

6. **Export/Import Flow** (60 min)
   - Export data
   - Clear data
   - Import data
   - Verify restoration

### Phase 4: Accessibility Tests (HIGH PRIORITY) ⭐

**Estimated Time:** 2-3 hours
**Impact:** High - Validates WCAG compliance

**Tests to Implement:**

1. **Axe-Core Automated Tests** (60 min)
   - Run on new tab page
   - Run on options page
   - Verify no violations

2. **Keyboard Navigation Tests** (60 min)
   - Tab order correct
   - ESC closes modal
   - Enter activates buttons
   - Focus restoration works

3. **ARIA Attributes Tests** (30-60 min)
   - All interactive elements labeled
   - Roles correct
   - Modal attributes present

### Phase 5: Performance Tests (LOW PRIORITY)

**Estimated Time:** 3-4 hours
**Impact:** Medium - Validates performance claims

**Tests to Implement:**

1. **Algorithm Performance** (60 min)
   - Category ordering with 100+ categories
   - Verify O(n) complexity

2. **Memory Leak Tests** (90 min)
   - Multiple renders
   - Event listener cleanup
   - Observer cleanup

3. **Lazy Loading Tests** (60 min)
   - Only visible favicons load
   - Progressive loading works
   - Observer fires correctly

### Phase 6: Visual Regression Tests (OPTIONAL)

**Estimated Time:** 4-6 hours
**Impact:** Low - Catches UI regressions

**Tools:**
- Percy.io (paid)
- Playwright screenshots + comparison
- Chromatic (paid)

---

## 💰 Cost-Benefit Analysis

### Total Implementation Time: 20-30 hours

**Benefits:**
- ✅ Catch bugs before users do
- ✅ Confidence in refactoring
- ✅ Faster development cycles
- ✅ Documentation via tests
- ✅ Regression prevention
- ✅ CI/CD integration ready

**Costs:**
- ⏰ Initial implementation time (20-30 hours)
- ⏰ Maintenance time (~10% ongoing)
- 💰 CI/CD costs (optional, GitHub Actions free tier)
- 💰 Visual testing tools (optional, Percy/Chromatic)

**ROI:**
- Break-even: After 2-3 major features
- Long-term: Saves 50-70% of manual testing time

---

## 🚀 Quick Start (Minimal Viable Testing)

If you want to start small, here's a 2-hour quick start:

### Step 1: Setup Jest (15 min)

```bash
npm init -y
npm install --save-dev jest @types/chrome jsdom
```

Add to package.json:
```json
{
  "scripts": {
    "test": "jest"
  }
}
```

### Step 2: Create Test Setup (15 min)

Create `test/setup.js` with Chrome API mocks (see Phase 1 above)

### Step 3: Write 5 Critical Tests (90 min)

1. **URLUtils.isValidImageUrl() XSS protection** (20 min)
2. **ErrorUtils.logError() stores errors** (15 min)
3. **GeneralUtils.deepClone() works correctly** (20 min)
4. **NOVATAB_MESSAGES all defined** (15 min)
5. **Category ordering is O(n)** (20 min)

### Step 4: Run Tests (5 min)

```bash
npm test
```

**Result:** ~60-70% confidence with 2 hours of work

---

## 📊 Testing Priority Matrix

| Test Type | Priority | Effort | Impact | ROI |
|-----------|----------|--------|--------|-----|
| Unit Tests (Utils) | ⭐⭐⭐ HIGH | Low | High | Excellent |
| Accessibility Tests | ⭐⭐⭐ HIGH | Low | High | Excellent |
| Integration Tests | ⭐⭐ MEDIUM | Medium | Medium | Good |
| E2E Tests | ⭐⭐ MEDIUM | High | High | Good |
| Performance Tests | ⭐ LOW | Medium | Medium | Fair |
| Visual Tests | ⭐ LOW | High | Low | Poor |

---

## 🎯 Recommended Approach

### For Immediate Value (This Week)
1. **Phase 1: Unit Tests** - Focus on utils.js (4-6 hours)
2. **Phase 4: Accessibility Tests** - Axe-core integration (2-3 hours)

**Total:** 6-9 hours for 70-80% confidence

### For Long-Term Quality (Next 2-4 Weeks)
1. Complete Phase 1 (Unit Tests)
2. Complete Phase 4 (A11y Tests)
3. Add Phase 3 (E2E Tests) for critical paths
4. Add Phase 2 (DOM Tests) for UI components

**Total:** 16-23 hours for 90% confidence

### For Production-Grade (Month 1-2)
1. All phases 1-5
2. CI/CD integration (GitHub Actions)
3. Pre-commit hooks
4. Coverage requirements (80%+)

**Total:** 25-35 hours for 95%+ confidence

---

## 📝 Sample Test Files

### tests/utils.test.js

```javascript
import { URLUtils, ErrorUtils, GeneralUtils } from '../utils.js';

describe('URLUtils', () => {
  describe('isValidImageUrl', () => {
    test('accepts HTTPS URLs', () => {
      expect(URLUtils.isValidImageUrl('https://example.com/icon.png')).toBe(true);
    });

    test('accepts HTTP URLs', () => {
      expect(URLUtils.isValidImageUrl('http://example.com/icon.png')).toBe(true);
    });

    test('accepts data:image URLs', () => {
      expect(URLUtils.isValidImageUrl('data:image/png;base64,iVBOR')).toBe(true);
    });

    test('rejects javascript: URLs', () => {
      expect(URLUtils.isValidImageUrl('javascript:alert(1)')).toBe(false);
    });

    test('rejects vbscript: URLs', () => {
      expect(URLUtils.isValidImageUrl('vbscript:msgbox')).toBe(false);
    });

    test('rejects data:text/html URLs', () => {
      expect(URLUtils.isValidImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    test('rejects empty string', () => {
      expect(URLUtils.isValidImageUrl('')).toBe(false);
    });

    test('rejects null', () => {
      expect(URLUtils.isValidImageUrl(null)).toBe(false);
    });
  });
});

describe('ErrorUtils', () => {
  beforeEach(() => {
    // Reset chrome.storage mock
    chrome.storage.local.get.mockClear();
    chrome.storage.local.set.mockClear();
  });

  test('logError stores error with context', async () => {
    const error = new Error('Test error');

    await ErrorUtils.logError(error, 'testFunction', { foo: 'bar' });

    expect(chrome.storage.local.set).toHaveBeenCalledWith(
      expect.objectContaining({
        errorLog: expect.arrayContaining([
          expect.objectContaining({
            message: 'Test error',
            context: 'testFunction',
            details: { foo: 'bar' }
          })
        ])
      })
    );
  });

  test('keeps only last 50 errors', async () => {
    // Mock 50 existing errors
    const existingErrors = Array(50).fill({ message: 'old error' });
    chrome.storage.local.get.mockImplementation((keys, callback) => {
      callback({ errorLog: existingErrors });
    });

    await ErrorUtils.logError(new Error('New error'), 'test');

    const setCall = chrome.storage.local.set.mock.calls[0][0];
    expect(setCall.errorLog).toHaveLength(50); // Should still be 50
    expect(setCall.errorLog[49].message).toBe('New error'); // Latest error at end
  });
});

describe('GeneralUtils', () => {
  test('deepClone creates independent copy', () => {
    const original = { nested: { value: 1 }, array: [1, 2, 3] };
    const cloned = GeneralUtils.deepClone(original);

    cloned.nested.value = 999;
    cloned.array.push(4);

    expect(original.nested.value).toBe(1); // Original unchanged
    expect(original.array).toEqual([1, 2, 3]); // Original unchanged
    expect(cloned.nested.value).toBe(999);
    expect(cloned.array).toEqual([1, 2, 3, 4]);
  });

  test('deepClone handles dates', () => {
    const original = { date: new Date('2025-01-01') };
    const cloned = GeneralUtils.deepClone(original);

    expect(cloned.date).toEqual(original.date);
    expect(cloned.date).not.toBe(original.date); // Different instance
  });
});
```

### tests/accessibility.test.js (with Playwright)

```javascript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('new tab page has no a11y violations', async ({ page }) => {
    await page.goto('chrome-extension://[ID]/new_tab.html');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('options page has no a11y violations', async ({ page }) => {
    await page.goto('chrome-extension://[ID]/options.html');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('modal has correct ARIA attributes', async ({ page }) => {
    await page.goto('chrome-extension://[ID]/new_tab.html');

    // Open modal
    await page.click('.site-card', { button: 'right' });
    await page.click('#set-custom-icon-ctx');

    const modal = page.locator('#custom-icon-modal');

    // Verify ARIA attributes
    expect(await modal.getAttribute('role')).toBe('dialog');
    expect(await modal.getAttribute('aria-modal')).toBe('true');
    expect(await modal.getAttribute('aria-labelledby')).toBe('modal-title');
  });

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('chrome-extension://[ID]/new_tab.html');

    // Open modal
    await page.click('.site-card', { button: 'right' });
    await page.click('#set-custom-icon-ctx');

    // Press ESC
    await page.keyboard.press('Escape');

    // Modal should be closed
    const modal = page.locator('#custom-icon-modal');
    expect(await modal.isVisible()).toBe(false);
  });
});
```

---

## 🔧 CI/CD Integration

Once tests are written, integrate with GitHub Actions:

### .github/workflows/test.yml

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm test

      - name: Run accessibility tests
        run: npm run test:a11y

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## ✅ Conclusion

**YES, testing CAN and SHOULD be automated!**

**Quick Win:** Start with Phase 1 (Unit Tests) - 4-6 hours for immediate value

**Best ROI:** Phase 1 + Phase 4 (Unit + A11y) - 6-9 hours for 70-80% confidence

**Production Ready:** All phases - 25-35 hours for 95%+ confidence

**Recommendation:** Start with unit tests for utils.js this week, then gradually add more coverage over the next month.

Would you like me to implement the Phase 1 unit tests now?
