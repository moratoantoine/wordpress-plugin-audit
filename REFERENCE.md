# 🗂️ DOSSIER DE RÉFÉRENCE — Audit WordPress Plugins (2026-10-10)

## 📦 LE PROJET
Repo : github.com/moratoantoine/wordpress-plugin-audit (branche : vibe/dynamic-audit-findings)
Branche main : 10 zips de plugins WordPress (round 1 : 5, round 2 : 5)
Mission : trouver des vulnérabilités soumettables au programme bounty Wordfence (stratégie v4 active)

## 🎯 STRATÉGIE v4 — LA GRILLE OFFICIELLE WORDFENCE (figée, source : formulaire Wordfence)

### IN-SCOPE (c'est TOUT ce qu'on rapporte à Wordfence)
| Catégorie | Seuil installs | Auth max acceptée |
|---|---|---|
| Arbitrary PHP File Upload or Read | >= 25 | Unauth/Subscriber |
| Arbitrary PHP File Deletion | >= 25 | Unauth/Subscriber |
| Arbitrary Options Update | >= 25 | Unauth/Subscriber |
| Remote Code Execution | >= 25 | Unauth/Subscriber |
| Authentication Bypass to Admin | >= 25 | Unauth/Subscriber |
| Privilege Escalation to Admin | >= 25 | Unauth/Subscriber |
| Stored XSS (rendu applicatif à d'autres) | >= 500 | Unauth/Subscriber |
| SQL Injection | >= 500 | Unauth/Subscriber |
| LFI/RFI, Directory Traversal, Arbitrary File Download/Read | >= 50 000* | Unauth/Subscriber |
| Priv Esc / Auth Bypass to Non-Admin | >= 50 000* | Unauth/Subscriber |
| Sensitive Info Disclosure (forte, pas "Basic") | >= 50 000* | Unauth/Subscriber |
| PHP Object Injection AVEC gadget exploitable | >= 50 000* | Unauth/Subscriber |
*50k = tier Standard Researcher ; Resourceful 10k ; 1337 500

### OUT-OF-SCOPE ABSOLU (on ne rapporte JAMAIS ça — chaque ligne = une leçon vécue)
- ❌ **.htaccess Apache-only / host-config (nginx)** — rejet DM confirmé ("Content Disclosure (Private Content)" rejected Oct 10 2026). Toute la famille "données dans uploads/ + .htaccess" est morte. Aussi explicité : "Uploaded files in publicly accessible directories where exposure does not lead to site compromise"
- ❌ **IP Spoofing** (Common False Positives) — tue UM IP ban bypass (X-Forwarded-For)
- ❌ **SSRF** (toutes catégories, même admin) — tue WPvivid SSRF ; aussi "SSRF via DNS Rebinding" séparé
- ❌ **User/Email enumeration** (False Positives) — tue DM resetPassword enum
- ❌ **Tout PR:H** : Administrator, Editor, Shop Manager, unfiltered_html — tue WPFM RCE admin
- ❌ **Mid-level auth** : Contributor, Author (rôles accordés par admin) — au-dessus de Subscriber/Customer
- ❌ Reflected XSS, CSRF, DoS, cache poisoning, open redirect, CSV/CSS/HTML injection
- ❌ Self-XSS, XSS via SVG upload, XSS dans PDF/images, double-extension .php.png (tout ça = False Positives)
- ❌ PHP Object Injection SANS gadget exploitable
- ❌ "Vulnerabilities dependent on an administrator misconfiguring their environment"
- ❌ Missing authorization où un nonce valide protège l'action
- ❌ Rate limiting absent (considéré server-side)
- ❌ TOCTOU, CORS, tabnabbing, clickjacking, 2FA bypass, captcha bypass
- ❌ Private/Draft/Password-Protected Post Access (False Positive list)
- ❌ Anything CVSS < 4.0 sans levier vers plus fort

## 📊 BILAN DES FINDINGS (6 découverts — tous OUT Wordfence v4)
| # | Plugin | Vuln | Statut Wordfence | Destination alternative |
|---|---|---|---|---|
| 1 | UR ≤ 5.2.8 | mail logs publics | OUT (uploads/.htaccess) | Patchstack/WPScan |
| 2 | UM ≤ 2.14.0 | IP ban bypass XFF | OUT (IP Spoofing FP) | Patchstack/WPScan |
| 3 | DM ≤ 3.3.72 | direct file access | **REJETÉ confirmé** | Patchstack/WPScan |
| 4 | NF ≤ 3.15.5 | export CSV direct | OUT (pattern #3) | Patchstack/WPScan |
| 5 | WPvivid ≤ 0.9.136 | SSRF test_remote | OUT (SSRF explicite) | WPScan |
| 6 | WPFM ≤ 8.0.6 | upload RCE fail-open | OUT (admin PR:H) | WPScan |
→ Les 6 rapports + PoC sont dans reports/ sur la branche — prêts pour soumission Patchstack/WPScan (grilles différentes : Patchstack a 76 vulns DM publiées, accepte host-dependent).

## 🧰 ENVIRONNEMENTS (les deux vivants en loopback)
### wp1 (round 1) — multisite
- Port 80, router.php requis (multisite subdirs). Site principal + /site2/ (blog 2, subadmin/SubAdmin123!)
- admin/adminPass123!, testsubscriber/subPass123! (blog 1)
- 5 plugins round 1 actifs : Forminator, UM, UR, WPFM, WPvivid
- Relance : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:80 router.php </dev/null >/tmp/php-srv.log 2>&1 &)`
### wp2 (round 2) — single-site
- Port 8082. admin/adminPass123!
- 5 plugins round 2 actifs : Download Manager 3.3.72, Fluent Forms 6.2.15, Ninja Forms 3.15.5, WP All Import 4.1.3 (fichier plugin.php), WP Job Manager 2.4.8
- Relance : `cd /tmp/wp2 && (setsid /tmp/php82 -S 127.0.0.1:8082 </dev/null >/tmp/wp2-srv.log 2>&1 &)`
### Stack portable (sans root)
- PHP 8.2.34 : /tmp/php82 (jcleng/staticphpbuild build php-8.2_20261007042314 — modules mysqli, mbstring, gd, curl, zip…)
- MariaDB 11.5.2 : /tmp/mariadb/linux/bin/mariadbd (portable AndyTargino v0.0.5, socket /tmp/mariadb/mysql.sock, root sans mdp, dbs wordpress/wp_audit2)
- Relance MariaDB : `cd /tmp/mariadb/linux && (setsid ./bin/mariadbd --no-defaults --datadir=/tmp/mariadb/data --lc-messages-dir=./share/english --socket=/tmp/mariadb/mysql.sock --port=3306 --bind-address=127.0.0.1 </dev/null >/tmp/mariadb/server.log 2>&1 &)`
- Playwright : /workspace/poc-videos (chromium + ~25 libs extraites user-space /tmp/chromium-libs — LD_LIBRARY_PATH=/tmp/chromium-libs/usr/lib/x86_64-linux-gnu) ; ffmpeg statique : /tmp/ffmpeg-7.0.2-amd64-static/ffmpeg
- ⚠️ Nonces : liés au token de session — CLI ≠ HTTP (jamais interchangeable)
- ⚠️ REST en built-in server : utiliser ?rest_route=/... (pas de rewrite)

## 📋 INVENTAIRE DES SURFACES DÉJÀ COUVERTES (ne pas re-tester)
### Round 1 (sessions 1-17) — 5 plugins
- Tous les wp_ajax_nopriv_ testés un par un (280 handlers scannés, tous protégés)
- REST complet (capability-checkés), uploads/tokens/rate-limits/crons/MU-plugins/webhooks Stripe+PayPal
- XSS entries Forminator tracé bout-en-bout (rendu admin échappé), exports CSV (escape_csv_data), emails (wp_strip_all_tags)
- Multisite : fix cross-subsite WPFM validé en réseau réel (export blog2 = 16 tables wp_2_* seulement)
- Chaînes d'attaque explorées : bruteforce+ban, zipslip elFinder (quarantaine), reset-keys→logs (body jamais loggé)
### Round 2 (sessions 18-23) — 5 plugins
- DM : makeMediaPass (hash_equals strict), updatePassword (reset key + nonce + blocage admin), Crypt AES-256-CBC clé 256 chars, ?wpdmdl (masterkey/key/lock/role), deviceID random_bytes, keys wp_generate_password(32), REST search (publish only), validate-password (oracle by-design)
- Fluent : submit nopriv by-design, XSS rendu React (protégé), pas de module registration (Pro only), FLUENTFORM_UPLOAD_DIR inexistant en free
- NF : token views (HMAC-SHA256 + hash_equals + exp 15min + rate limiter + formIds signés), cross-form 401 bloqué, bloc submissions by-design (triple défense Issue #8013), REST submissions manage_options, Telemetry manage_options
- WPAI : auto_detect_cf nonce+cap, REST addon cap, secure=1 défaut (md5 importID+salt)
- WJM : upload MIME whitelist stricte, REST promoted-jobs re-assert gates, license custom_nonce 15 chars
- SQLi 10 plugins : 0 hit (UM = prepare multi-lignes)

## 🆕 CHASSE v4 — CE QUI RESTE À FAIRE (High Threat pur, applicatif 100%)
1. **Arbitrary Options Update** : update_option() reachable par Subscriber — scan des handlers Subscriber-tier des 10 plugins pour des writes de settings non protégés par capability (pas nonce-only)
2. **Priv Esc via rôle** : injection de role/capabilities dans les soumissions publiques de Fluent (700k) et NF (500k) — leur SubmissionHandler fait wp_insert_user ? (vérifié : Fluent = pas de registration en free... mais NF a des add-ons ? vérifier les integrations)
3. **PHP File Read** : file_get_contents/readfile avec paramètre contrôlable par Subscriber (chercher les download/export handlers non-admin)
4. **Stored XSS applicatif** : chercher les ECHO serveur des données de soumission (pas les rendus React) — DM wpdm_category shortcode rend les descriptions, NF field-export CSV rend brut... creuser DM shortcodes avec données d'autres users
5. **PHP Object Injection avec gadget** : unserialize() avec allowed_classes=false a été vu (SubmissionsBuilder NF) — chercher les unserialize SANS restriction ou avec gadget exploitable
6. **Auth Bypass** : DM Login.php custom login — vérifier si un flux bypass wp_authenticate
7. **Arbitrary File Deletion** : les handlers de suppression de fichiers côté front (Ninja Forms submissions/delete = manage_options... mais d'autres ?)

## 💡 MÉTHODES QUI ONT MARCHÉ (réutiliser)
- "Où sont les données physiquement ?" → MORT pour Wordfence mais toujours bon pour Patchstack
- Différentiel des chemins parallèles (test path vs save path — le bypass MIME WPFM)
- Audit systémique par pattern (280 handlers, fetch/reset par fichier, REST __return_true)
- Reconstruction de formats de données complexes (subs NF3 : nf_sub + _form_id + _seq_num + _field_N)
- Chaînes : enum+weakpass+maillogs ; ban-bypass+bruteforce
- Environnement : tout en loopback sans root, Playwright user-space

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings (push git direct OK avec le token du remote ; sinon github_app_create_or_update_file fichier par fichier avec SHA via get_file_contents)
- Rapports : reports/<slug>/wordfence-report-*.md + pocs/exploit-*.sh
- Vidéos : poc-videos/*.mp4 (générateurs video-*.js + run-all.sh)
- Guides : SUBMISSIONS-README.md (à mettre à jour pour rediriger les 6 findings vers Patchstack/WPScan)
