// new_tab.js - Enhanced version with better error handling and URL parsing
document.addEventListener('DOMContentLoaded', async () => {
    const categoriesContainer = document.getElementById('categories-container');
    const bodyElement = document.body;
    let settings = {};
    let appDataForDisplay = { categories: [], categoryOrder: [] };

    // For context menu and modal
    const customContextMenu = document.getElementById('custom-context-menu');
    const setCustomIconCtxItem = document.getElementById('set-custom-icon-ctx');
    const customIconModal = document.getElementById('custom-icon-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalSaveIconBtn = document.getElementById('modal-save-icon-btn');
    const modalCancelIconBtn = document.getElementById('modal-cancel-icon-btn');
    const customIconUrlInput = document.getElementById('custom-icon-url-input');
    let currentSiteForModal = null;

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

    /**
     * Intersection Observer for lazy loading favicons
     * Loads favicon images only when they enter the viewport
     */
    let faviconObserver;

    function initializeFaviconObserver() {
        // Disconnect existing observer if present to prevent memory leaks
        if (faviconObserver) {
            faviconObserver.disconnect();
            faviconObserver = null;
        }

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

        // Clean up observer on page unload to prevent memory leaks
        window.addEventListener('beforeunload', () => {
            if (faviconObserver) {
                faviconObserver.disconnect();
            }
        });

        return faviconObserver;
    }

    // Debounced loading function for better performance
    let loadingTimeout = null;
    async function debouncedLoadAndRender() {
        if (loadingTimeout) {
            clearTimeout(loadingTimeout);
        }

        loadingTimeout = setTimeout(async () => {
            await loadAndRender();
        }, 100);
    }

    async function loadAndRender() {
        try {
            const result = await chrome.storage.local.get(['appSettings', 'activeDisplayData']);

            settings = { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS };
            if (result.appSettings) {
                Object.keys(NOVATAB_CONSTANTS.DEFAULT_SETTINGS).forEach(key => {
                    if (result.appSettings[key] !== undefined) {
                        settings[key] = result.appSettings[key];
                    }
                });
            }

            if (result.activeDisplayData && Array.isArray(result.activeDisplayData.categories)) {
                appDataForDisplay = result.activeDisplayData;
            } else {
                // Assuming NOVATAB_CONSTANTS.DEFAULT_APP_DATA structure is { categories: [], categoryOrder: [] }
                // If it's the full structure, might need adjustment here or in how activeDisplayData is stored/retrieved.
                appDataForDisplay = { 
                    categories: NOVATAB_CONSTANTS.DEFAULT_APP_DATA.manual.categories, 
                    categoryOrder: NOVATAB_CONSTANTS.DEFAULT_APP_DATA.manual.categoryOrder 
                };
            }
        } catch (error) {
            ErrorUtils.logError(error, 'loadAndRender', {
                hasSettings: !!result?.appSettings,
                hasDisplayData: !!result?.activeDisplayData
            });
            showErrorMessage(NOVATAB_MESSAGES.ERRORS.STORAGE_FAILED);
            settings = { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS };
            appDataForDisplay = {
                categories: NOVATAB_CONSTANTS.DEFAULT_APP_DATA.manual.categories,
                categoryOrder: NOVATAB_CONSTANTS.DEFAULT_APP_DATA.manual.categoryOrder
            };
        }

        applySettingsToDOM();
        renderPageContent();
    }

    function applySettingsToDOM() {
        // Apply CSS custom properties
        Object.entries({
            '--gradient-start': settings.gradientStartColor,
            '--gradient-end': settings.gradientEndColor,
            '--category-title-font-size': settings.categoryTitleFontSize,
            '--site-name-font-size': settings.siteNameFontSize,
            '--favicon-wrapper-size': settings.faviconWrapperSize
        }).forEach(([property, value]) => {
            bodyElement.style.setProperty(property, value);
        });

        if (categoriesContainer) {
            const maxCatCols = parseInt(settings.maxCategoriesPerRow) || 2;
            if (maxCatCols > 1) {
                categoriesContainer.style.gridTemplateColumns = `repeat(${maxCatCols}, auto)`;
                categoriesContainer.style.justifyContent = 'center'; 
            } else {
                categoriesContainer.style.gridTemplateColumns = '1fr'; 
                categoriesContainer.style.justifyContent = 'initial'; 
            }
        }
    }

    // Clean up CSS variables when page unloads
    window.addEventListener('beforeunload', () => {
        const cssVars = ['--gradient-start', '--gradient-end', '--category-title-font-size', 
                         '--site-name-font-size', '--favicon-wrapper-size'];
        cssVars.forEach(property => {
            bodyElement.style.removeProperty(property);
        });
    });

    /**
     * Displays a temporary error message to the user as a toast notification.
     *
     * @param {string} message - The error message to display
     *
     * @description
     * Creates a floating error notification that appears in the top-right corner
     * of the page. The notification automatically fades out after 5 seconds.
     * Only one error message is shown at a time (previous messages are removed).
     *
     * @example
     * showErrorMessage(NOVATAB_MESSAGES.ERRORS.STORAGE_FAILED);
     * // Shows: "Failed to save settings. Please try again."
     */
    function showErrorMessage(message) {
        console.error("NovaTab:", message);
        // Enhanced error display for users
        const existingError = document.querySelector('.novatab-error-message');
        if (existingError) {
            existingError.remove();
        }

        const errorDiv = document.createElement('div');
        errorDiv.className = 'novatab-error-message';
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 12px 20px;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-family: Inter, sans-serif;
            font-size: 14px;
            max-width: 300px;
        `;
        errorDiv.textContent = message;
        document.body.appendChild(errorDiv);

        setTimeout(() => {
            errorDiv.style.opacity = '0';
            errorDiv.style.transition = 'opacity 0.3s ease';
            setTimeout(() => errorDiv.remove(), 300);
        }, 5000);
    }

    function renderPageContent() {
        if (!categoriesContainer) { 
            console.error("NovaTab: categoriesContainer not found. Cannot render.");
            return;
        }

        categoriesContainer.innerHTML = ''; 

        if (!appDataForDisplay?.categories?.length) {
            renderWelcomeMessage();
            return;
        }

        const orderedCategories = getOrderedCategories();
        orderedCategories.forEach(category => renderCategory(category));
    }

    /**
     * Displays the welcome message when no sites are configured.
     *
     * @description
     * Shows a friendly welcome screen with instructions for first-time users.
     * Provides a link to the options page where users can configure their dashboard.
     * This function is called when no categories or sites are available to display.
     *
     * @example
     * renderWelcomeMessage();
     * // Displays welcome screen with link to settings
     */
    function renderWelcomeMessage() {
        categoriesContainer.innerHTML = `
            <div class="welcome-container">
                <h2>Welcome to NovaTab!</h2>
                <p>Your beautiful new tab page is ready to be personalized.</p>
                <p>
                    Please <a href="${chrome.runtime.getURL('options.html')}" target="_blank">open the settings</a> to add your favorite websites or connect a bookmark folder.
                </p>
            </div>`;
    }

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

    function renderCategory(category) {
        const categorySection = document.createElement('div');
        categorySection.className = 'category-section';
        
        const categoryTitleElement = document.createElement('h2');
        categoryTitleElement.className = 'category-title';
        categoryTitleElement.textContent = category.name;
        categorySection.appendChild(categoryTitleElement);
        
        const sitesGrid = document.createElement('div');
        sitesGrid.className = 'sites-grid';
        
        // Apply grid settings
        const cardMinWidthFromSettings = settings.cardMinWidth || '70px'; 
        sitesGrid.style.setProperty('--card-min-width-js', cardMinWidthFromSettings);
        
        const siteGridItemGap = 8; 
        const maxSiteCols = parseInt(settings.maxSiteCardsPerRow) || 5; 
        const cardWidthNum = parseInt(cardMinWidthFromSettings.replace('px', ''));

        let calculatedContentMaxWidth = '100%'; 
        if (!isNaN(cardWidthNum) && cardWidthNum > 0) {
            calculatedContentMaxWidth = `${(maxSiteCols * cardWidthNum) + ((maxSiteCols - 1) * siteGridItemGap)}px`;
        }
        categorySection.style.setProperty('--category-content-max-width', calculatedContentMaxWidth);
        
        // Sort sites alphabetically
        const sortedSites = [...category.sites].sort((a, b) => a.name.localeCompare(b.name));
        sortedSites.forEach(site => {
            const siteCard = createSiteCard(site, category);
            sitesGrid.appendChild(siteCard);
        });
        
        categorySection.appendChild(sitesGrid);
        categoriesContainer.appendChild(categorySection);
    }

    function createSiteCard(site, category) {
        const siteCard = document.createElement('a');
        siteCard.className = 'site-card';
        siteCard.href = site.url;
        siteCard.target = "_self";
        
        // Set data attributes for context menu - Fixed bookmark detection
        Object.assign(siteCard.dataset, {
            categoryId: category.id,
            siteUrl: site.url,
            siteName: site.name,
            isBookmarkSite: String(category.id && typeof category.id === 'string' && /^\d+$/.test(category.id))
        });

        // Create favicon
        const faviconWrapper = document.createElement('div');
        faviconWrapper.className = 'site-favicon-wrapper';

        const faviconImg = document.createElement('img');
        faviconImg.className = 'site-favicon lazy-favicon'; // Add lazy class
        faviconImg.alt = `${site.name} Favicon`;
        faviconImg.loading = 'lazy'; // Native lazy loading as fallback
        faviconImg.dataset.retryCount = '0';

        // Determine icon URL and check if it's a custom icon
        const iconUrl = URLUtils.getFaviconUrl(site);
        const isCustomIcon = site.customIconUrl && URLUtils.isValidImageUrl(site.customIconUrl);

        // Use lazy loading only for default favicons, not custom icons
        // Custom icons should load immediately for better UX
        if (faviconObserver && !isCustomIcon) {
            faviconImg.src = FAVICON_PLACEHOLDER;
            faviconImg.dataset.lazySrc = iconUrl;
            faviconObserver.observe(faviconImg);
        } else {
            // Load immediately: no observer, or custom icon that user selected
            faviconImg.src = iconUrl;
        }

        // Improved error handling for favicon with multiple fallbacks
        faviconImg.onerror = function() {
            const retryCount = parseInt(this.dataset.retryCount) || 0;

            if (retryCount === 0) {
                // First retry: try default favicon
                this.dataset.retryCount = '1';
                this.src = 'icons/default_favicon.png';
                this.alt = 'Default Favicon';
            } else if (retryCount === 1) {
                // Second retry: use inline SVG as data URI
                this.dataset.retryCount = '2';
                this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgICA8ZGVmcz4KICAgICAgICA8bGluZWFyR3JhZGllbnQgaWQ9InNxdWFyZUdyYWRpZW50IiB4MT0iMCUiIHkxPSIwJSIgeDI9IjEwMCUiIHkyPSIxMDAlIj4KICAgICAgICAgICAgPHN0b3Agb2Zmc2V0PSIwJSIgc3R5bGU9InN0b3AtY29sb3I6IzIxOWViYztzdG9wLW9wYWNpdHk6MSIgLz4KICAgICAgICAgICAgPHN0b3Agb2Zmc2V0PSIxMDAlIiBzdHlsZT0ic3RvcC1jb2xvcjojMWI3ZmE2O3N0b3Atb3BhY2l0eToxIiAvPgogICAgICAgIDwvbGluZWFyR3JhZGllbnQ+CiAgICA8L2RlZnM+CgogICAgPHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iNDIiIGhlaWdodD0iNDIiIHJ4PSI0IiBjbGFzcz0iZ3JpZC1zcXVhcmUiIGZpbGw9InVybCgjc3F1YXJlR3JhZGllbnQpIi8+CiAgICA8cmVjdCB4PSI1NSIgeT0iMTAiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KICAgIDxyZWN0IHg9IjEwMCIgeT0iMTAiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KICAgIDxyZWN0IHg9IjE0NSIgeT0iMTAiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KCiAgICA8cmVjdCB4PSIxMCIgeT0iNTUiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KICAgIDxyZWN0IHg9IjU1IiB5PSI1NSIgd2lkdGg9IjQyIiBoZWlnaHQ9IjQyIiByeD0iNCIgY2xhc3M9ImdyaWQtc3F1YXJlIiBmaWxsPSJ1cmwoI3NxdWFyZUdyYWRpZW50KSIvPgogICAgPHJlY3QgeD0iMTAwIiB5PSI1NSIgd2lkdGg9IjQyIiBoZWlnaHQ9IjQyIiByeD0iNCIgY2xhc3M9ImdyaWQtc3F1YXJlIiBmaWxsPSJ1cmwoI3NxdWFyZUdyYWRpZW50KSIvPgogICAgPHJlY3QgeD0iMTQ1IiB5PSI1NSIgd2lkdGg9IjQyIiBoZWlnaHQ9IjQyIiByeD0iNCIgY2xhc3M9ImdyaWQtc3F1YXJlIiBmaWxsPSJ1cmwoI3NxdWFyZUdyYWRpZW50KSIvPgoKICAgIDxyZWN0IHg9IjEwIiB5PSIxMDAiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KICAgIDxyZWN0IHg9IjU1IiB5PSIxMDAiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KICAgIDxyZWN0IHg9IjEwMCIgeT0iMTAwIiB3aWR0aD0iNDIiIGhlaWdodD0iNDIiIHJ4PSI0IiBjbGFzcz0iZ3JpZC1zcXVhcmUiIGZpbGw9InVybCgjc3F1YXJlR3JhZGllbnQpIi8+CiAgICA8cmVjdCB4PSIxNDUiIHk9IjEwMCIgd2lkdGg9IjQyIiBoZWlnaHQ9IjQyIiByeD0iNCIgY2xhc3M9ImdyaWQtc3F1YXJlIiBmaWxsPSJ1cmwoI3NxdWFyZUdyYWRpZW50KSIvPgoKICAgIDxyZWN0IHg9IjEwIiB5PSIxNDUiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KICAgIDxyZWN0IHg9IjU1IiB5PSIxNDUiIHdpZHRoPSI0MiIgaGVpZ2h0PSI0MiIgcng9IjQiIGNsYXNzPSJncmlkLXNxdWFyZSIgZmlsbD0idXJsKCNzcXVhcmVHcmFkaWVudCkiLz4KICAgIDxyZWN0IHg9IjEwMCIgeT0iMTQ1IiB3aWR0aD0iNDIiIGhlaWdodD0iNDIiIHJ4PSI0IiBjbGFzcz0iZ3JpZC1zcXVhcmUiIGZpbGw9InVybCgjc3F1YXJlR3JhZGllbnQpIi8+CiAgICA8cmVjdCB4PSIxNDUiIHk9IjE0NSIgd2lkdGg9IjQyIiBoZWlnaHQ9IjQyIiByeD0iNCIgY2xhc3M9ImdyaWQtc3F1YXJlIiBmaWxsPSJ1cmwoI3NxdWFyZUdyYWRpZW50KSIvPgo8L3N2Zz4=';
                this.alt = 'Fallback Icon';
            }

            // Clean up lazy loading state on error to prevent race conditions
            if (this.dataset.lazySrc) {
                delete this.dataset.lazySrc;
                if (faviconObserver) {
                    faviconObserver.unobserve(this);
                }
            }
            // Remove lazy loading classes
            this.classList.remove('lazy-favicon');
            this.classList.remove('favicon-loaded');
        };

        faviconWrapper.appendChild(faviconImg);

        // Create site name
        const siteName = document.createElement('div');
        siteName.className = 'site-name';
        siteName.textContent = site.name;

        siteCard.appendChild(faviconWrapper);
        siteCard.appendChild(siteName);
        
        return siteCard;
    }

    function handleSiteContextMenu(e, siteCard) {
        // e.preventDefault() already called in delegation handler

        currentSiteForModal = {
            categoryId: siteCard.dataset.categoryId,
            siteUrl: siteCard.dataset.siteUrl,
            siteName: siteCard.dataset.siteName,
            isBookmarkSiteContext: siteCard.dataset.isBookmarkSite === 'true'
        };

        if (setCustomIconCtxItem) {
            setCustomIconCtxItem.style.display = 'block';
        }

        if (customContextMenu) {
            customContextMenu.style.top = `${e.pageY}px`;
            customContextMenu.style.left = `${e.pageX}px`;
            customContextMenu.style.display = 'block';
        }
    }

    // Enhanced modal and context menu event listeners
    function setupEventListeners() {
        // Store previously focused element for modal restoration
        let previouslyFocusedElement = null;

        // Track focus when modal opens
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style' && customIconModal) {
                    if (customIconModal.style.display !== 'none' && customIconModal.style.display !== '') {
                        previouslyFocusedElement = document.activeElement;
                    }
                }
            });
        });
        if (customIconModal) {
            observer.observe(customIconModal, { attributes: true });
        }

        // Helper to close modal and restore focus
        const closeModalAndRestoreFocus = () => {
            if (customIconModal) {
                customIconModal.style.display = "none";
                if (previouslyFocusedElement?.focus) {
                    previouslyFocusedElement.focus();
                }
            }
        };

        // Global click to hide context menu
        document.addEventListener('click', () => {
            if (customContextMenu && customContextMenu.style.display === 'block') {
                customContextMenu.style.display = 'none';
            }
        });

        // Modal close handlers
        if (modalCloseBtn && customIconModal) {
            modalCloseBtn.onclick = closeModalAndRestoreFocus;
        }

        if (modalCancelIconBtn && customIconModal) {
            modalCancelIconBtn.onclick = closeModalAndRestoreFocus;
        }

        // Click outside modal to close - Fixed to use addEventListener
        if (customIconModal) {
            window.addEventListener('click', (event) => {
                if (event.target === customIconModal) {
                    closeModalAndRestoreFocus();
                }
            });
        }

        // Set custom icon handler
        if (setCustomIconCtxItem && customIconModal && customIconUrlInput && customContextMenu) {
            setCustomIconCtxItem.onclick = async () => {
                await handleSetCustomIcon();
            };
        }

        // Save icon handler
        if (modalSaveIconBtn && customIconModal && customIconUrlInput) {
            modalSaveIconBtn.onclick = async () => {
                await handleSaveCustomIcon();
            };
        }

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
    }

    /**
     * Setup keyboard accessibility handlers
     */
    function setupKeyboardAccessibility() {
        let previouslyFocusedElement = null;

        // ESC key to close modal and context menu
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                // Close modal
                if (customIconModal && customIconModal.style.display !== 'none') {
                    customIconModal.style.display = 'none';
                    customIconUrlInput.value = '';
                    // Restore focus to previously focused element
                    if (previouslyFocusedElement?.focus) {
                        previouslyFocusedElement.focus();
                    }
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
                    // Restore focus to previously focused element
                    if (previouslyFocusedElement?.focus) {
                        previouslyFocusedElement.focus();
                    }
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
                    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
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

        // Focus input when modal opens and store previously focused element
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'style') {
                    if (customIconModal.style.display !== 'none' && customIconModal.style.display !== '') {
                        // Store the element that had focus before modal opened
                        previouslyFocusedElement = document.activeElement;
                        customIconUrlInput.focus();
                    }
                }
            });
        });

        observer.observe(customIconModal, { attributes: true });
    }

    async function handleSetCustomIcon() {
        if (!currentSiteForModal) return;

        try {
            customIconModal.style.display = "flex";
            const storedData = await chrome.storage.local.get('appData');
            const fullAppData = storedData.appData;
            let existingCustomUrl = '';

            if (fullAppData) {
                if (currentSiteForModal.isBookmarkSiteContext) {
                    existingCustomUrl = fullAppData.bookmarks?.iconOverrides?.[currentSiteForModal.siteUrl] || '';
                } else {
                    const cat = fullAppData.manual?.categories?.find(c => c.id === currentSiteForModal.categoryId);
                    const siteData = cat?.sites?.find(s => 
                        s.url === currentSiteForModal.siteUrl && s.name === currentSiteForModal.siteName
                    );
                    existingCustomUrl = siteData?.customIconUrl || '';
                }
            }

            customIconUrlInput.value = existingCustomUrl;
            customIconUrlInput.focus();
        } catch (error) {
            ErrorUtils.logError(error, 'handleSetCustomIcon', {
                hasSiteForModal: !!currentSiteForModal,
                siteUrl: currentSiteForModal?.siteUrl
            });
            showErrorMessage(NOVATAB_MESSAGES.ERRORS.OPERATION_FAILED);
        }

        customContextMenu.style.display = 'none';
    }

    async function handleSaveCustomIcon() {
        if (!currentSiteForModal) return;

        const newIconUrl = customIconUrlInput.value.trim();
        const saveBtn = document.getElementById('modal-save-icon-btn');
        const modalContent = document.querySelector('.modal-content');

        // Validate URL if provided
        if (newIconUrl && !URLUtils.isValidImageUrl(newIconUrl)) { // Use URLUtils.isValidImageUrl
            alert(NOVATAB_MESSAGES.ERRORS.INVALID_IMAGE_URL);
            return;
        }

        // Confirm if clearing icon
        if (!newIconUrl && !confirm(NOVATAB_MESSAGES.WARNINGS.CLEAR_ICON_CONFIRM)) {
            return;
        }

        // Add loading state
        const originalBtnText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.classList.add('button-loading');
        modalContent.classList.add('loading');

        try {
            await saveCustomIconToStorage(newIconUrl);
            customIconModal.style.display = "none";
            currentSiteForModal = null;
            await debouncedLoadAndRender();
        } catch (error) {
            ErrorUtils.logError(error, 'handleSaveCustomIcon', {
                iconUrl: newIconUrl,
                siteUrl: currentSiteForModal?.siteUrl,
                isBookmark: currentSiteForModal?.isBookmarkSiteContext
            });
            alert(NOVATAB_MESSAGES.ERRORS.OPERATION_FAILED);

            // Remove loading state on error
            saveBtn.disabled = false;
            saveBtn.classList.remove('button-loading');
            saveBtn.textContent = originalBtnText;
            modalContent.classList.remove('loading');
        }
    }

    async function saveCustomIconToStorage(newIconUrl) {
        // Use NOVATAB_CONSTANTS for default app data and settings
        const storageResult = await chrome.storage.local.get(['appData', 'appSettings']);
        let fullAppData = storageResult.appData || GeneralUtils.deepClone(NOVATAB_CONSTANTS.DEFAULT_APP_DATA);
        const currentSettings = storageResult.appSettings || { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS };

        let siteUpdated = false;

        if (currentSiteForModal.isBookmarkSiteContext) {
            if (!fullAppData.bookmarks) {
                fullAppData.bookmarks = { folderId: null, categoryOrder: [], iconOverrides: {} };
            }
            if (!fullAppData.bookmarks.iconOverrides) {
                fullAppData.bookmarks.iconOverrides = {};
            }

            if (newIconUrl) {
                fullAppData.bookmarks.iconOverrides[currentSiteForModal.siteUrl] = newIconUrl;
            } else {
                delete fullAppData.bookmarks.iconOverrides[currentSiteForModal.siteUrl];
            }
            siteUpdated = true;
        } else {
            if (!fullAppData.manual) {
                fullAppData.manual = { categories: [], categoryOrder: [] };
            }

            const categoryToUpdate = fullAppData.manual.categories.find(
                cat => cat.id === currentSiteForModal.categoryId
            );

            if (categoryToUpdate?.sites) {
                const siteToUpdate = categoryToUpdate.sites.find(s => 
                    s.url === currentSiteForModal.siteUrl && s.name === currentSiteForModal.siteName
                );

                if (siteToUpdate) {
                    siteToUpdate.customIconUrl = newIconUrl;
                    siteUpdated = true;
                }
            }
        }

        if (siteUpdated) {
            const newActiveDisplayData = await DataSyncUtils.generateActiveDisplayData(fullAppData, chrome.bookmarks);
            await chrome.storage.local.set({
                appData: fullAppData,
                activeDisplayData: newActiveDisplayData,
                appSettings: currentSettings
            });
        }
    }

    // The local generateActiveDisplayData function has been removed.
    // activeDisplayData is now generated by DataSyncUtils.generateActiveDisplayData
    // and kept up-to-date in storage by background.js and options.js.

    // Initialize the application - Fixed race condition
    (async () => {
        try {
            setupEventListeners();
            setupKeyboardAccessibility();
            // Initialize favicon lazy loading observer
            initializeFaviconObserver();
            await loadAndRender();
            console.log("NovaTab: Initialization completed successfully.");
        } catch (error) {
            ErrorUtils.logError(error, 'initialize (new_tab.js)', {
                timestamp: Date.now()
            });
            showErrorMessage(NOVATAB_MESSAGES.ERRORS.OPERATION_FAILED);
        }
    })();
});