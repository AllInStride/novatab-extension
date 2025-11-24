// options.js - Enhanced version with better error handling, validation, and organization
document.addEventListener('DOMContentLoaded', async () => {
    // --- CONSTANTS ---
    // DEFAULT_SETTINGS and DEFAULT_APP_DATA are now sourced from NOVATAB_CONSTANTS in utils.js

    const STATUS_TYPES = { // This can remain local if only used here, or be moved to NOVATAB_CONSTANTS if used elsewhere.
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info'
    };

    // --- STATE VARIABLES ---
    let appSettings = {};
    let appData = {};
    let isLoading = false;
    let saveTimeout = null;
    let hasUnsavedChanges = false; // Flag for unsaved changes

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

    // VALIDATION UTILITIES are now sourced from ValidationUtils in utils.js
    // ERROR HANDLING
    function handleError(error, context = '', showToUser = true) {
        console.error(`NovaTab Error (${context}):`, error);
        if (showToUser) {
            // Use DOMUtils.showStatus
            DOMUtils.showStatus(elements.statusMessageUI, `Error: ${error.message || 'Something went wrong'}`, STATUS_TYPES.ERROR);
        }
    }

    // showStatus function is removed, using DOMUtils.showStatus directly.

    // --- LOADING STATE MANAGEMENT ---
    function setLoadingState(loading) {
        isLoading = loading;
        const saveBtn = elements.saveAllSettingsBtn;

        if (saveBtn) {
            saveBtn.disabled = loading;
            if (loading) {
                saveBtn.classList.add('button-loading');
            } else {
                saveBtn.classList.remove('button-loading');
                saveBtn.textContent = 'Save All Settings';
            }
        }
    }
    
    function setUnsavedChanges(isDirty) {
        hasUnsavedChanges = isDirty;
        const statusMsg = "Changes pending. Click 'Save All Settings' to apply.";
        if (isDirty) {
            // Show a persistent info message that changes are pending
            DOMUtils.showStatus(elements.statusMessageUI, statusMsg, STATUS_TYPES.INFO, 0); 
        } else {
            // Clear the "pending" message if changes are saved or reverted
            // Ensure we only clear our specific pending message, not other success/error messages that might be temporary.
            if (elements.statusMessageUI.textContent === statusMsg && elements.statusMessageUI.className === STATUS_TYPES.INFO) {
                 elements.statusMessageUI.textContent = '';
                 elements.statusMessageUI.className = '';
            }
        }
        // Optionally, visually indicate unsaved changes on the save button
        if (elements.saveAllSettingsBtn) {
            if (isDirty) {
                elements.saveAllSettingsBtn.classList.add('unsaved-changes-indicator'); // Requires CSS for actual visual change
            } else {
                elements.saveAllSettingsBtn.classList.remove('unsaved-changes-indicator');
            }
        }
    }
    
    // Add beforeunload listener for unsaved changes
    window.addEventListener('beforeunload', (event) => {
        if (hasUnsavedChanges) {
            event.preventDefault(); 
            event.returnValue = ''; // Required for Chrome compatibility.
            return 'You have unsaved changes. Are you sure you want to leave?'; // Standard message.
        }
    });

    // --- INITIALIZATION ---
    async function initialize() {
        try {
            setLoadingState(true);

            // Set dynamic version from manifest
            const manifest = chrome.runtime.getManifest();
            const versionElement = document.getElementById('extension-version');
            if (versionElement) {
                versionElement.textContent = manifest.version;
            }

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
            setUnsavedChanges(false); // Initialize as no unsaved changes

            // Check storage usage and show warning if needed
            if (typeof StorageManager !== 'undefined') {
                await StorageManager.showUsageWarningIfNeeded(elements.statusMessageUI);
            }

            DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.SUCCESS.SETTINGS_SAVED, STATUS_TYPES.SUCCESS, 3000);
        } catch (error) {
            handleError(error, 'initialization');
        } finally {
            setLoadingState(false);
        }
    }

    async function loadDataFromStorage() {
        try {
            const result = await chrome.storage.local.get(['appSettings', 'appData']);

            // Load settings with validation using NOVATAB_CONSTANTS
            appSettings = { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS };
            if (result.appSettings) {
                Object.keys(NOVATAB_CONSTANTS.DEFAULT_SETTINGS).forEach(key => {
                    if (result.appSettings[key] !== undefined) {
                        appSettings[key] = result.appSettings[key];
                    }
                });
            }

            // Load app data with validation using NOVATAB_CONSTANTS
            appData = GeneralUtils.deepClone(NOVATAB_CONSTANTS.DEFAULT_APP_DATA); // Use deepClone for safety
            if (result.appData) {
                appData.activeMode = result.appData.activeMode || NOVATAB_CONSTANTS.DEFAULT_APP_DATA.activeMode;

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
        // Use ValidationUtils.validateCategory which internally uses GeneralUtils.generateUUID
        return categories.map(cat => ValidationUtils.validateCategory(cat));
    }

    // --- INPUT VALIDATION ---
    function validateSettingsInputs() {
        const errors = [];
        // Use ValidationUtils for all validation checks
        if (!ValidationUtils.isPositiveNumber(elements.maxCategoriesPerRowInput.value)) {
            errors.push('Max Categories Per Row must be a positive number');
        }
        
        if (!ValidationUtils.isPositiveNumber(elements.maxSiteCardsPerRowInput.value)) {
            errors.push('Max Site Cards Per Row must be a positive number');
        }
        
        if (!ValidationUtils.isValidPixelValue(elements.cardMinWidthInput.value)) {
            errors.push('Card Min Width must be a valid pixel value (e.g., 70px)');
        }
        
        if (!ValidationUtils.isValidPixelValue(elements.faviconWrapperSizeInput.value)) {
            errors.push('Favicon Wrapper Size must be a valid pixel value (e.g., 38px)');
        }
        
        if (!ValidationUtils.isValidPixelValue(elements.categoryTitleFontSizeInput.value)) {
            errors.push('Category Title Font Size must be a valid pixel value (e.g., 16px)');
        }
        
        if (!ValidationUtils.isValidPixelValue(elements.siteNameFontSizeInput.value)) {
            errors.push('Site Name Font Size must be a valid pixel value (e.g., 10px)');
        }
        
        if (!ValidationUtils.isValidHexColor(elements.gradientStartColorInput.value)) {
            errors.push('Gradient Start Color must be a valid hex color');
        }
        
        if (!ValidationUtils.isValidHexColor(elements.gradientEndColorInput.value)) {
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
                    setUnsavedChanges(true); 

                    if (appData.activeMode === 'bookmarks' && appData.bookmarks.folderId) {
                        await renderBookmarkCategoryOrderList(); 
                    }
                } catch (error) {
                    handleError(error, 'mode switching');
                }
            });
        });

        // Manual mode handlers
        elements.addManualCategoryBtn?.addEventListener('click', () => {
            handleAddManualCategory(); 
        });

        // Bookmark mode handlers
        elements.bookmarkFolderSelector?.addEventListener('change', () => {
            handleBookmarkFolderSelectionChange(); 
        });

        elements.refreshBookmarkCategoriesBtn?.addEventListener('click', handleRefreshBookmarkCategories); 

        // Settings handlers with debouncing for validation, and mark unsaved changes
        const appearanceInputElements = [
            elements.maxCategoriesPerRowInput,
            elements.maxSiteCardsPerRowInput,
            elements.cardMinWidthInput,
            elements.faviconWrapperSizeInput,
            elements.categoryTitleFontSizeInput,
            elements.siteNameFontSizeInput,
            elements.gradientStartColorInput,
            elements.gradientEndColorInput
        ];

        appearanceInputElements.forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    debounceValidation(); 
                    setUnsavedChanges(true); 
                });
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
                DOMUtils.showStatus(elements.statusMessageUI, `Validation: ${errors[0]}`, STATUS_TYPES.ERROR, 5000);
            }
        }, 500);
    }

    // Debounce timer for manual updates - Using DOMUtils.debounce
    // This will now only update the local appData and mark changes as unsaved.
    const debouncedUpdateManualData = DOMUtils.debounce(() => {
        updateManualDataFromDOM(); // Updates local appData.manual based on DOM
        setUnsavedChanges(true);
        // Removed: DOMUtils.showStatus(elements.statusMessageUI, 'Changes saved automatically', STATUS_TYPES.SUCCESS, 1000);
    }, 500);


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
                           value="${DOMUtils.escapeHTML(site.name)}" placeholder="Site Name">
                    <input type="url" class="manual-site-url-input form-control"
                           value="${DOMUtils.escapeHTML(site.url)}" placeholder="https://example.com">
                    <input type="url" class="manual-site-custom-icon-url-input form-control"
                           value="${DOMUtils.escapeHTML(site.customIconUrl || '')}" placeholder="Custom Icon URL (optional)">
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
                       value="${DOMUtils.escapeHTML(category.name)}" placeholder="Category Name">
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
        // Use URLUtils.getFaviconUrl, though it's more comprehensive than needed for just a preview.
        // For simplicity, we can keep a lightweight version or adapt.
        // Let's use a simplified version of what URLUtils.getFaviconUrl would do for preview:
        if (site.customIconUrl && URLUtils.isValidImageUrl(site.customIconUrl)) {
             return site.customIconUrl;
        }
        if (site.url && URLUtils.isValidUrl(site.url)) {
            try {
                const hostname = URLUtils.getEffectiveHostname(site.url);
                if (hostname && hostname !== 'example.com') {
                    return `${NOVATAB_CONSTANTS.FAVICON_SERVICES.GOOGLE}?domain=${encodeURIComponent(hostname)}&sz=32`;
                }
            } catch {
                // Fall through
            }
        }
        return NOVATAB_CONSTANTS.FAVICON_SERVICES.FALLBACK;
    }

    function addEventListenersToManualItems() {
        // Event delegation - single listener on container handles all buttons
        if (!elements.manualCategoriesListUI) return;

        // Remove old listener if exists (prevent duplicates on re-render)
        if (elements.manualCategoriesListUI._delegateListener) {
            elements.manualCategoriesListUI.removeEventListener(
                'click',
                elements.manualCategoriesListUI._delegateListener
            );
        }

        // Create new delegate listener
        const delegateListener = (e) => {
            const target = e.target;

            if (target.classList.contains('remove-manual-category-btn')) {
                handleRemoveManualCategory(e);
            } else if (target.classList.contains('add-manual-site-btn')) {
                handleAddManualSite(e);
            } else if (target.classList.contains('remove-manual-site-btn')) {
                handleRemoveManualSite(e);
            }
        };

        // Store reference for later removal
        elements.manualCategoriesListUI._delegateListener = delegateListener;

        // Add single delegated listener
        elements.manualCategoriesListUI.addEventListener('click', delegateListener);
    }

    function handleAddManualCategory() {
        try {
            updateManualDataFromDOM(); 
            const newCatId = GeneralUtils.generateUUID();
            const newCategory = { id: newCatId, name: 'New Category', sites: [] };
            appData.manual.categories.push(newCategory);
            appData.manual.categoryOrder.push(newCatId); 
            renderManualCategoriesList(); 
            setUnsavedChanges(true);
        } catch (error) {
            handleError(error, 'adding category');
        }
    }

    function handleRemoveManualCategory(event) {
        try {
            const catElement = event.target.closest('.manual-category-item');
            const catName = catElement.querySelector('.manual-category-name-input').value;
            
            if (!confirm(`Remove category "${catName}"? ${NOVATAB_MESSAGES.WARNINGS.DELETE_CATEGORY_CONFIRM}`)) {
                return;
            }
            
            updateManualDataFromDOM(); 
            const catId = catElement.dataset.id;
            appData.manual.categories = appData.manual.categories.filter(c => c.id !== catId);
            appData.manual.categoryOrder = appData.manual.categoryOrder.filter(id => id !== catId);
            renderManualCategoriesList(); 
            setUnsavedChanges(true);
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
                setUnsavedChanges(true);
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
                    setUnsavedChanges(true);
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
                    // Use URLUtils.normalizeUrl for robust URL handling
                    siteUrl = URLUtils.normalizeUrl(siteUrl);
                }

                // Keep sites even if name is empty (to prevent data loss)
                // User can see and fix empty names
                if (siteUrl) { // URLUtils.normalizeUrl might return empty string for invalid inputs
                    sites.push(ValidationUtils.validateSite({ // Use ValidationUtils.validateSite
                        name: siteName || 'Unnamed Site',
                        url: siteUrl,
                        customIconUrl
                    }));
                }
            });

            // Keep categories even if empty (to prevent accidental deletion)
            // Use ValidationUtils.validateCategory to ensure structure and ID
            newCategories.push(ValidationUtils.validateCategory({
                id,
                name: name || "Unnamed Category",
                sites
            }));
            newCategoryOrder.push(id);
        });

        // Filter out any potentially invalid categories if validateCategory decided so (e.g. no ID)
        // Though current validateCategory always returns a valid structure with an ID.
        appData.manual.categories = newCategories.filter(cat => cat && cat.id);
        appData.manual.categoryOrder = newCategoryOrder;
    }

    function updateManualCategoryOrderFromDOM() {
        const newOrder = [];
        elements.manualCategoriesListUI.querySelectorAll('.manual-category-item').forEach(item => {
            newOrder.push(item.dataset.id);
        });
        appData.manual.categoryOrder = newOrder;
        updateManualDataFromDOM(); 
        setUnsavedChanges(true);
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
                DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.ERRORS.BOOKMARK_PERMISSION_DENIED, STATUS_TYPES.ERROR);
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
            if (bookmarkNode.title || depth === 0) { // Root node might not have a title
                // Include root folders (like 'Bookmarks Bar', 'Other Bookmarks') which often have IDs like "1", "2"
                // And the absolute root "0" if desired (though often not directly selectable for this purpose)
                if (depth > 0 || ["0", "1", "2"].includes(bookmarkNode.id)) { // Adjust this condition as needed
                    const option = document.createElement('option');
                    option.value = bookmarkNode.id;
                    option.textContent = `${'— '.repeat(depth)}${DOMUtils.escapeHTML(bookmarkNode.title || (bookmarkNode.id === "0" ? 'All Bookmarks (Root)' : 'Unnamed Folder'))}`;
                    selectElement.appendChild(option);
                }
            }
            bookmarkNode.children.forEach(child => {
                // Only recurse if child is a folder (doesn't have a URL)
                if (!child.url) {
                    populateFolderOptionsRecursive(child, depth + 1, selectElement);
                }
            });
        }
    }


    async function handleBookmarkFolderSelectionChange() {
        try {
            appData.bookmarks.folderId = elements.bookmarkFolderSelector.value;
            setUnsavedChanges(true);

            if (appData.bookmarks.folderId) {
                const derivedCategories = await deriveCategoriesFromSelectedBookmarkFolder(true);
                appData.bookmarks.categoryOrder = derivedCategories.map(cat => cat.id); 
                await renderBookmarkCategoryOrderList(); 
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
                    li.innerHTML = `<span class="drag-handle">☰</span> ${DOMUtils.escapeHTML(categoryMap.get(catId))}`;
                    elements.bookmarkCategoryOrderListUI.appendChild(li);
                }
            });

            makeSortable(elements.bookmarkCategoryOrderListUI, appData.bookmarks.categoryOrder, updateBookmarkCategoryOrderFromDOM);
        } catch (error) {
            handleError(error, 'rendering bookmark category order');
        }
    }
    
    function updateBookmarkCategoryOrderFromDOM() {
        const newOrder = [];
        elements.bookmarkCategoryOrderListUI.querySelectorAll('.sortable-item').forEach(item => {
            newOrder.push(item.dataset.id);
        });
        appData.bookmarks.categoryOrder = newOrder;
        setUnsavedChanges(true);
    }


    async function handleRefreshBookmarkCategories() {
        if (appData.activeMode !== 'bookmarks' || !appData.bookmarks.folderId) {
            DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.ERRORS.BOOKMARK_FOLDER_NOT_FOUND, STATUS_TYPES.INFO, 3000);
            return;
        }

        const refreshBtn = elements.refreshBookmarkCategoriesBtn;
        const originalBtnText = refreshBtn ? refreshBtn.textContent : '';

        try {
            // Add loading state to refresh button
            if (refreshBtn) {
                refreshBtn.disabled = true;
                refreshBtn.classList.add('button-loading');
                refreshBtn.textContent = 'Refreshing...';
            }

            DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.INFO.REFRESHING, STATUS_TYPES.INFO, 0);

            // This will fetch bookmarks, update appData.bookmarks.categoryOrder, and re-render the list.
            // The derived categories will be based on the current state of appData.bookmarks.iconOverrides.
            const derivedCategories = await deriveCategoriesFromSelectedBookmarkFolder(true);
            const newCategoryMap = new Map(derivedCategories.map(cat => [cat.id, cat.name]));

            let currentOrder = appData.bookmarks.categoryOrder || [];
            let updatedOrder = currentOrder.filter(id => newCategoryMap.has(id));

            derivedCategories.forEach(cat => {
                if (!updatedOrder.includes(cat.id)) {
                    updatedOrder.push(cat.id);
                }
            });

            appData.bookmarks.categoryOrder = updatedOrder; // Update local appData
            await renderBookmarkCategoryOrderList(); // Update UI

            // Explicitly call save to persist all changes including the new bookmark order and potentially other pending changes.
            await handleSaveAllSettings();
            // Success message will be shown by handleSaveAllSettings.
        } catch (error) {
            handleError(error, 'refreshing bookmark categories');
        } finally {
            // Remove loading state from refresh button
            if (refreshBtn) {
                refreshBtn.disabled = false;
                refreshBtn.classList.remove('button-loading');
                refreshBtn.textContent = originalBtnText;
            }
        }
    }

    // --- SAVE FUNCTION ---
    async function handleSaveAllSettings() {
        try {
            setLoadingState(true);
            
            // Validate inputs
            const validationErrors = validateSettingsInputs();
            if (validationErrors.length > 0) {
                DOMUtils.showStatus(elements.statusMessageUI, `Validation failed: ${validationErrors[0]}`, STATUS_TYPES.ERROR);
                setLoadingState(false); // Release loading state on validation error
                return;
            }

            // Update settings from UI using NOVATAB_CONSTANTS for defaults
            appSettings = {
                maxCategoriesPerRow: elements.maxCategoriesPerRowInput.value.trim() || NOVATAB_CONSTANTS.DEFAULT_SETTINGS.maxCategoriesPerRow,
                maxSiteCardsPerRow: elements.maxSiteCardsPerRowInput.value.trim() || NOVATAB_CONSTANTS.DEFAULT_SETTINGS.maxSiteCardsPerRow,
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
                updateManualDataFromDOM(); // Ensure local appData.manual is up-to-date with DOM
            } else { // 'bookmarks' mode
                appData.bookmarks.folderId = elements.bookmarkFolderSelector.value;
                // Bookmark category order is already updated in appData.bookmarks.categoryOrder by makeSortable/updateBookmarkCategoryOrderFromDOM
            }

            // Generate active display data using the centralized utility
            // Ensure appData is up-to-date before this call
            const activeDisplayData = await DataSyncUtils.generateActiveDisplayData(appData, chrome.bookmarks);

            // Save to storage
            await StorageUtils.set({ 
                [NOVATAB_CONSTANTS.STORAGE_KEYS.APP_SETTINGS]: appSettings, 
                [NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA]: appData, 
                [NOVATAB_CONSTANTS.STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: activeDisplayData 
            });
            
            setUnsavedChanges(false); 
            DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.SUCCESS.SETTINGS_SAVED, STATUS_TYPES.SUCCESS, 3000); 

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

            DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.SUCCESS.DATA_EXPORTED, STATUS_TYPES.SUCCESS);
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

                // Validate and merge settings using NOVATAB_CONSTANTS
                const newAppSettings = { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS };
                Object.keys(NOVATAB_CONSTANTS.DEFAULT_SETTINGS).forEach(key => {
                    if (imported.appSettings && imported.appSettings[key] !== undefined) {
                        newAppSettings[key] = imported.appSettings[key];
                    }
                });

                appSettings = newAppSettings;
                appData = GeneralUtils.deepClone(NOVATAB_CONSTANTS.DEFAULT_APP_DATA);

                appData.activeMode = imported.appData.activeMode || NOVATAB_CONSTANTS.DEFAULT_APP_DATA.activeMode;

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

                await handleSaveAllSettings(); // This will also save activeDisplayData and reset unsavedChanges flag
                updateUIBasedOnState();

                if (appData.activeMode === 'bookmarks') {
                    await loadBookmarkFoldersIntoSelector(); // Ensure folders are loaded
                    if (appData.bookmarks.folderId) { // If a folder is selected, render its order list
                       elements.bookmarkFolderSelector.value = appData.bookmarks.folderId; // Set selector
                       await renderBookmarkCategoryOrderList();
                    }
                }
                
                DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.SUCCESS.DATA_IMPORTED, STATUS_TYPES.SUCCESS, 3000);

            } catch (error) {
                handleError(error, 'importing settings');
            } finally {
                elements.importSettingsInput.value = '';
            }
        };
        
        reader.readAsText(file);
    }

    async function handleResetAllSettings() {
        if (!confirm(NOVATAB_MESSAGES.WARNINGS.RESET_SETTINGS_CONFIRM + " This action cannot be undone.")) {
            return;
        }

        try {
            setLoadingState(true);

            // Use NOVATAB_CONSTANTS for resetting
            appSettings = { ...NOVATAB_CONSTANTS.DEFAULT_SETTINGS };
            appData = GeneralUtils.deepClone(NOVATAB_CONSTANTS.DEFAULT_APP_DATA);

            // Generate activeDisplayData based on the reset appData
            const activeDisplayData = await DataSyncUtils.generateActiveDisplayData(appData, chrome.bookmarks);

            await StorageUtils.set({
                [NOVATAB_CONSTANTS.STORAGE_KEYS.APP_SETTINGS]: appSettings,
                [NOVATAB_CONSTANTS.STORAGE_KEYS.APP_DATA]: appData,
                [NOVATAB_CONSTANTS.STORAGE_KEYS.ACTIVE_DISPLAY_DATA]: activeDisplayData
            });

            // Reload and update UI
            await loadDataFromStorage(); // This reloads appSettings and appData from storage
            updateUIBasedOnState();

            if (appData.activeMode === 'bookmarks') {
                await loadBookmarkFoldersIntoSelector(); // Reload folders
                elements.bookmarkFolderSelector.value = appData.bookmarks.folderId; // Reset selector
                await renderBookmarkCategoryOrderList(); // Re-render list
            }
            
            setUnsavedChanges(false); // Reset unsaved changes flag
            DOMUtils.showStatus(elements.statusMessageUI, NOVATAB_MESSAGES.SUCCESS.SETTINGS_SAVED, STATUS_TYPES.SUCCESS, 3000);

        } catch (error) {
            handleError(error, 'resetting settings');
        } finally {
            setLoadingState(false);
        }
    }

    // generateUUID and escapeHTML are removed, using GeneralUtils.generateUUID and DOMUtils.escapeHTML

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
                
                if (onSortCallback) {
                    onSortCallback(); 
                } else {
                    setUnsavedChanges(true);
                }
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
        // Set version number dynamically from manifest
        const manifest = chrome.runtime.getManifest();
        const versionElement = document.getElementById('extension-version');
        if (versionElement) {
            versionElement.textContent = manifest.version;
        }
    }

    // Call initializeFooter after DOM is loaded
    initializeFooter();

    // --- INITIALIZATION ---
    await initialize();
});