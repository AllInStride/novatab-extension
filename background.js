// background.js - Service Worker for NovaTab extension

const EXTENSION_VERSION = "1.1.0";
const DEFAULT_SETTINGS = {
    maxCategoriesPerRow: '2',
    maxSiteCardsPerRow: '5',
    cardMinWidth: '70px',
    categoryTitleFontSize: '16px',
    siteNameFontSize: '10px',
    faviconWrapperSize: '38px',
    gradientStartColor: '#F5F7FA',
    gradientEndColor: '#E0E5EC'
};

const DEFAULT_APP_DATA = {
    activeMode: 'manual',
    manual: { categories: [], categoryOrder: [] },
    bookmarks: { folderId: null, categoryOrder: [], iconOverrides: {} }
};

// Installation and update handling
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log('NovaTab: Extension installed/updated', details);
    
    try {
        if (details.reason === 'install') {
            await handleFirstInstall();
        } else if (details.reason === 'update') {
            await handleUpdate(details.previousVersion);
        }
    } catch (error) {
        console.error('NovaTab: Error during installation/update:', error);
    }
});

// Handle first-time installation
async function handleFirstInstall() {
    console.log('NovaTab: First time installation');
    
    try {
        await chrome.storage.local.set({
            appSettings: { ...DEFAULT_SETTINGS },
            appData: { ...DEFAULT_APP_DATA },
            activeDisplayData: { categories: [], categoryOrder: [] },
            extensionVersion: EXTENSION_VERSION,
            installDate: Date.now()
        });
        
        console.log('NovaTab: Default settings initialized');
        
    } catch (error) {
        console.error('NovaTab: Error during first install setup:', error);
    }
}

// Handle extension updates
async function handleUpdate(previousVersion) {
    console.log(`NovaTab: Updating from version ${previousVersion} to ${EXTENSION_VERSION}`);
    
    try {
        const result = await chrome.storage.local.get(['appSettings', 'appData', 'extensionVersion']);
        
        if (previousVersion && isVersionLower(previousVersion, '1.1.0')) {
            await migrateToV1_1_0(result);
        }
        
        await chrome.storage.local.set({
            extensionVersion: EXTENSION_VERSION,
            lastUpdateDate: Date.now()
        });
        
        console.log('NovaTab: Update completed successfully');
        
    } catch (error) {
        console.error('NovaTab: Error during update:', error);
    }
}

// Migration function for version 1.1.0
async function migrateToV1_1_0(existingData) {
    console.log('NovaTab: Migrating to version 1.1.0');
    
    try {
        let appSettings = existingData.appSettings || {};
        let appData = existingData.appData || {};
        
        const updatedSettings = { ...DEFAULT_SETTINGS, ...appSettings };
        
        const updatedAppData = {
            activeMode: appData.activeMode || DEFAULT_APP_DATA.activeMode,
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
                id: cat.id || generateUUID(),
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
        console.error('NovaTab: Error during migration:', error);
        throw error;
    }
}

// Utility function to compare version strings
function isVersionLower(version1, version2) {
    const v1Parts = version1.split('.').map(Number);
    const v2Parts = version2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(v1Parts.length, v2Parts.length); i++) {
        const v1Part = v1Parts[i] || 0;
        const v2Part = v2Parts[i] || 0;
        
        if (v1Part < v2Part) return true;
        if (v1Part > v2Part) return false;
    }
    
    return false;
}

// UUID generation utility
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Handle bookmark changes
chrome.bookmarks.onCreated.addListener(handleBookmarkChange);
chrome.bookmarks.onRemoved.addListener(handleBookmarkChange);
chrome.bookmarks.onChanged.addListener(handleBookmarkChange);
chrome.bookmarks.onMoved.addListener(handleBookmarkChange);

async function handleBookmarkChange(id, changeInfo) {
    try {
        const result = await chrome.storage.local.get(['appData']);
        
        if (result.appData?.activeMode === 'bookmarks' && result.appData?.bookmarks?.folderId) {
            console.log('NovaTab: Bookmarks changed, display may need refresh');
        }
    } catch (error) {
        console.error('NovaTab: Error handling bookmark change:', error);
    }
}

// Handle action button click
chrome.action.onClicked.addListener(() => {
    chrome.runtime.openOptionsPage();
});

// Message handling
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('NovaTab: Received message:', request);
    
    if (request.action === 'getVersion') {
        sendResponse({ version: EXTENSION_VERSION });
        return true;
    }
    
    if (request.action === 'refreshBookmarks') {
        handleBookmarkRefresh(sendResponse);
        return true;
    }
});

async function handleBookmarkRefresh(sendResponse) {
    try {
        sendResponse({ success: true });
    } catch (error) {
        console.error('NovaTab: Error refreshing bookmarks:', error);
        sendResponse({ success: false, error: error.message });
    }
}

chrome.runtime.onSuspend.addListener(() => {
    console.log('NovaTab: Extension suspending');
});

chrome.runtime.onStartup.addListener(() => {
    console.log('NovaTab: Extension starting up');
});

console.log('NovaTab: Background service worker initialized');