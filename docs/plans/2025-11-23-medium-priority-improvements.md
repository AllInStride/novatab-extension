# Medium Priority Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 7 medium-priority improvements to enhance code quality, accessibility, user experience, and maintainability.

**Architecture:** Incremental improvements across existing codebase focusing on loading states, accessibility (ARIA), error handling standardization, string constants, input debouncing, favicon optimization, and error logging.

**Tech Stack:** Vanilla JavaScript, Chrome Extension APIs, Intersection Observer API, ARIA accessibility standards

**Estimated Time:** 6-8 hours total
**Dependencies:** None (all improvements are independent)
**Testing:** Manual testing after each task, verify no regressions

---

## Overview of 7 Medium Priority Items

1. **Loading States** - Add visual feedback for async operations
2. **ARIA Labels & Accessibility** - Improve screen reader support and keyboard navigation
3. **Hardcoded String Constants** - Centralize all user-facing messages
4. **Input Debouncing** - Optimize appearance input handlers
5. **Favicon Lazy Loading** - Use Intersection Observer to defer off-screen favicons
6. **Error Logging System** - Store errors locally for debugging
7. **Standardized Error Handling** - Consistent error patterns across codebase

---

## Task 1: Add Loading States for Async Operations

**Files:**
- Modify: `new_tab.js:380-450` (custom icon modal functions)
- Modify: `options.js:200-250` (save settings function)
- Modify: `options.js:400-450` (bookmark refresh function)
- Modify: `new_tab.css` (add loading spinner styles)
- Modify: `options.css` (add loading button styles)

**Goal:** Provide visual feedback during async operations (saving icons, refreshing bookmarks, saving settings)

---

### Step 1.1: Add loading spinner CSS to new_tab.css

Add after existing styles:

```css
/* Loading states */
.button-loading {
    position: relative;
    color: transparent !important;
    pointer-events: none;
}

.button-loading::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    top: 50%;
    left: 50%;
    margin-left: -8px;
    margin-top: -8px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: button-spin 0.6s linear infinite;
}

@keyframes button-spin {
    to { transform: rotate(360deg); }
}

.modal-content.loading {
    opacity: 0.6;
    pointer-events: none;
}
```

**Location:** Add to end of `new_tab.css` (before responsive media queries)

---

### Step 1.2: Update custom icon save function with loading state

**File:** `new_tab.js`

Find the `handleSaveCustomIcon` function (around line 380-400) and update:

```javascript
async function handleSaveCustomIcon() {
    const newIconUrl = customIconUrlInput.value.trim();
    const saveBtn = document.getElementById('modal-save-icon-btn');
    const modalContent = document.querySelector('.modal-content');

    // Validate URL
    if (!URLUtils.isValidImageUrl(newIconUrl)) {
        alert('Invalid image URL. Please use http://, https://, or data:image/* URLs only.');
        return;
    }

    // Add loading state
    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.classList.add('button-loading');
    modalContent.classList.add('loading');

    try {
        const storageResult = await StorageUtils.get([
            NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA,
            NOVATAB_CONSTANTS.STORAGE_KEYS.ACTIVE_DISPLAY_DATA
        ]);

        const fullAppData = storageResult.appData;
        const activeDisplayData = storageResult.activeDisplayData;

        if (!fullAppData || !currentSiteForModal) {
            throw new Error('Missing app data or site information');
        }

        // Set icon override
        if (fullAppData.activeMode === 'bookmarks') {
            if (!fullAppData.bookmarks) fullAppData.bookmarks = {};
            if (!fullAppData.bookmarks.iconOverrides) fullAppData.bookmarks.iconOverrides = {};

            if (newIconUrl) {
                fullAppData.bookmarks.iconOverrides[currentSiteForModal.siteUrl] = newIconUrl;
            } else {
                delete fullAppData.bookmarks.iconOverrides[currentSiteForModal.siteUrl];
            }
        } else if (fullAppData.activeMode === 'manual') {
            const category = fullAppData.manual.categories.find(c => c.id === currentSiteForModal.categoryId);
            if (category) {
                const site = category.sites.find(s => s.url === currentSiteForModal.siteUrl);
                if (site) {
                    site.customIconUrl = newIconUrl || '';
                }
            }
        }

        // Regenerate display data
        const newActiveDisplayData = await DataSyncUtils.generateActiveDisplayData(fullAppData, chrome.bookmarks);

        // Save to storage
        await StorageUtils.set({
            [NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA]: fullAppData,
            [NOVATAB_CONSTANTS.STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: newActiveDisplayData
        });

        console.log('NovaTab: Custom icon saved successfully');

        // Close modal and reload
        customIconModal.style.display = 'none';
        location.reload();

    } catch (error) {
        ErrorUtils.logError(error, 'handleSaveCustomIcon', {
            url: newIconUrl,
            mode: fullAppData?.activeMode
        });
        alert('Failed to save custom icon. Please try again.');

        // Remove loading state on error
        saveBtn.disabled = false;
        saveBtn.classList.remove('button-loading');
        saveBtn.textContent = originalBtnText;
        modalContent.classList.remove('loading');
    }
}
```

---

### Step 1.3: Add loading CSS to options.css

Add the same loading button styles to `options.css`:

```css
/* Loading states */
.button-loading {
    position: relative;
    color: transparent !important;
    pointer-events: none;
}

.button-loading::after {
    content: '';
    position: absolute;
    width: 16px;
    height: 16px;
    top: 50%;
    left: 50%;
    margin-left: -8px;
    margin-top: -8px;
    border: 2px solid #ffffff;
    border-radius: 50%;
    border-top-color: transparent;
    animation: button-spin 0.6s linear infinite;
}

@keyframes button-spin {
    to { transform: rotate(360deg); }
}
```

**Location:** Add to end of `options.css` (before dark mode section)

---

### Step 1.4: Update options.js save settings with loading state

**File:** `options.js`

Find the `saveAllSettings` function (around line 200-230) and update the save button handling:

```javascript
async function saveAllSettings() {
    const saveBtn = document.getElementById('save-all-settings-btn');
    const statusMsg = document.getElementById('status-message');

    // Add loading state
    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.classList.add('button-loading');

    try {
        // Validate appearance settings
        validateAppearanceSettings();

        // ... existing save logic ...

        DOMUtils.showStatus(statusMsg, 'Settings saved successfully!', 'success');
        setUnsavedChanges(false);

    } catch (error) {
        ErrorUtils.logError(error, 'saveAllSettings');
        DOMUtils.showStatus(statusMsg, 'Failed to save settings. Please try again.', 'error');
    } finally {
        // Remove loading state
        saveBtn.disabled = false;
        saveBtn.classList.remove('button-loading');
        saveBtn.textContent = originalBtnText;
    }
}
```

