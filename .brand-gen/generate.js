const path = require('path');
const { chromium } = require('playwright');

const HERE = __dirname;
const HTML = 'file://' + path.join(HERE, 'brand.html');
const OUT = path.join(HERE, '..', 'assets');

const jobs = [
  { variant: 'icon', size: 1024, file: 'icon.png' },
  { variant: 'adaptive-bg', size: 1024, file: 'android-icon-background.png' },
  { variant: 'adaptive-fg', size: 1024, file: 'android-icon-foreground.png', transparent: true },
  { variant: 'monochrome', size: 1024, file: 'android-icon-monochrome.png', transparent: true },
  { variant: 'mark', size: 512, file: 'favicon.png', transparent: true },
];

async function shootSquare(browser, job) {
  const page = await browser.newPage({
    viewport: { width: job.size, height: job.size },
    deviceScaleFactor: 1,
  });
  if (job.transparent) await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`${HTML}?variant=${job.variant}&size=${job.size}`, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  await page.screenshot({
    path: path.join(OUT, job.file),
    omitBackground: !!job.transparent,
  });
  await page.close();
  console.log('wrote', job.file);
}

async function shootSplash(browser) {
  const w = 640, h = 760;
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 2 });
  await page.goto(`${HTML}?variant=splash&w=${w}&h=${h}`, { waitUntil: 'load' });
  await page.waitForTimeout(200);
  await page.screenshot({
    path: path.join(OUT, 'splash-icon.png'),
    omitBackground: true,
  });
  await page.close();
  console.log('wrote splash-icon.png');
}

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox', '--force-color-profile=srgb'],
  });
  for (const job of jobs) {
    await shootSquare(browser, job);
  }
  await shootSplash(browser);
  await browser.close();
})();
