const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  const skipBtn = await page.locator('button:has-text("跳过")').first();
  if (await skipBtn.isVisible()) await skipBtn.click();
  await page.waitForTimeout(500);

  // Test: Draw multiple strokes and check persistence
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext('2d');

    function hasStrokePixels(x, y, radius) {
      const strokeR = 44, strokeG = 36, strokeB = 22;
      let count = 0;
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          const px = Math.floor((x + dx) * dpr);
          const py = Math.floor((y + dy) * dpr);
          if (px < 0 || py < 0 || px >= canvas.width || py >= canvas.height) continue;
          const pixel = ctx.getImageData(px, py, 1, 1).data;
          if (Math.abs(pixel[0] - strokeR) < 30 && Math.abs(pixel[1] - strokeG) < 30 && Math.abs(pixel[2] - strokeB) < 30) {
            count++;
          }
        }
      }
      return count;
    }

    const results = [];

    // Test 1: Draw a horizontal stroke
    const cx1 = rect.left + 200;
    const cy1 = rect.top + 200;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx1, clientY: cy1, bubbles: true }));
    for (let i = 1; i <= 30; i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx1 + i * 10, clientY: cy1, bubbles: true }));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx1 + 300, clientY: cy1, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));
    
    const stroke1During = hasStrokePixels(cx1 + 150, cy1, 5);
    results.push({ test: 'Stroke 1 (horizontal)', strokePixels: stroke1During });

    // Test 2: Draw a vertical stroke
    const cx2 = rect.left + 500;
    const cy2 = rect.top + 100;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx2, clientY: cy2, bubbles: true }));
    for (let i = 1; i <= 30; i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx2, clientY: cy2 + i * 10, bubbles: true }));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx2, clientY: cy2 + 300, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));

    const stroke2During = hasStrokePixels(cx2, cy2 + 150, 5);
    results.push({ test: 'Stroke 2 (vertical)', strokePixels: stroke2During });

    // Test 3: Draw a diagonal stroke
    const cx3 = rect.left + 700;
    const cy3 = rect.top + 100;
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx3, clientY: cy3, bubbles: true }));
    for (let i = 1; i <= 30; i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: cx3 + i * 8, clientY: cy3 + i * 8, bubbles: true }));
    }
    canvas.dispatchEvent(new MouseEvent('mouseup', { clientX: cx3 + 240, clientY: cy3 + 240, bubbles: true }));
    await new Promise(r => setTimeout(r, 200));

    const stroke3During = hasStrokePixels(cx3 + 120, cy3 + 120, 5);
    results.push({ test: 'Stroke 3 (diagonal)', strokePixels: stroke3During });

    // Wait for save timer (1500ms) and check again
    await new Promise(r => setTimeout(r, 2000));
    
    const stroke1After = hasStrokePixels(cx1 + 150, cy1, 5);
    const stroke2After = hasStrokePixels(cx2, cy2 + 150, 5);
    const stroke3After = hasStrokePixels(cx3 + 120, cy3 + 120, 5);
    results.push({ test: 'After save timer (2s)', stroke1: stroke1After, stroke2: stroke2After, stroke3: stroke3After });

    // Wait even longer
    await new Promise(r => setTimeout(r, 3000));
    
    const stroke1Later = hasStrokePixels(cx1 + 150, cy1, 5);
    const stroke2Later = hasStrokePixels(cx2, cy2 + 150, 5);
    const stroke3Later = hasStrokePixels(cx3 + 120, cy3 + 120, 5);
    results.push({ test: 'After 5s total', stroke1: stroke1Later, stroke2: stroke2Later, stroke3: stroke3Later });

    return results;
  });

  console.log('=== Multi-Stroke Persistence Test ===');
  for (const r of result) {
    console.log(JSON.stringify(r));
  }

  // Check if any stroke disappeared
  const afterSave = result.find(r => r.test.includes('After save'));
  const afterLater = result.find(r => r.test.includes('5s'));
  if (afterSave && afterLater) {
    const allPersist = afterSave.stroke1 > 0 && afterSave.stroke2 > 0 && afterSave.stroke3 > 0 &&
                       afterLater.stroke1 > 0 && afterLater.stroke2 > 0 && afterLater.stroke3 > 0;
    console.log('\n' + (allPersist ? '✅ All strokes persist' : '❌ Some strokes disappeared'));
  }

  await browser.close();
})();
