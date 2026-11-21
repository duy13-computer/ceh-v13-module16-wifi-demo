const { test: base, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const appUrl = pathToFileURL(path.resolve(__dirname, '../../index.html')).href;

const test = base.extend({
  browserErrors: [async ({ page, context }, use) => {
    const errors = [];
    const observe = current => {
      current.on('pageerror', error => errors.push(error.message));
      current.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    };
    observe(page);
    context.on('page', observe);
    await use(errors);
    expect(errors, 'không có console.error hoặc lỗi JavaScript').toEqual([]);
  }, { auto: true }],
});

async function expectScore(page, passed, applicable) {
  await expect(page.locator('#passed')).toHaveText(String(passed));
  await expect(page.locator('#applicable')).toHaveText(String(applicable));
}

test('file:// A → tắt WPS → cách ly → 3/6 → tải và mở báo cáo thật', async ({ page }, testInfo) => {
  await page.goto(appUrl);
  expect(page.url()).toMatch(/^file:/);
  await expectScore(page, 1, 6);
  await page.locator('#wps').selectOption('off');
  await page.locator('#guest-isolation').selectOption('on');
  await expectScore(page, 3, 6);
  await expect(page.locator('#score-delta')).toContainText('+2 so với hồ sơ gốc');
  const downloaded = page.waitForEvent('download');
  await page.locator('#export-report').click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toMatch(/^bao-cao-wifi-A-\d{4}-\d{2}-\d{2}\.html$/);
  expect(await download.failure()).toBeNull();
  const filename = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(filename);
  const html = await fs.readFile(filename, 'utf8');
  expect(html).toContain('3/6 tiêu chí đạt');
  expect(html).toContain('Mạng khách bật, cách ly bật');
  expect(html).toContain('Ghép nối nhanh qua WPS đã tắt');
  expect(html).toContain('không kết nối router thật');
  await page.goto(pathToFileURL(filename).href);
  await expect(page.locator('.baseline-section')).toContainText('+2 so với hồ sơ gốc');
  await expect(page.locator('.todo-list li')).toHaveCount(3);
});

test('file:// localStorage giữ bản nháp sau tải lại, đổi hồ sơ và xóa khôi phục', async ({ page }) => {
  await page.goto(appUrl);
  await page.locator('#wps').selectOption('off');
  await expectScore(page, 2, 6);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('wifi-audit:draft:v1:A')).wps)).toBe('off');
  await page.reload();
  await expectScore(page, 2, 6);
  await expect(page.locator('#wps')).toHaveValue('off');
  await page.locator('[data-profile="B"]').click();
  await expectScore(page, 6, 6);
  await page.locator('[data-profile="C"]').click();
  await expectScore(page, 2, 5);
  await page.locator('[data-profile="A"]').click();
  await expectScore(page, 2, 6);
  await page.locator('#reset').click();
  expect(await page.evaluate(() => localStorage.getItem('wifi-audit:draft:v1:A'))).toBeNull();
  await page.reload();
  await expectScore(page, 1, 6);
});

