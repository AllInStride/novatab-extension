# NovaTab Data Flow Documentation

## Table of Contents
1. [Overview](#overview)
2. [Data Models](#data-models)
3. [Manual Mode Data Flow](#manual-mode-data-flow)
4. [Bookmarks Mode Data Flow](#bookmarks-mode-data-flow)
5. [ActiveDisplayData Generation](#activedisplaydata-generation)
6. [Storage Synchronization Patterns](#storage-synchronization-patterns)
7. [Event Handling](#event-handling)
8. [State Management](#state-management)

---

## Overview

NovaTab uses a centralized data flow architecture where data moves from storage through transformation layers to the UI. The extension operates in two modes:

- **Manual Mode**: User-curated categories and sites
- **Bookmarks Mode**: Categories and sites derived from Chrome bookmarks

All data transformations flow through a central `activeDisplayData` structure that serves as the single source of truth for what's displayed on the new tab page.

---

## Data Models

### Storage Keys (NOVATAB_CONSTANTS.STORAGE_KEYS)
```javascript
{
  APP_SETTINGS: 'appSettings',      // Display/appearance settings
  APP_DATA: 'appData',              // Mode configuration and raw data
  ACTIVE_DISPLAY_DATA: 'activeDisplayData',  // Computed display data
  EXTENSION_VERSION: 'extensionVersion'
}
```

### appSettings Structure
```javascript
{
  maxCategoriesPerRow: '2',         // 1-4 categories per row
  maxSiteCardsPerRow: '5',          // 3-10 sites per row
  cardMinWidth: '70px',             // 50-150px
  categoryTitleFontSize: '16px',    // 8-24px
  siteNameFontSize: '10px',         // 8-24px
  faviconWrapperSize: '38px',       // 24-64px
  gradientStartColor: '#F5F7FA',    // Hex color
  gradientEndColor: '#E0E5EC'       // Hex color
}
```

### appData Structure
```javascript
{
  activeMode: 'manual' | 'bookmarks',

  manual: {
    categories: [
      {
        id: 'uuid-string',
        name: 'Category Name',
        sites: [
          {
            name: 'Site Name',
            url: 'https://example.com',
            customIconUrl: ''  // Optional
          }
        ]
      }
    ],
    categoryOrder: ['uuid1', 'uuid2', ...]
  },

  bookmarks: {
    folderId: 'bookmark_folder_id' | null,
    categoryOrder: ['folder_id1', 'folder_id2', ...],
    iconOverrides: {
      'https://example.com': 'https://custom-icon-url.com/icon.png'
    }
  }
}
```

### activeDisplayData Structure
```javascript
{
  categories: [
    {
      id: 'uuid-or-bookmark-id',
      name: 'Category Name',
      sites: [
        {
          name: 'Site Name',
          url: 'https://example.com',
          customIconUrl: ''
        }
      ]
    }
  ],
  categoryOrder: ['id1', 'id2', ...]
}
```

---

## Manual Mode Data Flow

### Sequence Diagram

```
┌─────────┐         ┌──────────┐         ┌─────────┐         ┌─────────────┐         ┌─────────┐
│ Options │         │ utils.js │         │ chrome. │         │ background  │         │ new_tab │
│  Page   │         │DataSync  │         │ storage │         │     .js     │         │   .js   │
└────┬────┘         └────┬─────┘         └────┬────┘         └──────┬──────┘         └────┬────┘
     │                   │                    │                     │                     │
     │ 1. User edits     │                    │                     │                     │
     │    categories     │                    │                     │                     │
     │    and sites      │                    │                     │                     │
     │                   │                    │                     │                     │
     │ 2. Click "Save    │                    │                     │                     │
     │    All Settings"  │                    │                     │                     │
     ├───────────────────┤                    │                     │                     │
     │ updateManualData  │                    │                     │                     │
     │ FromDOM()         │                    │                     │                     │
     │                   │                    │                     │                     │
     │ 3. Call DataSync  │                    │                     │                     │
     │ ─────────────────>│                    │                     │                     │
     │ generateActive    │                    │                     │                     │
     │ DisplayData()     │                    │                     │                     │
     │                   │                    │                     │                     │
     │                   │ 4. Clone manual    │                     │                     │
     │                   │    categories &    │                     │                     │
     │                   │    categoryOrder   │                     │                     │
     │                   │                    │                     │                     │
     │ 5. Save to storage│                    │                     │                     │
     │ ──────────────────┼───────────────────>│                     │                     │
     │                   │                    │ appData,            │                     │
     │                   │                    │ activeDisplayData,  │                     │
     │                   │                    │ appSettings         │                     │
     │                   │                    │                     │                     │
     │                   │                    │ 6. storage.onChanged│                     │
     │                   │                    │    (not used in     │                     │
     │                   │                    │     current impl)   │                     │
     │                   │                    │                     │                     │
     │                   │                    │                     │                     │
     │                   │                    │                     │   7. User opens new │
     │                   │                    │                     │      tab            │
     │                   │                    │                     │   ──────────────────┤
     │                   │                    │                     │   loadAndRender()   │
     │                   │                    │                     │                     │
     │                   │                    │   8. Fetch data     │                     │
     │                   │                    │<────────────────────┼─────────────────────│
     │                   │                    │   appSettings,      │                     │
     │                   │                    │   activeDisplayData │                     │
     │                   │                    │                     │                     │
     │                   │                    │   9. Return data    │                     │
     │                   │                    │─────────────────────┼────────────────────>│
     │                   │                    │                     │                     │
     │                   │                    │                     │   10. Render UI     │
     │                   │                    │                     │       using         │
     │                   │                    │                     │   activeDisplayData │
     │                   │                    │                     │                     │
```

### Step-by-Step Flow

1. **User Interaction (options.js)**
   - User adds/edits categories and sites in the options page
   - Changes are tracked locally in `appData.manual`
   - `hasUnsavedChanges` flag is set to `true`
   - Unsaved changes indicator appears on save button

2. **DOM to Data Conversion (options.js)**
   - `updateManualDataFromDOM()` reads all category inputs
   - Validates and normalizes URLs using `URLUtils.normalizeUrl()`
   - Validates sites using `ValidationUtils.validateSite()`
   - Validates categories using `ValidationUtils.validateCategory()`
   - Updates `appData.manual.categories` and `appData.manual.categoryOrder`

3. **Active Display Data Generation (utils.js)**
   - `DataSyncUtils.generateActiveDisplayData(appData)` is called
   - In manual mode, performs deep clone of `appData.manual`
   - Returns `{categories: [...], categoryOrder: [...]}`
   - Deep cloning prevents accidental mutation of source data

4. **Storage Persistence (options.js)**
   - `StorageUtils.set()` saves three keys:
     - `appSettings`: Display/appearance settings
     - `appData`: Mode configuration and raw data
     - `activeDisplayData`: Computed display data
   - `hasUnsavedChanges` is set to `false`
   - Success message displayed

5. **New Tab Rendering (new_tab.js)**
   - On page load, `loadAndRender()` fetches from storage
   - Reads `appSettings` and `activeDisplayData`
   - Applies settings to CSS custom properties
   - Renders categories using `activeDisplayData.categories`
   - Orders categories using `activeDisplayData.categoryOrder`
   - Sites are sorted alphabetically within each category

---

## Bookmarks Mode Data Flow

### Sequence Diagram

```
┌─────────┐   ┌──────────┐   ┌─────────┐   ┌────────────┐   ┌───────────┐   ┌─────────┐
│ Options │   │ utils.js │   │ chrome. │   │   chrome.  │   │background │   │ new_tab │
│  Page   │   │DataSync  │   │ storage │   │ bookmarks  │   │    .js    │   │   .js   │
└────┬────┘   └────┬─────┘   └────┬────┘   └─────┬──────┘   └─────┬─────┘   └────┬────┘
     │             │              │              │                │              │
     │ 1. Select   │              │              │                │              │
     │   bookmark  │              │              │                │              │
     │   folder    │              │              │                │              │
     ├─────────────┤              │              │                │              │
     │ Fetch folder│              │              │                │              │
     │ contents    │              │              │                │              │
     │ ────────────┼──────────────┼─────────────>│                │              │
     │             │              │              │                │              │
     │ 2. Derive   │              │              │                │              │
     │   categories│              │              │                │              │
     │ ────────────┤              │              │                │              │
     │ (folders =  │              │              │                │              │
     │  categories)│              │              │                │              │
     │             │              │              │                │              │
     │ 3. Click    │              │              │                │              │
     │   "Save All │              │              │                │              │
     │   Settings" │              │              │                │              │
     ├─────────────┤              │              │                │              │
     │             │              │              │                │              │
     │ 4. Call     │              │              │                │              │
     │ DataSync    │              │              │                │              │
     │ ───────────>│              │              │                │              │
     │             │              │              │                │              │
     │             │ 5. Fetch     │              │                │              │
     │             │   bookmarks  │              │                │              │
     │             │ ─────────────┼──────────────┼───────────────>│              │
     │             │              │              │                │              │
     │             │ 6. Convert   │              │                │              │
     │             │   folders to │              │                │              │
     │             │   categories │              │                │              │
     │             │              │              │                │              │
     │             │ 7. Apply icon│              │                │              │
     │             │   overrides  │              │                │              │
     │             │              │              │                │              │
     │ 8. Save to  │              │              │                │              │
     │   storage   │              │              │                │              │
     │ ────────────┼─────────────>│              │                │              │
     │             │              │              │                │              │
     │             │              │              │                │              │
     │             │              │              │  9. Bookmark   │              │
     │             │              │              │     changed    │              │
     │             │              │              │  ──────────────┤              │
     │             │              │              │  (user adds/   │              │
     │             │              │              │   removes)     │              │
     │             │              │              │                │              │
     │             │              │              │  10. Listener  │              │
     │             │              │              │      triggered │              │
     │             │              │              │<───────────────┤              │
     │             │              │              │                │              │
     │             │              │              │  11. Re-generate              │
     │             │              │              │      activeDisplayData        │
     │             │<─────────────┼──────────────┼────────────────┤              │
     │             │              │              │                │              │
     │             │ 12. Save     │              │                │              │
     │             │     updated  │              │                │              │
     │             │     data     │              │                │              │
     │             │ ─────────────┼─────────────>│                │              │
     │             │              │              │                │              │
     │             │              │              │                │  13. User    │
     │             │              │              │                │      opens   │
     │             │              │              │                │      new tab │
     │             │              │              │                │  ────────────┤
     │             │              │              │                │              │
     │             │              │  14. Fetch   │                │              │
     │             │              │<─────────────┼────────────────┼──────────────│
     │             │              │              │                │              │
     │             │              │  15. Render  │                │              │
     │             │              │──────────────┼────────────────┼─────────────>│
     │             │              │              │                │              │
```

### Step-by-Step Flow

1. **Folder Selection (options.js)**
   - User selects a bookmark folder from dropdown
   - `handleBookmarkFolderSelectionChange()` is called
   - Fetches subfolders using `chrome.bookmarks.getChildren()`
   - Derives initial category order from folder structure
   - Saves `folderId` to `appData.bookmarks.folderId`
   - Marks changes as unsaved

2. **Category Derivation (options.js)**
   - `deriveCategoriesFromSelectedBookmarkFolder()` processes the folder:
     - Iterates through subfolders (each becomes a category)
     - Fetches bookmarks in each subfolder (become sites)
     - Applies custom icon overrides from `appData.bookmarks.iconOverrides`
     - Only includes folders with at least one bookmark
   - Updates `appData.bookmarks.categoryOrder` with folder IDs

3. **Active Display Data Generation (utils.js)**
   - `DataSyncUtils.generateActiveDisplayData(appData, chrome.bookmarks)` is called
   - In bookmarks mode:
     - Checks if `folderId` is set (returns empty if not)
     - Fetches root folder contents via `bookmarksApi.getChildren()`
     - Iterates through subfolders:
       - Each folder becomes a category (id = folder.id, name = folder.title)
       - Fetches bookmarks in each subfolder
       - Converts bookmarks to sites (name = title, url = url)
       - Applies icon overrides from `appData.bookmarks.iconOverrides[url]`
     - Maintains category order from `appData.bookmarks.categoryOrder`
     - Adds new categories not in order to the end
   - Returns `{categories: [...], categoryOrder: [...]}`

4. **Storage Persistence (options.js)**
   - Same as manual mode: saves `appData`, `appSettings`, `activeDisplayData`

5. **Bookmark Change Detection (background.js)**
   - Listens to Chrome bookmark events:
     - `chrome.bookmarks.onCreated`
     - `chrome.bookmarks.onRemoved`
     - `chrome.bookmarks.onChanged`
     - `chrome.bookmarks.onMoved`
   - `handleBookmarkChange()` is triggered
   - Checks if `activeMode === 'bookmarks'` and `folderId` is set
   - Re-generates `activeDisplayData` via `DataSyncUtils.generateActiveDisplayData()`
   - Saves updated `activeDisplayData` to storage
   - **Note:** New tab page will see changes on next reload (no live updates)

6. **Manual Refresh (options.js)**
   - User can click "Refresh Bookmark Categories" button
   - `handleRefreshBookmarkCategories()` is called
   - Re-derives categories and updates order
   - Calls `handleSaveAllSettings()` to persist

7. **New Tab Rendering (new_tab.js)**
   - Same as manual mode: fetches and renders `activeDisplayData`
   - Categories derived from bookmarks are visually identical to manual categories
   - Bookmark folder IDs are numeric strings (e.g., "1", "2", "123")
   - Manual category IDs are UUIDs (used to distinguish in UI)

---

## ActiveDisplayData Generation

### Purpose

`activeDisplayData` serves as the **normalized, display-ready representation** of data regardless of source mode. This abstraction allows:

- **Consistent Rendering**: new_tab.js always consumes the same data structure
- **Mode Isolation**: UI doesn't need to know about manual vs. bookmarks mode
- **Performance**: Pre-computed data avoids expensive operations on page load
- **Data Integrity**: Source data (`appData`) remains unchanged

### Generation Logic (DataSyncUtils.generateActiveDisplayData)

```javascript
async function generateActiveDisplayData(appData, bookmarksApi) {
  // Input validation
  if (!appData) return {categories: [], categoryOrder: []};

  const activeMode = appData.activeMode || 'manual';
  let result = {categories: [], categoryOrder: []};

  if (activeMode === 'manual') {
    // Deep clone to prevent mutation
    result.categories = deepClone(appData.manual.categories);
    result.categoryOrder = deepClone(appData.manual.categoryOrder);

  } else if (activeMode === 'bookmarks') {
    // Validate prerequisites
    if (!appData.bookmarks?.folderId) return result;
    if (!bookmarksApi) return result;

    // Fetch bookmark folder contents
    const rootContents = await bookmarksApi.getChildren(folderId);

    for (const folder of rootContents) {
      if (!folder.url) {  // Is a folder (not a bookmark)
        const sites = [];
        const bookmarks = await bookmarksApi.getChildren(folder.id);

        for (const bookmark of bookmarks) {
          if (bookmark.url) {  // Is a bookmark (not a folder)
            sites.push({
              name: bookmark.title,
              url: bookmark.url,
              customIconUrl: iconOverrides[bookmark.url] || ''
            });
          }
        }

        // Only include folders with bookmarks
        if (sites.length > 0) {
          result.categories.push({
            id: folder.id,
            name: folder.title,
            sites: sites
          });
        }
      }
    }

    // Maintain user-defined category order
    const categoryMap = new Map(result.categories.map(c => [c.id, c]));
    let orderedIds = appData.bookmarks.categoryOrder.filter(id => categoryMap.has(id));

    // Add new categories not in order
    result.categories.forEach(cat => {
      if (!orderedIds.includes(cat.id)) {
        orderedIds.push(cat.id);
      }
    });

    result.categoryOrder = orderedIds;
  }

  return result;
}
```

### When Generation Occurs

1. **Options Page Save (options.js)**
   - User clicks "Save All Settings"
   - Always regenerates before saving

2. **Bookmark Changes (background.js)**
   - Chrome bookmark added/removed/changed/moved
   - Only if in bookmarks mode and folderId is set
   - Auto-regenerates and saves

3. **Manual Refresh (background.js)**
   - Via message: `chrome.runtime.sendMessage({action: 'refreshBookmarks'})`
   - Called by `handleManualBookmarkRefresh()`

4. **Import Settings (options.js)**
   - After importing settings JSON
   - Regenerates based on imported mode

5. **Reset Settings (options.js)**
   - After resetting to defaults
   - Regenerates from default data

### Data Transformations

**Manual Mode:**
```
appData.manual.categories (source)
    ↓ (deep clone)
activeDisplayData.categories (display)
```

**Bookmarks Mode:**
```
chrome.bookmarks API (source)
    ↓ (fetch folders)
Folder Structure
    ↓ (convert folders → categories, bookmarks → sites)
    ↓ (apply iconOverrides)
activeDisplayData.categories (display)
```

---

## Storage Synchronization Patterns

### Three-Layer Storage Architecture

NovaTab uses three distinct storage keys for different purposes:

1. **appSettings** - Display/appearance configuration
2. **appData** - Mode selection and raw data sources
3. **activeDisplayData** - Computed display data

This separation enables:
- **Independent updates**: Settings can change without affecting data
- **Data integrity**: Source data preserved separately from computed data
- **Performance**: Display data pre-computed, not on-the-fly
- **Debugging**: Easy to inspect what's stored vs. what's displayed

### Read Pattern

**Options Page (options.js):**
```javascript
const result = await chrome.storage.local.get(['appSettings', 'appData']);

appSettings = {...DEFAULT_SETTINGS, ...result.appSettings};
appData = validateAndMerge(DEFAULT_APP_DATA, result.appData);
```

**New Tab Page (new_tab.js):**
```javascript
const result = await chrome.storage.local.get(['appSettings', 'activeDisplayData']);

settings = {...DEFAULT_SETTINGS, ...result.appSettings};
displayData = result.activeDisplayData || {categories: [], categoryOrder: []};
```

**Background (background.js):**
```javascript
const result = await StorageUtils.get(STORAGE_KEYS.APP_DATA);
const appData = result.appData;

// Generate new display data
const newActiveDisplayData = await DataSyncUtils.generateActiveDisplayData(
  appData,
  chrome.bookmarks
);

// Save only the display data
await StorageUtils.set({
  [STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: newActiveDisplayData
});
```

### Write Pattern

**Explicit Save (options.js):**
```javascript
async function handleSaveAllSettings() {
  // 1. Validate inputs
  const errors = validateSettingsInputs();
  if (errors.length) return;

  // 2. Update settings from UI
  appSettings = {
    maxCategoriesPerRow: input.value,
    // ... other settings
  };

  // 3. Update appData from UI (manual mode) or keep (bookmarks mode)
  if (activeMode === 'manual') {
    updateManualDataFromDOM();  // Updates appData.manual
  }

  // 4. Generate display data
  const activeDisplayData = await DataSyncUtils.generateActiveDisplayData(
    appData,
    chrome.bookmarks
  );

  // 5. Save all three together
  await StorageUtils.set({
    [STORAGE_KEYS.APP_SETTINGS]: appSettings,
    [STORAGE_KEYS.APP_DATA]: appData,
    [STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: activeDisplayData
  });

  // 6. Clear unsaved changes flag
  setUnsavedChanges(false);
}
```

**Auto-Update (background.js):**
```javascript
async function handleBookmarkChange(id, changeInfo) {
  // 1. Fetch current appData
  const {appData} = await StorageUtils.get(STORAGE_KEYS.APP_DATA);

  // 2. Check if relevant
  if (appData.activeMode !== 'bookmarks' || !appData.bookmarks.folderId) {
    return;  // Not in bookmarks mode, ignore
  }

  // 3. Regenerate display data only
  const newActiveDisplayData = await DataSyncUtils.generateActiveDisplayData(
    appData,
    chrome.bookmarks
  );

  // 4. Save only display data (don't touch appData or appSettings)
  await StorageUtils.set({
    [STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: newActiveDisplayData
  });
}
```

### Data Consistency Guarantees

1. **Atomic Writes**: All related data saved together in options.js
2. **Validation on Read**: Data validated against defaults on load
3. **Deep Cloning**: Prevents accidental mutation of source data
4. **Fallback Values**: Always has defaults if storage is empty/corrupted

### Storage Error Handling

```javascript
const StorageUtils = {
  async get(keys) {
    try {
      const result = await chrome.storage.local.get(keys);
      if (chrome.runtime.lastError) {
        ErrorUtils.logError(chrome.runtime.lastError, 'StorageUtils.get');
        return {};
      }
      return result;
    } catch (error) {
      ErrorUtils.logError(error, 'StorageUtils.get');
      return {};  // Safe fallback
    }
  },

  async set(data) {
    try {
      await chrome.storage.local.set(data);
      if (chrome.runtime.lastError) {
        ErrorUtils.logError(chrome.runtime.lastError, 'StorageUtils.set');
        return false;
      }
      return true;
    } catch (error) {
      ErrorUtils.logError(error, 'StorageUtils.set');
      return false;
    }
  }
};
```

---

## Event Handling

### Options Page Events

**User Input Changes (Debounced):**
```javascript
// Appearance settings (live validation, no auto-save)
appearanceInputElements.forEach(input => {
  input.addEventListener('input', () => {
    debounceValidation();      // Shows validation errors
    setUnsavedChanges(true);   // Marks as unsaved
  });
});

// Manual mode inputs (debounced data updates)
document.addEventListener('input', (e) => {
  if (e.target.matches('.manual-category-name-input, .manual-site-*')) {
    debouncedUpdateManualData();  // Updates local appData, marks unsaved
  }
});
```

**Mode Switching:**
```javascript
dataSourceModeRadios.forEach(radio => {
  radio.addEventListener('change', async (event) => {
    appData.activeMode = event.target.value;
    toggleModeSections(appData.activeMode);
    setUnsavedChanges(true);

    if (appData.activeMode === 'bookmarks' && appData.bookmarks.folderId) {
      await renderBookmarkCategoryOrderList();
    }
  });
});
```

**Explicit Save:**
```javascript
saveAllSettingsBtn.addEventListener('click', async () => {
  await handleSaveAllSettings();  // Validates, generates display data, saves
});
```

**Beforeunload Warning:**
```javascript
window.addEventListener('beforeunload', (event) => {
  if (hasUnsavedChanges) {
    event.preventDefault();
    event.returnValue = '';  // Shows browser's default warning
    return 'You have unsaved changes. Are you sure you want to leave?';
  }
});
```

### Background Events

**Bookmark Changes (Auto-Sync):**
```javascript
chrome.bookmarks.onCreated.addListener(handleBookmarkChange);
chrome.bookmarks.onRemoved.addListener(handleBookmarkChange);
chrome.bookmarks.onChanged.addListener(handleBookmarkChange);
chrome.bookmarks.onMoved.addListener(handleBookmarkChange);

async function handleBookmarkChange(id, changeInfo) {
  const {appData} = await StorageUtils.get(STORAGE_KEYS.APP_DATA);

  if (appData?.activeMode === 'bookmarks' && appData?.bookmarks?.folderId) {
    const newActiveDisplayData = await DataSyncUtils.generateActiveDisplayData(
      appData,
      chrome.bookmarks
    );

    await StorageUtils.set({
      [STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: newActiveDisplayData
    });
  }
}
```

**Runtime Messages:**
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVersion') {
    sendResponse({version: NOVATAB_CONSTANTS.VERSION});
    return true;
  }

  if (request.action === 'refreshBookmarks') {
    handleManualBookmarkRefresh(sendResponse);
    return true;  // Async response
  }
});
```

**Extension Lifecycle:**
```javascript
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await handleFirstInstall();
  } else if (details.reason === 'update') {
    await handleUpdate(details.previousVersion);
  }
});
```

### New Tab Events

**Page Load:**
```javascript
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await loadAndRender();  // Fetches and renders
});
```

**Context Menu (Custom Icons):**
```javascript
siteCard.addEventListener('contextmenu', handleSiteContextMenu);

