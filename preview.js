const puppeteer = require('puppeteer');
const path = require('path');

async function captureScreenshot() {
  console.log('🚀 Starting Puppeteer screenshot capture...');

  let browser;
  try {
    // Launch browser with optimized settings
    browser = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps'
      ]
    });

    const page = await browser.newPage();

    // Set viewport for consistent screenshots
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 2 // For high-DPI screenshots
    });

    console.log('📱 Setting viewport to 1440x900 with 2x scale...');

    // Navigate to the local development server
    const url = 'http://localhost:3000';
    console.log(`🌐 Navigating to ${url}...`);

    await page.goto(url, {
      waitUntil: 'networkidle0', // Wait until no network requests for 500ms
      timeout: 30000
    });

    // Wait for any animations or dynamic content to load
    console.log('⏳ Waiting for page content to fully load...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take screenshot
    const screenshotPath = path.join(__dirname, 'current-view.png');
    console.log(`📸 Capturing screenshot to ${screenshotPath}...`);

    await page.screenshot({
      path: screenshotPath,
      fullPage: true,
      type: 'png'
    });

    console.log('✅ Screenshot saved successfully as current-view.png');

  } catch (error) {
    console.error('❌ Error capturing screenshot:', error.message);

    if (error.message.includes('ERR_CONNECTION_REFUSED')) {
      console.log('💡 Make sure your development server is running with: npm run dev');
    }

    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if development server is likely running
async function checkDevServer() {
  try {
    const response = await fetch('http://localhost:3000');
    return response.ok;
  } catch {
    return false;
  }
}

async function main() {
  console.log('🔍 Checking if development server is running...');

  const isServerRunning = await checkDevServer();
  if (!isServerRunning) {
    console.log('⚠️  Development server not detected at http://localhost:3000');
    console.log('📝 Please start the server first with: npm run dev');
    console.log('📝 Then run this command again: npm run preview');
    process.exit(1);
  }

  console.log('✅ Development server detected!');
  await captureScreenshot();
}

main();