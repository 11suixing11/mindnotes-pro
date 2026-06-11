const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(2000);

  // Dismiss guide
  const skipBtn = await page.locator('button:has-text("跳过")').first();
  if (await skipBtn.isVisible()) await skipBtn.click();
  await page.waitForTimeout(500);

  const result = await page.evaluate(async () => {
    const canvas = document.querySelector('canvas');
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const ctx = canvas.getContext('2d');

    function samplePixels(label) {
      const pts = [];
      for (let i = 0; i < 20; i++) {
        const px = Math.floor((cx + i * 10) * dpr);
        const py = Math.floor(cy * dpr);
        const pixel = ctx.getImageData(px, py, 1, 1).data;
        pts.push({ x: px, y: py, r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] });
      }
      return pts;
    }

    // Sample before drawing
    const before = samplePixels('before');

    // Start drawing
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: cx, clientY: cy, bubbles: true }));
    
    // Sample during drawing (mouse held down)
    const duringSamples = [];
    for (let i = 1; i <= 50; i++) {
      canvas.dispatchEvent(new MouseEvent('mousemove', { 
        clientX: cx + i * 10, clientY: cy, bubbles: true 
      }));
      await new Promise(r => setTimeout(r, 16));
    }
    const during = samplePixels('during');

    // Release mouse
    canvas.dispatchEvent(new MouseEvent('mouseup', { 
      clientX: cx + 500, clientY: cy, bubbles: true 
    }));

    // Sample at different time points after release
    const after50ms = [];
    const after200ms = [];
    const after500ms = [];
    const after1000ms = [];
    const after2000ms = [];
    const after3000ms = [];

    await new Promise(r => setTimeout(r, 50));
    after50ms.push(...samplePixels('after50ms'));

    await new Promise(r => setTimeout(r, 150));
    after200ms.push(...samplePixels('after200ms'));

    await new Promise(r => setTimeout(r, 300));
    after500ms.push(...samplePixels('after500ms'));

    await new Promise(r => setTimeout(r, 500));
    after1000ms.push(...samplePixels('after1000ms'));

    await new Promise(r => setTimeout(r, 1000));
    after2000ms.push(...samplePixels('after2000ms'));

    await new Promise(r => setTimeout(r, 1000));
    after3000ms.push(...samplePixels('after3000ms'));

    // Count stroke-colored pixels at each time
    function countStrokePixels(samples) {
      const strokeR = 44, strokeG = 36, strokeB = 22;
      let count = 0;
      for (const s of samples) {
        if (Math.abs(s.r - strokeR) < 20 && Math.abs(s.g - strokeG) < 20 && Math.abs(s.b - strokeB) < 20) {
          count++;
        }
      }
      return count;
    }

    return {
      before: countStrokePixels(before),
      during: countStrokePixels(during),
      after50ms: countStrokePixels(after50ms),
      after200ms: countStrokePixels(after200ms),
      after500ms: countStrokePixels(after500ms),
      after1000ms: countStrokePixels(after1000ms),
      after2000ms: countStrokePixels(after2000ms),
      after3000ms: countStrokePixels(after3000ms),
      duringRaw: during.slice(0, 5),
      after50msRaw: after50ms.slice(0, 5),
      after500msRaw: after500ms.slice(0, 5),
    };
  });

  console.log('=== Stroke Pixel Count Over Time ===');
  console.log('Before drawing:', result.before, '/ 20 samples');
  console.log('During drawing:', result.during, '/ 20 samples');
  console.log('After 50ms:', result.after50ms, '/ 20 samples');
  console.log('After 200ms:', result.after200ms, '/ 20 samples');
  console.log('After 500ms:', result.after500ms, '/ 20 samples');
  console.log('After 1000ms:', result.after1000ms, '/ 20 samples');
  console.log('After 2000ms:', result.after2000ms, '/ 20 samples');
  console.log('After 3000ms:', result.after3000ms, '/ 20 samples');

  console.log('\n=== Raw Samples (first 5) ===');
  console.log('During:', JSON.stringify(result.duringRaw));
  console.log('After 50ms:', JSON.stringify(result.after50msRaw));
  console.log('After 500ms:', JSON.stringify(result.after500msRaw));

  // Check if stroke disappears
  if (result.during > 0 && result.after3000ms === 0) {
    console.log('\n❌ BUG CONFIRMED: Stroke visible during drawing but disappeared after release!');
  } else if (result.after3000ms > 0) {
    console.log('\n✅ Stroke persists after release');
  }

  await browser.close();
})();