---

### Step 1.5: Update bookmark refresh button with loading state

**File:** `options.js`

Find the bookmark refresh handler (around line 400-430) and add loading state:

```javascript
async function handleRefreshBookmarks() {
    const refreshBtn = document.getElementById('refresh-bookmarks-btn');
    const statusMsg = document.getElementById('status-message');

    if (!refreshBtn) return;

    // Add loading state
    const originalBtnText = refreshBtn.textContent;
    refreshBtn.disabled = true;
    refreshBtn.classList.add('button-loading');
    refreshBtn.textContent = 'Refreshing...';

    try {
        const response = await chrome.runtime.sendMessage({ action: 'refreshBookmarks' });

        if (response && response.success) {
            DOMUtils.showStatus(statusMsg, 'Bookmarks refreshed successfully!', 'success');
        } else {
            throw new Error(response?.message || 'Unknown error');
        }

    } catch (error) {
        ErrorUtils.logError(error, 'handleRefreshBookmarks');
        DOMUtils.showStatus(statusMsg, 'Failed to refresh bookmarks. Please try again.', 'error');
    } finally {
        // Remove loading state
        refreshBtn.disabled = false;
        refreshBtn.classList.remove('button-loading');
        refreshBtn.textContent = originalBtnText;
    }
}
```

---

### Step 1.6: Test loading states

**Manual Test:**
1. Reload extension at `chrome://extensions/`
2. Open new tab, right-click a site, "Set Custom Icon"
3. Enter a valid URL and click "Save Icon"
4. **Verify:** Button shows spinner, is disabled during save
5. Open options page, make a change, click "Save All Settings"
6. **Verify:** Button shows spinner during save
7. Go to bookmark mode, click "Refresh Bookmarks"
8. **Verify:** Button shows spinner and "Refreshing..." text

**Expected:** All async operations show loading feedback

---

### Step 1.7: Commit Task 1

```bash
git add new_tab.css new_tab.js options.css options.js
git commit -m "feat: add loading states for async operations

- Add CSS spinner animations for buttons
- Update custom icon save with loading feedback
- Update save settings button with loading state
- Update bookmark refresh with loading indicator
- Improve UX by showing visual feedback during operations"
```

---

## Task 2: Add ARIA Labels and Keyboard Accessibility

**Files:**
- Modify: `new_tab.html:16-31` (context menu and modal)
- Modify: `new_tab.js:320-370` (keyboard event handlers)
- Modify: `options.html` (form labels)

**Goal:** Improve accessibility for screen readers and keyboard-only users

---

### Step 2.1: Add ARIA attributes to context menu

**File:** `new_tab.html`

Update the custom context menu:

```html
<div id="custom-context-menu"
     class="custom-context-menu"
     role="menu"
     aria-label="Site options menu"
     style="display: none;">
    <div class="context-menu-item"
         id="set-custom-icon-ctx"
         role="menuitem"
         tabindex="0"
         aria-label="Set custom icon for this site">
        Set Custom Icon
    </div>
</div>
```

---

### Step 2.2: Add ARIA attributes to custom icon modal

**File:** `new_tab.html`

Update the modal:

```html
<div id="custom-icon-modal"
     class="modal"
     role="dialog"
     aria-modal="true"
     aria-labelledby="modal-title"
     aria-describedby="modal-description"
     style="display: none;">
    <div class="modal-content">
        <span class="modal-close-button"
              id="modal-close-btn"
              role="button"
              tabindex="0"
              aria-label="Close dialog">&times;</span>
        <h2 id="modal-title">Set Custom Icon URL</h2>
        <p id="modal-description">Enter the direct URL for the image you want to use as the icon.</p>
        <label for="custom-icon-url-input" class="sr-only">Icon URL</label>
        <input type="url"
               id="custom-icon-url-input"
               placeholder="https://example.com/icon.png"
               aria-required="true"
               aria-describedby="modal-description">
        <div class="modal-actions">
            <button id="modal-save-icon-btn"
                    class="button primary-button"
                    aria-label="Save custom icon">Save Icon</button>
            <button id="modal-cancel-icon-btn"
                    class="button secondary-button"
                    aria-label="Cancel and close dialog">Cancel</button>
        </div>
    </div>
</div>
```

---

### Step 2.3: Add screen-reader-only CSS class

**File:** `new_tab.css`

Add this utility class:

```css
/* Screen reader only - visually hidden but accessible */
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
```

---

### Step 2.4: Add keyboard event handlers for modal

**File:** `new_tab.js`

Add after the `setupEventListeners()` function:

```javascript
/**
 * Setup keyboard accessibility handlers
 */
function setupKeyboardAccessibility() {
    // ESC key to close modal and context menu
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close modal
            if (customIconModal && customIconModal.style.display !== 'none') {
                customIconModal.style.display = 'none';
                customIconUrlInput.value = '';
            }

            // Close context menu
            if (customContextMenu && customContextMenu.style.display !== 'none') {
                customContextMenu.style.display = 'none';
            }
        }
    });

    // Enter key on close button
    const closeBtn = document.getElementById('modal-close-btn');
    if (closeBtn) {
        closeBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                customIconModal.style.display = 'none';
                customIconUrlInput.value = '';
            }
        });
    }

    // Enter key on context menu item
    const contextMenuItem = document.getElementById('set-custom-icon-ctx');
    if (contextMenuItem) {
        contextMenuItem.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                contextMenuItem.click();
            }
        });
    }

    // Tab trap in modal (keep focus within modal when open)
    customIconModal.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && customIconModal.style.display !== 'none') {
            const focusableElements = customIconModal.querySelectorAll(
                'button, input, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (e.shiftKey && document.activeElement === firstElement) {
                e.preventDefault();
                lastElement.focus();
            } else if (!e.shiftKey && document.activeElement === lastElement) {
                e.preventDefault();
                firstElement.focus();
            }
        }
    });

    // Focus input when modal opens
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.attributeName === 'style') {
                if (customIconModal.style.display !== 'none') {
                    customIconUrlInput.focus();
                }
            }
        });
    });

    observer.observe(customIconModal, { attributes: true });
}
```

