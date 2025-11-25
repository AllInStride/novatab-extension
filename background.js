// background.js - Service Worker for NovaTab extension

// Import utilities (Manifest V3 service workers require importScripts)
importScripts('utils.js');

// Installation and update handling
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('NovaTab: Extension installed/updated', details);

    // Ensure utils.js is loaded before proceeding
    // In a service worker, you might need to use importScripts() if utils.js is not automatically loaded.
    // However, based on the problem description, we assume utils.js objects are globally available.

    try {
        if (details.reason === 'install') {
            await handleFirstInstall();
        } else if (details.reason === 'update') {
            await handleUpdate(details.previousVersion);
        }
    } catch (error) {
        ErrorUtils.logError(error, 'chrome.runtime.onInstalled', {
            reason: details.reason,
            previousVersion: details.previousVersion
        });
    }
});

// Handle first-time installation
async function handleFirstInstall() {
    console.log('NovaTab: First time installation');

    try {
        await chrome.storage.local.set({
            appSettings: { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS },
            appData: { ...NOVATAB_CONSTANTS.DEFAULT_APP_DATA },
            activeDisplayData: { categories: [], categoryOrder: [] }, // Assuming this structure is okay or defined elsewhere
            extensionVersion: NOVATAB_CONSTANTS.VERSION,
            installDate: Date.now()
        });

        console.log('NovaTab: Default settings initialized');

    } catch (error) {
        ErrorUtils.logError(error, 'handleFirstInstall', {
            reason: 'install',
            version: NOVATAB_CONSTANTS.VERSION
        });
    }
}

// Handle extension updates
async function handleUpdate(previousVersion) {
    console.log(`NovaTab: Updating from version ${previousVersion} to ${NOVATAB_CONSTANTS.VERSION}`);

    try {
        const result = await chrome.storage.local.get(['appSettings', 'appData', 'extensionVersion']);

        // Use GeneralUtils.compareVersions for version comparison
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

// Migration function for version 1.1.0
async function migrateToV1_1_0(existingData) {
    console.log('NovaTab: Migrating to version 1.1.0');
    
    try {
        let appSettings = existingData.appSettings || {};
        let appData = existingData.appData || {};

        const updatedSettings = { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS, ...appSettings };

        const updatedAppData = {
            activeMode: appData.activeMode || NOVATAB_CONSTANTS.DEFAULT_APP_DATA.activeMode,
            manual: {
                categories: appData.manual?.categories || [],
                categoryOrder: appData.manual?.categoryOrder || []
            },
            bookmarks: {
                folderId: appData.bookmarks?.folderId || null,
                categoryOrder: appData.bookmarks?.categoryOrder || [],
                iconOverrides: appData.bookmarks?.iconOverrides || {}
            }
        };

        if (updatedAppData.manual.categories) {
            updatedAppData.manual.categories = updatedAppData.manual.categories.map(cat => ({
                id: cat.id || GeneralUtils.generateUUID(),
                name: cat.name || 'Unnamed Category',
                sites: (cat.sites || []).map(site => ({
                    name: site.name || '',
                    url: site.url || '',
                    customIconUrl: site.customIconUrl || ''
                }))
            }));
        }

        if ((!updatedAppData.manual.categoryOrder || updatedAppData.manual.categoryOrder.length === 0)
            && updatedAppData.manual.categories.length > 0) {
            updatedAppData.manual.categoryOrder = updatedAppData.manual.categories.map(c => c.id);
        }
        
        await chrome.storage.local.set({
            appSettings: updatedSettings,
            appData: updatedAppData
        });
        
        console.log('NovaTab: Migration to 1.1.0 completed');

    } catch (error) {
        ErrorUtils.logError(error, 'migrateToV1_1_0', {
            hasExistingData: !!existingData,
            existingMode: existingData?.appData?.activeMode
        });
        throw error;
    }
}

// Bookmark change debouncing
let bookmarkChangeTimeout = null;

// Handle bookmark changes
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
            ErrorUtils.logError(error, 'handleBookmarkChange', {
                bookmarkId: id,
                changeInfo: changeInfo
            });
        }
    }, 500);
}

// Handle action button click
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('NovaTab: Received message:', request);

    if (request.action === 'getVersion') {
        sendResponse({ version: NOVATAB_CONSTANTS.VERSION });
        return true;
    }

    if (request.action === 'refreshBookmarks') {
        // This message might now be redundant if background.js auto-updates on bookmark changes.
        // However, it can be kept for explicit refresh requests from options page or other UI.
        handleManualBookmarkRefresh(sendResponse);
        return true;
    }
});

async function handleManualBookmarkRefresh(sendResponse) {
    try {
        const storageResult = await StorageUtils.get(NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA);
        const currentAppData = storageResult.appData;

        if (currentAppData?.activeMode === 'bookmarks' && currentAppData?.bookmarks?.folderId) {
            const newActiveDisplayData = await DataSyncUtils.generateActiveDisplayData(currentAppData, chrome.bookmarks);
            await StorageUtils.set({ [NOVATAB_CONSTANTS.STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: newActiveDisplayData });
            console.log('NovaTab: activeDisplayData refreshed manually via message.');
            sendResponse({ success: true, message: "Bookmarks refreshed and display data updated." });
        } else {
            sendResponse({ success: false, message: "Not in bookmarks mode or no folder selected." });
        }
    } catch (error) {
        ErrorUtils.logError(error, 'handleManualBookmarkRefresh', {
            mode: currentAppData?.activeMode,
            hasFolderId: !!currentAppData?.bookmarks?.folderId
        });
        sendResponse({ success: false, error: error.message });
    }
}

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

        if (!appData?.bookmarks?.iconOverrides || !appData?.bookmarks?.folderId) {
            return 0;
        }

        console.log('NovaTab: Starting icon override cleanup...');

        const activeUrls = new Set();
        const activeData = await DataSyncUtils.generateActiveDisplayData(appData, chrome.bookmarks);

        activeData.categories.forEach(cat => {
            cat.sites.forEach(site => {
                activeUrls.add(site.url);
            });
        });

        let cleaned = 0;
        const iconOverrides = appData.bookmarks.iconOverrides;

        Object.keys(iconOverrides).forEach(url => {
            if (!activeUrls.has(url)) {
                delete iconOverrides[url];
                cleaned++;
            }
        });

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
        ErrorUtils.logError(error, 'cleanupOrphanedIconOverrides', {
            hasIconOverrides: !!appData?.bookmarks?.iconOverrides,
            hasFolderId: !!appData?.bookmarks?.folderId
        });
        return 0;
    }
}

chrome.runtime.onSuspend.addListener(() => {
    console.log('NovaTab: Extension suspending');
});

chrome.runtime.onStartup.addListener(async () => {
    console.log('NovaTab: Extension starting up');
    await cleanupOrphanedIconOverrides();
});

console.log('NovaTab: Background service worker initialized');