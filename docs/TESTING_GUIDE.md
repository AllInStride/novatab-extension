# NovaTab Extension - Testing Guide

**Purpose:** Test all critical and high priority fixes before Chrome Web Store submission
**Estimated Time:** 30-45 minutes
**Prerequisites:** Chrome browser, the extension files

---

## Quick Start (5 minutes)

### Step 1: Load the Extension

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable **"Developer mode"** (toggle in top-right corner)
4. Click **"Load unpacked"**
5. Select the folder: `/Users/gabrielguenette/projects/novatab-extension`
6. Extension should load with no errors

**✅ Pass Criteria:**
- Extension appears in the list
- No error messages appear
- Icon shows in toolbar (if you have icon files)

---

### Step 2: Open Chrome DevTools Console

**IMPORTANT:** Keep DevTools open during ALL testing to catch errors

1. Open a new tab (should show NovaTab)
2. Press **F12** (or right-click → Inspect)
3. Go to **Console** tab
4. Look for any red errors

**✅ Pass Criteria:**
- No red errors in console
- May see blue info messages (OK)
- May see yellow warnings (OK for now)

---

### Step 3: Quick Smoke Test

1. **New Tab Page:**
   - Open new tab
   - Should see NovaTab page (or welcome message if no data)
   - Fonts should load (check if text looks clean)

2. **Options Page:**
   - Right-click extension icon → Options
   - OR go to `chrome://extensions/` → NovaTab → Details → Extension options
   - Should open options page
   - Check footer: version shows **1.1.1**

**✅ Pass Criteria:**
- New tab page loads without errors
- Options page loads without errors
- Fonts look correct (not blocky/default)
- Version shows 1.1.1 in footer

---

## Detailed Testing (30-40 minutes)

### Test 1: Custom Icon Functionality (CRITICAL FIX)
**Tests:** Fixed generateActiveDisplayData call

