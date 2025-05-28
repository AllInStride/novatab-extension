// utils.js - Shared utilities for NovaTab extension

const NOVATAB_CONSTANTS = {
    VERSION: "1.1.0",
    
    DEFAULT_SETTINGS: {
        maxCategoriesPerRow: '2',
        maxSiteCardsPerRow: '5',
        cardMinWidth: '70px',
        categoryTitleFontSize: '16px',
        siteNameFontSize: '10px',
        faviconWrapperSize: '38px',
        gradientStartColor: '#F5F7FA',
        gradientEndColor: '#E0E5EC'
    },
    
    DEFAULT_APP_DATA: {
        activeMode: 'manual',
        manual: { categories: [], categoryOrder: [] },
        bookmarks: { folderId: null, categoryOrder: [], iconOverrides: {} }
    },
    
    STORAGE_KEYS: {
        APP_SETTINGS: 'appSettings',
        APP_DATA: 'appData',
        ACTIVE_DISPLAY_DATA: 'activeDisplayData',
        EXTENSION_VERSION: 'extensionVersion'
    },
    
    FAVICON_SERVICES: {
        GOOGLE: 'https://www.google.com/s2/favicons',
        FALLBACK: 'icons/default_favicon.png'
    }
};

const URLUtils = {
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;
        
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    },

    normalizeUrl(url) {
        if (!url || typeof url !== 'string') return '';
        
        const trimmed = url.trim();
        if (!trimmed) return '';
        
        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }
        
        return `https://${trimmed}`;
    },

    getEffectiveHostname(url) {
        if (!url || typeof url !== 'string') {
            return 'example.com';
        }

        try {
            const normalizedUrl = this.normalizeUrl(url);
            const urlObj = new URL(normalizedUrl);
            
            if (!urlObj.hostname || urlObj.hostname === 'localhost') {
                return urlObj.hostname || 'localhost';
            }

            const parts = urlObj.hostname.split('.');
            
            if (parts.length === 1) {
                return urlObj.hostname;
            }
            
            if (parts.length === 2) {
                return urlObj.hostname;
            }

            const commonCcTlds = ['co', 'com', 'org', 'gov', 'net', 'edu', 'ac'];
            const lastPart = parts[parts.length - 1];
            const secondLastPart = parts[parts.length - 2];
            
            if (parts.length >= 3 && lastPart.length === 2 && commonCcTlds.includes(secondLastPart)) {
                return parts.slice(-3).join('.');
            }
            
            return parts.slice(-2).join('.');
            
        } catch (error) {
            console.warn(`NovaTab URLUtils: Error parsing URL "${url}":`, error.message);
            return 'example.com';
        }
    },

    getFaviconUrl(site) {
        if (!site || typeof site !== 'object') {
            return NOVATAB_CONSTANTS.FAVICON_SERVICES.FALLBACK;
        }

        if (site.customIconUrl && this.isValidUrl(site.customIconUrl)) {
            return site.customIconUrl;
        }

        if (!site.url) {
            return NOVATAB_CONSTANTS.FAVICON_SERVICES.FALLBACK;
        }

        const hostname = this.getEffectiveHostname(site.url);
        if (hostname === 'example.com') {
            return NOVATAB_CONSTANTS.FAVICON_SERVICES.FALLBACK;
        }

        return `${NOVATAB_CONSTANTS.FAVICON_SERVICES.GOOGLE}?domain=${encodeURIComponent(hostname)}&sz=64`;
    }
};

const ValidationUtils = {
    isPositiveNumber(value) {
        const num = parseInt(value);
        return !isNaN(num) && num > 0;
    },

    isValidPixelValue(value) {
        return /^\d+px$/.test(value) && parseInt(value) > 0;
    },

    isValidHexColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    },

    validateSite(site) {
        if (!site || typeof site !== 'object') {
            return { name: '', url: '', customIconUrl: '' };
        }

        return {
            name: typeof site.name === 'string' ? site.name.trim() : '',
            url: typeof site.url === 'string' ? URLUtils.normalizeUrl(site.url) : '',
            customIconUrl: typeof site.customIconUrl === 'string' ? site.customIconUrl.trim() : ''
        };
    },

    validateCategory(category) {
        if (!category || typeof category !== 'object') {
            return {
                id: this.generateUUID(),
                name: 'Unnamed Category',
                sites: []
            };
        }

        return {
            id: category.id || this.generateUUID(),
            name: typeof category.name === 'string' ? category.name.trim() || 'Unnamed Category' : 'Unnamed Category',
            sites: Array.isArray(category.sites) ? category.sites.map(site => this.validateSite(site)) : []
        };
    },

    // Merging validators from options.js into ValidationUtils
    isValidCategoriesPerRow(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 4;
    },

    isValidSiteCardsPerRow(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 3 && num <= 10;
    },

    isValidCardMinWidth(value) {
        const match = value.match(/^(\d+)px$/);
        if (!match) return false;
        const num = parseInt(match[1]);
        return num >= 50 && num <= 150;
    },

    isValidFaviconSize(value) { // Renamed from isValidFaviconWrapperSize for generality
        const match = value.match(/^(\d+)px$/);
        if (!match) return false;
        const num = parseInt(match[1]);
        return num >= 24 && num <= 64;
    },

    isValidFontSize(value) {
        const match = value.match(/^(\d+)px$/);
        if (!match) return false;
        const num = parseInt(match[1]);
        return num >= 8 && num <= 24;
    },
    // isValidColor is already covered by isValidHexColor
    // isValidUrl from the local validators object in options.js was:
    // (url) => { try { new URL(url); return url.startsWith('http://') || url.startsWith('https://'); } catch { return false; } }
    // URLUtils.isValidUrl is more robust, so we'll rely on that if strict http/https is needed.
    // If a simpler URL check is needed elsewhere, it can be added or URLUtils.isValidUrl can be used.
};

