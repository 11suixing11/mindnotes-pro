const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Dismiss the welcome guide
  const skipBtn = await page.locator('button:has-text("跳过")').first();
  if (await skipBtn.isVisible()) await skipBtn.click();
  await page.waitForTimeout(500);

  // Get canvas info
  const canvasInfo = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas found' };
    const rect = canvas.getBoundingClientRect();
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      top: rect.top,
      left: rect.left,
      display: getComputedStyle(canvas).display,
      visibility: getComputedStyle(canvas).visibility,
      opacity: getComputedStyle(canvas).opacity,
      pointerEvents: getComputedStyle(canvas).pointerEvents,
      touchAction: getComputedStyle(canvas).touchAction,
      parentOverflow: getComputedStyle(canvas.parentElement).overflow,
      parentWidth: canvas.parentElement.getBoundingClientRect().width,
      parentHeight: canvas.parentElement.getBoundingClientRect().height,
      bgColor: canvas.style.backgroundColor,
    };
  });
  console.log('=== Canvas Info ===');
  console.log(JSON.stringify(canvasInfo, null, 2));

  // Simulate drawing and check pixels
  const drawResult = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dpr = window.devicePixelRatio || 1;

    // Get pixels BEFORE drawing
    const ctx = canvas.getContext('2d');
    const beforePixels = [];
    for (let i = 0; i < 5; i++) {
      const px = Math.floor(canvas.width / 2 + i * 30 * dpr);
      const py = Math.floor(canvas.height / 2);
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      beforePixels.push({ x: px, y: py, rgba: [pixel[0], pixel[1], pixel[2], pixel[3]] });
    }

    // Simulate mouse draw
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true }));
    for (let i = 1; i <= 20; i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx + i * 10, clientY: cy + i * 5, bubbles: true }));
      await new Promise(r => setTimeout(r, 16));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx + 200, clientY: cy + 100, bubbles: true }));

    await new Promise(r => setTimeout(r, 1000));

    // Get pixels AFTER drawing
    const afterPixels = [];
    for (let i = 0; i < 5; i++) {
      const px = Math.floor(canvas.width / 2 + i * 30 * dpr);
      const py = Math.floor(canvas.height / 2);
      const pixel = ctx.getImageData(px, py, 1, 1).data;
      afterPixels.push({ x: px, y: py, rgba: [pixel[0], pixel[1], pixel[2], pixel[3]] });
    }

    return { beforePixels, afterPixels };
  });
  console.log('\n=== Pixel Comparison (Before vs After Draw) ===');
  console.log('Before:', JSON.stringify(drawResult.beforePixels, null, 2));
  console.log('After:', JSON.stringify(drawResult.afterPixels, null, 2));

  // Check if pixels changed
  if (drawResult.beforePixels && drawResult.afterPixels) {
    let changed = false;
    for (let i = 0; i < drawResult.beforePixels.length; i++) {
      const b = drawResult.beforePixels[i].rgba;
      const a = drawResult.afterPixels[i].rgba;
      if (b[0] !== a[0] || b[1] !== a[1] || b[2] !== a[2] || b[3] !== a[3]) {
        changed = true;
        break;
      }
    }
    console.log('\nPixels changed after drawing:', changed);
  }

  // Take screenshot after drawing
  await page.screenshot({ path: 'after-draw.png', fullPage: true });
  console.log('\nScreenshot saved to after-draw.png');

  // Check the useCanvasRenderer internals
  const rendererCheck = await page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    if (!canvas) return { error: 'No canvas' };
    const ctx = canvas.getContext('2d');
    if (!ctx) return { error: 'No context' };

    // Check if canvas has any non-white pixels
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let nonBgPixels = 0;
    const bgColor = [255, 255, 255]; // white
    for (let i = 0; i < data.length; i += 4) {
      if (Math.abs(data[i] - bgColor[0]) > 10 || 
          Math.abs(data[i+1] - bgColor[1]) > 10 || 
          Math.abs(data[i+2] - bgColor[2]) > 10) {
        nonBgPixels++;
      }
    }
    return { 
      totalPixels: data.length / 4, 
      nonBgPixels,
      canvasW: canvas.width,
      canvasH: canvas.height,
      dpr: window.devicePixelRatio
    };
  });
  console.log('\n=== Canvas Content Check ===');
  console.log(JSON.stringify(rendererCheck, null, 2));

  await browser.close();
})();
