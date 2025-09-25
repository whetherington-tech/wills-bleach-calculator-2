# Will's Calculator - HubSpot Custom Module

A simple HubSpot custom module that embeds Will's Bleach Calculator with dynamic height support and no clipping issues.

## Files Included

- `module.html` - Main template with iframe and postMessage handling
- `module.css` - CSS to prevent clipping and ensure proper height management
- `meta.json` - Module configuration and metadata
- `fields.json` - Optional fields for URL and height customization

## Installation in HubSpot

### Method 1: HubSpot Design Manager
1. Go to **Design Manager** in your HubSpot account
2. Navigate to **Modules** or create a new folder
3. Click **Upload** and select all 4 files at once
4. Name the module "Will's Calculator Module"

### Method 2: Developer Tools
1. Use HubSpot CLI or Developer Tools
2. Upload the module folder to your HubSpot account
3. The module will appear in your available modules

## Usage

### In Page Editor
1. Add a new module to your page
2. Search for "Will's Calculator Module"
3. Drag and drop onto your page
4. The calculator will automatically load and adjust its height

### Module Settings (Optional)
- **Calculator URL**: Change the URL if using a different calculator instance
- **Initial Height**: Adjust the starting height (will auto-resize anyway)

## Key Features

✅ **No Clipping**: Custom CSS prevents HubSpot wrapper clipping
✅ **Dynamic Height**: Automatically adjusts as user progresses through steps
✅ **Mobile Responsive**: Works on all screen sizes
✅ **Clean Integration**: Uses your existing working calculator
✅ **PostMessage Communication**: Maintains height sync between iframe and parent

## How It Works

1. **Simple Container**: Clean HTML structure without unnecessary wrappers
2. **Override CSS**: Forces `overflow: visible` on all containers
3. **PostMessage Listener**: Receives height updates from your calculator
4. **Dynamic Resizing**: Adjusts iframe and container heights in real-time

## Expected Console Output

When working correctly, you should see:
```
📐 Custom Module: Iframe initialized
📐 Custom Module: Iframe loaded, ready for height messages
📐 Height message sent: 1200 (from your calculator)
📐 Custom Module: Received height update: 1200 → 1200
📐 Custom Module: Height updated to 1200px
```

## Replacing Current Implementation

1. **Remove** the current Rich Text module with iframe
2. **Remove** the non-functional calculator module
3. **Add** this new custom module
4. **Test** the form progression to ensure no clipping

## Troubleshooting

- If height doesn't adjust: Check browser console for postMessage errors
- If module doesn't appear: Ensure all files are uploaded correctly
- If clipping persists: Check for additional CSS conflicts in template

## Support

This module maintains your existing calculator functionality while providing better container control within HubSpot's system.