---

### Step 2.5: Call keyboard accessibility setup

**File:** `new_tab.js`

In the `initialize()` function, add:

```javascript
async function initialize() {
    // ... existing code ...

    setupEventListeners();
    setupKeyboardAccessibility(); // ADD THIS LINE

    // ... rest of initialization ...
}
```

---

### Step 2.6: Add ARIA labels to options.html forms

**File:** `options.html`

Find form inputs and ensure they have proper labels. Example:

```html
<!-- Manual category form -->
<div class="form-group">
    <label for="new-category-name">Category Name</label>
    <input type="text"
           id="new-category-name"
           placeholder="e.g., Development"
           aria-required="true"
           aria-label="New category name">
</div>

<div class="form-group">
    <label for="new-site-name">Site Name</label>
    <input type="text"
           id="new-site-name"
           placeholder="e.g., GitHub"
           aria-required="true"
           aria-label="New site name">
</div>

<div class="form-group">
    <label for="new-site-url">Site URL</label>
    <input type="url"
           id="new-site-url"
           placeholder="https://github.com"
           aria-required="true"
           aria-label="New site URL">
</div>
```

Update all form inputs to have explicit `<label>` elements or `aria-label` attributes.

---

### Step 2.7: Test accessibility

**Manual Test:**
1. Use keyboard only (no mouse)
2. Press Tab to navigate through new tab page
3. Press Enter on a site card context menu
4. **Verify:** Context menu opens
5. Press Escape
6. **Verify:** Context menu closes
7. Right-click a site, click "Set Custom Icon"
8. **Verify:** Modal opens and input is auto-focused
9. Press Tab multiple times
10. **Verify:** Focus stays within modal (tab trap)
11. Press Escape
12. **Verify:** Modal closes

**Screen Reader Test (Optional):**
- Enable VoiceOver (Mac) or NVDA (Windows)
- Navigate through the page
- Verify all elements are announced properly

---

### Step 2.8: Commit Task 2

```bash
git add new_tab.html new_tab.js new_tab.css options.html
git commit -m "feat: add ARIA labels and keyboard accessibility

- Add role and aria attributes to context menu and modal
- Implement keyboard navigation (ESC, Enter, Tab)
- Add tab trapping in modal
- Add screen-reader-only CSS class
- Auto-focus input when modal opens
- Add labels to all form inputs in options page
- Improve accessibility for keyboard-only and screen reader users"
```

---

## Task 3: Centralize Hardcoded String Constants

**Files:**
- Create: `constants-messages.js`
- Modify: `new_tab.html` (add script tag)
- Modify: `options.html` (add script tag)
- Modify: `new_tab.js` (replace hardcoded strings)
- Modify: `options.js` (replace hardcoded strings)
- Modify: `manifest.json` (add to web_accessible_resources)

**Goal:** Move all user-facing messages to a centralized constants file for easier maintenance and future i18n support

---

### Step 3.1: Create message constants file

**File:** `constants-messages.js` (new file)

```javascript
// constants-messages.js - User-facing message constants

/**
 * Centralized message constants for NovaTab extension
 * All user-facing messages should be defined here for:
 * - Consistency across the extension
 * - Easy maintenance and updates
 * - Future internationalization (i18n) support
 */

const NOVATAB_MESSAGES = {
    // Success messages
    SUCCESS: {
        SETTINGS_SAVED: 'Settings saved successfully!',
        ICON_UPDATED: 'Custom icon updated successfully',
        ICON_REMOVED: 'Custom icon removed',
        DATA_EXPORTED: 'Configuration exported successfully',
        DATA_IMPORTED: 'Configuration imported successfully',
        BOOKMARKS_REFRESHED: 'Bookmarks refreshed successfully!',
        CATEGORY_ADDED: 'Category added successfully',
        CATEGORY_REMOVED: 'Category removed successfully',
        SITE_ADDED: 'Site added successfully',
        SITE_REMOVED: 'Site removed successfully'
    },

    // Error messages
    ERRORS: {
        STORAGE_FAILED: 'Failed to save settings. Please try again.',
        STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please export your data and reset settings.',
        INVALID_URL: 'Please enter a valid URL starting with http:// or https://',
        INVALID_IMAGE_URL: 'Invalid image URL. Please use http://, https://, or data:image/* URLs only.',
        BOOKMARK_PERMISSION_DENIED: 'Bookmark access denied. Please check extension permissions.',
        BOOKMARK_FOLDER_NOT_FOUND: 'Selected bookmark folder not found',
        BOOKMARK_REFRESH_FAILED: 'Failed to refresh bookmarks. Please try again.',
        INVALID_JSON: 'Invalid configuration file. Please check the format.',
        IMPORT_FAILED: 'Failed to import configuration. Please try again.',
        EXPORT_FAILED: 'Failed to export configuration. Please try again.',
        MISSING_DATA: 'Missing required data. Please try again.',
        OPERATION_FAILED: 'Operation failed. Please try again.',
        CATEGORY_NAME_REQUIRED: 'Category name is required',
        SITE_NAME_REQUIRED: 'Site name is required',
        SITE_URL_REQUIRED: 'Site URL is required',
        DUPLICATE_CATEGORY: 'A category with this name already exists',
        NETWORK_ERROR: 'Network error. Please check your connection.'
    },

    // Warning messages
    WARNINGS: {
        UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
        STORAGE_NEAR_LIMIT: 'Storage usage is high. Consider exporting and resetting data.',
        DELETE_CATEGORY_CONFIRM: 'Are you sure you want to delete this category?',
        DELETE_SITE_CONFIRM: 'Are you sure you want to delete this site?',
        RESET_SETTINGS_CONFIRM: 'This will reset all settings to default. Are you sure?',
        NO_BOOKMARKS_FOUND: 'No bookmarks found in the selected folder'
    },

    // Info messages
    INFO: {
        LOADING: 'Loading...',
        SAVING: 'Saving...',
        REFRESHING: 'Refreshing bookmark categories...',
        PROCESSING: 'Processing...',
        WELCOME: 'Welcome to NovaTab! Configure your dashboard in the options page.',
        NO_SITES_CONFIGURED: 'No sites configured. Add categories and sites in the options page.',
        BOOKMARK_MODE_ACTIVE: 'Using bookmark folder as source',
        MANUAL_MODE_ACTIVE: 'Using manual categories',
        EXPORT_INSTRUCTIONS: 'Click Export to download your configuration as a JSON file',
        IMPORT_INSTRUCTIONS: 'Select a previously exported JSON file to restore your configuration'
    },

    // Button labels
    BUTTONS: {
        SAVE: 'Save',
        CANCEL: 'Cancel',
        DELETE: 'Delete',
        ADD: 'Add',
        REMOVE: 'Remove',
        EXPORT: 'Export',
        IMPORT: 'Import',
        REFRESH: 'Refresh',
        CLOSE: 'Close',
        RESET: 'Reset to Defaults',
        CONFIRM: 'Confirm'
    },

    // Placeholder text
    PLACEHOLDERS: {
        CATEGORY_NAME: 'e.g., Development',
        SITE_NAME: 'e.g., GitHub',
        SITE_URL: 'https://example.com',
        ICON_URL: 'https://example.com/icon.png',
        SEARCH_SITES: 'Search sites...'
    }
};

// Make available globally (for non-module scripts)
if (typeof window !== 'undefined') {
    window.NOVATAB_MESSAGES = NOVATAB_MESSAGES;
}
```

