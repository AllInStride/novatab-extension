# Contributing to NovaTab

Thank you for your interest in contributing to NovaTab! This document provides guidelines and instructions for developers who want to contribute to the project.

## Table of Contents
- [Development Setup](#development-setup)
- [Code Style Guidelines](#code-style-guidelines)
- [Bug Reports](#bug-reports)
- [Feature Requests](#feature-requests)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Code Review Expectations](#code-review-expectations)
- [Additional Resources](#additional-resources)

---

## Development Setup

### Prerequisites
- **Chrome Browser** (version 88 or higher)
- **Text Editor** (VS Code, Sublime Text, or your preferred editor)
- **Git** for version control
- **GitHub Account** for submitting contributions

### Installation Steps

1. **Fork the Repository**
   - Visit [NovaTab Extension on GitHub](https://github.com/AllInStride/novatab-extension)
   - Click the "Fork" button in the top-right corner

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/novatab-extension.git
   cd novatab-extension
   ```

3. **Load the Extension in Chrome**
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in the top-right corner)
   - Click "Load unpacked"
   - Select the `novatab-extension` directory
   - The extension should now be installed and active

4. **Test the Extension**
   - Open a new tab to see NovaTab in action
   - Right-click the NovaTab icon in the toolbar and select "Options" to access settings
   - Verify that you can add categories, sites, and customize appearance

5. **Set Up Your Development Workflow**
   - After making code changes, click the refresh icon in `chrome://extensions/` to reload the extension
   - Check the Chrome DevTools console for any errors (F12 on the new tab page or options page)

---

## Code Style Guidelines

### General Principles
- **Readability First:** Write clear, self-documenting code with descriptive variable and function names
- **Consistency:** Follow the existing code style and patterns in the codebase
- **Modularity:** Keep functions focused on a single responsibility
- **No Dependencies:** NovaTab is a vanilla JavaScript project with no external dependencies (no npm, no build step)

### JavaScript Style

#### Naming Conventions
- **Constants:** Use `UPPER_SNAKE_CASE` for constants (e.g., `DEFAULT_SETTINGS`, `STORAGE_KEYS`)
- **Functions:** Use `camelCase` for function names (e.g., `generateUUID`, `isValidUrl`)
- **Variables:** Use `camelCase` for variables (e.g., `appSettings`, `categoryOrder`)
- **Private Functions:** Prefix with underscore if needed (e.g., `_helperFunction`)

#### Code Formatting
- **Indentation:** Use 4 spaces (not tabs)
- **Semicolons:** Use semicolons to terminate statements
- **Quotes:** Use single quotes `'` for strings (consistent with existing code)
- **Line Length:** Aim for 100-120 characters per line maximum
- **Braces:** Always use braces for control structures, even single-line blocks

#### Example:
```javascript
/**
 * Validates a site object and normalizes its properties.
 *
 * @param {Object} site - The site object to validate
 * @returns {Object} Validated and normalized site object
 */
function validateSite(site) {
    if (!site || typeof site !== 'object') {
        return { name: '', url: '', customIconUrl: '' };
    }

    return {
        name: String(site.name || '').trim(),
        url: URLUtils.normalizeUrl(site.url || ''),
        customIconUrl: String(site.customIconUrl || '').trim()
    };
}
```

### JSDoc Comments
- **All Public Functions:** Add JSDoc comments to all exported/public functions in `utils.js`
- **Include:** `@param`, `@returns`, `@description` tags
- **Examples:** Add `@example` blocks for complex utilities
- **See Existing Code:** Reference `utils.js` for JSDoc style examples

### HTML/CSS Style
- **HTML:** Use semantic HTML5 elements
- **CSS:** Use descriptive class names (e.g., `.category-container`, `.site-card`)
- **CSS Variables:** Use CSS custom properties for theming (see `styles.css` for examples)
- **Accessibility:** Ensure proper ARIA labels and keyboard navigation support

### File Organization
- **utils.js:** Shared utilities, constants, and helper functions
- **background.js:** Service worker logic, bookmark monitoring, data migrations
- **new_tab.js:** New tab page rendering and UI logic
- **options.js:** Settings page logic and data management
- **Keep Separation:** Don't mix concerns across files

---

## Bug Reports

Before submitting a bug report, please:
1. **Search Existing Issues:** Check if the bug has already been reported
2. **Reproduce the Bug:** Verify you can consistently reproduce the issue
3. **Test in Clean Environment:** Try disabling other extensions to rule out conflicts

### How to Submit a Bug Report

1. Go to the [NovaTab Issues page](https://github.com/AllInStride/novatab-extension/issues)
2. Click **"New Issue"** and select **"Bug report"** (if available)
3. Provide the following information:
   - **Clear Description:** What happened vs. what you expected
   - **Steps to Reproduce:** Numbered list of exact steps
   - **Environment:**
     - NovaTab version (check `manifest.json` or `chrome://extensions/`)
     - Chrome version (go to `chrome://settings/help`)
     - Operating System (Windows, macOS, Linux)
   - **Screenshots/Videos:** If applicable
   - **Console Errors:** Open DevTools (F12) and include any error messages

### Example Bug Report
```
**Title:** Sites disappear when switching from Bookmarks to Manual mode

**Description:**
When I switch from Bookmarks mode to Manual mode in Settings, all my manually
created sites disappear, even though I had previously saved them.

**Steps to Reproduce:**
1. Open NovaTab Settings
2. Create a category in Manual mode with 3 sites
3. Click "Save All Settings"
4. Switch to Bookmarks mode and select a bookmark folder
5. Click "Save All Settings"
6. Switch back to Manual mode
7. Expected: Manual categories still exist
8. Actual: All manual categories are gone

**Environment:**
- NovaTab version: 1.1.0
- Chrome version: 120.0.6099.109
- OS: macOS 14.1

**Console Errors:**
None visible in console
```

For more details, see [SUPPORT.md](./SUPPORT.md).

---

## Feature Requests

We welcome feature ideas! Before submitting:
1. **Check Existing Issues:** Someone may have already requested it
2. **Review the PRD:** See [PRD.md](./PRD.md) for the project roadmap and scope

### How to Submit a Feature Request

1. Go to the [NovaTab Issues page](https://github.com/AllInStride/novatab-extension/issues)
2. Click **"New Issue"** and select **"Feature request"** (if available)
3. Provide:
   - **Clear Title:** Concise summary of the feature
   - **Problem Statement:** What problem does this solve?
   - **Proposed Solution:** How should it work?
   - **Alternatives Considered:** Other approaches you've thought about
   - **Use Case:** How would you (or others) use this feature?

### Example Feature Request
```
**Title:** Add support for custom category icons

**Problem:**
Currently, categories only display text titles. Users want visual icons to
quickly identify categories.

**Proposed Solution:**
Add an optional icon field to categories where users can upload custom icons
or select from a predefined icon library.

**Use Case:**
- I organize my sites by type (work, personal, entertainment)
- Icons would make it easier to visually scan and find categories
- Example: Briefcase icon for Work, Home icon for Personal, etc.
```

For more details, see [SUPPORT.md](./SUPPORT.md).

---

## Pull Request Process

### Before You Start
1. **Open an Issue First:** For significant changes, discuss your approach in an issue before coding
2. **Review Architecture:** Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the codebase structure
3. **Create a Branch:** Use a descriptive branch name (e.g., `fix/bookmark-sync-bug`, `feature/custom-icons`)

### Development Workflow

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Your Changes**
   - Follow the [Code Style Guidelines](#code-style-guidelines)
   - Add JSDoc comments for new functions
   - Update documentation if needed (README.md, ARCHITECTURE.md, etc.)

3. **Test Your Changes**
   - Follow the [Testing Guidelines](#testing-guidelines)
   - Test in both Manual and Bookmarks modes
   - Verify settings save/load correctly
   - Check for console errors

4. **Commit Your Changes**
   ```bash
   git add .
   git commit -m "Add feature: descriptive commit message"
   ```
   - Use descriptive commit messages in present tense (e.g., "Add custom icon support", "Fix bookmark sync issue")
   - Reference issue numbers in commits (e.g., "Fix #42: Resolve bookmark sync bug")

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**
   - Go to your fork on GitHub
   - Click "Compare & pull request"
   - Fill out the PR template:
     - **Title:** Clear, concise summary
     - **Description:** What changed and why
     - **Issue Reference:** Link to related issue(s)
     - **Testing:** How you tested the changes
     - **Screenshots:** If UI changes are involved

### Pull Request Checklist
- [ ] Code follows the project's code style guidelines
- [ ] JSDoc comments added for new functions
- [ ] Tested manually in Chrome (both Manual and Bookmarks modes)
- [ ] No console errors or warnings
- [ ] Documentation updated (if applicable)
- [ ] Commit messages are clear and descriptive
- [ ] PR description explains what changed and why

### Example Pull Request Description
```
**Related Issue:** Closes #42

**Summary:**
Fixes a bug where bookmark changes weren't reflected in the new tab page
until the extension was reloaded.

**Changes:**
- Added bookmark change listeners in background.js
- Regenerate activeDisplayData when bookmarks are added/removed/modified
- Updated data flow documentation in ARCHITECTURE.md

**Testing:**
- Tested adding/removing bookmarks in Chrome bookmarks manager
- Verified new tab page updates automatically
- Tested in both Bookmarks and Manual modes
- No console errors

**Screenshots:**
[Attach before/after screenshots if UI changes]
```

---

## Testing Guidelines

NovaTab is a Chrome Extension without automated tests, so **manual testing is critical**.

### Testing Checklist

#### General Testing
- [ ] Extension loads without errors in `chrome://extensions/`
- [ ] New tab page renders correctly
- [ ] Options page loads and all tabs are functional
- [ ] No errors in DevTools console (F12)

#### Manual Mode Testing
- [ ] Create a new category
- [ ] Add sites to the category
- [ ] Edit site names and URLs
- [ ] Delete sites
- [ ] Reorder categories (drag-and-drop)
- [ ] Delete categories
- [ ] Click "Save All Settings" and verify data persists
- [ ] Refresh the new tab page and verify changes appear
- [ ] Test unsaved changes indicator (edit without saving, try to close page)

#### Bookmarks Mode Testing
- [ ] Switch to Bookmarks mode
- [ ] Select a bookmark folder from the dropdown
- [ ] Verify categories are derived from subfolders
- [ ] Verify sites are derived from bookmarks
- [ ] Add a bookmark in Chrome bookmarks manager
- [ ] Verify new bookmark appears in new tab (may require refresh)
- [ ] Remove a bookmark and verify it disappears
- [ ] Test custom icon overrides (right-click on site card)

#### Appearance Settings Testing
- [ ] Change max categories per row (1-4)
- [ ] Change max site cards per row (3-10)
- [ ] Adjust card minimum width
- [ ] Adjust font sizes
- [ ] Change gradient colors
- [ ] Verify changes apply to new tab page after saving

#### Data Management Testing
- [ ] Export settings to JSON
- [ ] Verify exported file contains correct data
- [ ] Import settings from JSON
- [ ] Verify imported data loads correctly
- [ ] Test "Reset All Settings" button
- [ ] Verify data is cleared and defaults are restored

#### Edge Cases
- [ ] Test with empty categories
- [ ] Test with very long site names (50+ characters)
- [ ] Test with invalid URLs
- [ ] Test with 10+ categories
- [ ] Test with 20+ sites per category
- [ ] Test switching between modes multiple times
- [ ] Test with no bookmark folder selected

### Browser Compatibility
- **Primary:** Test in the latest stable version of Chrome
- **Minimum:** Ensure compatibility with Chrome 88+ (see `manifest.json`)
- **Note:** NovaTab is Chrome-specific and does not target Firefox or Edge

### Performance Testing
- [ ] Test with large datasets (50+ categories, 500+ sites)
- [ ] Verify page load time is acceptable (<1 second)
- [ ] Check for memory leaks (DevTools Memory profiler)
- [ ] Verify smooth drag-and-drop performance

---

## Code Review Expectations

When your PR is submitted, a maintainer will review it. Here's what we look for:

### Code Quality
- **Readability:** Code is clear and well-documented
- **Consistency:** Follows existing patterns and style
- **Modularity:** Functions are focused and reusable
- **Error Handling:** Edge cases are handled gracefully

### Functionality
- **Bug-Free:** No new bugs introduced
- **Scope:** PR addresses the stated issue/feature only (no scope creep)
- **Data Integrity:** User data is not lost or corrupted
- **Backward Compatibility:** Existing users' data is migrated properly (if applicable)

### Testing
- **Manual Testing:** Evidence that changes were tested thoroughly
- **Edge Cases:** Unusual scenarios are considered and handled

### Documentation
- **Code Comments:** Complex logic is explained
- **JSDoc:** Public functions have proper JSDoc comments
- **README/Docs:** Updated if user-facing changes are made

### Review Process
1. **Initial Review:** Maintainer reviews the PR within 3-5 days
2. **Feedback:** Maintainer may request changes or ask questions
3. **Revisions:** Make requested changes and push updates
4. **Approval:** Once approved, the PR will be merged
5. **Merge:** Maintainer will merge and close the PR

### Responding to Feedback
- **Be Respectful:** Feedback is meant to improve code quality
- **Ask Questions:** If feedback is unclear, ask for clarification
- **Make Changes Promptly:** Address feedback in a timely manner
- **Discuss Disagreements:** If you disagree, explain your reasoning politely

---

## Additional Resources

### Documentation
- **[README.md](./README.md)** - User guide and feature overview
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Codebase architecture and data flow
- **[CHANGELOG.md](./CHANGELOG.md)** - Version history and release notes
- **[PRD.md](./PRD.md)** - Product requirements and roadmap
- **[SUPPORT.md](./SUPPORT.md)** - Bug reports and feature requests

### External Resources
- **[Chrome Extension Development](https://developer.chrome.com/docs/extensions/)** - Official Chrome extension docs
- **[Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)** - Manifest V3 overview
- **[chrome.storage API](https://developer.chrome.com/docs/extensions/reference/storage/)** - Storage API reference
- **[chrome.bookmarks API](https://developer.chrome.com/docs/extensions/reference/bookmarks/)** - Bookmarks API reference

### Getting Help
- **GitHub Issues:** [Report bugs or request features](https://github.com/AllInStride/novatab-extension/issues)
- **Discussions:** Open an issue for questions or discussions
- **Code Review:** Tag maintainers in your PR for review

---

## Thank You!

Thank you for contributing to NovaTab! Your contributions help make this extension better for everyone. We appreciate your time and effort.

If you have any questions or need help, feel free to open an issue or reach out to the maintainers.

Happy coding!
