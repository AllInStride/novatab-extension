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

    // Default values as constants
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
        categories: [], 
        categoryOrder: []
    };

    console.log("NovaTab: Starting enhanced new_tab.js script...");

    // Improved URL parsing and hostname extraction
    function getEffectiveHostname(url) {
        if (!url || typeof url !== 'string') {
            console.warn('NovaTab: Invalid URL provided to getEffectiveHostname:', url);
            return 'example.com';
        }

        try {
            // Ensure URL has protocol
            const urlToProcess = url.match(/^https?:\/\//) ? url : `https://${url}`;
            const urlObj = new URL(urlToProcess);
            
            if (!urlObj.hostname || urlObj.hostname === 'localhost') {
                return urlObj.hostname || 'localhost';
            }

            const parts = urlObj.hostname.split('.');
            
            // For single part hostnames (like localhost)
            if (parts.length === 1) {
                return urlObj.hostname;
            }
            
            // For two parts (like google.com)
            if (parts.length === 2) {
                return urlObj.hostname;
            }

            // For three or more parts, try to get the domain
            // Handle common country code TLDs (co.uk, com.au, etc.)
            const commonCcTlds = ['co', 'com', 'org', 'gov', 'net', 'edu', 'ac'];
            const lastPart = parts[parts.length - 1];
            const secondLastPart = parts[parts.length - 2];
            
            if (parts.length >= 3 && lastPart.length === 2 && commonCcTlds.includes(secondLastPart)) {
                // Handle cases like amazon.co.uk
                return parts.slice(-3).join('.');
            }
            
            // Default to last two parts (domain.tld)
            return parts.slice(-2).join('.');
            
        } catch (error) {
            console.warn(`NovaTab: Error parsing URL "${url}":`, error.message);
            return 'example.com';
        }
    }

    // Improved favicon URL generation
    function getFaviconUrl(site) {
        if (site.customIconUrl) {
            return site.customIconUrl;
        }

        if (!site.url) {
            return 'icons/default_favicon.png';
        }

        const hostname = getEffectiveHostname(site.url);
        if (hostname === 'example.com') {
            return 'icons/default_favicon.png';
        }

        return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
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
            
            settings = { ...DEFAULT_SETTINGS };
            if (result.appSettings) {
                Object.keys(DEFAULT_SETTINGS).forEach(key => {
                    if (result.appSettings[key] !== undefined) {
                        settings[key] = result.appSettings[key];
                    }
                });
            }
            
            if (result.activeDisplayData && Array.isArray(result.activeDisplayData.categories)) {
                appDataForDisplay = result.activeDisplayData;
            } else {
                appDataForDisplay = { ...DEFAULT_APP_DATA };
            }
        } catch (error) {
            console.error("NovaTab: Error loading data:", error);
            showErrorMessage("Failed to load settings. Using defaults.");
            settings = { ...DEFAULT_SETTINGS };
            appDataForDisplay = { ...DEFAULT_APP_DATA };
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

    function getOrderedCategories() {
        if (!appDataForDisplay.categories) return [];
        
        const categoryMap = new Map(appDataForDisplay.categories.map(cat => [cat.id, cat]));
        const orderedCategories = [];

        if (appDataForDisplay.categoryOrder?.length) {
            // Add categories in specified order
            appDataForDisplay.categoryOrder.forEach(catId => {
                if (categoryMap.has(catId)) {
                    orderedCategories.push(categoryMap.get(catId));
                }
            });
            
            // Add any remaining categories not in the order
            appDataForDisplay.categories.forEach(cat => {
                if (!appDataForDisplay.categoryOrder.includes(cat.id)) {
                    orderedCategories.push(cat);
                }
            });
        } else {
            orderedCategories.push(...appDataForDisplay.categories);
        }

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

        // Add context menu listener
        siteCard.addEventListener('contextmenu', handleSiteContextMenu);

        // Create favicon
        const faviconWrapper = document.createElement('div');
        faviconWrapper.className = 'site-favicon-wrapper';
        
        const faviconImg = document.createElement('img'); 
        faviconImg.className = 'site-favicon';
        faviconImg.alt = `${site.name} Favicon`;
        faviconImg.src = getFaviconUrl(site);
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

    function handleSiteContextMenu(e) {
        e.preventDefault();
        
        currentSiteForModal = { 
            categoryId: e.currentTarget.dataset.categoryId, 
            siteUrl: e.currentTarget.dataset.siteUrl, 
            siteName: e.currentTarget.dataset.siteName,
            isBookmarkSiteContext: e.currentTarget.dataset.isBookmarkSite === 'true'
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
        
        // Validate URL if provided
        if (newIconUrl && !isValidUrl(newIconUrl)) {
            alert("Please enter a valid URL (starting with http:// or https://).");
            return;
        }

        // Confirm if clearing icon
        if (!newIconUrl && !confirm("You are about to clear the custom icon. Continue?")) {
            return;
        }

        try {
            await saveCustomIconToStorage(newIconUrl);
            customIconModal.style.display = "none";
            currentSiteForModal = null;
            await debouncedLoadAndRender();
        } catch (error) {
            console.error("NovaTab: Error saving custom icon:", error);
            alert("Error saving custom icon. Please try again.");
        }
    }

    function isValidUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        } catch {
            return false;
        }
    }

    async function saveCustomIconToStorage(newIconUrl) {
        const DEFAULT_APP_DATA_FULL = {
            activeMode: 'manual',
            manual: { categories: [], categoryOrder: [] },
            bookmarks: { folderId: null, categoryOrder: [], iconOverrides: {} }
        };

        const storageResult = await chrome.storage.local.get(['appData', 'appSettings']);
        let fullAppData = storageResult.appData || { ...DEFAULT_APP_DATA_FULL };
        const currentSettings = storageResult.appSettings || DEFAULT_SETTINGS;

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
            const newActiveDisplayData = await generateActiveDisplayData(fullAppData);
            await chrome.storage.local.set({
                appData: fullAppData,
                activeDisplayData: newActiveDisplayData,
                appSettings: currentSettings
            });
        }
    }

    async function generateActiveDisplayData(fullAppData) {
        let newActiveDisplayData = { categories: [], categoryOrder: [] };
        const activeMode = fullAppData.activeMode || 'manual';

        if (activeMode === 'manual') {
            newActiveDisplayData.categories = (fullAppData.manual.categories || []).map(cat => ({
                ...cat,
                sites: (cat.sites || []).map(s => ({ ...s }))
            }));
            newActiveDisplayData.categoryOrder = [...(fullAppData.manual.categoryOrder || [])];
        } else if (activeMode === 'bookmarks' && fullAppData.bookmarks.folderId) {
            try {
                const tempBookmarks = await chrome.bookmarks.getChildren(fullAppData.bookmarks.folderId);
                const derivedCats = [];

                for (const folder of tempBookmarks) {
                    if (!folder.url) {
                        const sitesFromBookmark = [];
                        const bookmarksInFolder = await chrome.bookmarks.getChildren(folder.id);

                        bookmarksInFolder.forEach(bm => {
                            if (bm.url) {
                                sitesFromBookmark.push({
                                    name: bm.title,
                                    url: bm.url,
                                    customIconUrl: (fullAppData.bookmarks.iconOverrides && fullAppData.bookmarks.iconOverrides[bm.url]) || ''
                                });
                            }
                        });

                        if (sitesFromBookmark.length > 0) {
                            derivedCats.push({ id: folder.id, name: folder.title, sites: sitesFromBookmark });
                        }
                    }
                }

                newActiveDisplayData.categories = derivedCats;
                const derivedCategoryMap = new Map(derivedCats.map(c => [c.id, c]));
                let finalOrder = (fullAppData.bookmarks.categoryOrder || []).filter(id => derivedCategoryMap.has(id));

                derivedCats.forEach(cat => {
                    if (!finalOrder.includes(cat.id)) {
                        finalOrder.push(cat.id);
                    }
                });

                newActiveDisplayData.categoryOrder = finalOrder;
            } catch (error) {
                console.error("NovaTab: Error generating bookmark display data:", error);
            }
        }

        return newActiveDisplayData;
    }

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