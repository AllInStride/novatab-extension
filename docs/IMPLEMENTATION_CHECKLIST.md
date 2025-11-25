# NovaTab - Implementation Checklist

Quick reference checklist for implementing code review findings.

---

## ✅ Phase 1: Critical Fixes (BEFORE Chrome Web Store)
**Target: Complete in 1 session (4-6 hours)**

### File: new_tab.js
- [ ] Line 448: Replace `generateActiveDisplayData(fullAppData)` with `DataSyncUtils.generateActiveDisplayData(fullAppData, chrome.bookmarks)`

### File: manifest.json + HTML files
- [ ] Choose font strategy:
  - [ ] Option A: Download Inter font locally, remove Google Fonts from HTML
  - [ ] Option B: Update CSP to allow `style-src` and `font-src`
- [ ] Test font loading works correctly

### File: options.html
- [ ] Line 140: Update "Rate on Chrome Web Store" URL (add after extension published)
- [ ] Line 142: Update "Privacy Policy" to GitHub URL: `https://github.com/AllInStride/novatab-extension/blob/main/PRIVACY.md`
- [ ] Line 144: Update "Report an Issue" to: `https://github.com/AllInStride/novatab-extension/issues`
- [ ] Line 137: Update version to 1.1.1 OR make dynamic via JavaScript

### File: new_tab.js + options.js
- [ ] Add `isValidImageUrl()` function to ValidationUtils or URLUtils:
  ```javascript
  isValidImageUrl(url) {
      if (!url || typeof url !== 'string') return false;
      try {
          const urlObj = new URL(url);
          if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') return true;
          if (urlObj.protocol === 'data:') return url.startsWith('data:image/');
          return false;
      } catch { return false; }
  }
  ```
- [ ] Replace `URLUtils.isValidUrl()` with `URLUtils.isValidImageUrl()` for custom icon validation (new_tab.js:383, options.js:414-419)

### File: background.js
- [ ] Lines 120-149: Add debouncing to `handleBookmarkChange()`:
  ```javascript
  let bookmarkChangeTimeout = null;
  async function handleBookmarkChange(id, changeInfo) {
      if (bookmarkChangeTimeout) clearTimeout(bookmarkChangeTimeout);
      bookmarkChangeTimeout = setTimeout(async () => {
          // ... existing logic
      }, 500);
  }
  ```

### Testing
- [ ] Test custom icon saving works
- [ ] Test fonts load correctly
- [ ] Test footer links navigate correctly
- [ ] Test rapid bookmark changes don't cause issues
- [ ] Test malicious URL rejection (javascript:, data:text/html)
- [ ] Check console for errors
- [ ] Verify CSP compliance (no violations)

---

## ✅ Phase 2: Production Hardening
**Target: Complete in Week 1 post-launch (8-12 hours)**

### File: background.js / new file storage-utils-extended.js
- [ ] Create `safeStorageSet()` wrapper with quota checking
- [ ] Add warning at 90% quota
- [ ] Add user-friendly error messages for quota exceeded
- [ ] Replace all `chrome.storage.local.set()` calls with `safeStorageSet()`

### File: background.js or utils.js
- [ ] Create `cleanupOrphanedIconOverrides()` function
- [ ] Call on extension startup (onStartup listener)
- [ ] Call when bookmark folder changes
- [ ] Test with 100+ bookmarks, remove some, verify cleanup

### File: utils.js
- [ ] Verify `GeneralUtils.deepClone()` implementation
- [ ] Test with: undefined values, Dates, nested objects, arrays
- [ ] Consider using `structuredClone()` (Chrome 98+) as primary method
- [ ] Add fallback for edge cases

### File: new_tab.js
- [ ] Lines 162-186: Optimize `getOrderedCategories()` to use Set instead of array.includes()
- [ ] Test performance with 50+ categories
- [ ] Benchmark before/after

### File: new_tab.js
- [ ] Line 241: Implement event delegation for context menu
- [ ] Remove individual listeners on site cards
- [ ] Add single listener on categoriesContainer
- [ ] Test context menu still works correctly

### File: options.js
- [ ] Lines 466-476: Implement event delegation for manual item buttons
- [ ] Test add/remove category and site buttons

### Testing
- [ ] Monitor memory usage over 30 minutes of active use
- [ ] Test storage quota warnings
- [ ] Test with 100+ sites and categories
- [ ] Verify no memory leaks (Chrome DevTools Memory profiler)

---

## ✅ Phase 3: Quality & Accessibility
**Target: Complete in Weeks 2-3 (6-8 hours)**

### File: new_tab.html
- [ ] Add `role="menu"` to context menu
- [ ] Add `aria-label="Site options"` to context menu
- [ ] Add `role="menuitem"` to context menu items
- [ ] Add `role="dialog"` and `aria-modal="true"` to modal
- [ ] Add `aria-labelledby="modal-title"` to modal
- [ ] Add `id="modal-title"` to modal heading

### File: options.html
- [ ] Review all form inputs have associated `<label>` elements
- [ ] Add `aria-describedby` for input hints
- [ ] Add `role="status"` to status message (already present)
- [ ] Add `aria-live="polite"` to status message for screen readers