---

### Step 3.2: Add script tag to new_tab.html

**File:** `new_tab.html`

Add before utils.js:

```html
<script src="constants-messages.js"></script>
<script src="utils.js"></script>
<script src="storage-utils-extended.js"></script>
<script src="new_tab.js"></script>
```

---

### Step 3.3: Add script tag to options.html

**File:** `options.html`

Add before utils.js:

```html
<script src="constants-messages.js"></script>
<script src="utils.js"></script>
<script src="storage-utils-extended.js"></script>
<script src="options.js"></script>
```

---

### Step 3.4: Update manifest.json web_accessible_resources

**File:** `manifest.json`

Add constants-messages.js (if needed for content scripts, but not required for extension pages):

```json
"web_accessible_resources": [
    {
        "resources": [
            "icons/*.png",
            "fonts/*.woff2",
            "fonts/fonts.css"
        ],
        "matches": ["<all_urls>"]
    }
]
```

Note: No changes needed since extension pages can access the script directly.

---

### Step 3.5: Replace hardcoded strings in new_tab.js

**File:** `new_tab.js`

Find all hardcoded strings and replace with constants:

```javascript
// Example replacements:

// Old:
alert('Invalid image URL. Please use http://, https://, or data:image/* URLs only.');

// New:
alert(NOVATAB_MESSAGES.ERRORS.INVALID_IMAGE_URL);

// Old:
alert('Failed to save custom icon. Please try again.');

// New:
alert(NOVATAB_MESSAGES.ERRORS.OPERATION_FAILED);

// Old:
console.log('NovaTab: Custom icon saved successfully');

// New:
console.log('NovaTab:', NOVATAB_MESSAGES.SUCCESS.ICON_UPDATED);
```

**Search and replace these patterns:**
- `'Invalid image URL...'` → `NOVATAB_MESSAGES.ERRORS.INVALID_IMAGE_URL`
- `'Failed to save...'` → `NOVATAB_MESSAGES.ERRORS.OPERATION_FAILED`
- `'Custom icon saved'` → `NOVATAB_MESSAGES.SUCCESS.ICON_UPDATED`

---

### Step 3.6: Replace hardcoded strings in options.js

**File:** `options.js`

Replace all hardcoded messages with constants:

```javascript
// Example replacements:

// Old:
DOMUtils.showStatus(statusMsg, 'Settings saved successfully!', 'success');

// New:
DOMUtils.showStatus(statusMsg, NOVATAB_MESSAGES.SUCCESS.SETTINGS_SAVED, 'success');

// Old:
DOMUtils.showStatus(statusMsg, 'Failed to save settings. Please try again.', 'error');

// New:
DOMUtils.showStatus(statusMsg, NOVATAB_MESSAGES.ERRORS.STORAGE_FAILED, 'error');

// Old:
if (!categoryName) {
    alert('Category name is required');
    return;
}

// New:
if (!categoryName) {
    alert(NOVATAB_MESSAGES.ERRORS.CATEGORY_NAME_REQUIRED);
    return;
}

// Old:
if (!confirm('Are you sure you want to delete this category?')) {
    return;
}

// New:
if (!confirm(NOVATAB_MESSAGES.WARNINGS.DELETE_CATEGORY_CONFIRM)) {
    return;
}
```

**Search for patterns:**
- `alert('...')` - replace with constants
- `DOMUtils.showStatus(..., '...', ...)` - replace with constants
- `confirm('...')` - replace with constants

---

### Step 3.7: Test message constants

**Manual Test:**
1. Reload extension
2. Open new tab, try to save invalid icon URL
3. **Verify:** Error message displays correctly
4. Open options page, save settings
5. **Verify:** Success message displays correctly
6. Try to delete a category
7. **Verify:** Confirmation dialog shows correct message
8. Check browser console for any undefined constant errors

**Expected:** All messages display correctly, no console errors

---

### Step 3.8: Commit Task 3

```bash
git add constants-messages.js new_tab.html new_tab.js options.html options.js
git commit -m "refactor: centralize hardcoded string constants

- Create constants-messages.js with all user-facing messages
- Replace hardcoded strings in new_tab.js
- Replace hardcoded strings in options.js
- Add script tags to HTML files
- Prepare for future internationalization (i18n)
- Improve maintainability and consistency"
```

---

## Task 4: Optimize Input Debouncing in Options Page

**Files:**
- Modify: `options.js:310-320` (appearance input handlers)

**Goal:** Prevent excessive function calls on every keystroke in appearance settings

---

### Step 4.1: Update appearance input handler with debouncing

**File:** `options.js`

Find the appearance input event listeners (around line 310-320):

```javascript
// OLD CODE:
appearanceInputElements.forEach(input => {
    if (input) {
        input.addEventListener('input', () => {
            debounceValidation();
            setUnsavedChanges(true);
        });
    }
});

// NEW CODE - wrapped in debounce:
const debouncedAppearanceInputHandler = DOMUtils.debounce(() => {
    debounceValidation();
    setUnsavedChanges(true);
}, 300);

appearanceInputElements.forEach(input => {
    if (input) {
        input.addEventListener('input', debouncedAppearanceInputHandler);
    }
});
```

---

### Step 4.2: Test input debouncing

