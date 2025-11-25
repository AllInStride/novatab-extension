// utils.js - Shared utilities for NovaTab extension

/**
 * NovaTab extension constants and default values.
 *
 * @namespace NOVATAB_CONSTANTS
 * @property {string} VERSION - Current extension version
 * @property {Object} DEFAULT_SETTINGS - Default display and layout settings
 * @property {string} DEFAULT_SETTINGS.maxCategoriesPerRow - Maximum categories per row (1-4)
 * @property {string} DEFAULT_SETTINGS.maxSiteCardsPerRow - Maximum site cards per row (3-10)
 * @property {string} DEFAULT_SETTINGS.cardMinWidth - Minimum card width in pixels (50-150px)
 * @property {string} DEFAULT_SETTINGS.categoryTitleFontSize - Category title font size (8-24px)
 * @property {string} DEFAULT_SETTINGS.siteNameFontSize - Site name font size (8-24px)
 * @property {string} DEFAULT_SETTINGS.faviconWrapperSize - Favicon wrapper size (24-64px)
 * @property {string} DEFAULT_SETTINGS.gradientStartColor - Background gradient start color (hex)
 * @property {string} DEFAULT_SETTINGS.gradientEndColor - Background gradient end color (hex)
 * @property {Object} DEFAULT_APP_DATA - Default application data structure
 * @property {string} DEFAULT_APP_DATA.activeMode - Active display mode ('manual' or 'bookmarks')
 * @property {Object} DEFAULT_APP_DATA.manual - Manual mode data with categories and order
 * @property {Object} DEFAULT_APP_DATA.bookmarks - Bookmarks mode data with folder reference
 * @property {Object} STORAGE_KEYS - Chrome storage keys for data persistence
 * @property {string} STORAGE_KEYS.APP_SETTINGS - Key for application settings
 * @property {string} STORAGE_KEYS.APP_DATA - Key for application data
 * @property {string} STORAGE_KEYS.ACTIVE_DISPLAY_DATA - Key for active display data
 * @property {string} STORAGE_KEYS.EXTENSION_VERSION - Key for extension version
 * @property {Object} FAVICON_SERVICES - Favicon service URLs
 * @property {string} FAVICON_SERVICES.GOOGLE - Google favicon service URL
 * @property {string} FAVICON_SERVICES.FALLBACK - Fallback favicon path
 */
