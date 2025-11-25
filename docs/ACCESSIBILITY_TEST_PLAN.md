# Accessibility Testing Plan for Code Review Fixes

## Overview
This document outlines the test cases to verify the accessibility fixes implemented in response to the code review.

## Test Environment
- Browser: Chrome (latest version)
- Extension: NovaTab loaded in developer mode
- Testing Tools: Keyboard navigation, Chrome DevTools

## Test Cases

### 1. Tab Trap - Close Button Inclusion

**Issue Fixed**: Close button (span with tabindex="0") was not included in tab trap selector.

**Test Steps**:
1. Open NovaTab new tab page
2. Right-click on any site card and select "Set Custom Icon"
3. Modal should open with input focused
4. Press Tab key repeatedly

**Expected Results**:
- Tab order should be: Input → Save Button → Cancel Button → Close Button (×) → back to Input
- The close button (×) in the top-right should be reachable via Tab
- Shift+Tab should work in reverse order
- Focus should never escape the modal while it's open

**Pass Criteria**: ✅ Close button is included in tab navigation cycle

---

### 2. Focus Restoration - ESC Key

**Issue Fixed**: Focus was not restored when modal closed with ESC key.

**Test Steps**:
1. Open NovaTab new tab page
2. Click on a site card to focus it (or Tab to focus one)
3. Right-click on the focused site card
4. Click "Set Custom Icon" from context menu
5. Modal opens
6. Press ESC key

**Expected Results**:
- Modal closes
- Focus returns to the site card that was focused before opening modal
- Visible focus indicator should be on the site card

**Pass Criteria**: ✅ Focus restored to previously focused element

---

### 3. Focus Restoration - Close Button

**Issue Fixed**: Focus was not restored when clicking close button.

**Test Steps**:
1. Open NovaTab new tab page
2. Click on a site card to focus it
3. Right-click on the site card
4. Click "Set Custom Icon"
5. Click the close button (×) in top-right

**Expected Results**:
- Modal closes
- Focus returns to the site card that was focused before
- Visible focus indicator appears on the site card

**Pass Criteria**: ✅ Focus restored when using close button

---

### 4. Focus Restoration - Cancel Button

**Issue Fixed**: Focus was not restored when clicking cancel button.

**Test Steps**:
1. Open NovaTab new tab page
2. Tab to focus a site card
3. Right-click on the site card
4. Click "Set Custom Icon"
5. Click the "Cancel" button

**Expected Results**:
- Modal closes
- Focus returns to the site card
- Visible focus indicator appears

**Pass Criteria**: ✅ Focus restored when using cancel button

---

### 5. Focus Restoration - Click Outside

**Issue Fixed**: Focus was not restored when clicking outside modal.

**Test Steps**:
1. Open NovaTab new tab page
2. Focus a site card
3. Right-click and select "Set Custom Icon"
4. Click on the dark overlay outside the modal

**Expected Results**:
- Modal closes
- Focus returns to the site card
- Visible focus indicator appears

**Pass Criteria**: ✅ Focus restored when clicking outside

---

### 6. Options Page - No Redundant ARIA Labels

**Issue Fixed**: Inputs had both `<label for="...">` and `aria-label`, causing double announcements.

**Test Steps**:
1. Open NovaTab settings page (chrome-extension://[id]/options.html)
2. Enable screen reader (ChromeVox, NVDA, or JAWS)
3. Navigate through form fields using Tab

**Expected Results**:
- Each input announces its label only once
- No duplicate announcements
- Labels are clear and descriptive

**Fields to Test**:
- ✅ Content Source radio buttons
- ✅ Bookmark folder selector
- ✅ Max Categories Per Row
- ✅ Max Site Cards Per Row
- ✅ Site Card Minimum Width
- ✅ Favicon Area Size
- ✅ Category Title Font Size
- ✅ Site Name Font Size
- ✅ Start Color picker
- ✅ End Color picker
- ✅ Import file input

**Pass Criteria**: ✅ No double announcements, single clear label per input

---

## Code Changes Summary

### new_tab.js
1. **Tab trap selector** (line 417): Updated from `'button, input, [tabindex]:not([tabindex="-1"])'` to `'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'`
   - Now includes disabled elements properly
   - Includes span elements with tabindex="0"

2. **Focus restoration** (lines 310-333, 364-446):
   - Added `previouslyFocusedElement` variable in both `setupEventListeners()` and `setupKeyboardAccessibility()`
   - Added MutationObserver to track focused element when modal opens
   - Added `closeModalAndRestoreFocus()` helper function
   - Restore focus in ESC handler (line 374-376)
   - Restore focus in close button handler (line 395-397)
   - All modal close handlers now restore focus

### options.html
- Removed `aria-label` attributes from 11 input elements (lines 28, 31, 50, 69, 73, 77, 81, 88, 92, 100, 104, 119)
- Kept proper `<label for="...">` elements
- Screen reader users now get single, clear announcements

---

## Regression Testing

After running the above tests, verify no regressions:

1. **Modal still opens correctly** via context menu
2. **Save functionality works** - custom icons can still be set
3. **Context menu functions** properly
4. **Keyboard shortcuts** (Enter, Space on buttons) still work
5. **Settings page** form submission works correctly

---

## Browser Testing Matrix

| Browser | Tab Trap | ESC Focus | Click Focus | ARIA Labels |
|---------|----------|-----------|-------------|-------------|
| Chrome  | ⬜ | ⬜ | ⬜ | ⬜ |
| Edge    | ⬜ | ⬜ | ⬜ | ⬜ |
| Brave   | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Sign-off

- [ ] All test cases pass
- [ ] No regressions found
- [ ] Screen reader testing completed
- [ ] Ready for production

**Tested by**: _________________
**Date**: _________________
**Notes**: _________________
