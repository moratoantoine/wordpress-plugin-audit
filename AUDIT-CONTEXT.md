# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## 🎯 Mission
Audit de sécurité des 5 plugins du repo (versions = dernières publiées wordpress.org, vérifié session 10). Rapports Wordfence pour chaque finding confirmé dynamiquement.

## ✅ FINDINGS CONFIRMÉS (3, soumettables)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md
3. **WPvivid ≤ 0.9.136 — SSRF via test_remote_connection (CWE-918, admin/site)** → reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md (variante s3compat : SSRF HTTP PUT/DELETE, endpoint arbitraire)

## ⚙️ ENVIRONNEMENTS
Single-site : scripts/setup-dynamic-env.sh (127.0.0.1:8080, admin/adminPass123!, testsubscriber/subPass123!)
Multisite : scripts/setup-multisite-env.sh (port 80 + router.php, /site2/, subadmin/SubAdmin123! = admin blog 2 uniquement)
Artefact multisite connu : ajaxurl host vide (wp-config hybride) — bloque le fuzz elFinder HTTP dans CET env seulement

## 🔍 SESSION 11 — 8 ANGLES NOUVEAUX, TOUS REFERMÉS
1. **UR profile_pic_upload (user connecté)** : nonce + mime_content_type (contenu réel) + extension + realpath check + wp_unique_filename + payload chiffré AES-256-CBC (clés en options ur_secret_key/ur_secret_iv) renvoyé au client — à la soumission, revalidation complète (déchiffrement + mime + basename(file_path)===file_name) — défense en profondeur, refermé
2. **crypt_the_string** : AES-256-CBC clé/iv secrets serveur — non forgeable par le client, refermé
3. **Crons UR** (class-ur-cron.php + Crons.php membership) : hooks internes wp-cron sans input externe — refermé par design
4. **XSS err= redirects UM** : sanitize_key sur $_REQUEST['err'] partout (um-actions-misc.php:121) — refermé
5. **Open redirect UR** : toutes les redirections = add_query_arg sur permalinks internes / wp_safe_redirect / esc_url_raw / wp_validate_redirect (my-account redirect_to) — refermé
6. **Password reset UR** : utilise get_password_reset_key/check_password_reset_key du CORE WordPress (tokens natifs expirants) — refermé
7. **My Account UR endpoints GET** : query_vars internes + wp_validate_redirect — refermé
8. **WPvivid create_debug_package** : nonce + manage_options, zip écrit dans backup dir privé (nonce vérifié aussi dans l'URL JS admin) — refermé

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 🏁 ÉTAT : AUDIT EXHAUSTIF (sessions 1-11)
5 plugins couverture PROFONDE uniforme : endpoints publics (nopriv/REST), auth (subscriber), admin (nonce/capability — 280 handlers scannés session 10), multisite (réseau réel), flux de fichiers (uploads/drafts/tokens chiffrés), emails (headers/injection/logs), exports (CSV injection), XSS (entries/display_name/err params), SSRF (remotes), open redirects, password resets, crons, debug packages.

3 findings soumettables + PoC + contrôles négatifs · ~50 surfaces refermées avec preuves · 2 environnements reproductibles.

## 💡 PISTES SESSION 12+ (fond du fonds)
1. Corriger l'artefact multisite et fuzz elFinder HTTP complet (défenses statiques déjà confirmées)
2. Re-vérifier les 3 findings à chaque nouvelle version publiée des plugins
3. Audits de code ligne-par-ligne des fichiers restants non couverts (>3000 fichiers au total — couverture par surfaces, pas exhaustive du code)

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings — push via github_app_create_or_update_file (fichier par fichier, SHA via get_file_contents)
- 3 rapports Wordfence PRÊTS À SOUMETTRE
