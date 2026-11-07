import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
const imageFixtures = JSON.parse(readFileSync('src/data/images.json', 'utf8'));
const origin = 'http://localhost:4321';
const headers = { Origin: origin, 'Content-Type': 'application/json' };
const password = 'local-e2e-only-password';
let browserErrors = [];
test.beforeEach(async ({ page }) => {
  browserErrors = [];
  page.on('pageerror', error => browserErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /Content Security Policy/i.test(message.text())) browserErrors.push(message.text()); });
});
test.afterEach(() => { expect(browserErrors).toEqual([]); });

test('首页、筛选、排序、分页与真实随机入口', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('script[type=module]:not([src])')).toHaveCount(0);
  await expect(page.locator('#collection .item-card')).toHaveCount(12);
  await expect(page.locator('.editorial-card')).toHaveCount(3);
  await page.getByRole('link', { name: '下一页 →' }).click();
  await expect(page).toHaveURL(/page=2/);
  await page.locator('#collection .category-filter').filter({ hasText: '工具' }).click();
  await expect(page).toHaveURL(/cat=tool/);
  await page.getByLabel('排列方式').selectOption('oldest');
  await page.getByRole('button', { name: '应用' }).click();
  await expect(page).toHaveURL(/sort=oldest/);
  await page.goto('/random'); await expect(page).toHaveURL(/\/item\//);
  expect(errors).toEqual([]);
});
test('搜索、空状态、清空和键盘导航', async ({ page }) => {
  await page.goto('/search?q=AI');
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.getByRole('searchbox').fill('zzzznotarealitem999');
  await expect(page.locator('#search-empty')).toBeVisible();
  await page.getByRole('button', { name: '清空搜索' }).click();
  await expect(page.locator('#search-start')).toBeVisible();
  await page.getByRole('button', { name: 'AI 编程', exact: true }).click();
  await expect(page.locator('.search-result').first()).toBeVisible();
  await page.getByRole('searchbox').press('ArrowDown');
  await expect(page.locator('.search-result').first()).toBeFocused();
});
test('详情目录、评分保存及重载', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/item/interstellar');
  await expect(page.getByRole('navigation', { name: '本文目录' })).toBeVisible();
  await expect(page.locator('#view-count')).not.toHaveText('—');
  await page.locator('.rating-fruit[data-score="4"]').click();
  await expect(page.locator('#rating-feedback')).toContainText('4 颗糖');
  await page.reload();
  await expect(page.locator('.rating-fruit[data-score="4"]')).toHaveAttribute('aria-pressed', 'true');
  expect(errors).toEqual([]);
});
test('移动端导航、焦点恢复及无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: '打开菜单' }).click();
  await expect(page.locator('#mobile-menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '打开菜单' })).toBeFocused();
  for (const route of ['/', '/search', '/item/interstellar', '/category/tool', '/about']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  }
  await page.goto('/'); await page.screenshot({ path: 'test-results/mobile-home.png', fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'test-results/desktop-home.png', fullPage: true, animations: 'disabled' });
  await page.screenshot({ path: 'test-results/desktop-hero.png', animations: 'disabled' });
});
test('无 JavaScript 仍可分页及浏览详情', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(origin); await page.getByRole('link', { name: '下一页 →' }).click();
  await expect(page.locator('#collection .item-card')).toHaveCount(12);
  await page.locator('#collection .item-card').first().click();
  await expect(page.locator('.detail-article')).toBeVisible(); await context.close();
});
test('认证、CSRF、损坏 Cookie、未知条目和安全头', async ({ request }) => {
  expect((await request.post('/api/admin/items', { headers, data: {} })).status()).toBe(401);
  expect((await request.post('/api/admin/login', { headers: { Origin: 'https://evil.example' }, data: { password } })).status()).toBe(403);
  expect((await request.post('/api/admin/login', { data: { password } })).status()).toBe(403);
  expect((await request.get('/api/admin/items/test', { headers: { Cookie: 'admin_tok=%E0' } })).status()).toBe(401);
  expect((await request.get('/api/ratings/missing-item')).status()).toBe(404);
  expect((await request.post('/api/views/missing-item', { headers })).status()).toBe(404);
  for (const route of ['/item/not-real', '/category/__proto__', '/no-such-page']) expect((await request.get(route)).status()).toBe(404);
  const response = await request.get('/');
  expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
  expect(response.headers()['cache-control']).toBe('no-store');
});
test('后台创建、编辑、删除完整流程', async ({ page }) => {
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin'); await page.getByLabel('密码').fill(password); await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page).toHaveURL(/admin\/dashboard/);
  await page.goto('/admin/items/new');
  await page.locator('#f-title').fill('端到端测试内容'); await page.locator('#f-id').fill('e2e-created');
  await page.locator('#f-summary').fill('一条可编辑和删除的内容');
  await page.locator('#f-cover').fill(imageFixtures.obsidian.src);
  await page.getByLabel('首页精选', { exact: true }).check();
  await page.locator('#f-body').fill('## 测试正文\n\n可以阅读。<script>globalThis.injected=true</script><img src="x" onerror="globalThis.injected=true">');
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await expect(page).toHaveURL(/item\/e2e-created/);
  expect(await page.evaluate(() => globalThis.injected)).toBeUndefined();
  await expect(page.locator('.detail-article script, .detail-article [onerror]')).toHaveCount(0);
  const duplicate = await page.request.post('/api/admin/items', { headers, data: { id: 'e2e-created', title: '重复', category: 'book', summary: '摘要', date: '2026-11-06' } });
  expect(duplicate.status()).toBe(409);
  const invalid = await page.request.put('/api/admin/items/e2e-created', { headers, data: { title: '测试', category: 'book', summary: '摘要', date: '2026-02-30' } });
  expect(invalid.status()).toBe(400);
  expect((await page.request.put('/api/admin/items/e2e-created', { headers, data: { body: 'x'.repeat(200001) } })).status()).toBe(413);
  await page.goto('/admin/items/e2e-created/edit');
  await expect(page.getByLabel('首页精选', { exact: true })).toBeChecked();
  expect((await (await page.request.get('/api/items/e2e-created')).json()).item.featured).toBe(true);
  await page.locator('#f-title').fill('已更新的测试内容');
  await page.getByRole('button', { name: '保存', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('已更新的测试内容');
  await page.goto('/admin/dashboard?q=已更新的测试内容');
  await page.getByRole('button', { name: '删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect((await page.request.get('/item/e2e-created')).status()).toBe(404);
  await page.getByRole('button', { name: /退出/ }).click(); await expect(page).toHaveURL(/\/admin$/);
  expect(errors).toEqual([]);
});
test('并发浏览去重与评分类型边界', async ({ request }) => {
  expect((await request.post('/api/admin/login', { headers, data: { password } })).ok()).toBeTruthy();
  expect((await request.post('/api/admin/items', { headers, data: { id: 'e2e-concurrent', title: '并发计数', category: 'other', summary: '独立的并发计数测试条目', date: '2026-11-06' } })).status()).toBe(201);
  const before = await (await request.get('/api/views/e2e-concurrent')).json();
  const responses = await Promise.all(Array.from({ length: 12 }, () => request.post('/api/views/e2e-concurrent', { headers })));
  expect(responses.every(response => response.ok())).toBeTruthy();
  const after = await (await request.get('/api/views/e2e-concurrent')).json();
  expect(after.count - before.count).toBe(1);
  expect((await request.delete('/api/admin/items/e2e-concurrent', { headers })).ok()).toBeTruthy();
  for (const score of ['5', true, 0, 6, 1.5]) expect((await request.post('/api/ratings/quiet', { headers, data: { score } })).status()).toBe(400);
});
test('登录限流最终返回 429', async ({ request }) => {
  let status = 0;
  for (let i = 0; i < 11; i++) status = (await request.post('/api/admin/login', { headers, data: { password: 'wrong' } })).status();
  expect(status).toBe(429);
});

test('书封、海报、Logo 完整加载，图片失效自动回退', async ({ page, request }) => {
  const asset = await request.get(imageFixtures['atomic-habits'].src);
  expect(asset.ok()).toBeTruthy();
  expect(asset.headers()['content-type']).toContain('image/webp');
  expect(asset.headers()['cache-control']).toContain('immutable');
  expect((await request.get('/server/entry.mjs')).status()).toBe(404);
  expect((await request.get('/wrangler.toml')).status()).toBe(404);
  for (const [id, kind] of [['atomic-habits', 'book'], ['interstellar', 'poster'], ['obsidian', 'logo']]) {
    await page.goto(`/item/${id}`);
    const cover = page.locator('.detail-poster img');
    await expect(cover).toBeVisible();
    await expect.poll(() => cover.evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(page.locator(`.detail-poster .cover-media--${kind}`)).toHaveCount(1);
    await expect(page.getByRole('link', { name: '图片来源 ↗' })).toBeVisible();
  }
  await page.route('**/images/covers/obsidian-*.webp', route => route.abort());
  await page.reload();
  await expect(page.locator('.detail-poster [data-image-error="true"]')).toHaveCount(1);
  await expect(page.locator('.detail-poster__art')).toBeVisible();
  await expect(page.locator('.detail-poster img')).not.toBeVisible();
});


test('保留公开 API、站点地图和精选选择，管理会话仍受保护', async ({ request }) => {
  expect((await request.get('/api/health')).ok()).toBeTruthy();
  const home = await (await request.get('/api/home')).json();
  expect(home.items.length).toBe(63);
  expect(home.featured.every(item => item.featured)).toBeTruthy();
  const selected = await (await request.get('/api/items?featured=1')).json();
  expect(selected.items.every(item => item.featured)).toBeTruthy();
  expect((await (await request.get('/api/stats')).json()).total).toBe(63);
  expect((await (await request.get('/api/items/atomic-habits')).json()).item.featured).toBe(true);
  expect((await (await request.get('/api/items/atomic-habits/related')).json()).items.length).toBeGreaterThan(0);
  expect((await request.get('/api/items?category=__proto__')).status()).toBe(400);
  expect((await request.get('/api/admin/session')).status()).toBe(401);
  expect(await (await request.get('/api/sitemap.xml')).text()).toContain('https://tanghulu.life/item/atomic-habits');
});