const NOVATAB_CONSTANTS = {
    VERSION: "1.1.1",

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

/**
 * URL validation and manipulation utilities.
 * @namespace URLUtils
 */
const URLUtils = {
    /**
     * Validates if a string is a valid HTTP or HTTPS URL.
     *
     * @param {string} url - The URL string to validate
     * @returns {boolean} True if the URL is valid HTTP/HTTPS, false otherwise
     *
     * @description
     * Validates URLs by attempting to parse them with the URL constructor.
     * Automatically prepends 'https://' if the protocol is missing.
     * Only accepts http: and https: protocols.
     *
     * @example
     * URLUtils.isValidUrl('https://example.com'); // true
     * URLUtils.isValidUrl('example.com'); // true (auto-prepends https://)
     * URLUtils.isValidUrl('ftp://example.com'); // false (invalid protocol)
     * URLUtils.isValidUrl(''); // false
     * URLUtils.isValidUrl(null); // false
     */
    isValidUrl(url) {
        if (!url || typeof url !== 'string') return false;

        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    },

    /**
     * Normalizes a URL by ensuring it has a protocol.
     *
     * @param {string} url - The URL string to normalize
     * @returns {string} The normalized URL with protocol, or empty string if invalid
     *
     * @description
     * Trims whitespace and prepends 'https://' if no protocol is present.
     * Returns empty string for null, undefined, or empty inputs.
     *
     * @example
     * URLUtils.normalizeUrl('example.com'); // 'https://example.com'
     * URLUtils.normalizeUrl('http://example.com'); // 'http://example.com'
     * URLUtils.normalizeUrl('  example.com  '); // 'https://example.com'
     * URLUtils.normalizeUrl(''); // ''
     */
    normalizeUrl(url) {
        if (!url || typeof url !== 'string') return '';

        const trimmed = url.trim();
        if (!trimmed) return '';

        if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
            return trimmed;
        }

        return `https://${trimmed}`;
    },

    /**
     * Extracts the effective hostname from a URL for favicon retrieval.
     *
     * @param {string} url - The URL to extract hostname from
     * @returns {string} The effective hostname, or 'example.com' on error
     *
     * @description
     * Returns the base domain for favicon lookup by:
     * - Extracting the hostname from the URL
     * - Handling localhost and single-part hostnames
     * - Extracting base domain (e.g., 'example.com' from 'www.example.com')
     * - Handling country-code TLDs (e.g., 'example.co.uk')
     *
     * Edge cases:
     * - Invalid URLs return 'example.com'
     * - Localhost returns 'localhost'
     * - Single-part domains return as-is
     * - Handles common ccTLDs (.co.uk, .com.au, etc.)
     *
     * @example
     * URLUtils.getEffectiveHostname('https://www.example.com/path'); // 'example.com'
     * URLUtils.getEffectiveHostname('https://blog.example.co.uk'); // 'example.co.uk'
     * URLUtils.getEffectiveHostname('http://localhost:3000'); // 'localhost'
     * URLUtils.getEffectiveHostname('invalid'); // 'example.com'
     */
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
    },

    /**
     * Gets the appropriate favicon URL for a site.
     *
     * @param {Object} site - The site object
     * @param {string} site.url - The site's URL
     * @param {string} [site.customIconUrl] - Optional custom icon URL
     * @returns {string} The favicon URL (custom, Google service, or fallback)
     *
     * @description
     * Returns favicon URL with the following priority:
     * 1. Custom icon URL (if provided and valid)
     * 2. Google favicon service URL (if site URL is valid)
     * 3. Fallback icon path
     *
     * Edge cases:
     * - Invalid site objects return fallback icon
     * - Invalid custom icon URLs are ignored
     * - Invalid site URLs return fallback icon
     * - Uses Google S2 favicon service with 64px size
     *
     * @example
     * URLUtils.getFaviconUrl({url: 'https://example.com'});
     * // 'https://www.google.com/s2/favicons?domain=example.com&sz=64'
     *
     * URLUtils.getFaviconUrl({url: 'https://example.com', customIconUrl: 'https://cdn.example.com/icon.png'});
     * // 'https://cdn.example.com/icon.png'
     *
     * URLUtils.getFaviconUrl({});
     * // 'icons/default_favicon.png'
     */
    getFaviconUrl(site) {
        if (!site || typeof site !== 'object') {
            return NOVATAB_CONSTANTS.FAVICON_SERVICES.FALLBACK;
        }

        if (site.customIconUrl && this.isValidImageUrl(site.customIconUrl)) {
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

/**
 * Data validation utilities for settings and user input.
 * @namespace ValidationUtils
 */
const ValidationUtils = {
    /**
     * Validates if a value is a positive integer.
     *
     * @param {string|number} value - The value to validate
     * @returns {boolean} True if value is a positive integer, false otherwise
     *
     * @example
     * ValidationUtils.isPositiveNumber('5'); // true
     * ValidationUtils.isPositiveNumber(10); // true
     * ValidationUtils.isPositiveNumber('0'); // false
     * ValidationUtils.isPositiveNumber('-5'); // false
     * ValidationUtils.isPositiveNumber('abc'); // false
     */
    isPositiveNumber(value) {
        const num = parseInt(value);
        return !isNaN(num) && num > 0;
    },

    /**
     * Validates if a value is a valid pixel value (e.g., '16px').
     *
     * @param {string} value - The pixel value to validate
     * @returns {boolean} True if value is in format 'Npx' where N > 0
     *
     * @example
     * ValidationUtils.isValidPixelValue('16px'); // true
     * ValidationUtils.isValidPixelValue('0px'); // false
     * ValidationUtils.isValidPixelValue('16'); // false
     * ValidationUtils.isValidPixelValue('px'); // false
     */
    isValidPixelValue(value) {
        return /^\d+px$/.test(value) && parseInt(value) > 0;
    },

    /**
     * Validates if a color is a valid 6-digit hex color.
     *
     * @param {string} color - The hex color to validate
     * @returns {boolean} True if color matches #RRGGBB format
     *
     * @example
     * ValidationUtils.isValidHexColor('#FF5733'); // true
     * ValidationUtils.isValidHexColor('#fff'); // false (must be 6 digits)
     * ValidationUtils.isValidHexColor('FF5733'); // false (missing #)
     * ValidationUtils.isValidHexColor('#GG5733'); // false (invalid hex)
     */
    isValidHexColor(color) {
        return /^#[0-9A-F]{6}$/i.test(color);
    },

    /**
     * Validates and sanitizes a site object.
     *
     * @param {Object} site - The site object to validate
     * @param {string} [site.name] - The site name
     * @param {string} [site.url] - The site URL
     * @param {string} [site.customIconUrl] - Optional custom icon URL
     * @returns {Object} Validated site object with trimmed/normalized values
     *
     * @description
     * Returns a sanitized site object with:
     * - Trimmed name (empty string if missing)
     * - Normalized URL (empty string if missing)
     * - Trimmed custom icon URL (empty string if missing)
     *
     * @example
     * ValidationUtils.validateSite({name: ' Google ', url: 'google.com'});
     * // {name: 'Google', url: 'https://google.com', customIconUrl: ''}
     *
     * ValidationUtils.validateSite({});
     * // {name: '', url: '', customIconUrl: ''}
     */
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

    /**
     * Validates and sanitizes a category object.
     *
     * @param {Object} category - The category object to validate
     * @param {string} [category.id] - The category ID (generated if missing)
     * @param {string} [category.name] - The category name
     * @param {Array<Object>} [category.sites] - Array of site objects
     * @returns {Object} Validated category with id, name, and validated sites array
     *
     * @description
     * Returns a sanitized category object with:
     * - Valid UUID (generated if missing)
     * - Non-empty name (defaults to 'Unnamed Category')
     * - Array of validated sites (empty array if missing)
     *
     * @example
     * ValidationUtils.validateCategory({name: 'Work', sites: [{name: 'Gmail', url: 'gmail.com'}]});
     * // {id: '...uuid...', name: 'Work', sites: [{name: 'Gmail', url: 'https://gmail.com', customIconUrl: ''}]}
     *
     * ValidationUtils.validateCategory({});
     * // {id: '...uuid...', name: 'Unnamed Category', sites: []}
     */
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

    /**
     * Validates categories per row setting (1-4).
     *
     * @param {string|number} value - The value to validate
     * @returns {boolean} True if value is between 1 and 4 inclusive
     *
     * @example
     * ValidationUtils.isValidCategoriesPerRow('2'); // true
     * ValidationUtils.isValidCategoriesPerRow('5'); // false
     */
    isValidCategoriesPerRow(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 1 && num <= 4;
    },

    /**
     * Validates site cards per row setting (3-10).
     *
     * @param {string|number} value - The value to validate
     * @returns {boolean} True if value is between 3 and 10 inclusive
     *
     * @example
     * ValidationUtils.isValidSiteCardsPerRow('5'); // true
     * ValidationUtils.isValidSiteCardsPerRow('2'); // false
     * ValidationUtils.isValidSiteCardsPerRow('11'); // false
     */
    isValidSiteCardsPerRow(value) {
        const num = parseInt(value);
        return !isNaN(num) && num >= 3 && num <= 10;
    },

    /**
     * Validates card minimum width setting (50-150px).
     *
     * @param {string} value - The pixel value to validate
     * @returns {boolean} True if value is between 50px and 150px inclusive
     *
     * @example
     * ValidationUtils.isValidCardMinWidth('70px'); // true
     * ValidationUtils.isValidCardMinWidth('40px'); // false
     * ValidationUtils.isValidCardMinWidth('200px'); // false
     */
    isValidCardMinWidth(value) {
        const match = value.match(/^(\d+)px$/);
        if (!match) return false;
        const num = parseInt(match[1]);
        return num >= 50 && num <= 150;
    },

    /**
     * Validates favicon size setting (24-64px).
     *
     * @param {string} value - The pixel value to validate
     * @returns {boolean} True if value is between 24px and 64px inclusive
     *
     * @example
     * ValidationUtils.isValidFaviconSize('38px'); // true
     * ValidationUtils.isValidFaviconSize('20px'); // false
     * ValidationUtils.isValidFaviconSize('70px'); // false
     */
    isValidFaviconSize(value) {
        const match = value.match(/^(\d+)px$/);
        if (!match) return false;
        const num = parseInt(match[1]);
        return num >= 24 && num <= 64;
    },

    /**
     * Validates font size setting (8-24px).
     *
     * @param {string} value - The pixel value to validate
     * @returns {boolean} True if value is between 8px and 24px inclusive
     *
     * @example
     * ValidationUtils.isValidFontSize('16px'); // true
     * ValidationUtils.isValidFontSize('6px'); // false
     * ValidationUtils.isValidFontSize('30px'); // false
     */
    isValidFontSize(value) {
        const match = value.match(/^(\d+)px$/);
        if (!match) return false;
        const num = parseInt(match[1]);
        return num >= 8 && num <= 24;
    }
};

/**
 * Chrome storage utilities for reading and writing extension data.
 * @namespace StorageUtils
 */
const StorageUtils = {
    /**
     * Retrieves data from chrome.storage.local.
     *
     * @param {string|string[]|Object} keys - Storage keys to retrieve
     * @returns {Promise<Object>} Retrieved data object, or empty object on error
     *
     * @description
     * Safely retrieves data from Chrome storage with error handling.
     * Returns empty object if retrieval fails.
     *
     * @example
     * const data = await StorageUtils.get('appSettings');
     * const multiple = await StorageUtils.get(['appSettings', 'appData']);
     */
    async get(keys) {
        try {
            const result = await chrome.storage.local.get(keys);
            if (chrome.runtime.lastError) {
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

    /**
     * Saves data to chrome.storage.local.
     *
     * @param {Object} data - Key-value pairs to save to storage
     * @returns {Promise<boolean>} True if save succeeded, false on error
     *
     * @description
     * Safely saves data to Chrome storage with error handling.
     * Returns boolean indicating success/failure.
     *
     * @example
     * const success = await StorageUtils.set({appSettings: {...}});
     */
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

    /**
     * Retrieves application settings with defaults.
     *
     * @returns {Promise<Object>} Settings object merged with defaults
     *
     * @description
     * Retrieves settings from storage and merges with DEFAULT_SETTINGS.
     * Any missing settings will use default values.
     * Ensures all required settings are present.
     *
     * @example
     * const settings = await StorageUtils.getSettings();
     * // {maxCategoriesPerRow: '2', maxSiteCardsPerRow: '5', ...}
     */
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

    /**
     * Retrieves and validates application data.
     *
     * @returns {Promise<Object>} Validated app data with manual and bookmarks modes
     *
     * @description
     * Retrieves app data from storage, validates structure, and ensures:
     * - Valid activeMode ('manual' or 'bookmarks')
     * - Validated categories and sites in manual mode
     * - Valid categoryOrder arrays
     * - Proper bookmarks mode configuration
     * - Auto-generates categoryOrder if missing
     *
     * Returns DEFAULT_APP_DATA structure if no data exists.
     *
     * @example
     * const appData = await StorageUtils.getAppData();
     * // {
     * //   activeMode: 'manual',
     * //   manual: {categories: [...], categoryOrder: [...]},
     * //   bookmarks: {folderId: null, categoryOrder: [], iconOverrides: {}}
     * // }
     */
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

/**
 * DOM manipulation and UI utilities.
 * @namespace DOMUtils
 */
const DOMUtils = {
    /**
     * Escapes HTML special characters to prevent XSS attacks.
     *
     * @param {string} str - The string to escape
     * @returns {string} HTML-escaped string
     *
     * @description
     * Replaces potentially dangerous HTML characters with their entity equivalents:
     * - & becomes &amp;
     * - < becomes &lt;
     * - > becomes &gt;
     * - " becomes &quot;
     * - ' becomes &#39;
     *
     * Non-string inputs are converted to strings first.
     *
     * @example
     * DOMUtils.escapeHTML('<script>alert("xss")</script>');
     * // '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
     *
     * DOMUtils.escapeHTML("It's a test & demo");
     * // 'It&#39;s a test &amp; demo'
     */
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

    /**
     * Creates a debounced function that delays execution until after wait milliseconds.
     *
     * @param {Function} func - The function to debounce
     * @param {number} wait - Milliseconds to wait before executing
     * @returns {Function} Debounced function
     *
     * @description
     * Delays function execution until after the specified wait time has elapsed
     * since the last time it was invoked. Useful for rate-limiting expensive
     * operations like search, validation, or API calls.
     *
     * @example
     * const debouncedSearch = DOMUtils.debounce((query) => {
     *   console.log('Searching for:', query);
     * }, 300);
     *
     * // Only the last call executes after 300ms
     * debouncedSearch('a');
     * debouncedSearch('ab');
     * debouncedSearch('abc'); // Only this executes
     */
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

    /**
     * Creates a throttled function that executes at most once per limit milliseconds.
     *
     * @param {Function} func - The function to throttle
     * @param {number} limit - Milliseconds between executions
     * @returns {Function} Throttled function
     *
     * @description
     * Ensures function executes at most once per specified time period.
     * First call executes immediately, subsequent calls are ignored until
     * the time period expires. Useful for scroll handlers, resize events, etc.
     *
     * @example
     * const throttledScroll = DOMUtils.throttle(() => {
     *   console.log('Scroll position:', window.scrollY);
     * }, 100);
     *
     * window.addEventListener('scroll', throttledScroll);
     * // Executes at most once per 100ms during scrolling
     */
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

    /**
     * Displays a status message in a DOM element with auto-clear.
     *
     * @param {HTMLElement} element - The element to display the message in
     * @param {string} message - The message text to display
     * @param {string} [type='info'] - CSS class for styling (info, success, error, etc.)
     * @param {number} [duration=3000] - Milliseconds before auto-clearing (0 = no auto-clear)
     *
     * @description
     * Shows a temporary status message by setting element's textContent and className.
     * Automatically clears the message after the specified duration.
     * If element is null/undefined, the function returns early.
     *
     * @example
     * const statusDiv = document.getElementById('status');
     * DOMUtils.showStatus(statusDiv, 'Settings saved!', 'success');
     * // Shows "Settings saved!" with 'success' class for 3 seconds
     *
     * DOMUtils.showStatus(statusDiv, 'Error occurred', 'error', 5000);
     * // Shows error for 5 seconds
     *
     * DOMUtils.showStatus(statusDiv, 'Loading...', 'info', 0);
     * // Shows indefinitely (no auto-clear)
     */
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

/**
 * General utility functions for common operations.
 * @namespace GeneralUtils
 */
const GeneralUtils = {
    /**
     * Generates a UUID v4 (Universally Unique Identifier).
     *
     * @returns {string} A unique UUID string
     *
     * @description
     * Generates a UUID using the native crypto.randomUUID() if available,
     * otherwise falls back to a polyfill implementation.
     * Used for generating unique IDs for categories and other entities.
     *
     * @example
     * const id = GeneralUtils.generateUUID();
     * // '123e4567-e89b-12d3-a456-426614174000'
     */
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

    /**
     * Creates a deep clone of an object, handling nested objects and arrays.
     * Uses structuredClone API (Chrome 98+) with fallback for edge cases.
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

        // Use modern structuredClone API (Chrome 98+, always available in Manifest V3)
        try {
            return structuredClone(obj);
        } catch (error) {
            console.warn('NovaTab: structuredClone failed, using fallback:', error);
        }

        // Fallback for unsupported types
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
    },

    /**
     * Compares two semantic version strings.
     *
     * @param {string} version1 - First version string (e.g., '1.2.3')
     * @param {string} version2 - Second version string (e.g., '1.2.4')
     * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
     *
     * @description
     * Compares semantic version strings using dot notation.
     * Handles versions with different numbers of parts (e.g., '1.2' vs '1.2.0').
     * Missing parts are treated as 0.
     *
     * @example
     * GeneralUtils.compareVersions('1.2.3', '1.2.4'); // -1
     * GeneralUtils.compareVersions('2.0.0', '1.9.9'); // 1
     * GeneralUtils.compareVersions('1.2.0', '1.2'); // 0
     * GeneralUtils.compareVersions('1.0', '1.0.0'); // 0
     */
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

    /**
     * Safely executes an async function with error handling.
     *
     * @param {Function} asyncFunc - The async function to execute
     * @param {string} [context='unknown'] - Context string for error logging
     * @returns {Promise<*>} Result of the async function, or null on error
     *
     * @description
     * Wraps async function execution with try-catch and Chrome runtime error handling.
     * Logs errors using ErrorUtils.logError with the provided context.
     * Returns null if an error occurs or chrome.runtime.lastError is set.
     *
     * Useful for Chrome API calls that may set runtime.lastError.
     *
     * @example
     * const bookmarks = await GeneralUtils.safeAsync(
     *   () => chrome.bookmarks.getChildren(folderId),
     *   'fetchBookmarks'
     * );
     * if (bookmarks) {
     *   // Process bookmarks
     * }
     */
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

/**
 * Error handling and logging utilities.
 * @namespace ErrorUtils
 */
const ErrorUtils = {
    /**
     * Creates a structured error object.
     *
     * @param {string} message - Error message describing what went wrong
     * @param {string} [code='UNKNOWN_ERROR'] - Error code for categorization
     * @param {*} [details=null] - Additional error details or context
     * @returns {Object} Structured error object with message, code, details, and timestamp
     *
     * @description
     * Creates a standardized error object with:
     * - message: Human-readable error description
     * - code: Machine-readable error category
     * - details: Optional additional context
     * - timestamp: Unix timestamp (milliseconds) when error was created
     *
     * @example
     * const error = ErrorUtils.createError(
     *   'Failed to save settings',
     *   'STORAGE_ERROR',
     *   {key: 'appSettings', size: 5000}
     * );
     * // {
     * //   message: 'Failed to save settings',
     * //   code: 'STORAGE_ERROR',
     * //   details: {key: 'appSettings', size: 5000},
     * //   timestamp: 1699564800000
     * // }
     */
    createError(message, code = 'UNKNOWN_ERROR', details = null) {
        return {
            message,
            code,
            details,
            timestamp: Date.now()
        };
    },

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
};

/**
 * Cross-reference for UUID generation in ValidationUtils.
 * @memberof ValidationUtils
 */
ValidationUtils.generateUUID = GeneralUtils.generateUUID;

/**
 * Data synchronization utilities for managing display data across modes.
 * @namespace DataSyncUtils
 */
const DataSyncUtils = {
    /**
     * Generates active display data based on the current mode (manual or bookmarks).
     *
     * @param {Object} appData - Application data containing mode configuration
     * @param {string} appData.activeMode - Active mode ('manual' or 'bookmarks')
     * @param {Object} appData.manual - Manual mode data with categories and order
     * @param {Object} appData.bookmarks - Bookmarks mode data with folder reference
     * @param {Object} [bookmarksApi] - Chrome bookmarks API (required for bookmarks mode)
     * @returns {Promise<Object>} Display data object with categories and categoryOrder arrays
     *
     * @description
     * Generates the active display data based on the current mode:
     *
     * **Manual Mode:**
     * - Deep clones manual.categories and manual.categoryOrder
     * - Prevents direct modification of source data
     *
     * **Bookmarks Mode:**
     * - Fetches bookmarks from the configured folder
     * - Converts bookmark folders to categories
     * - Converts bookmarks to sites
     * - Applies custom icon overrides
     * - Maintains category order consistency
     * - Only includes folders with bookmarks
     *
     * **Error Handling:**
     * - Returns empty structure if appData is missing
     * - Returns empty structure if bookmarks mode has no folderId
     * - Returns empty structure if bookmarksApi is missing in bookmarks mode
     * - Logs all errors via ErrorUtils
     *
     * @example
     * // Manual mode
     * const displayData = await DataSyncUtils.generateActiveDisplayData({
     *   activeMode: 'manual',
     *   manual: {categories: [...], categoryOrder: [...]},
     *   bookmarks: {folderId: null, categoryOrder: [], iconOverrides: {}}
     * });
     * // {categories: [...cloned...], categoryOrder: [...cloned...]}
     *
     * @example
     * // Bookmarks mode
     * const displayData = await DataSyncUtils.generateActiveDisplayData({
     *   activeMode: 'bookmarks',
     *   manual: {categories: [], categoryOrder: []},
     *   bookmarks: {
     *     folderId: 'bookmark_folder_123',
     *     categoryOrder: ['folder1', 'folder2'],
     *     iconOverrides: {'https://example.com': 'https://custom.icon/url'}
     *   }
     * }, chrome.bookmarks);
     * // {categories: [...from bookmarks...], categoryOrder: [...derived...]}
     */
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
                    console.warn("NovaTab DataSyncUtils: Bookmarks mode is active but no folderId is set. Returning empty display data.");
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
                        if (!folder.url) {
                            // It's a sub-folder, treat as a category
                            const sitesFromBookmark = [];
                            const bookmarksInFolder = await GeneralUtils.safeAsync(() => bookmarksApi.getChildren(folder.id), `bookmarksApi.getChildren_subfolder_${folder.id}`);

                            if (bookmarksInFolder) {
                                bookmarksInFolder.forEach(bm => {
                                    if (bm.url) {
                                        // It's a bookmark, convert to site
                                        sitesFromBookmark.push({
                                            name: bm.title || 'Unnamed Bookmark',
                                            url: bm.url,
                                            customIconUrl: (appData.bookmarks.iconOverrides && appData.bookmarks.iconOverrides[bm.url]) || ''
                                        });
                                    }
                                });
                            }

                            if (sitesFromBookmark.length > 0) {
                                derivedCats.push({
                                    id: folder.id,
                                    name: folder.title || 'Unnamed Category',
                                    sites: sitesFromBookmark
                                });
                            }
                        }
                    }
                }
                newActiveDisplayData.categories = derivedCats;

                // Ensure categoryOrder is consistent with derived categories
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