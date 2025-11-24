// constants-messages.js - User-facing message constants

/**
 * Centralized message constants for NovaTab extension
 * All user-facing messages should be defined here for:
 * - Consistency across the extension
 * - Easy maintenance and updates
 * - Future internationalization (i18n) support
 */

const NOVATAB_MESSAGES = {
    // Success messages
    SUCCESS: {
        SETTINGS_SAVED: 'Settings saved successfully!',
        ICON_UPDATED: 'Custom icon updated successfully',
        ICON_REMOVED: 'Custom icon removed',
        DATA_EXPORTED: 'Configuration exported successfully',
        DATA_IMPORTED: 'Configuration imported successfully',
        BOOKMARKS_REFRESHED: 'Bookmarks refreshed successfully!',
        CATEGORY_ADDED: 'Category added successfully',
        CATEGORY_REMOVED: 'Category removed successfully',
        SITE_ADDED: 'Site added successfully',
        SITE_REMOVED: 'Site removed successfully'
    },

    // Error messages
    ERRORS: {
        STORAGE_FAILED: 'Failed to save settings. Please try again.',
        STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please export your data and reset settings.',
        INVALID_URL: 'Please enter a valid URL starting with http:// or https://',
        INVALID_IMAGE_URL: 'Invalid image URL. Please use http://, https://, or data:image/* URLs only.',
        BOOKMARK_PERMISSION_DENIED: 'Bookmark access denied. Please check extension permissions.',
        BOOKMARK_FOLDER_NOT_FOUND: 'Selected bookmark folder not found',
        BOOKMARK_REFRESH_FAILED: 'Failed to refresh bookmarks. Please try again.',
        INVALID_JSON: 'Invalid configuration file. Please check the format.',
        IMPORT_FAILED: 'Failed to import configuration. Please try again.',
        EXPORT_FAILED: 'Failed to export configuration. Please try again.',
        MISSING_DATA: 'Missing required data. Please try again.',
        OPERATION_FAILED: 'Operation failed. Please try again.',
        CATEGORY_NAME_REQUIRED: 'Category name is required',
        SITE_NAME_REQUIRED: 'Site name is required',
        SITE_URL_REQUIRED: 'Site URL is required',
        DUPLICATE_CATEGORY: 'A category with this name already exists',
        NETWORK_ERROR: 'Network error. Please check your connection.'
    },

    // Warning messages
    WARNINGS: {
        UNSAVED_CHANGES: 'You have unsaved changes. Are you sure you want to leave?',
        STORAGE_NEAR_LIMIT: 'Storage usage is high. Consider exporting and resetting data.',
        DELETE_CATEGORY_CONFIRM: 'Are you sure you want to delete this category?',
        DELETE_SITE_CONFIRM: 'Are you sure you want to delete this site?',
        RESET_SETTINGS_CONFIRM: 'This will reset all settings to default. Are you sure?',
        NO_BOOKMARKS_FOUND: 'No bookmarks found in the selected folder'
    },

    // Info messages
    INFO: {
        LOADING: 'Loading...',
        SAVING: 'Saving...',
        REFRESHING: 'Refreshing bookmark categories...',
        PROCESSING: 'Processing...',
        WELCOME: 'Welcome to NovaTab! Configure your dashboard in the options page.',
        NO_SITES_CONFIGURED: 'No sites configured. Add categories and sites in the options page.',
        BOOKMARK_MODE_ACTIVE: 'Using bookmark folder as source',
        MANUAL_MODE_ACTIVE: 'Using manual categories',
        EXPORT_INSTRUCTIONS: 'Click Export to download your configuration as a JSON file',
        IMPORT_INSTRUCTIONS: 'Select a previously exported JSON file to restore your configuration'
    },

    // Button labels
    BUTTONS: {
        SAVE: 'Save',
        CANCEL: 'Cancel',
        DELETE: 'Delete',
        ADD: 'Add',
        REMOVE: 'Remove',
        EXPORT: 'Export',
        IMPORT: 'Import',
        REFRESH: 'Refresh',
        CLOSE: 'Close',
        RESET: 'Reset to Defaults',
        CONFIRM: 'Confirm'
    },

    // Placeholder text
    PLACEHOLDERS: {
        CATEGORY_NAME: 'e.g., Development',
        SITE_NAME: 'e.g., GitHub',
        SITE_URL: 'https://example.com',
        ICON_URL: 'https://example.com/icon.png',
        SEARCH_SITES: 'Search sites...'
    }
};

// Make available globally (for non-module scripts)
if (typeof window !== 'undefined') {
    window.NOVATAB_MESSAGES = NOVATAB_MESSAGES;
}
