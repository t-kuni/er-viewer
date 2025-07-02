const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:30033');
  await page.waitForSelector('svg');
  
  // サイドバーを開く
  await page.evaluate(() => {
    document.getElementById('sidebar').classList.add('open');
  });
  
  // エンティティをクリックしてみる
  try {
    await page.click('text=activities', { timeout: 3000 });
    console.log('Click successful');
  } catch (error) {
    console.log('Click failed:', error.message);
  }
  
  await browser.close();
})();
EOF < /dev/null
