# Changelog

All notable changes to NovaTab Extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1] - 2025-05-28

### Changed
- **Code consolidation** - Centralized shared code into `utils.js` for better maintainability
  - Moved DEFAULT_SETTINGS and DEFAULT_APP_DATA constants to utils.js
  - Centralized UUID generation utilities
  - Consolidated favicon/hostname utilities (getEffectiveHostname, getFaviconUrl)
  - Unified validation functions across all scripts
  - Moved showStatus and escapeHTML to utils.js
- **Improved data flow** - New `DataSyncUtils.generateActiveDisplayData` provides consistent data generation
  - Background script now uses centralized data generation on bookmark changes
  - Options page uses same utility for consistency when saving settings
  - New tab page reflects bookmark changes more quickly
- **Options page save model** - Changed from auto-save to explicit save behavior
  - Added "Save All Settings" button as explicit trigger for persistence
  - Removed debounced auto-saves to storage
  - Added unsaved changes indicator for better user feedback
  - Added beforeunload prompt to prevent accidental data loss
  - Updated placeholder footer URLs

### Fixed
- Better state management with cleaner separation between background script, options page, and new tab page
- More reliable settings persistence with explicit save model

[Commit: 2282c27](https://github.com/AllInStride/novatab-extension/commit/2282c27)

## [1.1.0] - 2025

### Added
- **Modern design** - Glassmorphism effects with backdrop filters
- **Dark mode support** - Automatic system preference detection
- **Full keyboard navigation** - Tab through all interactive elements
- **Screen reader support** - ARIA labels and semantic HTML
- **High contrast mode** - Support for users with visual impairments
- **Focus indicators** - Clear focus states for all controls
- **Reduced motion** - Respects user motion preferences
- **Loading states** - Visual feedback for async operations

### Changed
- **Enhanced user experience** - Responsive layout with improved mobile and tablet experience
- **Smooth animations** - Enhanced hover effects and transitions
- **Performance enhancements** - Debounced operations for better input handling
- **Efficient DOM manipulation** - Reduced reflows and repaints
- **Optimized storage** - Better data management and caching
- **Lazy loading** - On-demand favicon loading

### Fixed
- **Memory leak** - Replaced `window.onclick` with proper `addEventListener`
- **Race condition** - Proper async initialization sequence
- **Favicon fallback** - Multiple fallback levels including inline SVG
- **URL validation** - Proper URL object validation instead of regex
- **Bookmark detection** - More reliable bookmark category identification
- **Data loss prevention** - Manual mode now preserves empty categories/sites
- **Permission checks** - Bookmark API access is now properly verified
- **CSS cleanup** - Variables are removed on page unload
- **URL parsing** - Better hostname extraction for favicon loading
- **Error handling** - Comprehensive error handling throughout the app
- **Input validation** - Real-time validation for all user inputs
- **Enhanced error display** - User-visible error messages with auto-dismiss

## [1.0.0] - 2025

### Added
- Initial public release
- Manual site management with custom categories
- Chrome bookmarks integration
- Drag & drop category reordering
- Custom icon support via URLs
- Layout controls (grid layout and card sizes)
- Typography settings (font sizes for titles and site names)
- Gradient background customization
- Spacing options for cards
- Export/import settings functionality
- Reset to defaults option
- Automatic data validation
- Chrome storage integration
- Options page for configuration
- New tab override with custom dashboard

[Commit: 7ee8abe](https://github.com/AllInStride/novatab-extension/commit/7ee8abe)

---

## Types of Changes

- `Added` - New features
- `Changed` - Changes in existing functionality
- `Deprecated` - Soon-to-be removed features
- `Removed` - Removed features
- `Fixed` - Bug fixes
- `Security` - Vulnerability fixes