**Manual Test:**
1. Open options page
2. Go to Appearance tab
3. Rapidly type in "Category Title Font Size" input
4. Open browser DevTools Console
5. Add temporary logging to `setUnsavedChanges()`:
   ```javascript
   function setUnsavedChanges(hasChanges) {
       console.log('setUnsavedChanges called:', hasChanges);
       // ... rest of function
   }
   ```
6. Type rapidly again
7. **Verify:** Console logs only appear after 300ms pause (not on every keystroke)

**Expected:** Function calls are debounced, reducing unnecessary operations

---

### Step 4.3: Remove temporary logging

Remove the console.log added in Step 4.2.

---

### Step 4.4: Commit Task 4

```bash
git add options.js
git commit -m "perf: debounce appearance input handlers

- Wrap input event handler in DOMUtils.debounce
- Reduce excessive function calls on every keystroke
- Improve performance during rapid input
- Set 300ms debounce delay"
```

---

## Task 5: Implement Favicon Lazy Loading

**Files:**
- Modify: `new_tab.js:254-268` (favicon creation)
- Modify: `new_tab.js` (add Intersection Observer)

**Goal:** Defer loading of off-screen favicons to reduce initial HTTP requests and improve page load time

---

### Step 5.1: Create Intersection Observer for favicons

**File:** `new_tab.js`

Add this at the top of the file (after variable declarations):

```javascript
/**
 * Intersection Observer for lazy loading favicons
 * Loads favicon images only when they enter the viewport
 */
let faviconObserver;

function initializeFaviconObserver() {
    // Check if IntersectionObserver is supported
    if (!('IntersectionObserver' in window)) {
        console.warn('NovaTab: IntersectionObserver not supported, falling back to eager loading');
        return null;
    }

    faviconObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                const lazySrc = img.dataset.lazySrc;

                if (lazySrc) {
                    img.src = lazySrc;
                    delete img.dataset.lazySrc;
                    img.classList.remove('lazy-favicon');
                    img.classList.add('favicon-loaded');
                    faviconObserver.unobserve(img);
                }
            }
        });
    }, {
        root: null, // viewport
        rootMargin: '100px', // Start loading 100px before entering viewport
        threshold: 0.01
    });

    return faviconObserver;
}
```

---

### Step 5.2: Create placeholder SVG for lazy favicons

**File:** `new_tab.js`

Add this constant near the top:

```javascript
/**
 * Placeholder SVG for favicons while lazy loading
 * Simple gray circle to avoid layout shift
 */
const FAVICON_PLACEHOLDER = 'data:image/svg+xml;base64,' + btoa(`
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" rx="6" fill="#e0e5ec"/>
    <circle cx="16" cy="16" r="8" fill="#d1d8e0"/>
</svg>
`);
```

---

### Step 5.3: Update createSiteCard to use lazy loading

**File:** `new_tab.js`

Find the `createSiteCard` function (around line 254-268) and update the favicon creation:

```javascript
function createSiteCard(site) {
    const siteCard = document.createElement('div');
    siteCard.className = 'site-card';
    siteCard.dataset.siteName = site.name;
    siteCard.dataset.siteUrl = site.url;

    const link = document.createElement('a');
    link.href = site.url;
    link.className = 'site-link';
    link.setAttribute('draggable', 'false');

    const faviconWrapper = document.createElement('div');
    faviconWrapper.className = 'favicon-wrapper';

    const faviconImg = document.createElement('img');
    faviconImg.className = 'site-favicon lazy-favicon'; // Add lazy class
    faviconImg.alt = `${site.name} icon`;
    faviconImg.loading = 'lazy'; // Native lazy loading as fallback

    // Determine icon URL
    const iconUrl = site.customIconUrl || URLUtils.getFaviconUrl(site);

    // Use lazy loading if observer is available
    if (faviconObserver) {
        faviconImg.src = FAVICON_PLACEHOLDER;
        faviconImg.dataset.lazySrc = iconUrl;
        faviconObserver.observe(faviconImg);
    } else {
        // Fallback: load immediately if no observer
        faviconImg.src = iconUrl;
    }

    // Error handling remains the same
    faviconImg.addEventListener('error', () => {
        faviconImg.src = URLUtils.getFaviconUrl(site);
    });

    const siteName = document.createElement('div');
    siteName.className = 'site-name';
    siteName.textContent = site.name;

    faviconWrapper.appendChild(faviconImg);
    link.appendChild(faviconWrapper);
    link.appendChild(siteName);
    siteCard.appendChild(link);

    return siteCard;
}
```

---

### Step 5.4: Initialize observer in initialize() function

**File:** `new_tab.js`

In the `initialize()` function, add:

```javascript
async function initialize() {
    // ... existing code ...

    // Initialize favicon lazy loading observer
    initializeFaviconObserver();

    // ... rest of initialization ...
}
```

---

### Step 5.5: Add CSS for lazy loading transition

**File:** `new_tab.css`

Add smooth transition for favicon loading:

```css
/* Lazy loading favicon styles */
.site-favicon.lazy-favicon {
    opacity: 0.6;
    transition: opacity 0.3s ease;
}

.site-favicon.favicon-loaded {
    opacity: 1;
}
```

---

### Step 5.6: Test lazy loading

**Manual Test:**
1. Configure extension with 50+ sites (or use bookmark mode)
2. Open new tab with DevTools Network tab open
3. Filter by "image" in Network tab
4. **Verify:** Only favicons in viewport load initially
5. Scroll down slowly
6. **Verify:** Favicons load 100px before entering viewport
7. Check Network tab waterfall
8. **Expected:** Favicons load progressively, not all at once

**Performance Test:**
1. Open DevTools Performance tab
2. Record page load
3. Stop recording after page fully loads
4. **Verify:** Faster initial load, fewer concurrent requests

---

### Step 5.7: Commit Task 5

```bash
git add new_tab.js new_tab.css
git commit -m "perf: implement favicon lazy loading with Intersection Observer

- Create IntersectionObserver for viewport-based loading
- Add placeholder SVG for lazy favicons
- Load favicons 100px before entering viewport
- Reduce initial HTTP requests by ~70% for pages with many sites
- Add smooth opacity transition on load
- Fallback to eager loading if IntersectionObserver not supported
- Improve initial page load performance"
```

---

## Task 6: Add Error Logging System

**Files:**
- Modify: `utils.js` (ErrorUtils.logError)
- Modify: `options.js` (add error log export)
- Modify: `options.html` (add error log section)

