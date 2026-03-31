/**
 * デバッグ用: ログイン後のページ構造を確認する
 * 実行: npx ts-node src/debug-nav.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as os from 'os';
import { chromium } from 'playwright';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const BROWSER_PROFILE_DIR = (process.env.BROWSER_PROFILE_DIR ?? '~/.sbi-browser-profile')
  .replace('~', os.homedir());

(async () => {
  const context = await chromium.launchPersistentContext(BROWSER_PROFILE_DIR, {
    headless: false,
    locale: 'ja-JP',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();

  // ログイン
  await page.goto('https://login.sbisec.co.jp/login/entry', { waitUntil: 'domcontentloaded' });
  if (page.url().includes('login.sbisec.co.jp')) {
    console.log('パスキーでログインしてください...');
    await page.waitForURL((url) => !url.hostname.includes('login.sbisec.co.jp'), { timeout: 300_000 });
  }

  // トップページへ
  await page.goto('https://site2.sbisec.co.jp/ETGate/', { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});

  // 口座管理クリック前のリンク一覧
  console.log('\n=== 口座管理クリック前のリンク ===');
  const linksBefore = await page.$$eval('a', (els) =>
    els.filter(el => el.textContent?.trim()).map(el => el.textContent?.trim())
  );
  console.log(linksBefore.filter(Boolean).join('\n'));

  // 口座管理クリック
  console.log('\n=== 口座管理をクリック ===');
  await page.locator('a:has-text("口座管理")').first().click();
  await page.waitForTimeout(3000); // 3秒待機

  // iframeの確認
  const frames = page.frames();
  console.log('\n=== フレーム数:', frames.length);
  for (const frame of frames) {
    console.log('  フレームURL:', frame.url());
  }

  // クリック後のリンク一覧（全フレーム含む）
  console.log('\n=== 口座管理クリック後のリンク（メインページ）===');
  const linksAfter = await page.$$eval('a', (els) =>
    els.filter(el => el.textContent?.trim()).map(el => ({ text: el.textContent?.trim(), href: el.getAttribute('href') }))
  );
  console.log(JSON.stringify(linksAfter.filter(l => l.text), null, 2));

  // 各フレームのリンクも確認
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame.url() || frame.url() === 'about:blank') continue;
    console.log(`\n=== フレーム${i}のリンク (${frame.url()}) ===`);
    const frameLinks = await frame.$$eval('a', (els) =>
      els.filter(el => el.textContent?.trim()).map(el => ({ text: el.textContent?.trim(), href: el.getAttribute('href') }))
    ).catch(() => []);
    console.log(JSON.stringify(frameLinks.filter(l => l.text), null, 2));
  }

  await context.close();
})();