### File: new_tab.js
- [ ] Add ESC key handler to close modal and context menu
- [ ] Add Enter key handler on context menu items
- [ ] Add Tab navigation through context menu items
- [ ] Test with keyboard only (no mouse)
- [ ] Test with screen reader (VoiceOver on Mac, NVDA on Windows)

### File: options.js
- [ ] Add loading indicators to all async operations
- [ ] Add spinner/skeleton during initial data load
- [ ] Add "Saving..." state to save button
- [ ] Add "Refreshing..." state to refresh bookmark button

### File: new utils file or constants
- [ ] Create `NOVATAB_MESSAGES` constant with all user-facing strings
- [ ] Replace hardcoded strings throughout codebase
- [ ] Makes internationalization easier in future

### Testing
- [ ] Complete accessibility audit (Chrome Lighthouse)
- [ ] Test with keyboard navigation only
- [ ] Test with screen reader
- [ ] Verify WCAG 2.1 AA compliance
- [ ] Test color contrast ratios

---

## ✅ Phase 4: High-Value Features
**Target: Complete in Weeks 3-4 (15-20 hours)**

### Feature: Search/Filter (Priority 1)
- [ ] Add search input to new_tab.html
- [ ] Add search icon and styling
- [ ] Implement debounced filter logic
- [ ] Filter sites by name and URL
- [ ] Hide empty categories during search
- [ ] Add "No results found" message
- [ ] Test with 100+ sites
- [ ] Add keyboard shortcut (/) to focus search

### Feature: Keyboard Shortcuts (Priority 2)
- [ ] Add global keydown listener
- [ ] Implement / to focus search
- [ ] Implement Esc to close modals/menus
- [ ] Implement Ctrl/Cmd+K for search
- [ ] Add keyboard shortcut help modal (?)
- [ ] Document shortcuts in README
- [ ] Test on Mac and Windows

### Feature: Dark Mode Toggle (Priority 3)
- [ ] Add dark mode toggle to appearance settings
- [ ] Add three options: Auto, Light, Dark
- [ ] Store preference in chrome.storage
- [ ] Apply on page load before rendering
- [ ] Override system preference when manual mode selected
- [ ] Test transitions between modes
- [ ] Ensure good contrast in both modes

### Feature: First-Install Bookmark Import (Priority 4)
- [ ] Add check in handleFirstInstall() for existing bookmarks
- [ ] Create onboarding modal component
- [ ] Add "Import Bookmarks" and "Start Fresh" buttons
- [ ] Show modal on first new tab open
- [ ] Implement auto-import with user consent
- [ ] Test with various bookmark structures
- [ ] Don't show again after dismissed

### Design: Improved Animations
- [ ] Add hover lift effect to site cards
- [ ] Add modal fade-in animation
- [ ] Add loading skeleton screens
- [ ] Add empty state illustration/emoji
- [ ] Test performance (should maintain 60fps)
- [ ] Add prefers-reduced-motion media query support

### Design: Category Collapse
- [ ] Add collapse button to category headers
- [ ] Implement toggle functionality
- [ ] Store collapsed state in chrome.storage
- [ ] Restore collapsed state on page load
- [ ] Add smooth expand/collapse animation
- [ ] Test with many categories

### Testing
- [ ] Test each feature independently
- [ ] Test combinations (search + dark mode, etc.)
- [ ] Performance test with features enabled
- [ ] Get user feedback on new features

---

## ✅ Phase 5: Advanced Features (Optional)
**Target: Month 2+ (20-30 hours)**

### Feature: Site Usage Statistics
- [ ] Add click tracking to site cards
- [ ] Store click counts in chrome.storage
- [ ] Create statistics view in settings
- [ ] Display top 10 most-clicked sites
- [ ] Add "View Stats" button
- [ ] Add privacy notice (data stored locally only)
- [ ] Add ability to reset statistics

### Feature: Bulk Edit Mode
- [ ] Add "Edit" button to enter bulk mode
- [ ] Add checkboxes to each site card
- [ ] Add "Select All" / "Deselect All" buttons
- [ ] Add "Delete Selected" button
- [ ] Add "Move Selected to Category" dropdown
- [ ] Add confirmation dialogs
- [ ] Exit bulk mode when done

### Feature: Site Tags
- [ ] Extend site data model with tags array
- [ ] Add tag input UI in site editor
- [ ] Add tag display badges on site cards
- [ ] Add tag filter in search
- [ ] Create tag management UI (add, remove, rename tags)
- [ ] Add tag suggestions based on existing tags
- [ ] Test tag migration from old data

### Feature: Category Export/Import
- [ ] Add "Export" button to each category in settings
- [ ] Implement category JSON export
- [ ] Add "Import Category" button
- [ ] Parse and validate imported category JSON
- [ ] Generate new IDs to avoid conflicts
- [ ] Add success/error messages
- [ ] Test with various category sizes