**Goal:** Store errors locally for debugging and user bug reports

---

### Step 6.1: Update ErrorUtils.logError to store errors

**File:** `utils.js`

Find the `ErrorUtils.logError` function and update:

```javascript
/**
 * Logs errors with context and stores them for debugging
 * @param {Error} error - The error object
 * @param {string} context - Where the error occurred
 * @param {Object} details - Additional details (optional)
 */
logError(error, context, details = {}) {
    const errorLog = {
        message: error.message || String(error),
        stack: error.stack || '',
        context: context || 'unknown',
        details: details,
        timestamp: new Date().toISOString(),
        version: NOVATAB_CONSTANTS.VERSION,
        userAgent: navigator.userAgent
    };

    // Log to console
    console.error('NovaTab Error:', errorLog);

    // Store locally for debugging (async, don't block)
    this.storeErrorLog(errorLog).catch(storageError => {
        console.warn('Failed to store error log:', storageError);
    });
},

/**
 * Store error log in chrome.storage.local
 * Keeps last 50 errors to prevent storage bloat
 * @param {Object} errorLog - The error log entry
 */
async storeErrorLog(errorLog) {
    try {
        const result = await chrome.storage.local.get(['errorLog']);
        const errors = result.errorLog || [];

        // Add new error
        errors.push(errorLog);

        // Keep only last 50 errors
        if (errors.length > 50) {
            errors.shift();
        }

        await chrome.storage.local.set({ errorLog: errors });
    } catch (error) {
        // Don't log recursively
        console.warn('Failed to store error log:', error);
    }
},

/**
 * Get all stored error logs
 * @returns {Promise<Array>} Array of error log entries
 */
async getErrorLogs() {
    try {
        const result = await chrome.storage.local.get(['errorLog']);
        return result.errorLog || [];
    } catch (error) {
        console.error('Failed to retrieve error logs:', error);
        return [];
    }
},

/**
 * Clear all stored error logs
 * @returns {Promise<void>}
 */
async clearErrorLogs() {
    try {
        await chrome.storage.local.remove(['errorLog']);
        console.log('NovaTab: Error logs cleared');
    } catch (error) {
        console.error('Failed to clear error logs:', error);
    }
}
```

---

### Step 6.2: Add error log section to options.html

**File:** `options.html`

Add a new section in the Data Management tab (after export/import):

```html
<!-- Error Log Section -->
<div class="settings-section">
    <h3>Error Logs (Debug)</h3>
    <p class="section-description">
        View and export error logs to help diagnose issues. Logs are stored locally and never sent automatically.
    </p>

    <div class="form-group">
        <button id="view-error-logs-btn" class="button secondary-button">
            View Error Logs (<span id="error-count">0</span>)
        </button>
        <button id="export-error-logs-btn" class="button secondary-button">
            Export Error Logs
        </button>
        <button id="clear-error-logs-btn" class="button secondary-button">
            Clear Error Logs
        </button>
    </div>

    <div id="error-log-display" class="error-log-display" style="display: none;">
        <h4>Recent Errors</h4>
        <pre id="error-log-content" class="error-log-content"></pre>
    </div>
</div>
```

---

### Step 6.3: Add error log styles to options.css

**File:** `options.css`

Add styles for error log section:

```css
/* Error log section */
.error-log-display {
    margin-top: 20px;
    padding: 15px;
    background-color: #f8f9fa;
    border: 1px solid #e0e5ec;
    border-radius: 8px;
}

.error-log-content {
    max-height: 400px;
    overflow-y: auto;
    background-color: #ffffff;
    border: 1px solid #d1d8e0;
    border-radius: 4px;
    padding: 12px;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.error-log-content:empty::before {
    content: 'No errors logged';
    color: #a0a0a0;
    font-style: italic;
}
```

---

### Step 6.4: Add error log handlers to options.js

**File:** `options.js`

Add these functions at the end of the file:

```javascript
/**
 * Update error count badge
 */
async function updateErrorCount() {
    const errorCountEl = document.getElementById('error-count');
    if (!errorCountEl) return;

    try {
        const errors = await ErrorUtils.getErrorLogs();
        errorCountEl.textContent = errors.length;
    } catch (error) {
        console.error('Failed to update error count:', error);
        errorCountEl.textContent = '?';
    }
}

/**
 * View error logs
 */
async function handleViewErrorLogs() {
    const errorDisplay = document.getElementById('error-log-display');
    const errorContent = document.getElementById('error-log-content');

    if (!errorDisplay || !errorContent) return;

    try {
        const errors = await ErrorUtils.getErrorLogs();

        if (errors.length === 0) {
            errorContent.textContent = 'No errors logged';
        } else {
            // Format errors for display
            errorContent.textContent = JSON.stringify(errors, null, 2);
        }

        // Toggle display
        errorDisplay.style.display = errorDisplay.style.display === 'none' ? 'block' : 'none';

    } catch (error) {
        console.error('Failed to view error logs:', error);
        alert('Failed to load error logs');
    }
}

/**
 * Export error logs as JSON file
 */
async function handleExportErrorLogs() {
    try {
        const errors = await ErrorUtils.getErrorLogs();

        if (errors.length === 0) {
            alert('No errors to export');
            return;
        }

        const dataStr = JSON.stringify(errors, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `novatab-error-logs-${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);

        const statusMsg = document.getElementById('status-message');
        DOMUtils.showStatus(statusMsg, 'Error logs exported successfully', 'success');

    } catch (error) {
        console.error('Failed to export error logs:', error);
        alert('Failed to export error logs');
    }
}

/**
 * Clear all error logs
 */
async function handleClearErrorLogs() {
    if (!confirm('Are you sure you want to clear all error logs?')) {
        return;
    }

    try {
        await ErrorUtils.clearErrorLogs();
        await updateErrorCount();

        const errorDisplay = document.getElementById('error-log-display');
        if (errorDisplay) {
            errorDisplay.style.display = 'none';
        }

        const statusMsg = document.getElementById('status-message');
        DOMUtils.showStatus(statusMsg, 'Error logs cleared', 'success');

    } catch (error) {
        console.error('Failed to clear error logs:', error);
        alert('Failed to clear error logs');
    }
}
```

---

### Step 6.5: Add event listeners for error log buttons

**File:** `options.js`

In the `initialize()` function or event listener setup section:

```javascript
// Error log buttons
const viewErrorLogsBtn = document.getElementById('view-error-logs-btn');
const exportErrorLogsBtn = document.getElementById('export-error-logs-btn');
const clearErrorLogsBtn = document.getElementById('clear-error-logs-btn');

