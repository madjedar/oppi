const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[CONSOLE] ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.log(`[PAGE ERROR] ${err.toString()}`);
  });

  console.log('Navigating to https://oppi.netlify.app ...');
  await page.goto('https://oppi.netlify.app', { waitUntil: 'networkidle0' });
  
  await new Promise(r => setTimeout(r, 2000));
  
  const html = await page.content();
  console.log('HTML contains ErrorBoundary:', html.includes('عذراً، حدث خطأ غير متوقع'));
  
  await browser.close();
})();
