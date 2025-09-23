# 📸 Automated Screenshot Preview Setup

This project includes automated screenshot functionality using Puppeteer to capture the current state of your application.

## 🚀 Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

This will install Puppeteer (v23.0.0) along with all other project dependencies.

### 2. Start Development Server
```bash
npm run dev
```

Make sure your development server is running at `http://localhost:3000` before taking screenshots.

### 3. Capture Screenshot
```bash
npm run preview
```

This will:
- Check if your dev server is running
- Launch Puppeteer in headless mode
- Navigate to `http://localhost:3000`
- Wait for all content to load
- Take a full-page screenshot
- Save it as `current-view.png` in the project root

## 📁 Output

- **File**: `current-view.png`
- **Resolution**: 1440x900 viewport with 2x scale factor (high-DPI)
- **Type**: Full-page PNG screenshot

## ⚠️ Troubleshooting

### "Development server not detected"
Make sure you're running `npm run dev` in another terminal before running `npm run preview`.

### Puppeteer Installation Issues
If you encounter issues installing Puppeteer:

```bash
# Try clearing cache and reinstalling
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Permission Issues (macOS/Linux)
If you get permission errors:

```bash
sudo npm install puppeteer --unsafe-perm=true --allow-root
```

## 🔧 Customization

Edit `preview.js` to modify:
- Viewport size (currently 1440x900)
- Screenshot filename (currently 'current-view.png')
- Wait times or conditions
- URL target (currently http://localhost:3000)

## 📝 Usage Examples

```bash
# Standard workflow
npm run dev        # Start development server
npm run preview    # Take screenshot in another terminal

# Or run them in sequence (after dev server is already running)
npm run preview && open current-view.png  # macOS
npm run preview && xdg-open current-view.png  # Linux
```

The screenshot will show the current state of your water quality calculator application, useful for design reviews and documentation.