const StorageUtils = {
    async get(keys) {
        try {
            const result = await chrome.storage.local.get(keys);
            if (chrome.runtime.lastError) {
                // Adding a property to distinguish chrome.runtime.lastError
                const error = { ...chrome.runtime.lastError, isChromeRuntimeError: true };
                ErrorUtils.logError(error, 'StorageUtils.get - runtime.lastError');
                return {}; 
            }
            return result;
        } catch (error) {
            ErrorUtils.logError(error, 'StorageUtils.get');
            return {};
        }
    },

    async set(data) {
        try {
            await chrome.storage.local.set(data);
            if (chrome.runtime.lastError) {
                const error = { ...chrome.runtime.lastError, isChromeRuntimeError: true };
                ErrorUtils.logError(error, 'StorageUtils.set - runtime.lastError');
                return false; 
            }
            return true;
        } catch (error) {
            ErrorUtils.logError(error, 'StorageUtils.set');
            return false;
        }
    },

    async getSettings() {
        const result = await this.get(NOVATAB_CONSTANTS.STORAGE_KEYS.APP_SETTINGS);
        const settings = { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS };
        
        if (result[NOVATAB_CONSTANTS.STORAGE_KEYS.APP_SETTINGS]) {
            Object.keys(NOVATAB_CONSTANTS.DEFAULT_SETTINGS).forEach(key => {
                if (result[NOVATAB_CONSTANTS.STORAGE_KEYS.APP_SETTINGS][key] !== undefined) {
                    settings[key] = result[NOVATAB_CONSTANTS.STORAGE_KEYS.APP_SETTINGS][key];
                }
            });
        }
        
        return settings;
    },

    async getAppData() {
        const result = await this.get(NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA);
        let appData = JSON.parse(JSON.stringify(NOVATAB_CONSTANTS.DEFAULT_APP_DATA));
        
        if (result[NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA]) {
            const stored = result[NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA];
            
            appData.activeMode = stored.activeMode || appData.activeMode;
            
            if (stored.manual) {
                appData.manual.categories = Array.isArray(stored.manual.categories) 
                    ? stored.manual.categories.map(cat => ValidationUtils.validateCategory(cat))
                    : [];
                appData.manual.categoryOrder = Array.isArray(stored.manual.categoryOrder) 
                    ? stored.manual.categoryOrder 
                    : [];
            }
            
            if (stored.bookmarks) {
                appData.bookmarks = {
                    folderId: stored.bookmarks.folderId || null,
                    categoryOrder: Array.isArray(stored.bookmarks.categoryOrder) 
                        ? stored.bookmarks.categoryOrder 
                        : [],
                    iconOverrides: typeof stored.bookmarks.iconOverrides === 'object' 
                        ? stored.bookmarks.iconOverrides 
                        : {}
                };
            }
        }
        
        if ((!appData.manual.categoryOrder.length) && appData.manual.categories.length > 0) {
            appData.manual.categoryOrder = appData.manual.categories.map(c => c.id);
        }
        
        return appData;
    }
};

