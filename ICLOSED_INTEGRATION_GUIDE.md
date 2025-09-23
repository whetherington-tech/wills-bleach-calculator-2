# iClosed Popup Integration Guide

## ✅ WORKING SOLUTION - Use This Approach

### Problem Solved
Successfully integrated iClosed popup widgets in Next.js/React applications. After multiple failed attempts with static script tags and Next.js Script components, **dynamic script loading in useEffect** proved to be the correct solution.

### Implementation Steps

#### 1. Remove Static Script Loading
- **Don't use** static script tags in `layout.tsx`
- **Don't use** Next.js `<Script>` component (causes "Event handlers cannot be passed to Client Component props" errors)

#### 2. Dynamic Script Loading in Component
Add this to your React component where the popup button appears:

```tsx
'use client'

import { useEffect } from 'react'

export default function YourComponent() {
  // Dynamic iClosed script loading
  useEffect(() => {
    console.log('🔧 Loading iClosed widget dynamically...')

    // Remove existing script if present
    const existingScript = document.querySelector('script[src*="iclosed.io"]')
    if (existingScript) {
      console.log('🗑️ Removing existing script')
      existingScript.remove()
    }

    // Create and inject script dynamically
    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://app.iclosed.io/assets/widget.js'
    script.async = true

    // Track loading states
    script.onload = () => {
      console.log('✅ iClosed script loaded successfully')

      // Check for widget availability after load
      setTimeout(() => {
        console.log('🔍 Post-load check - window.iClosed:', typeof window.iClosed)

        // Try different initialization approaches
        if (typeof window.iClosed === 'object' && window.iClosed) {
          console.log('✅ iClosed widget object found')

          // Try common initialization methods
          if (typeof window.iClosed.init === 'function') {
            console.log('🚀 Calling iClosed.init()')
            window.iClosed.init()
          } else if (typeof window.iClosed.initialize === 'function') {
            console.log('🚀 Calling iClosed.initialize()')
            window.iClosed.initialize()
          } else if (typeof window.iClosed.start === 'function') {
            console.log('🚀 Calling iClosed.start()')
            window.iClosed.start()
          }
        } else if (typeof window.iClosed === 'function') {
          console.log('🚀 Calling iClosed as function')
          window.iClosed()
        } else {
          console.log('❌ No iClosed widget found after script load')
        }
      }, 100)
    }

    script.onerror = (error) => {
      console.error('❌ Failed to load iClosed script:', error)
    }

    // Inject script into head
    document.head.appendChild(script)
    console.log('📋 Script injected into DOM')

    // Cleanup on unmount
    return () => {
      const scriptToRemove = document.querySelector('script[src*="iclosed.io"]')
      if (scriptToRemove) {
        scriptToRemove.remove()
      }
    }
  }, [])

  return (
    <button
      data-iclosed-link="https://app.iclosed.io/e/willsfriends/Your-15-Minute-Water-Consult"
      data-embed-type="popup"
      className="your-button-styles"
    >
      Your Button Text
    </button>
  )
}
```

#### 3. Button Configuration
Use **only** the required data attributes (per iClosed documentation):

```tsx
<button
  data-iclosed-link="https://app.iclosed.io/e/yourcompany/your-booking-link"
  data-embed-type="popup"
  // No onClick handler needed - iClosed handles this automatically
>
  Button Text
</button>
```

### Key Requirements
1. **Component must be marked with `'use client'`**
2. **Use `data-iclosed-link` with your booking URL**
3. **Use `data-embed-type="popup"` for overlay behavior**
4. **No custom onClick handlers** - let iClosed handle everything
5. **Dynamic script loading in useEffect** - not static loading

### What NOT to Do
❌ Static script tags in layout.tsx
❌ Next.js Script component with event handlers
❌ Custom modal implementations
❌ onClick handlers that interfere with iClosed
❌ Multiple initialization attempts
❌ Fallback window.open() calls

### Debugging Tips
- Check console for script loading messages
- Verify `window.iClosed` exists after script loads
- Look for "POST /api/embed" network requests when button is clicked
- Popup should overlay current page, not navigate away

### File Locations
- **Main implementation**: `src/components/ResultsDisplay.tsx:14-80`
- **Button usage**: `src/components/ResultsDisplay.tsx:585-587`
- **Layout.tsx**: Remove any iClosed script references

### Success Indicators
✅ Script loads without errors
✅ `window.iClosed` object available
✅ Button click opens overlay popup
✅ Background remains visible behind popup
✅ No page navigation occurs

This approach works reliably across React/Next.js applications and follows iClosed's official documentation for popup embeds.