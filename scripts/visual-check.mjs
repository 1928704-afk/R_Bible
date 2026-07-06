import { chromium } from 'playwright-core';

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const targets = [
  { name: 'desktop-1440', width: 1440, height: 1000 },
  { name: 'tablet-768', width: 768, height: 1024 },
  { name: 'mobile-390', width: 390, height: 844 },
];

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
});

const results = [];

for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: target.width, height: target.height } });
  await page.goto('http://localhost:8081', { waitUntil: 'networkidle' });
  await page.screenshot({ path: `/private/tmp/bible-${target.name}.png`, fullPage: true });

  const metrics = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('[role="button"], button'));
    const buttonRects = buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { text: button.textContent?.trim() ?? '', width: rect.width, height: rect.height };
    });

    return {
      title: document.body.innerText.slice(0, 120),
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
      bodyHeight: document.body.scrollHeight,
      buttons: buttonRects.slice(0, 8),
    };
  });

  results.push({ ...target, screenshot: `/private/tmp/bible-${target.name}.png`, metrics });
  await page.close();
}

await browser.close();

console.log(JSON.stringify(results, null, 2));
