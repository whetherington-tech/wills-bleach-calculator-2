# 🛡️ FAILSAFE: Working Calculator Version

## ⚠️ CRITICAL REVERT INSTRUCTIONS

If the calculator breaks or stops working in HubSpot iframes, use this **ONE COMMAND** to restore the working version:

```bash
git reset --hard WORKING-IFRAME-VERSION
git push --force-with-lease
```

## 📋 Working Version Details

**Git Tag:** `WORKING-IFRAME-VERSION`
**Commit:** `287a3eb`
**Date:** September 24, 2025
**Status:** ✅ **VERIFIED WORKING** in HubSpot iframe embedding

## 🎯 What This Version Achieves

- ✅ **Transparent body background** - No grey window background
- ✅ **Intact card styling** - Grey gradient card background preserved
- ✅ **Clean iframe embedding** - Works perfectly in HubSpot
- ✅ **Dynamic height detection** - PostMessage communication working
- ✅ **X-Frame-Options: ALLOWALL** - Iframe embedding enabled

## 🔧 Key Technical Details

### Critical CSS (globals.css line 87):
```css
body {
  background: transparent;  /* ← THIS IS CRITICAL */
  color: var(--foreground);
}
```

### Critical Component (WaterQualityCalculatorNew.tsx line 835):
```tsx
<div className="wf-gradient-card wf-card">  {/* ← KEEP BOTH CLASSES */}
```

### Container (WaterQualityCalculatorNew.tsx line 833):
```tsx
<div className="min-h-screen p-4 sm:p-6 lg:p-8">  {/* ← NO wf-gradient-bg class */}
```

## ⛔ DO NOT CHANGE

**NEVER modify these without creating a new failsafe:**
1. `body { background: transparent; }` in globals.css
2. `wf-gradient-card wf-card` classes in WaterQualityCalculatorNew.tsx
3. Container div should NOT have `wf-gradient-bg` class

## 🚨 Emergency Recovery

If you accidentally break the calculator:

1. **Immediate Recovery:**
   ```bash
   git reset --hard WORKING-IFRAME-VERSION
   git push --force-with-lease
   ```

2. **Verify Recovery:**
   - Check body background is `transparent` in globals.css
   - Check card has `wf-gradient-card wf-card` classes
   - Test in HubSpot iframe

3. **Create New Failsafe:**
   - If making changes, create a new tag first
   - Update this document with new tag name

## 📝 Change Log

- **WORKING-IFRAME-VERSION** (287a3eb) - Initial working iframe version with transparent body background

---

**⚠️ WARNING: This file exists to prevent losing the working version. Always create a new failsafe before making significant changes.**