test('file:// xuất/nhập JSON thật và từ chối schema lạ không đổi cấu hình', async ({ page }, testInfo) => {
  await page.goto(appUrl);
  await page.locator('#wps').selectOption('off');
  await page.locator('#guest-isolation').selectOption('on');
  const downloaded = page.waitForEvent('download');
  await page.locator('#export-config').click();
  const download = await downloaded;
  const filename = testInfo.outputPath('config.json');
  await download.saveAs(filename);
  const data = JSON.parse(await fs.readFile(filename, 'utf8'));
  expect(data.config.wps).toBe(false);
  expect(data.config.guest.isolateLan).toBe(true);
  await page.locator('#reset').click();
  await expectScore(page, 1, 6);
  await page.locator('#import-config').setInputFiles(filename);
  await expect(page.locator('#json-message')).toContainText('Đã nhập cấu hình JSON');
  await expectScore(page, 3, 6);
  data['<img src=x onerror=alert(1)>'] = true;
  await page.locator('#import-config').setInputFiles({ name: 'invalid.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.locator('#json-message')).toContainText('trường không được phép');
  await expect(page.locator('#json-message img')).toHaveCount(0);
  await expectScore(page, 3, 6);
});


async function accessibilityScan(page) {
  await page.addScriptTag({ path: require.resolve('axe-core') });
  return page.evaluate(async () => {
    // file:// cho phép CSS đã nạp, nhưng chặn XHR tải lại CSS; kiểm tra computed styles trực tiếp.
    const result = await axe.run(document, { preload: false, runOnly: { type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } });
    return { violations: result.violations.map(item => ({ id: item.id,
      nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) })),
      contrastChecked: result.passes.some(item => item.id === 'color-contrast') };
  });
}

function contrast(first, second) {
  const luminance = color => {
    const rgb = color.match(/[\d.]+/g).slice(0, 3).map(Number).map(value => value / 255)
      .map(value => value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
  };
  const one = luminance(first), two = luminance(second);
  return (Math.max(one, two) + .05) / (Math.min(one, two) + .05);
}

test('bàn phím: skip link, Tab, mũi tên, Home/End và focus rõ ràng', async ({ page }) => {
  await page.goto(appUrl);
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await expect(page.locator('.skip-link')).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-profile="A"]')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-profile="B"]')).toBeFocused();
  await expectScore(page, 6, 6);
  await page.keyboard.press('End');
  await expectScore(page, 2, 5);
  await page.keyboard.press('Home');
  await expectScore(page, 1, 6);
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('#mode')).toBeFocused();
  const focus = await page.locator('#mode').evaluate(element => ({
    width: getComputedStyle(element).outlineWidth, style: getComputedStyle(element).outlineStyle,
  }));
  expect(focus).toEqual({ width: '3px', style: 'solid' });
  await page.keyboard.press('Home');
  await page.keyboard.press('Tab');
  await expect(page.locator('#mode')).toHaveValue('wpa3-personal');
});

for (const colorScheme of ['light', 'dark']) {
  test('WCAG A/AA và tương phản, theme ' + colorScheme + ', desktop/mobile', async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    await page.goto(appUrl);
    await page.locator('.comparison > summary').click();
    await page.locator('#suggest-path').click();
    for (const id of ['A', 'B', 'C']) {
      await page.locator('[data-profile="' + id + '"]').click();
      if (id === 'B') await page.locator('#firmware-detail > summary').click();
      const result = await accessibilityScan(page);
      expect(result.violations).toEqual([]);
      expect(result.contrastChecked).toBe(true);
    }
    await page.keyboard.press('Tab');
    for (const id of ['mode', 'suggest-path', 'export-config', 'import-config']) {
      const control = page.locator('#' + id);
      await control.focus();
      const colors = await control.evaluate(element => {
        const style = getComputedStyle(element);
        const panel = getComputedStyle(element.closest('.panel'));
        return { border: style.borderTopColor, background: style.backgroundColor,
          outline: style.outlineColor, surrounding: panel.backgroundColor };
      });
      expect(contrast(colors.border, colors.background), id + ' boundary').toBeGreaterThanOrEqual(3);
      expect(contrast(colors.outline, colors.surrounding), id + ' focus').toBeGreaterThanOrEqual(3);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await accessibilityScan(page);
    expect(mobile.violations).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('mobile-' + colorScheme + '.png'), fullPage: true });
  });
}

test('prefers-reduced-motion tắt hiệu ứng nhưng giữ phản hồi trạng thái', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
  await page.goto(appUrl);
  await page.locator('#wps').selectOption('off');
  const criterion = page.locator('[data-criterion="C2"]');
  await expect(criterion).toHaveAttribute('data-recently-changed', 'true');
  expect(await criterion.evaluate(element => getComputedStyle(element).animationName)).toBe('none');
  await expect(page.locator('#last-status-change')).toContainText('C2');
  await expectScore(page, 2, 6);
});

test('báo cáo độc lập có tương phản và cấu trúc tiếp cận ở theme sáng/tối', async ({ page }, testInfo) => {
  await page.goto(appUrl);
  const downloading = page.waitForEvent('download');
  await page.locator('#export-report').click();
  const download = await downloading;
  const filename = testInfo.outputPath('report.html');
  await download.saveAs(filename);
  await page.goto(pathToFileURL(filename).href);
  for (const colorScheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme, reducedMotion: 'reduce' });
    const result = await accessibilityScan(page);
    expect(result.violations).toEqual([]);
    expect(result.contrastChecked).toBe(true);
  }
});
