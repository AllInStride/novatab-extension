# Parallel Agent Execution Plan - Critical & High Priority Fixes

**Target:** Fix all Part 1 (Critical) and Part 2 (High Priority) issues from code review
**Execution Strategy:** Maximum parallelization with dependency management
**Total Issues:** 3 Critical + 8 High Priority = 11 issues
**Estimated Total Time:** 8-12 hours (with parallelization: 3-4 hours wall-clock time)

---

## Dependency Analysis

### Independent Tasks (Can run in parallel)
These tasks have no dependencies and can execute simultaneously:

**Batch 1A - Critical Fixes (Independent):**
1. ✅ Fix missing `generateActiveDisplayData` call (new_tab.js)
2. ✅ Update placeholder URLs in footer (options.html)
3. ✅ Fix version display (options.html)

**Batch 1B - High Priority Fixes (Independent):**
4. ✅ Add XSS protection for custom icon URLs (utils.js + new_tab.js + options.js)
5. ✅ Add debouncing to bookmark change handler (background.js)
6. ✅ Implement storage quota checking (new file + updates)
7. ✅ Add icon override cleanup (background.js or utils.js)
8. ✅ Optimize category ordering algorithm (new_tab.js)

### Sequential Tasks (Dependencies exist)
**Batch 2 - After Font Strategy Decision:**
9. ⏸️ Resolve CSP font loading issue (manifest.json + HTML files)
   - **Dependency:** Requires user decision on local vs external fonts

**Batch 3 - After Core Utilities Complete:**
10. ⏸️ Verify/fix deep clone implementation (utils.js)
    - **Dependency:** May need to review existing implementation first
11. ⏸️ Implement event delegation for memory leaks (new_tab.js + options.js)
    - **Dependency:** Can run after other new_tab.js changes to avoid conflicts

---

## Execution Plan

### Phase 1: User Decision Required (5 minutes)

**Question for User:**
CSP Font Loading Strategy - Which approach do you prefer?

**Option A (Recommended):** Use local fonts
- Download Inter font files to `fonts/` directory
- Remove Google Fonts from HTML
- Update CSS to reference local fonts
- **Pros:** Faster, privacy-friendly, no CSP issues, works offline
- **Cons:** ~200KB font files added to extension package

**Option B:** Update CSP for external fonts
- Update manifest.json CSP to allow `style-src` and `font-src`
- Keep Google Fonts in HTML
- **Pros:** Smaller extension package, auto-updated fonts
- **Cons:** Requires internet, potential privacy concern, CSP complexity

**User Decision Needed:** A or B?

---

### Phase 2: Parallel Batch 1 (3 Critical + 5 High Priority) - 2-3 hours

Run these **8 agents in parallel** immediately after user decision:

#### Agent 1: Fix generateActiveDisplayData Call
**File:** `new_tab.js`
**Severity:** 🔴 CRITICAL
**Task:**
- Line 448: Replace `await generateActiveDisplayData(fullAppData)` with `await DataSyncUtils.generateActiveDisplayData(fullAppData, chrome.bookmarks)`
- Verify function is imported/available
- Test custom icon saving functionality

**Verification:**
- Code compiles without errors
- Custom icon modal opens
- Icon can be saved without runtime errors

**Estimated Time:** 15-20 minutes

---

#### Agent 2: Update Placeholder URLs
**File:** `options.html`
**Severity:** 🔴 CRITICAL
**Task:**
- Line 140: Update Rate on Chrome Web Store (placeholder for now: `#rate` with TODO comment)
- Line 142: Update Privacy Policy to `https://github.com/AllInStride/novatab-extension/blob/main/PRIVACY.md`
- Line 144: Update Report Issue to `https://github.com/AllInStride/novatab-extension/issues`
- Line 137: Update version to 1.1.1 OR make dynamic

**For dynamic version:**
```javascript
// Add to options.js initialization
const manifest = chrome.runtime.getManifest();
document.getElementById('extension-version').textContent = manifest.version;
```

**Verification:**
- Privacy Policy link opens correct GitHub page
- Report Issue link opens GitHub Issues
- Version displays correctly

**Estimated Time:** 15-20 minutes

---

#### Agent 3: Add XSS Protection for URLs
**Files:** `utils.js`, `new_tab.js`, `options.js`
**Severity:** 🟠 HIGH
**Task:**