**Steps:**
1. Go to Options → Content Management → Manual Management
2. Add a category (e.g., "Test")
3. Add a site (e.g., "Google" - https://google.com)
4. Click "Save All Settings"
5. Open new tab
6. Right-click the Google site card
7. Click "Set Custom Icon"
8. Modal should open
9. Try entering: `https://www.google.com/favicon.ico`
10. Click "Save Icon"
11. Should show success message (no error)
12. Page should refresh and show custom icon

**✅ Pass Criteria:**
- Modal opens without error
- Can enter URL
- Save completes without console error
- Icon updates on page

**❌ If Fails:**
- Check console for error mentioning "generateActiveDisplayData"
- This was Critical Fix #1 - if it fails, the fix didn't work

---

### Test 2: Local Fonts Loading (CRITICAL FIX)
**Tests:** CSP font loading fix

**Steps:**
1. Open DevTools (F12)
2. Go to **Network** tab
3. Refresh new tab page (Ctrl+R / Cmd+R)
4. Filter by "font" in Network tab
5. Should see 4 font files loading:
   - Inter-Regular.woff2
   - Inter-Medium.woff2
   - Inter-SemiBold.woff2
   - Inter-Bold.woff2
6. All should have Status: **200** (OK)
7. Check for URL: should start with `chrome-extension://` NOT `fonts.googleapis.com`

**Alternative Check (Console):**
8. Go to Console tab
9. Look for any CSP errors (Content Security Policy)
10. Should be NO errors mentioning "fonts.googleapis.com" or "fonts.gstatic.com"

**✅ Pass Criteria:**
- 4 font files load successfully from local extension
- No external font requests to Google
- No CSP errors in console
- Text renders cleanly (not blocky)

---

### Test 3: Footer Links (CRITICAL FIX)
**Tests:** Placeholder URL updates

**Steps:**
1. Go to Options page
2. Scroll to bottom footer
3. Check version: should show **1.1.1**
4. Click **"Privacy Policy"** link → should open GitHub page (PRIVACY.md)
5. Go back to options
6. Click **"Report an Issue"** link → should open GitHub Issues page
7. "Rate on Chrome Web Store" can stay as # (not published yet)

**✅ Pass Criteria:**
- Version shows 1.1.1 (not 1.1.0)
- Privacy Policy opens correct GitHub page
- Report Issue opens correct GitHub page

---

### Test 4: XSS Protection (HIGH PRIORITY FIX)
**Tests:** URL validation for security

**Steps:**
1. Open new tab
2. Right-click any site card
3. Click "Set Custom Icon"
4. Try entering dangerous URLs:
   - `javascript:alert('xss')` → Should be **REJECTED**
   - `data:text/html,<script>alert(1)</script>` → Should be **REJECTED**
   - `vbscript:alert(1)` → Should be **REJECTED**
5. Try valid URLs:
   - `https://example.com/icon.png` → Should be **ACCEPTED**
   - `data:image/png;base64,iVBOR...` → Should be **ACCEPTED**

**✅ Pass Criteria:**
- Dangerous protocols rejected with error message
- Valid http/https URLs accepted
- Valid data:image URLs accepted
- Alert box with error message appears for invalid URLs

---

### Test 5: Bookmark Debouncing (HIGH PRIORITY FIX)
**Tests:** Race condition prevention

**Steps:**
1. Go to Options → Content Management → **Use Bookmark Folder**
2. Select a bookmark folder with subfolders
3. Click "Save All Settings"
4. Open Chrome bookmarks (Ctrl+Shift+O / Cmd+Shift+O)
5. Rapidly create 5 bookmarks in the selected folder:
   - Create bookmark → Immediately create another → etc.
6. Watch console in new tab page (keep it open)
7. Should see only ONE message: "NovaTab: Bookmarks changed, generating new activeDisplayData..."
8. Wait 1 second
9. New tab should update with all 5 bookmarks

**✅ Pass Criteria:**
- Only one activeDisplayData generation despite multiple rapid changes
- All bookmarks eventually appear
- No race condition errors in console

**Note:** If you don't use bookmark mode, you can skip this test.

---

### Test 6: Storage Quota Warning (HIGH PRIORITY FIX)
**Tests:** Storage quota checking

**Steps:**
1. Go to Options page
2. Open console (F12)
3. Check for any warning messages about storage
4. If storage is below 90%, you likely won't see anything (GOOD)

**To test warning artificially:**
5. In console, run:
```javascript
StorageManager.checkUsage().then(usage => console.log('Storage:', usage.percentUsed + '%'))
```
6. Should show current storage percentage

**✅ Pass Criteria:**
- No errors when checking storage
- If over 90%, warning appears in status message
- Function runs without errors

---

### Test 7: Memory Leak Check (HIGH PRIORITY FIX)
**Tests:** Event delegation fixes

**Steps:**
1. Open new tab with DevTools
2. Go to **Memory** tab in DevTools
3. Click "Take snapshot" (camera icon)
4. Note the memory usage (e.g., "12.4 MB")
5. Reload the new tab page **10 times** (Ctrl+R / Cmd+R repeatedly)
6. Take another memory snapshot
7. Memory should be approximately the same (maybe +1-2 MB max)

**✅ Pass Criteria:**
- Memory doesn't grow significantly with repeated reloads
- No "Detached DOM nodes" warnings
- Page renders consistently on each reload

**❌ Red Flag:**
- Memory grows by 10+ MB after 10 reloads
- This indicates memory leaks not fixed

---

### Test 8: Category Ordering Performance (HIGH PRIORITY FIX)
**Tests:** Algorithm optimization

**Steps:**
1. Go to Options → Manual Management
2. Add at least 20 categories with 5 sites each
3. Click "Save All Settings"
4. Open new tab with DevTools console
5. In console, type:
```javascript
console.time('render'); location.reload(); console.timeEnd('render');
```
6. Should render in < 1 second even with many categories

**✅ Pass Criteria:**
- Page renders quickly with many categories
- No noticeable lag
- Console shows fast render time

**Note:** With the O(n) optimization, even 100+ categories should be fast.

---

### Test 9: Deep Clone Verification (HIGH PRIORITY FIX)
**Tests:** Improved cloning

**Steps:**
1. Open console on any page
2. Run this test:
```javascript
// Test deep clone
const original = {
    nested: { value: 1 },
    date: new Date(),
    array: [1, 2, { inner: 'value' }]
};
const cloned = GeneralUtils.deepClone(original);
cloned.nested.value = 999;
cloned.array[2].inner = 'changed';

console.log('Original nested:', original.nested.value); // Should still be 1
console.log('Cloned nested:', cloned.nested.value); // Should be 999
console.log('Original array inner:', original.array[2].inner); // Should still be 'value'
console.log('Are they different objects?', original !== cloned); // Should be true
```

**✅ Pass Criteria:**
- Original.nested.value still equals 1 (not changed)
- Original.array[2].inner still equals 'value' (not changed)
- Cloned values are 999 and 'changed'
- Objects are different (not same reference)

---

### Test 10: Icon Cleanup (HIGH PRIORITY FIX)
**Tests:** Orphaned icon cleanup

**Steps:**
1. Use bookmark mode
2. Set a custom icon for a bookmark
3. Go to Chrome bookmarks and **delete that bookmark**
4. In console, run:
```javascript
cleanupOrphanedIconOverrides().then(count => console.log('Cleaned:', count))
```
5. Should show "Cleaned: 1" (or more if multiple orphaned)
6. Run again immediately:
```javascript
cleanupOrphanedIconOverrides().then(count => console.log('Cleaned:', count))
```
7. Should show "Cleaned: 0" (nothing left to clean)

**✅ Pass Criteria:**
- Orphaned icons are detected and removed
- Running twice shows 0 on second run
- No errors in console

---

## General Checks (10 minutes)

### Console Errors Check
1. With DevTools open, navigate through the extension:
   - Open new tab
   - Open options page
   - Switch between tabs (Content Management, Appearance, Data)
   - Add/remove categories and sites
   - Save settings
   - Export/import settings

2. **Look for RED errors in console**
   - ❌ Any error with "generateActiveDisplayData" → Critical fix failed
   - ❌ Any error with "CSP" or "font" → Font fix failed
   - ❌ Any error with "storage" → Storage fix may have issues
   - ⚠️ Yellow warnings are OK for now
   - ℹ️ Blue info messages are OK

**✅ Pass Criteria:**
- No red errors during normal usage
- All features work smoothly

---

### Visual Regression Check
1. Compare new tab page to before fixes
2. Fonts should look the same (Inter font family)
3. Layout should be identical
4. No visual glitches or broken UI

**✅ Pass Criteria:**
- UI looks professional
- No visual regressions
- Fonts render cleanly

---

### Performance Check
1. Open new tab
2. Should load quickly (< 1 second)
3. Switching between categories should be instant
4. No lag when scrolling
5. Opening modals should be smooth

**✅ Pass Criteria:**
- Fast load times
- Smooth interactions
- No performance degradation

---

## Accessibility Check (Optional, 5 minutes)

### Lighthouse Audit
1. Open new tab page
2. Open DevTools (F12)
3. Go to **Lighthouse** tab
4. Select:
   - ☑ Performance
   - ☑ Accessibility
   - ☑ Best Practices
5. Click "Analyze page load"
6. Wait for report

**✅ Pass Criteria:**
- Accessibility score: 80+ (green)
- Performance score: 80+ (green)
- Best Practices score: 90+ (green)
- No major accessibility violations

---

## Test Summary Checklist

After completing all tests, verify:

**Critical Fixes:**
- [ ] ✅ Custom icons work (Test 1)
- [ ] ✅ Local fonts load (Test 2)
- [ ] ✅ Footer links work (Test 3)

**High Priority Fixes:**
- [ ] ✅ XSS protection blocks dangerous URLs (Test 4)
- [ ] ✅ Bookmark debouncing works (Test 5)
- [ ] ✅ Storage quota checking works (Test 6)
- [ ] ✅ No memory leaks (Test 7)
- [ ] ✅ Fast category rendering (Test 8)
- [ ] ✅ Deep clone works correctly (Test 9)
- [ ] ✅ Icon cleanup removes orphans (Test 10)

**General Quality:**
- [ ] ✅ No console errors during usage
- [ ] ✅ UI looks professional
- [ ] ✅ Performance is good
- [ ] ✅ (Optional) Accessibility score 80+

---

## If Tests Fail

### Critical Test Failures:
If Tests 1-3 fail, **DO NOT submit to Chrome Web Store**. Report the specific error.

### High Priority Test Failures:
If Tests 4-10 fail, investigate but may be able to submit depending on severity.

### How to Report Issues:
1. Note which test failed
2. Copy the console error (if any)
3. Describe what happened vs. what should happen
4. Take a screenshot if visual issue

---

## After All Tests Pass

You're ready for Chrome Web Store submission! Next steps:

1. **Commit changes:**
   ```bash
   git add .
   git commit -m "fix: Critical and high priority fixes for v1.1.1"
   ```

2. **Create release tag:**
   ```bash
   git tag -a v1.1.1 -m "Version 1.1.1 - Critical fixes"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin main
   git push origin v1.1.1
   ```

4. **Prepare Chrome Web Store submission:**
   - Create ZIP of extension folder (exclude .git, .claude, docs)
   - Upload to Chrome Web Store Developer Dashboard
   - Fill in store listing details
   - Submit for review

---

## Quick Reference - Common Issues

**"Extension failed to load"**
→ Check console for syntax errors
→ Run: `node -c *.js` to check all files

**"Fonts not loading"**
→ Check Network tab for font files
→ Verify fonts/ folder exists with .woff2 files

**"Custom icons not saving"**
→ Check console for generateActiveDisplayData error
→ Verify utils.js is loaded before new_tab.js

**"Memory keeps growing"**
→ Event delegation may not be working
→ Check if listeners are properly removed

**"CSP errors"**
→ Check manifest.json content_security_policy
→ Should NOT reference Google Fonts URLs

---

**Testing Guide Version:** 1.0
**Last Updated:** 2025-11-23
**For Extension Version:** 1.1.1