### Feature: Theme Presets
- [ ] Create THEME_PRESETS constant with 5-10 themes
- [ ] Add theme dropdown to appearance settings
- [ ] Add theme preview images
- [ ] Implement apply theme function
- [ ] Allow customization after applying preset
- [ ] Add "Create Custom Theme" option
- [ ] Consider community theme sharing

### Testing
- [ ] Full regression test of all features
- [ ] Performance test with all features enabled
- [ ] Test on various screen sizes
- [ ] Test with large datasets (1000+ sites)

---

## ✅ Testing & QA
**Ongoing throughout all phases**

### Automated Testing
- [ ] Set up Jest test framework
- [ ] Write tests for URLUtils (10+ test cases)
- [ ] Write tests for ValidationUtils (10+ test cases)
- [ ] Write tests for DataSyncUtils.generateActiveDisplayData
- [ ] Write tests for migration functions
- [ ] Write tests for deep clone
- [ ] Set up CI/CD to run tests on commit
- [ ] Aim for 70%+ code coverage

### Manual Testing Checklist
- [ ] Test on fresh Chrome profile
- [ ] Test bookmark permissions (grant/deny/revoke)
- [ ] Test with 0, 1, 10, 100, 500 bookmarks
- [ ] Test with long site names (100+ characters)
- [ ] Test with emoji and unicode characters
- [ ] Test with special URLs (localhost, IP addresses, ports)
- [ ] Test export/import with large datasets (>1MB)
- [ ] Test storage quota limits (fill to 90%+)
- [ ] Test on low-end hardware (CPU throttle 4x)
- [ ] Test on slow network (3G throttling)
- [ ] Test all keyboard shortcuts
- [ ] Test screen reader (VoiceOver/NVDA)
- [ ] Verify no CSP errors in console
- [ ] Test incognito mode behavior
- [ ] Test with multiple Chrome windows
- [ ] Test rapid clicking/keyboard spamming
- [ ] Test browser restart (data persistence)

### Cross-Browser Testing
- [ ] Chrome latest (primary target)
- [ ] Chrome latest-1 (for compatibility)
- [ ] Edge (Chromium)
- [ ] Brave
- [ ] Test on Windows
- [ ] Test on Mac
- [ ] Test on Linux (if available)

### Performance Testing
- [ ] Measure initial load time (target: <500ms)
- [ ] Measure render time with 100 sites (target: <1000ms)
- [ ] Check memory usage over 1 hour (should be stable)
- [ ] Check for memory leaks (use Chrome DevTools)
- [ ] Profile CPU usage (should be minimal when idle)
- [ ] Test favicon loading performance
- [ ] Test with network throttling

### Security Testing
- [ ] Attempt XSS via custom icon URL (should be blocked)
- [ ] Attempt XSS via site name (should be escaped)
- [ ] Attempt XSS via category name (should be escaped)
- [ ] Test CSP compliance (no violations)
- [ ] Verify no external requests except documented
- [ ] Test permissions (should only request what's needed)
- [ ] Review for sensitive data exposure
- [ ] Test import with malicious JSON (should validate)

---

## 📋 Pre-Submission Checklist

### Before Chrome Web Store Submission
- [ ] All Phase 1 (Critical) items completed
- [ ] Version number correct everywhere (manifest, HTML, docs)
- [ ] All footer links working
- [ ] Privacy policy accessible and accurate
- [ ] No console errors or warnings
- [ ] No CSP violations
- [ ] Tested on fresh Chrome profile
- [ ] Screenshots prepared (1280x800 or 640x400)
- [ ] Promotional images prepared (if needed)
- [ ] Store listing description written
- [ ] Store listing images uploaded
- [ ] Privacy policy uploaded to store
- [ ] Support email configured
- [ ] Permissions justified in description
- [ ] Test build uploaded and tested
- [ ] Final production build created
- [ ] Git tag created for release (v1.1.1)
- [ ] GitHub release notes written
- [ ] Backup of current Chrome Web Store listing (if updating)

### Post-Submission
- [ ] Monitor Chrome Web Store review status
- [ ] Respond to reviewer feedback within 24 hours
- [ ] Test published extension works correctly
- [ ] Monitor error logs and user feedback
- [ ] Plan Phase 2 implementation based on feedback

---

## 📊 Progress Tracking

### Phase 1: Critical Fixes
**Status:** Not Started
**Completion:** 0/6 tasks
**Estimated Hours:** 4-6
**Actual Hours:** ___

### Phase 2: Production Hardening
**Status:** Not Started
**Completion:** 0/7 tasks
**Estimated Hours:** 8-12
**Actual Hours:** ___

### Phase 3: Quality & Accessibility
**Status:** Not Started
**Completion:** 0/6 task groups
**Estimated Hours:** 6-8
**Actual Hours:** ___

### Phase 4: High-Value Features
**Status:** Not Started
**Completion:** 0/6 features
**Estimated Hours:** 15-20
**Actual Hours:** ___

### Phase 5: Advanced Features
**Status:** Not Started
**Completion:** 0/5 features
**Estimated Hours:** 20-30
**Actual Hours:** ___

---

**Last Updated:** 2025-11-23
**Next Review:** After Phase 1 completion