**Step 1:** Add to `URLUtils` or `ValidationUtils` in `utils.js`:
```javascript
/**
 * Validates if a URL is safe for use as an image source.
 * Only allows http, https, and data:image/ URLs.
 * Blocks javascript:, vbscript:, data:text/html, etc.
 *
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is safe for image use
 * @example
 * isValidImageUrl('https://example.com/icon.png') // true
 * isValidImageUrl('javascript:alert(1)') // false
 * isValidImageUrl('data:image/png;base64,...') // true
 * isValidImageUrl('data:text/html,<script>alert(1)</script>') // false
 */
isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;

    try {
        const urlObj = new URL(url);

        // Allow http and https
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
            return true;
        }

        // Allow data URLs only for images
        if (urlObj.protocol === 'data:') {
            return url.toLowerCase().startsWith('data:image/');
        }

        // Block everything else (javascript:, vbscript:, file:, etc.)
        return false;
    } catch {
        return false;
    }
}
```

**Step 2:** Update `new_tab.js:383`:
```javascript
// OLD:
if (newIconUrl && !URLUtils.isValidUrl(newIconUrl)) {

// NEW:
if (newIconUrl && !URLUtils.isValidImageUrl(newIconUrl)) {
```

**Step 3:** Update `options.js` (find similar validation around lines 414-419)

**Step 4:** Add JSDoc to the new function

