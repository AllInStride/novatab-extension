# NovaTab Extension - Enhanced Version

## 🚀 Quick Start
1. **Load this folder as an unpacked extension in Chrome:**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (top right toggle)
   - Click "Load unpacked" and select the `novatab-extension` folder

2. **Open a new tab** to see NovaTab in action!

3. **Configure settings** by right-clicking the extension icon and selecting "Options"

## ✨ What's New in v1.1.1

### 🔧 Code Refactoring and Improvements
- **Centralized utilities** - Consolidated shared code into `utils.js` for better maintainability
- **Improved data flow** - New `DataSyncUtils.generateActiveDisplayData` provides consistent data generation
- **Better code organization** - Centralized constants, UUID generation, favicon utilities, and validation functions
- **Enhanced state management** - Cleaner separation between background script, options page, and new tab page

### 💾 Options Page Save Model Changes
- **Explicit save button** - New "Save All Settings" button replaces auto-save behavior
- **Unsaved changes indicator** - Visual feedback shows when changes haven't been saved
- **beforeunload prompt** - Warns users if they try to close the page with unsaved changes
- **Improved reliability** - Clearer save state prevents accidental data loss

### 🏗️ Technical Improvements
- **DEFAULT_SETTINGS constant** - Centralized default settings in utils.js
- **UUID utilities** - Consolidated UUID generation functions
- **Favicon utilities** - Centralized favicon URL generation and validation
- **Validation utilities** - Shared validation functions across all scripts

## ✨ What's New in v1.1.0

### 🐛 Major Bug Fixes
- **Improved URL parsing** - Better hostname extraction for favicon loading
- **Enhanced error handling** - Comprehensive error handling throughout the app
- **Input validation** - Real-time validation for all user inputs
- **Memory optimization** - Better cleanup and performance improvements

### 🔧 Recent Bug Fixes (Latest Update)
- **Fixed memory leak** - Replaced `window.onclick` with proper `addEventListener`
- **Fixed race condition** - Proper async initialization sequence
- **Improved favicon fallback** - Multiple fallback levels including inline SVG
- **Better URL validation** - Proper URL object validation instead of regex
- **Fixed bookmark detection** - More reliable bookmark category identification
- **Prevented data loss** - Manual mode now preserves empty categories/sites
- **Added permission checks** - Bookmark API access is now properly verified
- **CSS cleanup** - Variables are removed on page unload
- **Debounced updates** - Manual changes are auto-saved with debouncing
- **Enhanced error display** - User-visible error messages with auto-dismiss

### 🎨 Enhanced User Experience
- **Modern design** - Glassmorphism effects with backdrop filters
- **Dark mode support** - Automatic system preference detection
- **Responsive layout** - Improved mobile and tablet experience
- **Smooth animations** - Enhanced hover effects and transitions
- **Loading states** - Visual feedback for async operations

### ♿ Accessibility Improvements
- **Full keyboard navigation** - Tab through all interactive elements
- **Screen reader support** - ARIA labels and semantic HTML
- **High contrast mode** - Support for users with visual impairments
- **Focus indicators** - Clear focus states for all controls
- **Reduced motion** - Respects user motion preferences

### ⚡ Performance Enhancements
- **Debounced operations** - Better performance for user inputs
- **Efficient DOM manipulation** - Reduced reflows and repaints
- **Optimized storage** - Better data management and caching
- **Lazy loading** - On-demand favicon loading

## 📋 Features

### 🔧 Content Management
- **Manual Site Management** - Create custom categories and add favorite sites
- **Bookmark Integration** - Sync with Chrome bookmarks automatically
- **Drag & Drop Reordering** - Organize categories by dragging
- **Custom Icons** - Set custom icons for any site using URLs

### 🎨 Customization
- **Layout Controls** - Adjust grid layout and card sizes
- **Typography Settings** - Customize font sizes for titles and site names
- **Color Themes** - Gradient background customization
- **Spacing Options** - Fine-tune card dimensions and spacing

### 💾 Data Management
- **Export/Import** - Backup and restore your settings
- **Reset Options** - Reset to defaults when needed
- **Data Validation** - Automatic data integrity checking

## 🛠️ Installation from Source

### Requirements
- Chrome 88+ (for Manifest V3 support)
- No additional dependencies needed

### Setup Steps
1. **Download/Clone** this repository
2. **Create icons** (see Icons section below)
3. **Load in Chrome:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `novatab-extension` folder

## 🖼️ Adding Icons

