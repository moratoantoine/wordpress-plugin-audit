# 📋 CONTEXTE PROJET — Audit plugins WordPress (sessions 1-18)

## ✅ FINDINGS (4) + TRIAGE PROGRAMME
1. **UR mail logs (CWE-538, Unauth)** — Wordfence bounty ✅ | reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM IP ban bypass (CWE-348, Unauth)** — Wordfence borderline / WPScan backup | reports/ultimate-member/wordfence-report-ip-ban-bypass.md
3. **WPvivid SSRF (CWE-918, Admin)** — WPScan | reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md
4. **WPFM upload RCE fail-open (CWE-434, Admin)** — WPScan | reports/wp-file-manager/wordfence-report-upload-rce-fail-open-mime.md
Règle Wordfence vérifiée : admin-required = pas de bounty → #3/#4 chez WPScan. SUBMISSIONS-README.md = guide complet de triage + checklist.

## 📹 SESSION 18 — VIDÉOS POC (exigence Wordfence) ✅
**Playwright opérationnel dans le sandbox** (Node 22 + chromium-1248 ; ~25 libs système extraites en user-space depuis les pools Debian — pattern identique à PHP/MariaDB portables : libglib, nss, atk, x11, xcb, gbm, xkbcommon, pango, cairo, alsa(bookworm pour GLIBC compat), wayland... via /tmp/fix-libs2.sh + /tmp/fetch-deb.py ; LD_LIBRARY_PATH=/tmp/chromium-libs/usr/lib/x86_64-linux-gnu).
**4 vidéos générées et converties en MP4 H.264 1920x1080** (36-41s) : poc-1-ur-mail-logs.mp4 (39s), poc-2-um-ip-ban-bypass.mp4 (37s), poc-3-wpvivid-ssrf.mp4 (38s), poc-4-wpfm-upload-rce.mp4 (41s). Structure Wordfence : titre→avant→exploitation live→impact→contrôle négatif. Conversion via ffmpeg statique 7.0.2 (johnvansickle — le ffmpeg playwright ne fait pas mp4, muxer webm only).
**Livrables poussés** : poc-videos/{video-1..4}.js (générateurs reproductibles), package.json, run-all.sh, README.md (procédure complète) + SUBMISSIONS-README.md (guide de soumission par programme). Les MP4 binaires ne passent pas l'API texte — régénérables en 1 commande (`cd poc-videos && npm run all`), les copies locales sont dans /workspace/poc-videos/videos/*.mp4 et /workspace/github__moratoantoine__wordpress-plugin-audit/poc-videos/*.mp4.

## ⚙️ ENVIRONNEMENTS
Single-site 127.0.0.1:8080 (setup-dynamic-env.sh) + Multisite port 80 router.php (setup-multisite-env.sh, /site2/, subadmin). Comptes : admin/adminPass123!, testsubscriber/subPass123!, subadmin/SubAdmin123!. Vidéo 2 : réactiver blocked_ips=127.0.0.1 avant, retirer après (faits).

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 🏁 ÉTAT FINAL
Audit complet (17 sessions d'audit + 1 session vidéos). 4 rapports Wordfence complets + 4 PoC bash + 4 vidéos MP4 + contrôles négatifs + 2 env reproductibles + guide de soumission. **PRÊT À SOUMETTRE : #1/#2 → Wordfence (bugcrowd.wordfence.com), #3/#4 → WPScan.**