**Verification:**
- Test with valid URLs (https://example.com/icon.png) - should accept
- Test with javascript:alert(1) - should reject
- Test with data:text/html,<script>alert(1)</script> - should reject
- Test with data:image/png;base64,... - should accept
- User sees appropriate error messages

**Estimated Time:** 30-40 minutes

---

#### Agent 4: Add Bookmark Change Debouncing
**File:** `background.js`
**Severity:** 🟠 HIGH
**Task:**

Replace lines 120-149 with debounced version:

```javascript
// Bookmark change handling with debouncing
let bookmarkChangeTimeout = null;

chrome.bookmarks.onCreated.addListener(handleBookmarkChange);
chrome.bookmarks.onRemoved.addListener(handleBookmarkChange);
chrome.bookmarks.onChanged.addListener(handleBookmarkChange);
chrome.bookmarks.onMoved.addListener(handleBookmarkChange);

/**
 * Handles bookmark changes with debouncing to prevent race conditions.
 * Waits 500ms after last change before regenerating activeDisplayData.
 *
 * @param {string} id - Bookmark ID that changed
 * @param {Object} changeInfo - Change information
 */
async function handleBookmarkChange(id, changeInfo) {
    // Clear existing timeout
    if (bookmarkChangeTimeout) {
        clearTimeout(bookmarkChangeTimeout);
    }

    // Debounce: wait 500ms after last change
    bookmarkChangeTimeout = setTimeout(async () => {
        try {
            const storageResult = await StorageUtils.get(NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA);
            const currentAppData = storageResult.appData;

            if (currentAppData?.activeMode === 'bookmarks' && currentAppData?.bookmarks?.folderId) {
                console.log('NovaTab: Bookmarks changed, generating new activeDisplayData...');

                const newActiveDisplayData = await DataSyncUtils.generateActiveDisplayData(
                    currentAppData,
                    chrome.bookmarks
                );

                await StorageUtils.set({
                    [NOVATAB_CONSTANTS.STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: newActiveDisplayData
                });

                console.log('NovaTab: Updated activeDisplayData saved due to bookmark change.');
            }
        } catch (error) {
            console.error('NovaTab: Error handling bookmark change:', error);
            ErrorUtils.logError(error, 'handleBookmarkChange');
        }
    }, 500);
}
```

**Verification:**
- Rapidly create 10 bookmarks in succession
- Verify only one `generateActiveDisplayData` call happens
- Check console logs show debouncing working
- Verify final state is correct

**Estimated Time:** 20-30 minutes

---

#### Agent 5: Implement Storage Quota Checking
**Files:** New `storage-utils-extended.js` + updates to multiple files
**Severity:** 🟠 HIGH
**Task:**

**Step 1:** Create new file `storage-utils-extended.js`:
```javascript
/**
 * Extended storage utilities with quota management.
 * Extends StorageUtils from utils.js with safety checks.
 */

const StorageManager = {
    /**
     * Chrome local storage quota in bytes (approximately 10MB).
     */
    QUOTA_BYTES: 10485760, // 10 * 1024 * 1024

    /**
     * Warning threshold as percentage of quota (90%).
     */
    WARNING_THRESHOLD: 0.9,

    /**
     * Checks current storage usage and available space.
     *
     * @returns {Promise<Object>} Storage usage information
     * @example
     * const usage = await StorageManager.checkUsage();
     * console.log(`Using ${usage.percentUsed}% of storage`);
     */
    async checkUsage() {
        try {
            const bytesInUse = await chrome.storage.local.getBytesInUse();
            const percentUsed = (bytesInUse / this.QUOTA_BYTES) * 100;
            const available = this.QUOTA_BYTES - bytesInUse;

            return {
                bytesInUse,
                quota: this.QUOTA_BYTES,
                available,
                percentUsed: percentUsed.toFixed(2),
                isNearLimit: percentUsed >= this.WARNING_THRESHOLD * 100
            };
        } catch (error) {
            console.error('NovaTab: Error checking storage usage:', error);
            return null;
        }
    },

    /**
     * Safely sets data in storage with quota checking.
     * Shows user-friendly errors if quota exceeded.
     *
     * @param {Object} data - Data to store
     * @returns {Promise<Object>} Result object with success/error
     * @example
     * const result = await StorageManager.safeSet({ key: 'value' });
     * if (!result.success) alert(result.error);
     */
    async safeSet(data) {
        try {
            // Check quota before attempting save
            const usage = await this.checkUsage();

            if (usage && usage.isNearLimit) {
                console.warn('NovaTab: Storage nearly full:', usage.percentUsed + '%');
            }

            if (usage && usage.percentUsed >= 100) {
                return {
                    success: false,
                    error: 'Storage quota exceeded. Please export your data and reset settings.',
                    code: 'QUOTA_EXCEEDED'
                };
            }

            // Attempt to save
            await chrome.storage.local.set(data);

            return { success: true };

        } catch (error) {
            // Handle quota exceeded error
            if (error.message && error.message.includes('QUOTA_BYTES')) {
                return {
                    success: false,
                    error: 'Storage quota exceeded. Please export your data and reset settings.',
                    code: 'QUOTA_EXCEEDED'
                };
            }

            // Handle other errors
            return {
                success: false,
                error: `Failed to save: ${error.message}`,
                code: 'UNKNOWN_ERROR'
            };
        }
    },

    /**
     * Shows storage usage warning to user if near limit.
     *
     * @param {HTMLElement} statusElement - Element to display message
     */
    async showUsageWarningIfNeeded(statusElement) {
        const usage = await this.checkUsage();

        if (usage && usage.isNearLimit) {
            const message = `Storage ${usage.percentUsed}% full. Consider exporting data.`;
            if (statusElement && DOMUtils?.showStatus) {
                DOMUtils.showStatus(statusElement, message, 'info', 10000);
            }
        }
    }
};
```

**Step 2:** Add script tag to HTML files:
```html
<!-- In new_tab.html and options.html, after utils.js -->
<script src="storage-utils-extended.js"></script>
```

**Step 3:** Update `options.js` to use `StorageManager.safeSet()`:
Find `handleSaveAllSettings()` function and replace:
```javascript
// OLD:
await chrome.storage.local.set({
    appData: fullAppData,
    // ...
});

// NEW:
const result = await StorageManager.safeSet({
    appData: fullAppData,
    appSettings: appSettings,
    activeDisplayData: newActiveDisplayData
});

if (!result.success) {
    DOMUtils.showStatus(elements.statusMessageUI, result.error, STATUS_TYPES.ERROR);
    setLoadingState(false);
    return;
}
```

**Step 4:** Add usage check on options page load:
```javascript
// In initialize() function
await StorageManager.showUsageWarningIfNeeded(elements.statusMessageUI);
```

**Verification:**
- Check storage usage in normal operation
- Simulate near-quota condition (use DevTools to set large data)
- Verify warning appears at 90%+
- Verify error appears at 100%
- Verify user-friendly error messages

**Estimated Time:** 45-60 minutes

---

#### Agent 6: Add Icon Override Cleanup
**File:** `background.js` or `utils.js`
**Severity:** 🟠 HIGH
**Task:**

**Step 1:** Add cleanup function to `background.js`:
```javascript
/**
 * Cleans up orphaned icon overrides for bookmarks that no longer exist.
 * Runs periodically to prevent unbounded storage growth.
 *
 * @returns {Promise<number>} Number of overrides cleaned up
 */
async function cleanupOrphanedIconOverrides() {
    try {
        const storageResult = await StorageUtils.get(NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA);
        const appData = storageResult.appData;

        // Only cleanup in bookmarks mode
        if (!appData?.bookmarks?.iconOverrides || !appData?.bookmarks?.folderId) {
            return 0;
        }

        console.log('NovaTab: Starting icon override cleanup...');

        // Build set of current bookmark URLs
        const activeUrls = new Set();
        const activeData = await DataSyncUtils.generateActiveDisplayData(appData, chrome.bookmarks);

        activeData.categories.forEach(cat => {
            cat.sites.forEach(site => {
                activeUrls.add(site.url);
            });
        });

        // Remove overrides for non-existent URLs
        let cleaned = 0;
        const iconOverrides = appData.bookmarks.iconOverrides;

        Object.keys(iconOverrides).forEach(url => {
            if (!activeUrls.has(url)) {
                delete iconOverrides[url];
                cleaned++;
            }
        });

        // Save if anything was cleaned
        if (cleaned > 0) {
            console.log(`NovaTab: Cleaned ${cleaned} orphaned icon overrides`);
            await StorageUtils.set({
                [NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA]: appData
            });
        } else {
            console.log('NovaTab: No orphaned icon overrides found');
        }

        return cleaned;

    } catch (error) {
        console.error('NovaTab: Error during icon override cleanup:', error);
        ErrorUtils.logError(error, 'cleanupOrphanedIconOverrides');
        return 0;
    }
}
```

**Step 2:** Call on extension startup:
```javascript
chrome.runtime.onStartup.addListener(async () => {
    console.log('NovaTab: Extension starting up');
    await cleanupOrphanedIconOverrides();
});
```

**Step 3:** Call when bookmark folder changes (in `handleBookmarkFolderSelectionChange` if it exists in options.js or during save):
```javascript
// After bookmark folder changes
await cleanupOrphanedIconOverrides();
```

**Verification:**
- Create bookmarks with custom icons
- Delete some bookmarks
- Trigger cleanup manually
- Verify orphaned icon overrides are removed
- Check storage size before/after
- Verify active icons still work

**Estimated Time:** 30-40 minutes

---

#### Agent 7: Optimize Category Ordering Algorithm
**File:** `new_tab.js`
**Severity:** 🟠 HIGH
**Task:**

Replace `getOrderedCategories()` function (lines 162-186) with optimized version:

```javascript
/**
 * Orders categories based on categoryOrder preference.
 * Optimized with Set for O(n) complexity instead of O(n²).
 *
 * @returns {Array} Ordered array of categories with sites
 */
function getOrderedCategories() {
    if (!appDataForDisplay.categories) return [];

    const categoryMap = new Map(appDataForDisplay.categories.map(cat => [cat.id, cat]));
    const orderedCategories = [];
    const usedIds = new Set(); // O(1) lookup instead of O(n) with includes()

    // Add categories in specified order
    if (appDataForDisplay.categoryOrder?.length) {
        appDataForDisplay.categoryOrder.forEach(catId => {
            if (categoryMap.has(catId)) {
                orderedCategories.push(categoryMap.get(catId));
                usedIds.add(catId); // Track used IDs
            }
        });
    }

    // Add remaining categories not in order (O(n) instead of O(n²))
    appDataForDisplay.categories.forEach(cat => {
        if (!usedIds.has(cat.id)) { // O(1) Set lookup
            orderedCategories.push(cat);
        }
    });

    return orderedCategories.filter(cat => cat?.sites?.length > 0);
}
```

**Verification:**
- Test with 0, 1, 10, 50 categories
- Benchmark performance before/after with console.time
- Verify category order is correct
- Verify unordered categories appear at end
- Check no categories are missing

**Estimated Time:** 20-30 minutes

---

#### Agent 8: Fix Version Display
**File:** `options.html` and `options.js`
**Severity:** 🟠 HIGH
**Task:**

**Option 1 (Recommended): Dynamic version**

In `options.js`, add to initialization:
```javascript
// In initialize() function, after line 120
const manifest = chrome.runtime.getManifest();
const versionElement = document.getElementById('extension-version');
if (versionElement) {
    versionElement.textContent = manifest.version;
}
```

**Option 2: Update hardcoded version**

In `options.html` line 137:
```html
<!-- OLD: -->
<span id="extension-version">1.1.0</span>

<!-- NEW: -->
<span id="extension-version">1.1.1</span>
```

Use Option 1 (dynamic) to prevent this issue in future versions.

**Verification:**
- Open options page
- Verify version shows 1.1.1
- Update manifest.json to 1.1.2 (test)
- Reload extension
- Verify version auto-updates to 1.1.2
- Revert manifest.json to 1.1.1

**Estimated Time:** 10-15 minutes

---

### Phase 3: Font Strategy Implementation (30-45 minutes)

**Based on user decision, run ONE of these agents:**

#### Agent 9A: Implement Local Fonts (IF user chose Option A)
**Files:** `manifest.json`, `new_tab.html`, `options.html`, `new fonts/` directory
**Severity:** 🔴 CRITICAL
**Task:**

**Step 1:** Download Inter font files:
- Go to https://fonts.google.com/specimen/Inter
- Download font family
- Extract: Inter-Regular.woff2, Inter-Medium.woff2, Inter-SemiBold.woff2, Inter-Bold.woff2
- Create `fonts/` directory in extension root
- Copy .woff2 files to `fonts/`

**Step 2:** Create `fonts/fonts.css`:
```css
@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 400;
    font-display: swap;
    src: url('Inter-Regular.woff2') format('woff2');
}

@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 500;
    font-display: swap;
    src: url('Inter-Medium.woff2') format('woff2');
}

@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 600;
    font-display: swap;
    src: url('Inter-SemiBold.woff2') format('woff2');
}

@font-face {
    font-family: 'Inter';
    font-style: normal;
    font-weight: 700;
    font-display: swap;
    src: url('Inter-Bold.woff2') format('woff2');
}
```

**Step 3:** Update HTML files:
```html
<!-- new_tab.html and options.html -->
<!-- OLD: -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

<!-- NEW: -->
<link rel="stylesheet" href="fonts/fonts.css">
```

**Step 4:** Update manifest.json:
```json
"web_accessible_resources": [
    {
        "resources": [
            "icons/*.png",
            "fonts/*.woff2"
        ],
        "matches": ["<all_urls>"]
    }
]
```

**Step 5:** No CSP changes needed (already allows 'self')

**Verification:**
- Load extension
- Open new tab and options page
- Verify Inter font loads (check DevTools Network tab)
- Verify no CSP errors in console
- Verify font rendering looks correct
- Test offline (disable network, reload)

**Estimated Time:** 30-45 minutes

---

#### Agent 9B: Update CSP for External Fonts (IF user chose Option B)
**File:** `manifest.json`
**Severity:** 🔴 CRITICAL
**Task:**

Update `content_security_policy` in manifest.json:

```json
// OLD:
"content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://www.google.com/ https://fonts.googleapis.com/ https://fonts.gstatic.com/;"
}

// NEW:
"content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; style-src 'self' https://fonts.googleapis.com/; font-src https://fonts.gstatic.com/; connect-src https://www.google.com/;"
}
```

**Verification:**
- Load extension
- Open new tab and options page
- Verify Inter font loads from Google Fonts
- Verify no CSP errors in console
- Check DevTools Network tab shows fonts loading
- Verify font rendering looks correct

**Estimated Time:** 10-15 minutes

---

### Phase 4: Deep Clone Verification (20-30 minutes)

#### Agent 10: Verify Deep Clone Implementation
**File:** `utils.js`
**Severity:** 🟠 HIGH
**Task:**

**Step 1:** Locate `GeneralUtils.deepClone()` function in utils.js

**Step 2:** Review implementation. If using `JSON.parse(JSON.stringify())`, replace with:

```javascript
/**
 * Creates a deep clone of an object, handling nested objects and arrays.
 * Uses structuredClone API (Chrome 98+) with fallback for older browsers.
 *
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned object
 * @example
 * const original = { nested: { value: 1 }, date: new Date() };
 * const cloned = GeneralUtils.deepClone(original);
 * cloned.nested.value = 2;
 * console.log(original.nested.value); // Still 1
 */
deepClone(obj) {
    // Handle null and non-objects
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Try modern structuredClone API first (Chrome 98+, Manifest V3 always has it)
    try {
        return structuredClone(obj);
    } catch (error) {
        console.warn('NovaTab: structuredClone failed, using fallback:', error);
    }

    // Fallback for unsupported types in structuredClone
    // Handle Date
    if (obj instanceof Date) {
        return new Date(obj.getTime());
    }

    // Handle Array
    if (obj instanceof Array) {
        return obj.map(item => this.deepClone(item));
    }

    // Handle Object
    const clonedObj = {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            clonedObj[key] = this.deepClone(obj[key]);
        }
    }

    return clonedObj;
}
```

**Step 3:** Add test cases (inline comments or separate test file):

```javascript
// Test cases for deepClone:
// 1. Primitive values: deepClone(5) === 5
// 2. Simple object: deepClone({a:1}) !== original but equals
// 3. Nested object: modifications don't affect original
// 4. Array: deepClone([1,2,3]) creates new array
// 5. Date: deepClone(new Date()) creates new Date with same time
// 6. Undefined values: preserved in objects
// 7. Null: returns null
// 8. Mixed nested: {arr: [1, {nested: 'value'}], date: new Date()}
```

**Verification:**
- Test with nested objects (3+ levels deep)
- Test with arrays containing objects
- Test with Date objects
- Test with undefined values
- Verify no shared references between clone and original
- Verify modifying clone doesn't affect original

**Estimated Time:** 20-30 minutes

---

### Phase 5: Event Delegation for Memory Leaks (45-60 minutes)

Run these **2 agents in parallel**:

#### Agent 11A: Event Delegation in new_tab.js
**File:** `new_tab.js`
**Severity:** 🟠 HIGH
**Task:**

**Step 1:** Remove individual listener in `createSiteCard()` (line 241):
```javascript
// DELETE THIS LINE:
siteCard.addEventListener('contextmenu', handleSiteContextMenu);
```

**Step 2:** Add event delegation in `setupEventListeners()`:
```javascript
function setupEventListeners() {
    // ... existing listeners

    // Context menu event delegation (replaces individual listeners)
    if (categoriesContainer) {
        categoriesContainer.addEventListener('contextmenu', (e) => {
            const siteCard = e.target.closest('.site-card');
            if (siteCard) {
                e.preventDefault();
                handleSiteContextMenu(e, siteCard);
            }
        });
    }

    // ... rest of setup
}
```

**Step 3:** Update `handleSiteContextMenu` signature:
```javascript
// OLD:
function handleSiteContextMenu(e) {
    e.preventDefault();

    currentSiteForModal = {
        categoryId: e.currentTarget.dataset.categoryId,
        // ...
    };

// NEW:
function handleSiteContextMenu(e, siteCard) {
    // e.preventDefault() already called in delegation handler

    currentSiteForModal = {
        categoryId: siteCard.dataset.categoryId,
        siteUrl: siteCard.dataset.siteUrl,
        siteName: siteCard.dataset.siteName,
        isBookmarkSiteContext: siteCard.dataset.isBookmarkSite === 'true'
    };

    // ... rest of function unchanged
}
```

**Verification:**
- Right-click site cards
- Verify context menu appears
- Verify custom icon modal works
- Test with rapid page reloads (10+ times)
- Check memory usage in Chrome DevTools (should not grow)
- Profile memory with DevTools Memory profiler

**Estimated Time:** 25-30 minutes

---

#### Agent 11B: Event Delegation in options.js
**File:** `options.js`
**Severity:** 🟠 HIGH
**Task:**

**Step 1:** Remove individual listeners in `addEventListenersToManualItems()` (lines 466-476):
```javascript
// REPLACE THIS ENTIRE FUNCTION:
function addEventListenersToManualItems() {
    document.querySelectorAll('.remove-manual-category-btn').forEach(btn => {
        btn.onclick = handleRemoveManualCategory;
    });

    document.querySelectorAll('.add-manual-site-btn').forEach(btn => {
        btn.onclick = handleAddManualSite;
    });

    document.querySelectorAll('.remove-manual-site-btn').forEach(btn => {
        btn.onclick = handleRemoveManualSite;
    });
}

// WITH EVENT DELEGATION VERSION:
function addEventListenersToManualItems() {
    // Event delegation - single listener on container handles all buttons
    if (!elements.manualCategoriesListUI) return;

    // Remove old listener if exists (prevent duplicates on re-render)
    if (elements.manualCategoriesListUI._delegateListener) {
        elements.manualCategoriesListUI.removeEventListener(
            'click',
            elements.manualCategoriesListUI._delegateListener
        );
    }

    // Create new delegate listener
    const delegateListener = (e) => {
        const target = e.target;

        if (target.classList.contains('remove-manual-category-btn')) {
            handleRemoveManualCategory(e);
        } else if (target.classList.contains('add-manual-site-btn')) {
            handleAddManualSite(e);
        } else if (target.classList.contains('remove-manual-site-btn')) {
            handleRemoveManualSite(e);
        }
    };

    // Store reference for later removal
    elements.manualCategoriesListUI._delegateListener = delegateListener;

    // Add single delegated listener
    elements.manualCategoriesListUI.addEventListener('click', delegateListener);
}
```

**Step 2:** Verify handlers still work (they should - they already use `e.target.closest()`):
- `handleRemoveManualCategory` - no changes needed
- `handleAddManualSite` - no changes needed
- `handleRemoveManualSite` - no changes needed

**Verification:**
- Add/remove categories
- Add/remove sites
- Test all buttons work correctly
- Re-render list multiple times
- Check memory doesn't grow with repeated renders
- Profile memory with DevTools

**Estimated Time:** 20-30 minutes

---

## Execution Summary

### Parallel Execution Groups

**Group 1 (Run immediately after font decision):**
- Agents 1, 2, 3, 4, 5, 6, 7, 8 (8 agents in parallel)
- Estimated wall-clock time: 45-60 minutes (longest agent is Agent 5 at 60 min)

**Group 2 (Run after font decision):**
- Agent 9A OR 9B (1 agent)
- Estimated time: 10-45 minutes depending on choice

**Group 3 (Run after Group 1 completes):**
- Agent 10 (1 agent)
- Estimated time: 20-30 minutes

**Group 4 (Run after Agent 10 and all new_tab.js/options.js changes):**
- Agents 11A, 11B (2 agents in parallel)
- Estimated time: 25-30 minutes

### Total Time Estimate

**Sequential execution:** 8-12 hours
**Parallel execution:** 2.5-3.5 hours wall-clock time

**Breakdown:**
- Phase 1 (decision): 5 minutes
- Phase 2 (Group 1): 60 minutes
- Phase 3 (Group 2): 10-45 minutes
- Phase 4 (Group 3): 30 minutes
- Phase 5 (Group 4): 30 minutes

**Total: ~2.5-3.5 hours**

---

## Testing & Verification Plan

### After Each Agent Completes
- [ ] Agent reports success/failure
- [ ] Code compiles without errors
- [ ] Specific verification tests pass
- [ ] No console errors
- [ ] Changes committed to git (optional)

### After All Agents Complete

**Comprehensive Testing:**
- [ ] Load extension in fresh Chrome profile
- [ ] Test all critical paths:
  - [ ] Custom icon saving
  - [ ] Bookmark changes
  - [ ] Storage operations
  - [ ] Category ordering
  - [ ] Footer links
  - [ ] Version display
- [ ] Performance testing:
  - [ ] Memory profiling (no leaks)
  - [ ] Fast category ordering with 50+ categories
  - [ ] No race conditions with rapid bookmark changes
- [ ] Security testing:
  - [ ] XSS attempts blocked
  - [ ] CSP compliance
- [ ] Storage testing:
  - [ ] Quota warnings work
  - [ ] Orphaned icon cleanup works
- [ ] Cross-browser:
  - [ ] Chrome latest
  - [ ] Edge

**Acceptance Criteria:**
- ✅ All 11 issues resolved
- ✅ No new bugs introduced
- ✅ All tests pass
- ✅ No console errors or warnings
- ✅ Extension ready for Chrome Web Store submission

---

## Rollback Plan

If any agent fails or introduces issues:

1. **Git revert:** Each agent should work on separate files where possible
2. **Incremental rollback:** Revert only failing agent's changes
3. **Re-run agent:** Fix issue and re-run single agent
4. **Don't block others:** Other agents can continue if independent

---

## Next Steps After Completion

1. **Manual testing:** Complete full test checklist
2. **Code review:** Review all changes for quality
3. **Git commit:** Create single commit for all fixes
4. **Chrome Web Store:** Submit for review
5. **Monitor:** Watch for user feedback and errors

---

**Plan Created:** 2025-11-23
**Ready for Execution:** Waiting for user font strategy decision