Create PNG files in the `icons/` directory:
- `icon16.png` (16×16 pixels) - Toolbar icon
- `icon32.png` (32×32 pixels) - Extension management page
- `icon48.png` (48×48 pixels) - Extensions page
- `icon128.png` (128×128 pixels) - Chrome Web Store
- `default_favicon.png` - Fallback for site favicons

**Quick Icon Creation:**
- Use any image editor (GIMP, Photoshop, online tools)
- Create simple colored squares or use your logo
- Export as PNG with transparent background

## ⚙️ Configuration

### Manual Mode
1. Go to extension options (right-click extension icon → Options)
2. Add categories and sites manually
3. Drag to reorder categories
4. **Click "Save All Settings" button** to save your changes
5. Right-click sites on new tab page to set custom icons

**Note:** Changes in the options page are not auto-saved. You must click the "Save All Settings" button to persist your changes. An unsaved changes indicator will appear if you have pending modifications, and you'll be prompted if you try to close the page without saving.

### Bookmark Mode
1. Create bookmark folders in Chrome
2. Add sites to those folders
3. In extension options, select your main bookmark folder
4. Subfolders become categories automatically
5. **Click "Save All Settings" button** to save your configuration

## 🎨 Customization Options

### Layout Settings
- **Max Categories Per Row** - Control category grid (1-4 columns)
- **Max Site Cards Per Row** - Sites per category (3-10 cards)
- **Card Minimum Width** - Individual card size (50px-150px)
- **Favicon Area Size** - Icon container size (24px-64px)

### Typography
- **Category Title Font Size** - Header text size (12px-24px)
- **Site Name Font Size** - Site label size (8px-16px)

### Visual Theme
- **Background Gradient** - Start and end colors
- **Card Style** - Automatic glassmorphism effects
- **Dark Mode** - Follows system preferences

## 🔧 Troubleshooting

### Common Issues

**Sites not loading:**
- Check URL format (must include https://)
- Verify network connectivity
- Try refreshing the extension

**Icons not showing:**
- Verify custom icon URLs are direct image links
- Check if icons exist in the `icons/` folder
- Clear browser cache and reload

**Settings not saving:**
- **Ensure you clicked "Save All Settings" button** - Changes are not auto-saved in v1.1.1+
- Check for the unsaved changes indicator (asterisk) before closing options page
- Verify Chrome storage permissions
- Try exporting/importing settings
- Reset to defaults if corrupted

**Bookmarks not syncing:**
- Verify bookmark folder selection
- Use "Refresh Bookmark Categories" button
- Check bookmark permissions

### Debug Mode
1. Open Developer Tools (F12) on new tab page
2. Check Console tab for error messages
3. Look for "NovaTab:" prefixed messages

### Reset Extension
1. Go to Options → Data Management tab
2. Click "Reset All Settings"
3. Confirm reset operation
4. Reload extension if needed

## 🔒 Privacy & Security

### Data Storage
- All data stored locally in Chrome storage
- No external servers or data transmission
- Bookmark access limited to selected folders only

### Permissions Used
- `storage` - Save extension settings locally
- `bookmarks` - Read bookmark folders (optional)
- `https://www.google.com/` - Load favicon images only

## 🤝 Contributing

### Bug Reports
Please include:
- Chrome version and operating system
- Extension version (check options page)
- Steps to reproduce the issue
- Console error messages (if any)

### Feature Requests
- Describe the feature clearly
- Explain the use case and benefits
- Consider impact on existing users

## 📈 Performance Tips

### For Best Performance
- **Limit categories** - 6 or fewer for optimal loading
- **Optimize icons** - Use appropriately sized images
- **Regular cleanup** - Remove unused categories/sites
- **Update bookmarks** - Keep bookmark structure simple

### Recommended Settings
- Max Categories Per Row: 2-3
- Max Site Cards Per Row: 5-8
- Card Min Width: 60px-80px
- Keep category names concise

## 🔮 Future Enhancements

### Planned Features
- Search functionality within sites
- Keyboard shortcuts for navigation
- Themes and color presets
- Weather and clock widgets
- Cross-device synchronization

### Technical Roadmap
- Enhanced accessibility features
- Performance optimizations
- Mobile browser support
- Automated testing suite

## 📞 Support

For issues, questions, or suggestions:
- Check this README for common solutions
- Review the troubleshooting section
- Check browser console for error messages

## 📄 License

This project is open source. Feel free to modify and distribute according to your needs.

---

**Version:** 1.1.1 Enhanced
**Chrome Version Required:** 88+
**Last Updated:** May 2025