function handleSiteContextMenu(e) {
  e.preventDefault();
  currentSiteForModal = {
    categoryId: e.target.dataset.categoryId,
    siteUrl: e.target.dataset.siteUrl,
    siteName: e.target.dataset.siteName,
    isBookmarkSite: e.target.dataset.isBookmarkSite === 'true'
  };
  showContextMenu(e.pageX, e.pageY);
}
```

**Custom Icon Saving:**
```javascript
async function saveCustomIconToStorage(newIconUrl) {
  const {appData, appSettings} = await chrome.storage.local.get(['appData', 'appSettings']);

  if (isBookmarkSite) {
    // Save to iconOverrides
    appData.bookmarks.iconOverrides[siteUrl] = newIconUrl;
  } else {
    // Find and update site in manual.categories
    const site = findSiteInCategories(categoryId, siteUrl);
    site.customIconUrl = newIconUrl;
  }

  // Regenerate display data
  const activeDisplayData = await generateActiveDisplayData(appData);

  // Save all
  await chrome.storage.local.set({appData, activeDisplayData, appSettings});

  await debouncedLoadAndRender();  // Refresh UI
}
```

---

## State Management

### Component-Level State

**Options Page (options.js):**
```javascript
let appSettings = {};         // Current settings (in-memory)
let appData = {};             // Current data (in-memory)
let isLoading = false;        // Loading state
let hasUnsavedChanges = false; // Dirty flag
```

**New Tab Page (new_tab.js):**
```javascript
let settings = {};                           // Display settings
let appDataForDisplay = {                    // Display data
  categories: [],
  categoryOrder: []
};
let currentSiteForModal = null;              // Context menu state
```

**Background (background.js):**
- Stateless (event-driven)
- Fetches data on-demand
- No persistent in-memory state

### State Synchronization

**No Active Sync Between Tabs:**
- Options page changes don't immediately reflect in open new tabs
- New tabs must be **reloaded** to see changes
- Background auto-updates `activeDisplayData` on bookmark changes
- No `chrome.storage.onChanged` listeners in current implementation

**Why No Live Sync:**
1. **Simplicity**: Avoids race conditions and complex state management
2. **Performance**: No overhead from storage listeners
3. **User Expectation**: Settings pages typically require manual refresh
4. **Data Integrity**: Prevents partial updates during editing

### State Validation

**On Load (options.js):**
```javascript
async function loadDataFromStorage() {
  const result = await chrome.storage.local.get(['appSettings', 'appData']);

  // Merge with defaults (ensures all keys present)
  appSettings = {...DEFAULT_SETTINGS};
  if (result.appSettings) {
    Object.keys(DEFAULT_SETTINGS).forEach(key => {
      if (result.appSettings[key] !== undefined) {
        appSettings[key] = result.appSettings[key];
      }
    });
  }

  // Validate categories
  appData.manual.categories = validateCategories(result.appData.manual.categories);

  // Ensure category order matches categories
  if (!appData.manual.categoryOrder.length && appData.manual.categories.length) {
    appData.manual.categoryOrder = appData.manual.categories.map(c => c.id);
  }
}
```

**On Render (new_tab.js):**
```javascript
function getOrderedCategories() {
  const categoryMap = new Map(categories.map(cat => [cat.id, cat]));
  const ordered = [];

  // Add in specified order
  categoryOrder.forEach(id => {
    if (categoryMap.has(id)) {
      ordered.push(categoryMap.get(id));
    }
  });

  // Add any not in order
  categories.forEach(cat => {
    if (!categoryOrder.includes(cat.id)) {
      ordered.push(cat);
    }
  });

  return ordered.filter(cat => cat?.sites?.length > 0);
}
```

### State Transitions

**Initial State (First Install):**
```
Storage: Empty
    ↓
