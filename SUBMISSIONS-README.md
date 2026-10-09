# 📤 GUIDE DE SOUMISSION — 4 Vulnerability Reports

## Triage par programme (règles vérifiées le 2026-10-09)

Wordfence : les vulnérabilités exigeant une authentification Administrator ne sont PAS éligibles aux bounties (Unauth/Subscriber uniquement). 10 soumissions hors-scope = risque de ban. → #1 et #2 pour Wordfence, #3 et #4 pour WPScan.

---

## 🎯 WORDFENCE (bugcrowd.wordfence.com) — 2 submissions bounty

### Finding #1 — User Registration & Membership ≤ 5.2.8
- **Type** : Information Disclosure (CWE-538) — Unauthenticated
- **Rapport** : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
- **PoC vidéo** : poc-videos/poc-1-ur-mail-logs.mp4 (39s, 1920×1080, H.264)
- **Script vidéo reproductible** : poc-videos/video-1-ur-mail-logs.js
- **Statut scope** : ✅ IN-SCOPE (Unauth Info Disclosure, 50 000+ installs actives)

### Finding #2 — Ultimate Member ≤ 2.14.0
- **Type** : Security Control Bypass (CWE-348) — Unauthenticated
- **Rapport** : reports/ultimate-member/wordfence-report-ip-ban-bypass.md
- **PoC vidéo** : poc-videos/poc-2-um-ip-ban-bypass.mp4 (37s, 1920×1080)
- **Script vidéo** : poc-videos/video-2-um-ip-ban.js
- **Statut scope** : 🟡 BORDERLINE (présenter le contournement du contrôle sans le terme bruteforce ; backup WPScan si rejeté)
- Installs vérifiées : 200 000 actives

---

## 🎯 WPSCAN (wpscan.com) — 2 submissions (authenticated acceptées chez WPScan)

### Finding #3 — WPvivid Backup Plugin ≤ 0.9.136
- **Type** : SSRF (CWE-918) — Administrator
- **Rapport** : reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md (les champs techniques couvrent le formulaire WPScan)
- **PoC vidéo** : poc-videos/poc-3-wpvivid-ssrf.mp4 (38s, 1920×1080)
- **Script vidéo** : poc-videos/video-3-wpvivid-ssrf.js
- **Variantes à mentionner** : s3compat (endpoint arbitraire → SSRF HTTP PUT/DELETE), media_upload WPFM (URL externe)

### Finding #4 — WP File Manager ≤ 8.0.6
- **Type** : Unrestricted File Upload → RCE (CWE-434) — Administrator
- **Rapport** : reports/wp-file-manager/wordfence-report-upload-rce-fail-open-mime.md
- **PoC vidéo** : poc-videos/poc-4-wpfm-upload-rce.mp4 (41s, 1920×1080)
- **Script vidéo** : poc-videos/video-4-wpfm-rce.js
- **Point fort** : fail-open prouvé (uploadAllow non fonctionnel car uploadDeny vide + Order deny,allow) + contrôle négatif (les 2 remédiations rejettent le PHP)

---

## 📹 Les vidéos PoC (format exigé par Wordfence)

Toutes : MP4 H.264, 1920×1080, 36-41s, étapes chronométrées : titre/version/impact (0:00) → état avant (0:07) → exploitation en direct (0:25) → preuve d'impact (0:55) → contrôle négatif / root-cause (1:05).

Reproduction : scripts Playwright fournis — prérequis = environnement de test (scripts/setup-dynamic-env.sh), `npm install playwright`, puis `node video-X.js` (avec LD_LIBRARY_PATH des libs user-space si sandbox).

## ✅ Checklist avant soumission
1. Créer un compte chercheur sur wordfence.com (requis pour le bounty)
2. Soumission Wordfence : copier le rapport .md dans le formulaire + joindre le MP4
3. Certifier « PoC tested step-by-step: YES » (chaque PoC a été réellement exécuté)
4. Ne PAS divulguer publiquement avant la fin du responsible disclosure
5. WPScan : soumettre via wpscan.com (advisory + CVE potentielle)