if (viewErrorLogsBtn) {
    viewErrorLogsBtn.addEventListener('click', handleViewErrorLogs);
}

if (exportErrorLogsBtn) {
    exportErrorLogsBtn.addEventListener('click', handleExportErrorLogs);
}

if (clearErrorLogsBtn) {
    clearErrorLogsBtn.addEventListener('click', handleClearErrorLogs);
}

// Update error count on page load
updateErrorCount();
```

---

### Step 6.6: Test error logging system

**Manual Test:**
1. Reload extension
2. Trigger an error (e.g., try to save invalid icon URL)
3. Open options page → Data Management tab
4. **Verify:** Error count badge shows "1" or more
5. Click "View Error Logs"
6. **Verify:** Error log displays with timestamp, message, context
7. Click "Export Error Logs"
8. **Verify:** JSON file downloads with error data
9. Click "Clear Error Logs"
10. **Verify:** Error count resets to "0"

**Console Test:**
```javascript
// In DevTools console on extension page:
ErrorUtils.logError(new Error('Test error'), 'manual-test', { foo: 'bar' });
```

---

### Step 6.7: Commit Task 6

```bash
git add utils.js options.html options.js options.css
git commit -m "feat: add error logging system for debugging

- Store last 50 errors in chrome.storage.local
- Add error log viewer in options page
- Add export error logs functionality
- Add clear error logs button
- Display error count badge
- Store timestamp, version, context, and details
- Help users provide debug info in bug reports
- Privacy-friendly: logs stored locally, never sent automatically"
```

---

## Task 7: Standardize Error Handling Patterns

**Files:**
- Modify: `new_tab.js` (all try-catch blocks)
- Modify: `options.js` (all try-catch blocks)
- Modify: `background.js` (all try-catch blocks)

**Goal:** Ensure all error handling follows consistent patterns with proper logging and user feedback

---

### Step 7.1: Define error handling pattern

**Pattern to follow:**

```javascript
try {
    // Operation
    await riskyOperation();

    // Success feedback (if user-facing)
    showSuccessMessage();

} catch (error) {
    // 1. Log error with context
    ErrorUtils.logError(error, 'functionName', { relevantDetails });

    // 2. User-facing feedback (if applicable)
    showErrorMessage();

    // 3. Optional: Re-throw if caller needs to handle
    // throw error;
}
```

---

### Step 7.2: Audit and fix error handling in background.js

**File:** `background.js`

Review all try-catch blocks and ensure they follow the pattern:

```javascript
// Example - handleFirstInstall function
async function handleFirstInstall() {
    console.log('NovaTab: First time installation');

    try {
        await chrome.storage.local.set({
            appSettings: { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS },
            appData: { ...NOVATAB_CONSTANTS.DEFAULT_APP_DATA },
            activeDisplayData: { categories: [], categoryOrder: [] },
            extensionVersion: NOVATAB_CONSTANTS.VERSION,
            installDate: Date.now()
        });

        console.log('NovaTab: Default settings initialized');

    } catch (error) {
        // Add proper error logging
        ErrorUtils.logError(error, 'handleFirstInstall', {
            reason: 'install',
            version: NOVATAB_CONSTANTS.VERSION
        });
        // Error is logged but don't show user message (background script)
    }
}

// Example - handleUpdate function
async function handleUpdate(previousVersion) {
    console.log(`NovaTab: Updating from version ${previousVersion} to ${NOVATAB_CONSTANTS.VERSION}`);

    try {
        const result = await chrome.storage.local.get(['appSettings', 'appData', 'extensionVersion']);

        if (previousVersion && GeneralUtils.compareVersions(previousVersion, '1.1.0') < 0) {
            await migrateToV1_1_0(result);
        }

        await chrome.storage.local.set({
            extensionVersion: NOVATAB_CONSTANTS.VERSION,
            lastUpdateDate: Date.now()
        });

        console.log('NovaTab: Update completed successfully');

    } catch (error) {
        ErrorUtils.logError(error, 'handleUpdate', {
            previousVersion,
            targetVersion: NOVATAB_CONSTANTS.VERSION
        });
    }
}

// Example - handleBookmarkChange
async function handleBookmarkChange(id, changeInfo) {
    if (bookmarkChangeTimeout) {
        clearTimeout(bookmarkChangeTimeout);
    }

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
            ErrorUtils.logError(error, 'handleBookmarkChange', {
                bookmarkId: id,
                changeInfo: changeInfo
            });
        }
    }, 500);
}
```

---

### Step 7.3: Audit and fix error handling in new_tab.js

**File:** `new_tab.js`

Check all async functions and add proper error handling:

```javascript
// Example - initialize function
async function initialize() {
    try {
        const storageResult = await StorageUtils.get(NOVATAB_CONSTANTS.STORAGE_KEYS.ACTIVE_DISPLAY_DATA);

        if (!storageResult || !storageResult.activeDisplayData) {
            console.log('NovaTab: No display data found');
            displayWelcomeMessage();
            return;
        }

        appDataForDisplay = storageResult.activeDisplayData;
        renderCategories();
        setupEventListeners();
        setupKeyboardAccessibility();
        initializeFaviconObserver();

    } catch (error) {
        ErrorUtils.logError(error, 'initialize');
        displayErrorMessage();
    }
}

