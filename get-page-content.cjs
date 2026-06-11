const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Get page title
  const title = await page.title();
  console.log('Page Title:', title);
  
  // Get all visible text
  const text = await page.evaluate(() => document.body.innerText);
  console.log('\nPage Content:\n', text);
  
  // Get all buttons
  const buttons = await page.$$eval('button', btns => btns.map(b => ({
    text: b.innerText,
    id: b.id,
    className: b.className
  })));
  console.log('\nButtons:', JSON.stringify(buttons, null, 2));
  
  // Get all inputs
  const inputs = await page.$$eval('input', inputs => inputs.map(i => ({
    type: i.type,
    placeholder: i.placeholder,
    id: i.id,
    value: i.value
  })));
  console.log('\nInputs:', JSON.stringify(inputs, null, 2));
  
  // Check for any error messages
  const errors = await page.$$eval('.error, .alert, [class*="error"]', els => els.map(e => e.innerText));
  console.log('\nError Messages:', errors);
  
  // Get page dimensions
  const dimensions = await page.evaluate(() => ({
    width: document.body.scrollWidth,
    height: document.body.scrollHeight
  }));
  console.log('\nPage Dimensions:', dimensions);
  
  await browser.close();
})();