const DOMUtils = {
    escapeHTML(str) {
        if (typeof str !== 'string') str = String(str);
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return str.replace(/[&<>"']/g, match => escapeMap[match]);
    },

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    throttle(func, limit) {
        let inThrottle;
        return function executedFunction(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    showStatus(element, message, type = 'info', duration = 3000) {
        if (!element) return;
        
        element.textContent = message;
        element.className = type;
        
        if (duration > 0) {
            setTimeout(() => {
                element.textContent = '';
                element.className = '';
            }, duration);
        }
    }
};

const GeneralUtils = {
    generateUUID() {
        if (crypto && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const cloned = {};
            Object.keys(obj).forEach(key => {
                cloned[key] = this.deepClone(obj[key]);
            });
            return cloned;
        }
        return obj;
    },

    compareVersions(version1, version2) {
        const v1Parts = version1.split('.').map(Number);
        const v2Parts = version2.split('.').map(Number);
        const maxLength = Math.max(v1Parts.length, v2Parts.length);
        
        for (let i = 0; i < maxLength; i++) {
            const v1Part = v1Parts[i] || 0;
            const v2Part = v2Parts[i] || 0;
            
            if (v1Part < v2Part) return -1;
            if (v1Part > v2Part) return 1;
        }
        
        return 0;
    },

    async safeAsync(asyncFunc, context = 'unknown') {
        try {
            const result = await asyncFunc();
            if (chrome.runtime.lastError) {
                const error = { ...chrome.runtime.lastError, isChromeRuntimeError: true };
                ErrorUtils.logError(error, `${context} - runtime.lastError`);
                return null;
            }
            return result;
        } catch (error) {
            ErrorUtils.logError(error, context);
            return null;
        }
    }
};

const ErrorUtils = {
    createError(message, code = 'UNKNOWN_ERROR', details = null) {
        return {
            message,
            code,
            details,
            timestamp: Date.now()
        };
    },

    logError(error, context = 'unknown') {
        const errorInfo = {
            context,
            message: error.message || error.toString(),
            stack: error.stack,
            timestamp: new Date().toISOString()
        };
        
        console.error('NovaTab Error:', errorInfo);
    }
};

ValidationUtils.generateUUID = GeneralUtils.generateUUID;

// The 'validators' object is now merged into ValidationUtils and can be removed.

const DataSyncUtils = {
    async generateActiveDisplayData(appData, bookmarksApi) {
        if (!appData) {
            ErrorUtils.logError(new Error("appData is undefined"), 'DataSyncUtils.generateActiveDisplayData appData check');
            return { categories: [], categoryOrder: [] }; 
        }

        const activeMode = appData.activeMode || 'manual';
        let newActiveDisplayData = { categories: [], categoryOrder: [] };

        try {
            if (activeMode === 'manual') {
                // Deep clone manual data to prevent direct modification of appData
                newActiveDisplayData.categories = GeneralUtils.deepClone(appData.manual?.categories || []);
                newActiveDisplayData.categoryOrder = GeneralUtils.deepClone(appData.manual?.categoryOrder || []);
            } else if (activeMode === 'bookmarks') {
                if (!appData.bookmarks?.folderId) {
                    console.warn("NovaTab DataSyncUtils: Bookmarks mode is active but no folderId is set. Returning empty display data."); // Kept as console.warn as it's an expected state.
                    return { categories: [], categoryOrder: [] };
                }
                if (!bookmarksApi) {
                    ErrorUtils.logError(new Error("bookmarksApi is undefined"), 'DataSyncUtils.generateActiveDisplayData bookmarksApi check');
                    return { categories: [], categoryOrder: [] }; 
                }

                const derivedCats = [];
                const rootFolderContents = await GeneralUtils.safeAsync(() => bookmarksApi.getChildren(appData.bookmarks.folderId), 'bookmarksApi.getChildren_root');

                if (rootFolderContents) {
                    for (const folder of rootFolderContents) {
                        if (!folder.url) { // It's a sub-folder, treat as a category
                            const sitesFromBookmark = [];
                            const bookmarksInFolder = await GeneralUtils.safeAsync(() => bookmarksApi.getChildren(folder.id), `bookmarksApi.getChildren_subfolder_${folder.id}`);

                            if (bookmarksInFolder) {
                                bookmarksInFolder.forEach(bm => {
                                    if (bm.url) { // It's a bookmark
                                        sitesFromBookmark.push({
                                            name: bm.title || 'Unnamed Bookmark',
                                            url: bm.url,
                                            // Apply icon override if it exists
                                            customIconUrl: (appData.bookmarks.iconOverrides && appData.bookmarks.iconOverrides[bm.url]) || ''
                                        });
                                    }
                                });
                            }

                            if (sitesFromBookmark.length > 0) {
                                derivedCats.push({
                                    id: folder.id, // Use bookmark folder ID as category ID
                                    name: folder.title || 'Unnamed Category',
                                    sites: sitesFromBookmark
                                });
                            }
                        }
                    }
                }
                newActiveDisplayData.categories = derivedCats;

                // Ensure categoryOrder is consistent
                const derivedCategoryMap = new Map(derivedCats.map(c => [c.id, c]));
                let finalOrder = (appData.bookmarks.categoryOrder || []).filter(id => derivedCategoryMap.has(id));

                derivedCats.forEach(cat => {
                    if (!finalOrder.includes(cat.id)) {
                        finalOrder.push(cat.id);
                    }
                });
                newActiveDisplayData.categoryOrder = finalOrder;
            }
        } catch (error) {
            ErrorUtils.logError(error, 'DataSyncUtils.generateActiveDisplayData main processing');
            return { categories: [], categoryOrder: [] }; 
        }
        
        // Final validation or cleaning step could be added here if necessary
        return newActiveDisplayData;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        NOVATAB_CONSTANTS,
        URLUtils,
        ValidationUtils,
        StorageUtils,
        DOMUtils,
        GeneralUtils,
        ErrorUtils,
        DataSyncUtils
    };
}