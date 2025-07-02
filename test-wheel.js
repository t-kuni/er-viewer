const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('http://localhost:30033');
  
  // Wait for canvas to load
  await page.waitForSelector('#er-canvas');
  
  // Simulate wheel event to zoom out
  await page.mouse.wheel(0, 100);
  await page.waitForTimeout(500);
  
  // Take screenshot
  await page.screenshot({ path: 'after-zoom-out.png' });
  
  await browser.close();
  console.log('Zoom out test completed');
})();
EOF < /dev/null
