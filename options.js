// options.js - Enhanced version with better error handling, validation, and organization
document.addEventListener('DOMContentLoaded', async () => {
    // --- CONSTANTS ---
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

    const STATUS_TYPES = {
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info'
    };

    // --- STATE VARIABLES ---
    let appSettings = {};
    let appData = {};
    let isLoading = false;
    let saveTimeout = null;

    // --- UI ELEMENTS ---
    const elements = {
        // Tabs
        tabLinks: document.querySelectorAll('.tab-link'),
        tabContents: document.querySelectorAll('.tab-content'),
        
        // Mode selection
        dataSourceModeRadios: document.querySelectorAll('input[name="dataSourceMode"]'),
        manualModeSection: document.getElementById('manual-mode-section'),
        bookmarkModeSection: document.getElementById('bookmark-mode-section'),
        
        // Manual mode elements
        manualCategoriesListUI: document.getElementById('manual-categories-list'),
        addManualCategoryBtn: document.getElementById('add-manual-category-btn'),
        
        // Bookmark mode elements
        bookmarkFolderSelector: document.getElementById('bookmark-folder-selector'),
        bookmarkCategoryOrderListUI: document.getElementById('bookmark-category-order-list'),
        refreshBookmarkCategoriesBtn: document.getElementById('refresh-bookmark-categories-btn'),
        
        // Appearance settings
        maxCategoriesPerRowInput: document.getElementById('setting-max-categories-per-row'),
        maxSiteCardsPerRowInput: document.getElementById('setting-max-site-cards-per-row'),
        cardMinWidthInput: document.getElementById('setting-card-min-width'),
        faviconWrapperSizeInput: document.getElementById('setting-favicon-wrapper-size'),
        categoryTitleFontSizeInput: document.getElementById('setting-category-title-font-size'),
        siteNameFontSizeInput: document.getElementById('setting-site-name-font-size'),
        gradientStartColorInput: document.getElementById('setting-gradient-start-color'),
        gradientEndColorInput: document.getElementById('setting-gradient-end-color'),
        
        // Data management
        exportSettingsBtn: document.getElementById('export-settings-btn'),
        importSettingsInput: document.getElementById('import-settings-input'),
        importSettingsBtn: document.getElementById('import-settings-btn'),
        resetAllSettingsBtn: document.getElementById('reset-all-settings-btn'),
        saveAllSettingsBtn: document.getElementById('save-all-settings-btn'),
        statusMessageUI: document.getElementById('status-message')
    };

    // --- VALIDATION UTILITIES ---
    const validators = {
        isPositiveNumber: (value) => {
            const num = parseInt(value);
            return !isNaN(num) && num > 0;
        },
        
        isValidPixelValue: (value) => {
            return /^\d+px$/.test(value) && parseInt(value) > 0;
        },
        
        isValidUrl: (url) => {
            try {
                new URL(url);
                return url.startsWith('http://') || url.startsWith('https://');
            } catch {
                return false;
            }
        },
        
        isValidColor: (color) => {
            return /^#[0-9A-F]{6}$/i.test(color);
        }
    };

    // --- ERROR HANDLING ---
    function handleError(error, context = '', showToUser = true) {
        console.error(`NovaTab Error (${context}):`, error);
        if (showToUser) {
            showStatus(`Error: ${error.message || 'Something went wrong'}`, STATUS_TYPES.ERROR);
        }
    }

    function showStatus(message, type = STATUS_TYPES.INFO, duration = 3000) {
        if (!elements.statusMessageUI) return;
        
        elements.statusMessageUI.textContent = message;
        elements.statusMessageUI.className = type;
        
        if (duration > 0) {
            setTimeout(() => {
                elements.statusMessageUI.textContent = '';
                elements.statusMessageUI.className = '';
            }, duration);
        }
    }

    // --- LOADING STATE MANAGEMENT ---
    function setLoadingState(loading) {
        isLoading = loading;
        const saveBtn = elements.saveAllSettingsBtn;
        
        if (saveBtn) {
            saveBtn.disabled = loading;
            saveBtn.textContent = loading ? 'Saving...' : 'Save All Settings';
        }
    }

    // --- INITIALIZATION ---
    async function initialize() {
        try {
            setLoadingState(true);
            await loadDataFromStorage();
            setupEventListeners();
            updateUIBasedOnState();
            
            // Apply gradient colors to the page
            document.documentElement.style.setProperty('--gradient-start', appSettings.gradientStartColor);
            document.documentElement.style.setProperty('--gradient-end', appSettings.gradientEndColor);
            
            if (appData.activeMode === 'bookmarks') {
                await loadBookmarkFoldersIntoSelector();
                if (appData.bookmarks.folderId) {
                    elements.bookmarkFolderSelector.value = appData.bookmarks.folderId;
                    await renderBookmarkCategoryOrderList();
                }
            }
            
            showStatus('Settings loaded successfully!', STATUS_TYPES.SUCCESS);
        } catch (error) {
            handleError(error, 'initialization');
        } finally {
            setLoadingState(false);
        }
    }

    async function loadDataFromStorage() {
        try {
            const result = await chrome.storage.local.get(['appSettings', 'appData']);
            
            // Load settings with validation
            appSettings = { ...DEFAULT_SETTINGS };
            if (result.appSettings) {
                Object.keys(DEFAULT_SETTINGS).forEach(key => {
                    if (result.appSettings[key] !== undefined) {
                        appSettings[key] = result.appSettings[key];
                    }
                });
            }

            // Load app data with validation
            appData = JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
            if (result.appData) {
                appData.activeMode = result.appData.activeMode || DEFAULT_APP_DATA.activeMode;
                
                if (result.appData.manual) {
                    appData.manual.categories = validateCategories(result.appData.manual.categories || []);
                    appData.manual.categoryOrder = result.appData.manual.categoryOrder || [];
                }
                
                if (result.appData.bookmarks) {
                    appData.bookmarks = {
                        folderId: result.appData.bookmarks.folderId || null,
                        categoryOrder: result.appData.bookmarks.categoryOrder || [],
                        iconOverrides: result.appData.bookmarks.iconOverrides || {}
                    };
                }
            }
            
            // Ensure category order consistency
            if ((!appData.manual.categoryOrder?.length) && appData.manual.categories.length > 0) {
                appData.manual.categoryOrder = appData.manual.categories.map(c => c.id);
            }

        } catch (error) {
            throw new Error(`Failed to load data: ${error.message}`);
        }
    }

    function validateCategories(categories) {
        return categories.map(cat => ({
            ...cat,
            id: cat.id || generateUUID(),
            name: cat.name || 'Unnamed Category',
            sites: (cat.sites || []).map(site => ({
                name: site.name || '',
                url: site.url || '',
                customIconUrl: site.customIconUrl || ''
            }))
        }));
    }

    // --- INPUT VALIDATION ---
    function validateSettingsInputs() {
        const errors = [];
        
        if (!validators.isPositiveNumber(elements.maxCategoriesPerRowInput.value)) {
            errors.push('Max Categories Per Row must be a positive number');
        }
        
        if (!validators.isPositiveNumber(elements.maxSiteCardsPerRowInput.value)) {
            errors.push('Max Site Cards Per Row must be a positive number');
        }
        
        if (!validators.isValidPixelValue(elements.cardMinWidthInput.value)) {
            errors.push('Card Min Width must be a valid pixel value (e.g., 70px)');
        }
        
        if (!validators.isValidPixelValue(elements.faviconWrapperSizeInput.value)) {
            errors.push('Favicon Wrapper Size must be a valid pixel value (e.g., 38px)');
        }
        
        if (!validators.isValidPixelValue(elements.categoryTitleFontSizeInput.value)) {
            errors.push('Category Title Font Size must be a valid pixel value (e.g., 16px)');
        }
        
        if (!validators.isValidPixelValue(elements.siteNameFontSizeInput.value)) {
            errors.push('Site Name Font Size must be a valid pixel value (e.g., 10px)');
        }
        
        if (!validators.isValidColor(elements.gradientStartColorInput.value)) {
            errors.push('Gradient Start Color must be a valid hex color');
        }
        
        if (!validators.isValidColor(elements.gradientEndColorInput.value)) {
            errors.push('Gradient End Color must be a valid hex color');
        }
        
        return errors;
    }

    // --- UI UPDATE FUNCTIONS ---
    function updateUIBasedOnState() {
        // Update appearance settings
        elements.maxCategoriesPerRowInput.value = appSettings.maxCategoriesPerRow;
        elements.maxSiteCardsPerRowInput.value = appSettings.maxSiteCardsPerRow;
        elements.cardMinWidthInput.value = appSettings.cardMinWidth;
        elements.faviconWrapperSizeInput.value = appSettings.faviconWrapperSize;
        elements.categoryTitleFontSizeInput.value = appSettings.categoryTitleFontSize;
        elements.siteNameFontSizeInput.value = appSettings.siteNameFontSize;
        elements.gradientStartColorInput.value = appSettings.gradientStartColor;
        elements.gradientEndColorInput.value = appSettings.gradientEndColor;

        // Update mode selection
        const currentModeRadio = document.querySelector(`input[name="dataSourceMode"][value="${appData.activeMode}"]`);
        if (currentModeRadio) currentModeRadio.checked = true;
        
        toggleModeSections(appData.activeMode);
        renderManualCategoriesList();
    }

    function toggleModeSections(mode) {
        elements.manualModeSection.style.display = mode === 'manual' ? 'block' : 'none';
        elements.bookmarkModeSection.style.display = mode === 'bookmarks' ? 'block' : 'none';
        
        if (mode === 'bookmarks' && elements.bookmarkFolderSelector.options.length <= 1) {
            loadBookmarkFoldersIntoSelector();
        }
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        // Tab navigation
        elements.tabLinks.forEach(tab => {
            tab.addEventListener('click', () => {
                elements.tabLinks.forEach(t => t.classList.remove('active'));
                elements.tabContents.forEach(c => c.classList.remove('active'));
                tab.classList.add('active');
                document.getElementById(tab.dataset.tab).classList.add('active');
            });
        });

        // Mode switching
        elements.dataSourceModeRadios.forEach(radio => {
            radio.addEventListener('change', async (event) => {
                try {
                    appData.activeMode = event.target.value;
                    toggleModeSections(appData.activeMode);
                    
                    if (appData.activeMode === 'bookmarks' && appData.bookmarks.folderId) {
                        await renderBookmarkCategoryOrderList();
                    }
                    
                    showStatus("Mode switched. Remember to save settings.", STATUS_TYPES.INFO);
                } catch (error) {
                    handleError(error, 'mode switching');
                }
            });
        });

        // Manual mode handlers
        elements.addManualCategoryBtn?.addEventListener('click', handleAddManualCategory);

        // Bookmark mode handlers
        elements.bookmarkFolderSelector?.addEventListener('change', handleBookmarkFolderSelectionChange);
        elements.refreshBookmarkCategoriesBtn?.addEventListener('click', handleRefreshBookmarkCategories);

        // Settings handlers with debouncing
        const inputElements = [
            elements.maxCategoriesPerRowInput,
            elements.maxSiteCardsPerRowInput,
            elements.cardMinWidthInput,
            elements.faviconWrapperSizeInput,
            elements.categoryTitleFontSizeInput,
            elements.siteNameFontSizeInput
        ];

        inputElements.forEach(input => {
            if (input) {
                input.addEventListener('input', debounceValidation);
            }
        });

        // Data management handlers
        elements.saveAllSettingsBtn?.addEventListener('click', handleSaveAllSettings);
        elements.exportSettingsBtn?.addEventListener('click', handleExportSettings);
        elements.importSettingsBtn?.addEventListener('click', () => elements.importSettingsInput?.click());
        elements.importSettingsInput?.addEventListener('change', handleImportSettings);
        elements.resetAllSettingsBtn?.addEventListener('click', handleResetAllSettings);

        // Add input listeners for manual data changes with debouncing
        document.addEventListener('input', (e) => {
            if (e.target.matches('.manual-category-name-input, .manual-site-name-input, .manual-site-url-input, .manual-site-custom-icon-url-input')) {
                debouncedUpdateManualData();
            }
        });
    }

    // Debounced validation for input fields
    let validationTimeout = null;
    function debounceValidation() {
        if (validationTimeout) {
            clearTimeout(validationTimeout);
        }
        
        validationTimeout = setTimeout(() => {
            const errors = validateSettingsInputs();
            if (errors.length > 0) {
                showStatus(`Validation: ${errors[0]}`, STATUS_TYPES.ERROR, 5000);
            }
        }, 500);
    }

    // Debounce timer for manual updates
    let manualUpdateDebounceTimer = null;

    function debounceManualUpdate(callback, delay = 500) {
        return function(...args) {
            clearTimeout(manualUpdateDebounceTimer);
            manualUpdateDebounceTimer = setTimeout(() => {
                callback.apply(this, args);
            }, delay);
        };
    }

    // Debounced version of updateManualDataFromDOM
    const debouncedUpdateManualData = debounceManualUpdate(() => {
        updateManualDataFromDOM();
        showStatus('Changes saved automatically', STATUS_TYPES.SUCCESS, 1000);
    });

    // --- MANUAL MODE FUNCTIONS ---
    function renderManualCategoriesList() {
        if (!elements.manualCategoriesListUI) return;

        elements.manualCategoriesListUI.innerHTML = '';
        
        if (!appData.manual.categories) appData.manual.categories = [];
        if (!appData.manual.categoryOrder) {
            appData.manual.categoryOrder = appData.manual.categories.map(c => c.id);
        }

        const categoryMap = new Map(appData.manual.categories.map(cat => [cat.id, cat]));
        const orderedCategories = getOrderedCategories(appData.manual.categoryOrder, categoryMap);

        orderedCategories.forEach(category => {
            const catItem = createCategoryElement(category);
            elements.manualCategoriesListUI.appendChild(catItem);
        });

        addEventListenersToManualItems();
        makeSortable(elements.manualCategoriesListUI, appData.manual.categoryOrder, updateManualCategoryOrderFromDOM);
    }

    function getOrderedCategories(categoryOrder, categoryMap) {
        const orderedCategories = [];
        
        // Add categories in specified order
        categoryOrder.forEach(id => {
            if (categoryMap.has(id)) {
                orderedCategories.push(categoryMap.get(id));
            }
        });
        
        // Add any remaining categories
        appData.manual.categories.forEach(cat => {
            if (!categoryOrder.includes(cat.id)) {
                orderedCategories.push(cat);
            }
        });
        
        return orderedCategories;
    }

    function createCategoryElement(category) {
        const catItem = document.createElement('div');
        catItem.className = 'manual-category-item sortable-item';
        catItem.dataset.id = category.id;
        catItem.draggable = true;

        const sitesHTML = (category.sites || []).map((site, siteIndex) => {
            const faviconUrl = getFaviconPreviewUrl(site);
            return `
                <li data-site-index="${siteIndex}">
                    <img src="${faviconUrl}" class="site-favicon-preview" alt="Favicon" 
                         onerror="this.onerror=null; this.src='icons/default_favicon.png'; this.alt='Default Favicon';">
                    <input type="text" class="manual-site-name-input form-control" 
                           value="${escapeHTML(site.name)}" placeholder="Site Name">
                    <input type="url" class="manual-site-url-input form-control" 
                           value="${escapeHTML(site.url)}" placeholder="https://example.com">
                    <input type="url" class="manual-site-custom-icon-url-input form-control" 
                           value="${escapeHTML(site.customIconUrl || '')}" placeholder="Custom Icon URL (optional)">
                    <div class="manual-site-actions">
                        <button class="button danger-button small-button remove-manual-site-btn">Remove Site</button>
                    </div>
                </li>
            `;
        }).join('');

        catItem.innerHTML = `
            <div class="manual-category-header">
                <span class="drag-handle">☰</span>
                <input type="text" class="manual-category-name-input form-control" 
                       value="${escapeHTML(category.name)}" placeholder="Category Name">
                <div class="manual-category-actions">
                    <button class="button danger-button small-button remove-manual-category-btn">Remove Category</button>
                </div>
            </div>
            <ul class="manual-sites-list">
                ${sitesHTML}
            </ul>
            <button class="button secondary-button small-button add-manual-site-btn">Add Site to this Category</button>
        `;

        return catItem;
    }

    function getFaviconPreviewUrl(site) {
        if (site.customIconUrl) return site.customIconUrl;
        
        if (site.url && validators.isValidUrl(site.url)) {
            try {
                const urlObj = new URL(site.url);
                return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=32`;
            } catch {
                // Fall through to default
            }
        }
        
        return 'icons/default_favicon.png';
    }

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

    function handleAddManualCategory() {
        try {
            updateManualDataFromDOM();
            const newCatId = generateUUID();
            const newCategory = { id: newCatId, name: 'New Category', sites: [] };
            appData.manual.categories.push(newCategory);
            appData.manual.categoryOrder.push(newCatId);
            renderManualCategoriesList();
            showStatus("Category added", STATUS_TYPES.SUCCESS, 1000);
        } catch (error) {
            handleError(error, 'adding category');
        }
    }

    function handleRemoveManualCategory(event) {
        try {
            const catElement = event.target.closest('.manual-category-item');
            const catName = catElement.querySelector('.manual-category-name-input').value;
            
            if (!confirm(`Remove category "${catName}"? This cannot be undone.`)) {
                return;
            }
            
            updateManualDataFromDOM();
            const catId = catElement.dataset.id;
            appData.manual.categories = appData.manual.categories.filter(c => c.id !== catId);
            appData.manual.categoryOrder = appData.manual.categoryOrder.filter(id => id !== catId);
            renderManualCategoriesList();
            showStatus("Category removed", STATUS_TYPES.SUCCESS, 1000);
        } catch (error) {
            handleError(error, 'removing category');
        }
    }

    function handleAddManualSite(event) {
        try {
            updateManualDataFromDOM();
            const catId = event.target.closest('.manual-category-item').dataset.id;
            const category = appData.manual.categories.find(c => c.id === catId);
            
            if (category) {
                if (!category.sites) category.sites = [];
                category.sites.push({ name: 'New Site', url: 'https://', customIconUrl: '' });
                renderManualCategoriesList();
                showStatus("Site added", STATUS_TYPES.SUCCESS, 1000);
            }
        } catch (error) {
            handleError(error, 'adding site');
        }
    }

    function handleRemoveManualSite(event) {
        try {
            updateManualDataFromDOM();
            const siteLi = event.target.closest('li');
            const catId = event.target.closest('.manual-category-item').dataset.id;
            const category = appData.manual.categories.find(c => c.id === catId);
            
            if (category?.sites) {
                const siteIndex = parseInt(siteLi.dataset.siteIndex);
                if (!isNaN(siteIndex) && siteIndex >= 0 && siteIndex < category.sites.length) {
                    category.sites.splice(siteIndex, 1);
                    renderManualCategoriesList();
                    showStatus("Site removed", STATUS_TYPES.SUCCESS, 1000);
                }
            }
        } catch (error) {
            handleError(error, 'removing site');
        }
    }

    function updateManualDataFromDOM() {
        const newCategories = [];
        const newCategoryOrder = [];

        elements.manualCategoriesListUI.querySelectorAll('.manual-category-item').forEach(catItem => {
            const id = catItem.dataset.id;
            const nameInput = catItem.querySelector('.manual-category-name-input');
            if (!nameInput) return;

            const name = nameInput.value.trim();
            const sites = [];

            catItem.querySelectorAll('.manual-sites-list li').forEach(siteLi => {
                const siteNameInput = siteLi.querySelector('.manual-site-name-input');
                const siteUrlInput = siteLi.querySelector('.manual-site-url-input');
                const customIconUrlInput = siteLi.querySelector('.manual-site-custom-icon-url-input');

                if (!siteNameInput || !siteUrlInput || !customIconUrlInput) return;

                const siteName = siteNameInput.value.trim();
                let siteUrl = siteUrlInput.value.trim();
                const customIconUrl = customIconUrlInput.value.trim();

                // Improved URL normalization
                if (siteUrl) {
                    // Remove any leading/trailing spaces and normalize whitespace
                    siteUrl = siteUrl.replace(/\s+/g, ' ').trim();
                    
                    // Handle various URL formats
                    if (!siteUrl.match(/^https?:\/\//i)) {
                        // Check if it looks like a protocol-less URL
                        if (siteUrl.match(/^\/\//)) {
                            siteUrl = 'https:' + siteUrl;
                        } else if (siteUrl.match(/^[a-zA-Z]+:/) && !siteUrl.match(/^https?:/i)) {
                            // Has a protocol but not http/https - keep as is but warn
                            console.warn(`NovaTab: Non-HTTP protocol detected: ${siteUrl}`);
                        } else {
                            // No protocol, add https://
                            siteUrl = 'https://' + siteUrl;
                        }
                    }
                }

                // Keep sites even if name is empty (to prevent data loss)
                // User can see and fix empty names
                if (siteUrl) {
                    sites.push({ 
                        name: siteName || 'Unnamed Site', 
                        url: siteUrl, 
                        customIconUrl 
                    });
                }
            });

            // Keep categories even if empty (to prevent accidental deletion)
            newCategories.push({ 
                id, 
                name: name || "Unnamed Category", 
                sites 
            });
            newCategoryOrder.push(id);
        });

        appData.manual.categories = newCategories;
        appData.manual.categoryOrder = newCategoryOrder;
    }

    function updateManualCategoryOrderFromDOM() {
        const newOrder = [];
        elements.manualCategoriesListUI.querySelectorAll('.manual-category-item').forEach(item => {
            newOrder.push(item.dataset.id);
        });
        appData.manual.categoryOrder = newOrder;
        updateManualDataFromDOM();
    }

    // --- BOOKMARK MODE FUNCTIONS ---
    async function checkBookmarkPermission() {
        try {
            await chrome.bookmarks.getTree();
            return true;
        } catch (error) {
            console.warn('NovaTab: Bookmark permission not granted:', error);
            return false;
        }
    }

    async function loadBookmarkFoldersIntoSelector() {
        try {
            // Check if we have bookmark permission first
            const hasPermission = await checkBookmarkPermission();
            if (!hasPermission) {
                elements.bookmarkFolderSelector.innerHTML = '<option value="">Bookmark permission required</option>';
                showStatus('Please grant bookmark permission to use this feature', STATUS_TYPES.ERROR);
                return;
            }

            const tree = await chrome.bookmarks.getTree();
            elements.bookmarkFolderSelector.innerHTML = '<option value="">-- Select a Root Bookmark Folder --</option>';
            
            if (tree?.length > 0) {
                populateFolderOptionsRecursive(tree[0], 0, elements.bookmarkFolderSelector);
            }
            
            if (appData.bookmarks.folderId) {
                elements.bookmarkFolderSelector.value = appData.bookmarks.folderId;
            }
        } catch (error) {
            handleError(error, 'loading bookmark folders');
            elements.bookmarkFolderSelector.innerHTML = '<option value="">Error loading folders</option>';
        }
    }

    function populateFolderOptionsRecursive(bookmarkNode, depth, selectElement) {
        if (bookmarkNode.children) {
            if (bookmarkNode.title || depth === 0) {
                if (depth > 0 || ["0", "1", "2"].includes(bookmarkNode.id)) {
                    const option = document.createElement('option');
                    option.value = bookmarkNode.id;
                    option.textContent = `${'— '.repeat(depth)}${bookmarkNode.title || (bookmarkNode.id === "0" ? 'All Bookmarks (Root)' : 'Unnamed Folder')}`;
                    selectElement.appendChild(option);
                }
            }
            bookmarkNode.children.forEach(child => {
                populateFolderOptionsRecursive(child, depth + 1, selectElement);
            });
        }
    }

    async function handleBookmarkFolderSelectionChange() {
        try {
            appData.bookmarks.folderId = elements.bookmarkFolderSelector.value;
            
            if (appData.bookmarks.folderId) {
                const derivedCategories = await deriveCategoriesFromSelectedBookmarkFolder(true);
                appData.bookmarks.categoryOrder = derivedCategories.map(cat => cat.id);
                await renderBookmarkCategoryOrderList();
                showStatus("Bookmark folder selected", STATUS_TYPES.SUCCESS);
            } else {
                appData.bookmarks.categoryOrder = [];
                elements.bookmarkCategoryOrderListUI.innerHTML = '';
            }
        } catch (error) {
            handleError(error, 'selecting bookmark folder');
        }
    }

    async function deriveCategoriesFromSelectedBookmarkFolder(applyOverrides = false) {
        if (!appData.bookmarks.folderId) return [];

        try {
            const subFolders = await chrome.bookmarks.getChildren(appData.bookmarks.folderId);
            const derivedCats = [];

            for (const folder of subFolders) {
                if (!folder.url) {
                    const sites = [];
                    const bookmarksInFolder = await chrome.bookmarks.getChildren(folder.id);

                    bookmarksInFolder.forEach(bookmark => {
                        if (bookmark.url) {
                            const site = { name: bookmark.title, url: bookmark.url };
                            if (applyOverrides && appData.bookmarks.iconOverrides?.[bookmark.url]) {
                                site.customIconUrl = appData.bookmarks.iconOverrides[bookmark.url];
                            } else {
                                site.customIconUrl = '';
                            }
                            sites.push(site);
                        }
                    });

                    if (sites.length > 0) {
                        derivedCats.push({ id: folder.id, name: folder.title, sites });
                    }
                }
            }

            return derivedCats;
        } catch (error) {
            handleError(error, 'deriving categories from bookmarks');
            return [];
        }
    }

    async function renderBookmarkCategoryOrderList() {
        elements.bookmarkCategoryOrderListUI.innerHTML = '';
        
        if (!appData.bookmarks.folderId) return;

        try {
            const allDerivedCategories = await deriveCategoriesFromSelectedBookmarkFolder(true);
            const categoryMap = new Map(allDerivedCategories.map(cat => [cat.id, cat.name]));
            
            let currentOrder = appData.bookmarks.categoryOrder.filter(id => categoryMap.has(id));
            allDerivedCategories.forEach(cat => {
                if (!currentOrder.includes(cat.id)) {
                    currentOrder.push(cat.id);
                }
            });
            
            appData.bookmarks.categoryOrder = currentOrder;

            currentOrder.forEach(catId => {
                if (categoryMap.has(catId)) {
                    const li = document.createElement('li');
                    li.dataset.id = catId;
                    li.draggable = true;
                    li.className = 'sortable-item';
                    li.innerHTML = `<span class="drag-handle">☰</span> ${escapeHTML(categoryMap.get(catId))}`;
                    elements.bookmarkCategoryOrderListUI.appendChild(li);
                }
            });

            makeSortable(elements.bookmarkCategoryOrderListUI, appData.bookmarks.categoryOrder);
        } catch (error) {
            handleError(error, 'rendering bookmark category order');
        }
    }

    async function handleRefreshBookmarkCategories() {
        if (appData.activeMode !== 'bookmarks' || !appData.bookmarks.folderId) {
            showStatus("Please select a bookmark folder first.", STATUS_TYPES.INFO);
            return;
        }

        try {
            setLoadingState(true);
            showStatus("Refreshing bookmark categories...", STATUS_TYPES.INFO);
            
            const derivedCategories = await deriveCategoriesFromSelectedBookmarkFolder(true);
            const newCategoryMap = new Map(derivedCategories.map(cat => [cat.id, cat.name]));
            
            let updatedOrder = appData.bookmarks.categoryOrder.filter(id => newCategoryMap.has(id));
            derivedCategories.forEach(cat => {
                if (!updatedOrder.includes(cat.id)) {
                    updatedOrder.push(cat.id);
                }
            });
            
            appData.bookmarks.categoryOrder = updatedOrder;
            await renderBookmarkCategoryOrderList();
            await handleSaveAllSettings();
            
            showStatus("Bookmark categories refreshed successfully!", STATUS_TYPES.SUCCESS);
        } catch (error) {
            handleError(error, 'refreshing bookmark categories');
        } finally {
            setLoadingState(false);
        }
    }

    // --- SAVE FUNCTION ---
    async function handleSaveAllSettings() {
        try {
            setLoadingState(true);
            
            // Validate inputs
            const validationErrors = validateSettingsInputs();
            if (validationErrors.length > 0) {
                showStatus(`Validation failed: ${validationErrors[0]}`, STATUS_TYPES.ERROR);
                return;
            }

            // Update settings from UI
            appSettings = {
                maxCategoriesPerRow: elements.maxCategoriesPerRowInput.value.trim() || DEFAULT_SETTINGS.maxCategoriesPerRow,
                maxSiteCardsPerRow: elements.maxSiteCardsPerRowInput.value.trim() || DEFAULT_SETTINGS.maxSiteCardsPerRow,
                cardMinWidth: elements.cardMinWidthInput.value.trim(),
                faviconWrapperSize: elements.faviconWrapperSizeInput.value.trim(),
                categoryTitleFontSize: elements.categoryTitleFontSizeInput.value.trim(),
                siteNameFontSize: elements.siteNameFontSizeInput.value.trim(),
                gradientStartColor: elements.gradientStartColorInput.value,
                gradientEndColor: elements.gradientEndColorInput.value
            };

            // Update gradient colors immediately
            document.documentElement.style.setProperty('--gradient-start', appSettings.gradientStartColor);
            document.documentElement.style.setProperty('--gradient-end', appSettings.gradientEndColor);

            appData.activeMode = document.querySelector('input[name="dataSourceMode"]:checked').value;

            if (appData.activeMode === 'manual') {
                updateManualDataFromDOM();
            } else {
                appData.bookmarks.folderId = elements.bookmarkFolderSelector.value;
                const currentBookmarkOrderInDOM = [];
                elements.bookmarkCategoryOrderListUI.querySelectorAll('.sortable-item').forEach(li => {
                    currentBookmarkOrderInDOM.push(li.dataset.id);
                });
                appData.bookmarks.categoryOrder = currentBookmarkOrderInDOM;
            }

            // Generate active display data
            let activeDisplayData = { categories: [], categoryOrder: [] };
            if (appData.activeMode === 'manual') {
                activeDisplayData.categories = appData.manual.categories;
                activeDisplayData.categoryOrder = appData.manual.categoryOrder;
            } else if (appData.activeMode === 'bookmarks' && appData.bookmarks.folderId) {
                activeDisplayData.categories = await deriveCategoriesFromSelectedBookmarkFolder(true);
                const derivedCategoryMap = new Map(activeDisplayData.categories.map(c => [c.id, c]));
                appData.bookmarks.categoryOrder = appData.bookmarks.categoryOrder.filter(id => derivedCategoryMap.has(id));
                activeDisplayData.categories.forEach(cat => {
                    if (!appData.bookmarks.categoryOrder.includes(cat.id)) {
                        appData.bookmarks.categoryOrder.push(cat.id);
                    }
                });
                activeDisplayData.categoryOrder = appData.bookmarks.categoryOrder;
            }

            // Save to storage
            await chrome.storage.local.set({ appSettings, appData, activeDisplayData });
            showStatus('Settings saved successfully!', STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            handleError(error, 'saving settings');
        } finally {
            setLoadingState(false);
        }
    }

    // --- DATA MANAGEMENT FUNCTIONS ---
    function handleExportSettings() {
        try {
            if (appData.activeMode === 'manual') updateManualDataFromDOM();
            
            const dataToExport = { appSettings, appData };
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `novatab_settings_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showStatus('Settings exported successfully!', STATUS_TYPES.SUCCESS);
        } catch (error) {
            handleError(error, 'exporting settings');
        }
    }

    function handleImportSettings(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const imported = JSON.parse(e.target.result);
                
                if (!imported.appSettings || !imported.appData) {
                    throw new Error('Invalid import file format');
                }

                // Validate and merge settings
                const newAppSettings = { ...DEFAULT_SETTINGS };
                Object.keys(DEFAULT_SETTINGS).forEach(key => {
                    if (imported.appSettings[key] !== undefined) {
                        newAppSettings[key] = imported.appSettings[key];
                    }
                });
                
                appSettings = newAppSettings;
                appData = JSON.parse(JSON.stringify(DEFAULT_APP_DATA));
                
                appData.activeMode = imported.appData.activeMode || DEFAULT_APP_DATA.activeMode;
                
                if (imported.appData.manual) {
                    appData.manual.categories = validateCategories(imported.appData.manual.categories || []);
                    appData.manual.categoryOrder = imported.appData.manual.categoryOrder || [];
                }
                
                if (imported.appData.bookmarks) {
                    appData.bookmarks = {
                        folderId: imported.appData.bookmarks.folderId || null,
                        categoryOrder: imported.appData.bookmarks.categoryOrder || [],
                        iconOverrides: imported.appData.bookmarks.iconOverrides || {}
                    };
                }

                if (!appData.manual.categoryOrder?.length && appData.manual.categories.length > 0) {
                    appData.manual.categoryOrder = appData.manual.categories.map(c => c.id);
                }

                await handleSaveAllSettings();
                updateUIBasedOnState();
                
                if (appData.activeMode === 'bookmarks') {
                    await loadBookmarkFoldersIntoSelector();
                    await renderBookmarkCategoryOrderList();
                }
                
                showStatus('Settings imported successfully!', STATUS_TYPES.SUCCESS);
                
            } catch (error) {
                handleError(error, 'importing settings');
            } finally {
                elements.importSettingsInput.value = '';
            }
        };
        
        reader.readAsText(file);
    }

    async function handleResetAllSettings() {
        if (!confirm("Are you sure you want to reset all NovaTab settings to their defaults? This action cannot be undone.")) {
            return;
        }

        try {
            setLoadingState(true);
            
            appSettings = { ...DEFAULT_SETTINGS };
            appData = JSON.parse(JSON.stringify(DEFAULT_APP_DATA));

            const defaultActiveDisplayData = { categories: [], categoryOrder: [] };
            if (DEFAULT_APP_DATA.activeMode === 'manual') {
                defaultActiveDisplayData.categories = DEFAULT_APP_DATA.manual.categories;
                defaultActiveDisplayData.categoryOrder = DEFAULT_APP_DATA.manual.categoryOrder;
            }

            await chrome.storage.local.set({
                appSettings: { ...DEFAULT_SETTINGS },
                appData: JSON.parse(JSON.stringify(DEFAULT_APP_DATA)),
                activeDisplayData: defaultActiveDisplayData
            });

            await loadDataFromStorage();
            updateUIBasedOnState();
            
            if (appData.activeMode === 'bookmarks') {
                await loadBookmarkFoldersIntoSelector();
                await renderBookmarkCategoryOrderList();
            }
            
            showStatus('All settings have been reset to default.', STATUS_TYPES.SUCCESS);
            
        } catch (error) {
            handleError(error, 'resetting settings');
        } finally {
            setLoadingState(false);
        }
    }

    // --- UTILITY FUNCTIONS ---
    function generateUUID() {
        return crypto.randomUUID();
    }

    function escapeHTML(str) {
        if (typeof str !== 'string') str = String(str);
        return str.replace(/[&<>"']/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[match]));
    }

    // --- DRAG AND DROP FUNCTIONALITY ---
    let draggedItem = null;

    function makeSortable(listElement, orderArray, onSortCallback) {
        listElement.querySelectorAll('.sortable-item').forEach(item => {
            item.ondragstart = (e) => {
                draggedItem = item;
                setTimeout(() => item.classList.add('dragging'), 0);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
            };

            item.ondragend = () => {
                if (draggedItem) draggedItem.classList.remove('dragging');
                draggedItem = null;
                
                const newOrder = [];
                listElement.querySelectorAll('.sortable-item').forEach(li => {
                    newOrder.push(li.dataset.id);
                });
                
                orderArray.length = 0;
                orderArray.push(...newOrder);
                
                if (onSortCallback) onSortCallback();
            };
        });

        listElement.ondragover = (e) => {
            e.preventDefault();
            if (!draggedItem) return;
            
            const afterElement = getDragAfterElement(listElement, e.clientY);
            if (afterElement == null) {
                listElement.appendChild(draggedItem);
            } else {
                listElement.insertBefore(draggedItem, afterElement);
            }
        };
    }

    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.sortable-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    // Initialize footer functionality
    function initializeFooter() {
        // Set version number
        document.getElementById('extension-version').textContent = chrome.runtime.getManifest().version;

        // Set up store rating link
        document.getElementById('rate-extension').href = `https://chrome.google.com/webstore/detail/${chrome.runtime.id}/reviews`;

        // Set up privacy policy link (replace with your actual privacy policy URL)
        document.getElementById('privacy-policy').href = 'https://github.com/yourusername/novatab-extension/blob/main/PRIVACY.md';

        // Set up issue reporting link (replace with your actual repository URL)
        document.getElementById('report-issue').href = 'https://github.com/yourusername/novatab-extension/issues/new';
    }

    // Call initializeFooter after DOM is loaded
    initializeFooter();

    // --- INITIALIZATION ---
    await initialize();
});