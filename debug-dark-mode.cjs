const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Dismiss welcome guide
  const skipBtn = await page.locator('button:has-text("跳过")').first();
  if (await skipBtn.isVisible()) await skipBtn.click();
  await page.waitForTimeout(500);

  // Test 1: Light mode drawing
  console.log('=== Test 1: Light Mode ===');
  const lightResult = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 3;

    // Draw a stroke
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true }));
    for (let i = 1; i <= 30; i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + i * 10, clientY: cy, bubbles: true }));
      await new Promise(r => setTimeout(r, 16));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + 300, clientY: cy, bubbles: true }));
    await new Promise(r => setTimeout(r, 500));

    // Sample along the stroke path
    const samples = [];
    for (let i = 0; i < 10; i++) {
      const px = Math.floor((cx + i * 30) * dpr);
      const py = Math.floor(cy * dpr);
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      samples.push({ x: px, y: py, r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] });
    }
    return { bgColor: canvas.style.backgroundColor, samples };
  });
  console.log('Background:', lightResult.bgColor);
  console.log('Samples along stroke:', JSON.stringify(lightResult.samples, null, 2));

  // Toggle to dark mode
  const themeBtn = await page.locator('button[aria-label*="深色"], button[aria-label*="浅色"]').first();
  if (await themeBtn.isVisible()) {
    await themeBtn.click();
    await page.waitForTimeout(500);
  }

  // Test 2: Dark mode drawing
  console.log('\n=== Test 2: Dark Mode ===');
  const darkResult = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height * 2 / 3;

    // Draw a stroke
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true }));
    for (let i = 1; i <= 30; i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + i * 10, clientY: cy, bubbles: true }));
      await new Promise(r => setTimeout(r, 16));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + 300, clientY: cy, bubbles: true }));
    await new Promise(r => setTimeout(r, 500));

    // Sample along the stroke path
    const samples = [];
    for (let i = 0; i < 10; i++) {
      const px = Math.floor((cx + i * 30) * dpr);
      const py = Math.floor(cy * dpr);
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      samples.push({ x: px, y: py, r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] });
    }
    
    // Get actual canvas background color by sampling an empty area
    const bgPixel = ctx.getImageData(10, 10, 1, 1).data;
    return { 
      bgColor: canvas.style.backgroundColor, 
      actualBg: [bgPixel[0], bgPixel[1], bgPixel[2], bgPixel[3]],
      samples,
      isDark: document.documentElement.classList.contains('dark')
    };
  });
  console.log('Is dark mode:', darkResult.isDark);
  console.log('CSS bgColor:', darkResult.bgColor);
  console.log('Actual bg pixel:', darkResult.actualBg);
  console.log('Samples along stroke:', JSON.stringify(darkResult.samples, null, 2));

  // Check contrast
  console.log('\n=== Contrast Analysis ===');
  const strokeColor = { r: 44, g: 36, b: 22 }; // #2c2416
  const darkBg = darkResult.actualBg;
  const contrast = Math.sqrt(
    Math.pow(strokeColor.r - darkBg[0], 2) + 
    Math.pow(strokeColor.g - darkBg[1], 2) + 
    Math.pow(strokeColor.b - darkBg[2], 2)
  );
  console.log('Stroke color (#2c2416):', strokeColor);
  console.log('Dark mode bg:', { r: darkBg[0], g: darkBg[1], b: darkBg[2] });
  console.log('Euclidean distance:', contrast.toFixed(1));
  console.log('WCAG contrast ratio would be very low if bg is dark');

  await page.screenshot({ path: 'dark-mode-test.png', fullPage: true });
  console.log('\nScreenshot saved to dark-mode-test.png');

  await browser.close();
})();