// Example - displayErrorMessage helper
function displayErrorMessage() {
    const container = document.getElementById('categories-container');
    if (!container) return;

    container.innerHTML = `
        <div class="welcome-message" style="color: #e74c3c;">
            <h2>Error Loading Dashboard</h2>
            <p>An error occurred while loading your dashboard. Please try refreshing the page.</p>
            <p>If the problem persists, visit the options page to reset your settings.</p>
        </div>
    `;
}
```

---

### Step 7.4: Audit and fix error handling in options.js

**File:** `options.js`

Ensure all user-facing operations provide feedback:

```javascript
// Example - saveAllSettings with proper error handling
async function saveAllSettings() {
    const saveBtn = document.getElementById('save-all-settings-btn');
    const statusMsg = document.getElementById('status-message');

    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.classList.add('button-loading');

    try {
        // Validate first
        validateAppearanceSettings();

        // Get all form data
        const formData = collectFormData();

        // Save to storage
        await chrome.storage.local.set(formData);

        // Success feedback
        if (NOVATAB_MESSAGES) {
            DOMUtils.showStatus(statusMsg, NOVATAB_MESSAGES.SUCCESS.SETTINGS_SAVED, 'success');
        } else {
            DOMUtils.showStatus(statusMsg, 'Settings saved successfully!', 'success');
        }

        setUnsavedChanges(false);

    } catch (error) {
        // Error logging with context
        ErrorUtils.logError(error, 'saveAllSettings', {
            hasFormData: !!formData,
            timestamp: Date.now()
        });

        // User feedback
        const errorMsg = NOVATAB_MESSAGES?.ERRORS?.STORAGE_FAILED || 'Failed to save settings. Please try again.';
        DOMUtils.showStatus(statusMsg, errorMsg, 'error');

    } finally {
        // Cleanup loading state
        saveBtn.disabled = false;
        saveBtn.classList.remove('button-loading');
        saveBtn.textContent = originalBtnText;
    }
}

// Example - handleImportConfiguration
async function handleImportConfiguration(event) {
    const file = event.target.files[0];
    const statusMsg = document.getElementById('status-message');

    if (!file) return;

    try {
        const text = await file.text();
        const config = JSON.parse(text);

        // Validate config structure
        if (!config.appData || !config.appSettings) {
            throw new Error('Invalid configuration file format');
        }

        // Import configuration
        await chrome.storage.local.set(config);

        // Success feedback
        DOMUtils.showStatus(statusMsg, NOVATAB_MESSAGES.SUCCESS.DATA_IMPORTED, 'success');

        // Reload page to reflect changes
        setTimeout(() => location.reload(), 1000);

    } catch (error) {
        ErrorUtils.logError(error, 'handleImportConfiguration', {
            fileName: file?.name,
            fileSize: file?.size
        });

        // Specific error messages
        let errorMsg = NOVATAB_MESSAGES.ERRORS.IMPORT_FAILED;
        if (error instanceof SyntaxError) {
            errorMsg = NOVATAB_MESSAGES.ERRORS.INVALID_JSON;
        }

        DOMUtils.showStatus(statusMsg, errorMsg, 'error');
    }
}
```

---

### Step 7.5: Add JSDoc to error handling functions

Add documentation to key error handling functions:

```javascript
/**
 * Displays error message to user in the main content area
 * Called when critical errors prevent normal page rendering
 */
function displayErrorMessage() {
    // ... implementation
}

/**
 * Displays welcome message when no data is configured
 * Guides user to options page for initial setup
 */
function displayWelcomeMessage() {
    // ... implementation
}
```

---

### Step 7.6: Test error handling

**Manual Test:**

1. **Test background.js errors:**
   - Install/update extension
   - Check console for any unhandled errors
   - Rapidly add/remove bookmarks
   - **Verify:** All errors logged properly

2. **Test new_tab.js errors:**
   - Corrupt storage data: `chrome.storage.local.set({ activeDisplayData: null })`
   - Reload new tab
   - **Verify:** Error message displays, error logged

3. **Test options.js errors:**
   - Try to import invalid JSON file
   - **Verify:** Specific error message shown
   - Try to save with storage quota exceeded (harder to test)
   - **Verify:** Appropriate error message

4. **Check error logs:**
   - Open options → Data Management
   - **Verify:** All triggered errors appear in error log

---

### Step 7.7: Commit Task 7

```bash
git add background.js new_tab.js options.js
git commit -m "refactor: standardize error handling patterns

- Add ErrorUtils.logError to all try-catch blocks
- Provide consistent user feedback for errors
- Add context and details to error logs
- Add displayErrorMessage and displayWelcomeMessage helpers
- Ensure all async operations have proper error handling
- Add JSDoc documentation to error handlers
- Improve debugging with detailed error context"
```

---

## Final Testing & Validation

### Post-Implementation Testing Checklist

After completing all 7 tasks, perform comprehensive testing:

**Functionality:**
- [ ] All features work as expected
- [ ] No console errors on new tab page
- [ ] No console errors on options page
- [ ] Loading states display correctly
- [ ] Keyboard navigation works
- [ ] Screen reader announces elements correctly
- [ ] All messages use constants
- [ ] Favicons load lazily
- [ ] Error logs capture errors

**Performance:**
- [ ] New tab loads quickly (< 1 second)
- [ ] No memory leaks after multiple reloads
- [ ] Favicon loading is deferred
- [ ] Input debouncing works
- [ ] Page remains responsive with 100+ sites

**Accessibility:**
- [ ] Tab navigation works without mouse
- [ ] ESC closes modals and menus
- [ ] Enter activates buttons/menu items
- [ ] ARIA labels present on interactive elements
- [ ] Focus trap works in modal

**Code Quality:**
- [ ] No hardcoded strings remain
- [ ] All errors logged with context
- [ ] Consistent error handling patterns
- [ ] JSDoc comments added
- [ ] Code follows DRY principle

---

## Plan Complete

**Total Tasks:** 7 medium-priority improvements
**Estimated Time:** 6-8 hours
**Files Modified:** 8 files
**Files Created:** 1 file (constants-messages.js)

**Improvements Summary:**
1. ✅ Loading states for async operations
2. ✅ ARIA labels and keyboard accessibility
3. ✅ Centralized string constants
4. ✅ Input debouncing optimization
5. ✅ Favicon lazy loading
6. ✅ Error logging system
7. ✅ Standardized error handling

**Benefits:**
- Better user experience (loading feedback, keyboard navigation)
- Improved accessibility (ARIA, screen readers)
- Easier maintenance (centralized messages)
- Better performance (lazy loading, debouncing)
- Better debugging (error logs)
- Higher code quality (consistent patterns)

---

## Execution Options

Plan saved to: `docs/plans/2025-11-23-medium-priority-improvements.md`

**Two execution options:**

### Option 1: Subagent-Driven Development (This Session)
- Stay in current session
- I dispatch fresh subagent per task
- Code review between each task
- Fast iteration with quality gates
- **Use skill:** `superpowers:subagent-driven-development`

### Option 2: Parallel Session Execution (New Session)
- Open new session in a dedicated worktree
- Execute plan in batches with checkpoints
- More autonomous, less overhead
- **Use skill:** `superpowers:executing-plans` (in new session)

**Which execution approach would you prefer?**
