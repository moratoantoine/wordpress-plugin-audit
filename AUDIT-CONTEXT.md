# 📋 CONTEXTE PROJET — Audit plugins WordPress (sessions 1-19, ROUND 2 en cours)

## ✅ FINDINGS ROUND 1 (4) — triage fait (voir SUBMISSIONS-README.md)
1. UR mail logs (CWE-538, Unauth) — Wordfence ✅
2. UM IP ban bypass (CWE-348, Unauth) — Wordfence borderline / WPScan
3. WPvivid SSRF (CWE-918, Admin) — WPScan
4. WPFM upload RCE fail-open (CWE-434, Admin) — WPScan
+ 4 vidéos PoC MP4 poussées (poc-videos/)

## 🆕 ROUND 2 — 5 NOUVEAUX PLUGINS (session 19 en cours)
| Plugin | Version | Installs | Fichiers PHP |
|---|---|---|---|
| Download Manager | 3.3.72 | 100 000 | 199 |
| Fluent Forms | 6.2.15 | 700 000 | 882 |
| Ninja Forms | 3.15.5 | 500 000 | 412 |
| WP All Import | 4.1.3 | 100 000 | 1121 |
| WP Job Manager | 2.4.8 | 70 000 | 301 |
Toutes versions = dernières publiées wordpress.org (vérifié). Tous ≥ 50k installs = in-scope Wordfence.

### ✅ FINDING #5 (ROUND 2) — Download Manager ≤ 3.3.72 — User/Email Enumeration Unauth
- resetPassword nopriv (src/User/Login.php:221) : réponses DISTINCTES ok/error selon existence du compte (username ET email)
- Throttle 60s contournable : lié au cookie __wpdm_client (sans cookie = jamais throttlé) + email-bombing (reset key envoyé à chaque ok)
- Testé dynamiquement : admin→ok, nobody→error, email ok/error — diverge du core WP (réponse générique)
- CVE-2026-2571 = DISTINCT (Subscriber+ via param user, patché 3.3.50) ; le nôtre = Unauth via resetPassword, version courante
- Rapport : reports/download-manager/wordfence-report-user-enumeration-resetpassword.md + PoC poussés

### 🔍 ROUND 2 — couverture en cours
- download-manager : nopriv balayés (media_pass durci avec nonce+strict compare, updatePassword très durci : reset key + nonce spécifique + blocage admin), Crypt AES/HMAC solide, REST wpdm à vérifier — user ENUM trouvé ✅
- wp-job-manager : upload_file nopriv exige login (config-conditionnel : option user_requires_account décochée = upload possible unauth — BORDERLINE), get_listings ok, log_stat ok
- ninja-forms : get_new_nonce public by-design (form), resume = session-based propre, nf_log_js_error 403 ✅, REST nf-be-data/submissions/views à auditer
- wp-all-import : 0 nopriv, auto_detect_cf nonce+cap ✅, REST addon fields = cap ✅, uploads wpallimport/files/ SANS .htaccess (index.php vide only) — accès direct 200 confirmé sur fichier posé à la main MAIS défaut secure=1 = dossier md5(importID+NONCE_SALT) → attaque conditionnelle (option admin décochée ou imports pré-option) → BORDERLINE noté
- fluentform : submit nopriv by-design, generate_protection_token 400 (params requis), upload intégré au flux de soumission — creuser les entries/XSS côté admin (pattern Forminator)

## ⚙️ ENVIRONNEMENTS
- wp1 : multisite port 80 (round 1, 5 plugins round-1 actifs)
- **wp2 : single-site port 8082, WP 6.7.1, admin/adminPass123!, les 5 NOUVEAUX plugins actifs** — instance dédiée round 2

## 💡 PISTES ROUND 2 (suite)
1. Ninja Forms REST (nf-be-data, submissions, views) : permission callbacks ?
2. Fluent Forms : rendu des entries admin (XSS pattern Forminator) + composants de paiement
3. WP Job Manager : la chaîne config-conditionnelle (option décochée → upload unauth → RCE si mime faible ?)
4. Download Manager REST wpdm/v1 : endpoints
5. WPAI history/ : les logs d'import (données) sont-ils sous le même schéma md5 ou plats ?

## ❌ 13 FINDINGS ROUND 1 RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 5 rapports + 5 PoC + 4 vidéos + env + contexte
