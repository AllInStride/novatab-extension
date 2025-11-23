# Product Requirements Document (PRD)
## NovaTab – Next Gen Dashboard Chrome Extension

---

## 1. Product Overview

**NovaTab** is a Chrome extension that transforms the default new tab page into a beautiful, customizable productivity dashboard. Users can organize their favorite sites and bookmarks into categories, personalize the appearance, and enjoy a privacy-first experience.

---

## 2. Purpose & Goals

- Replace the default Chrome new tab with a modern, user-friendly dashboard.
- Help users organize and quickly access their most-used sites and bookmarks.
- Provide extensive customization while maintaining a clean, minimalist design.
- Ensure user privacy by storing all data locally and not collecting personal information.

---

## 3. Target Users

- Productivity-focused Chrome users
- Users who want a more organized and visually appealing new tab
- Privacy-conscious individuals
- Users who rely on bookmarks and want better access/organization

---

## 4. Key Features

- **Customizable Categories & Sites:**  
  Users can add, edit, and reorder categories and site cards.
- **Bookmark Integration:**  
  Users can use Chrome bookmark folders as dashboard categories.
- **Modern UI:**  
  Gradient backgrounds, glassmorphism effects, and responsive design.
- **Personalization:**  
  Adjustable layout, card sizes, typography, and background colors.
- **Dark Mode Support:**  
  Follows system preferences for light/dark themes.
- **Import/Export Settings:**  
  Users can back up and restore their configuration.
- **No Analytics or Tracking:**  
  All data is stored locally; no personal data is collected or transmitted.
- **Support & Feedback:**  
  Users can report bugs or request features via GitHub Issues.

---

## 5. User Stories

- As a user, I want to add and organize my favorite sites into categories so I can access them quickly.
- As a user, I want to use my existing Chrome bookmark folders as categories on my dashboard.
- As a user, I want to customize the look and feel of my new tab page.
- As a user, I want my settings and data to remain private and stored only on my device.
- As a user, I want to easily back up and restore my dashboard configuration.
- As a user, I want to report bugs or request features easily.

---

## 6. Non-Functional Requirements

- **Performance:**  
  The extension should load instantly and not slow down the browser.
- **Accessibility:**  
  The UI should be keyboard navigable and readable for all users.
- **Privacy:**  
  No user data is collected, transmitted, or sold. All data is stored locally.
- **Compatibility:**  
  Works on Chrome v88+ and supports Windows, macOS, and Linux.

---

## 7. Success Metrics

- Extension is approved and published on the Chrome Web Store.
- Users can successfully customize and use the dashboard without errors.
- No user data is leaked or transmitted externally.
- Positive user feedback and ratings (4+ stars).
- Low support request volume for critical bugs.

---

## 8. Out of Scope

- Syncing settings across devices (unless Chrome sync is used)
- Integration with third-party services beyond bookmarks and favicons
- Mobile browser support

---

## 9. Milestones

- [x] Initial feature development
- [x] UI/UX improvements and accessibility
- [x] Privacy policy and compliance
- [x] Store listing assets and documentation
- [x] Chrome Web Store submission
- [x] **v1.1.1 - Code Refactoring and Technical Debt Reduction**
  - Consolidated utilities into centralized utils.js module
  - Implemented NOVATAB_CONSTANTS for application-wide constants (DEFAULT_SETTINGS, DEFAULT_APP_DATA, VERSION)
  - Centralized URL utilities (isValidUrl, normalizeUrl, getEffectiveHostname, getFaviconUrl)
  - Created DataSyncUtils.generateActiveDisplayData for consistent data flow between background, options, and new tab pages
  - Improved state management with automatic activeDisplayData regeneration on bookmark changes
  - Refactored options page to explicit save model with "Save All Settings" button, unsaved changes indicator, and beforeunload prompt
  - Enhanced code maintainability and reduced duplication across background.js, new_tab.js, and options.js
- [ ] Post-launch support and updates

---

## 10. Support

- [GitHub Issues for bug reports and feature requests](https://github.com/AllInStride/novatab-extension/issues)
- [SUPPORT.md](./SUPPORT.md) for user instructions

---

## 11. References

- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program_policies/)
- [NovaTab GitHub Repository](https://github.com/AllInStride/novatab-extension)
- [Privacy Policy](https://github.com/AllInStride/novatab-extension/blob/main/PRIVACY.md)

---

## 12. User Experience

NovaTab uses a carefully selected color palette to ensure clarity, accessibility, and a modern look. Each color is assigned a semantic role, with darker variants for active/pressed states and clear guidance for text usage.

| **Role**         | **Color**  | **Dark Variant** |
|------------------|------------|------------------|
| Primary          | #219ebc    | #1b7fa6          |
| Secondary        | #8ecae6    | #719fb0          |
| Accent           | #ffb703    | #cc9603          |
| Success          | #5ac4e0    | #468bb8          |
| Info             | #b4e0f0    | #8eb1c0          |
| Warning          | #ffd966    | #ccb24f          |
| Danger           | #fb8500    | #c96b00          |
| Link             | #405367    | #324352          |
| Text Primary     | #023047    | #021f38          |
| Text Secondary   | #ffb73f    | #cc8f2f          |

### Font / Text Roles

- **Body/Heading Text:** Use `#023047` for maximum contrast and readability.
- **Secondary Text/Captions/Disabled:** Use `#405367` for secondary copy.

### Why this setup works

- **Clear hierarchy:** Primary, secondary, and accent colors are visually distinct.
- **Semantic meaning:** Success, info, warning, and danger colors map to familiar UI conventions.
- **State feedback:** Darker variants are ready for button "hover" or "pressed" states.
- **Text contrast:** Navy (`#023047`) ensures readability; slate (`#405367`) works well for secondary text.

*This palette ensures NovaTab is visually appealing, accessible, and easy to use across all supported platforms.*

--- 