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
            console.error("NovaTab: Error loading data:", error);
            showErrorMessage("Failed to load settings. Using defaults.");
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
        faviconImg.className = 'site-favicon';
        faviconImg.alt = `${site.name} Favicon`;
        faviconImg.src = URLUtils.getFaviconUrl(site); // Use URLUtils
        faviconImg.dataset.retryCount = '0';

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
        // Global click to hide context menu
        document.addEventListener('click', () => {
            if (customContextMenu && customContextMenu.style.display === 'block') {
                customContextMenu.style.display = 'none';
            }
        });

        // Modal close handlers
        if (modalCloseBtn && customIconModal) {
            modalCloseBtn.onclick = () => customIconModal.style.display = "none";
        }

        if (modalCancelIconBtn && customIconModal) {
            modalCancelIconBtn.onclick = () => customIconModal.style.display = "none";
        }

        // Click outside modal to close - Fixed to use addEventListener
        if (customIconModal) {
            window.addEventListener('click', (event) => {
                if (event.target === customIconModal) {
                    customIconModal.style.display = "none";
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
            console.error("NovaTab: Error loading custom icon data:", error);
            showErrorMessage("Failed to load custom icon data");
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
            alert("Please enter a valid URL (starting with http:// or https://).");
            return;
        }

        // Confirm if clearing icon
        if (!newIconUrl && !confirm("You are about to clear the custom icon. Continue?")) {
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
            console.error("NovaTab: Error saving custom icon:", error);
            alert("Error saving custom icon. Please try again.");

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
            await loadAndRender();
            console.log("NovaTab: Initialization completed successfully.");
        } catch (error) {
            console.error("NovaTab: Failed to initialize:", error);
            showErrorMessage("Failed to initialize NovaTab");
        }
    })();
});