background.js: handleFirstInstall()
    ↓
Storage: {
  appSettings: DEFAULT_SETTINGS,
  appData: DEFAULT_APP_DATA,
  activeDisplayData: {categories: [], categoryOrder: []},
  extensionVersion: "1.1.0"
}
```

**Manual Mode Editing:**
```
User edits → appData.manual updated (in-memory)
User saves → activeDisplayData generated → All saved to storage
User reloads new tab → Fetches activeDisplayData → Renders
```

**Bookmarks Mode:**
```
User selects folder → appData.bookmarks.folderId set (in-memory)
User saves → activeDisplayData generated from bookmarks → All saved
Bookmark changed → background.js regenerates activeDisplayData → Saves
User reloads new tab → Fetches activeDisplayData → Renders
```

**Mode Switching:**
```
Manual → Bookmarks:
  1. Set appData.activeMode = 'bookmarks'
  2. Mark unsaved
  3. On save: Generate activeDisplayData from bookmarks
  4. Save all

Bookmarks → Manual:
  1. Set appData.activeMode = 'manual'
  2. Mark unsaved
  3. On save: Generate activeDisplayData from manual categories
  4. Save all
```

### Unsaved Changes Tracking

**When Set to True:**
- Any appearance setting input changes
- Manual category/site input changes (debounced)
- Mode switching
- Bookmark folder selection
- Category reordering (drag-drop)

**When Set to False:**
- After successful save
- After import (which auto-saves)
- After reset (which auto-saves)

**Visual Indicators:**
- Status message: "Changes pending. Click 'Save All Settings' to apply."
- Save button class: `unsaved-changes-indicator` (can be styled with CSS)
- Beforeunload warning if user tries to leave page

---

## Summary

NovaTab's data flow is designed for:

1. **Clarity**: Clear separation between source data and display data
2. **Consistency**: Same display structure regardless of mode
3. **Performance**: Pre-computed display data, not on-demand
4. **Integrity**: Deep cloning prevents accidental mutations
5. **Flexibility**: Easy to add new modes or data sources
6. **Reliability**: Comprehensive validation and error handling

The key architectural decision is the **activeDisplayData** abstraction, which decouples:
- **Where data comes from** (manual input vs. bookmarks)
- **How it's stored** (appData structure)
- **How it's displayed** (activeDisplayData structure)

This enables the new tab page to remain simple and mode-agnostic while supporting complex data sources and transformations.
