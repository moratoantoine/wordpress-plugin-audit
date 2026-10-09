# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## 🎯 Mission
Audit de sécurité des 5 plugins WordPress présents dans ce repo (zips à la racine). Objectif : trouver des vulnérabilités réelles, vérifiées DYNAMIQUEMENT (PoC + contrôle négatif), et produire des rapports au format Wordfence exact.

## 📦 Plugins audités (versions lues dans le header PHP, PAS le readme)
| Plugin | Slug | Version | Fichiers PHP |
|---|---|---|---|
| Forminator | forminator | 1.58.0 | 2467 |
| Ultimate Member | ultimate-member | 2.14.0 | 368 |
| User Registration & Membership | user-registration | 5.2.8 | 996 |
| WP File Manager | wp-file-manager | 8.0.6 | 46 |
| WPvivid Backup | wpvivid-backuprestore | 0.9.136 | 1410 |

## ⚙️ Environnement de test dynamique (reproductible SANS Docker ni root)
`bash scripts/setup-dynamic-env.sh` construit tout en loopback 127.0.0.1:
- PHP 8.2.34 statique : https://github.com/jcleng/staticphpbuild (build php-8.2_20261007042314, modules mysqli/mbstring/gd/curl/zip inclus) → /tmp/php82
- MariaDB 11.5.2 portable : https://github.com/AndyTargino/mariadb-portable-driver/releases/download/v0.0.5/mariadb-linux.zip → bootstrap manuel avec share/mariadb_system_tables.sql (--bootstrap), puis serveur sur 127.0.0.1:3306 (root sans mdp, db wordpress / wp / wppass123)
- WordPress latest (6.7.1) installé via wp_install() en CLI PHP (/tmp/install-wp.php) — admin/adminPass123!, subscriber testsubscriber/subPass123!
- Serveur web : serveur intégré PHP 8 workers sur 127.0.0.1:8080 (⚠️ .htaccess IGNORÉ = même comportement que nginx)
- Plugins activés + formulaires par défaut créés (UM install_default_forms → register form ID 7, page 13 ; UR create_form → form ID 19)

⚠️ SUBTILITÉ : le serveur PHP intégré meurt entre les sessions bash → relancer : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:8080 </dev/null >/tmp/php-srv.log 2>&1 &)`
⚠️ MariaDB survit si lancé avec setsid ; si mort : relancer ./bin/mariadbd depuis /tmp/mariadb/linux avec mêmes options.
⚠️ Les nonces WP incluent le token de session → un nonce généré en CLI (wp_set_current_user) NE marche PAS en HTTP et vice-versa.

## ❌ FINDINGS D'ORIGINE (session précédente) — LES 13 RÉFUTÉS DYNAMIQUEMENT
Voir reports/BILAN-verification-dynamique.md pour le détail. En résumé :
1. WPvivid Unauth RCE (do_restore_2) → protégé (nonce+manage_options), patch CVE-2024-10705 en place
2. UM File Upload RCE → whitelist stricte, toutes les extensions PHP rejetées (.php/.php5/.pht/.PHP/.php.txt)
3. Forminator Nonce Bypass RCE → constante à définir par l'admin, pas d'attaquant
4. WPFM SQLi→RCE db-restore.php → admin+nonce, code durci (CVE-2026-19708)
5. UR Blind SQLi functions-ur-admin → fonctions GDPR admin, pas de chemin attaquant
6. UR Arbitrary Registration → by-design (formulaire public), respecte users_can_register=0
7. UM Path Traversal → esc_url_raw + um_is_temp_upload borne au temp dir
8. Forminator Path Traversal → sanitize_file_name partout
9. UM IDOR um_get_members → nonce um-directory-{hash} + can_view_directory
10. UR Info Disclosure REST → capability manage_user_registration (401)
11. WPvivid Info Disclosure → même protection que #1
12. WPFM Arbitrary File Write → admin+nonce
13. WPFM Info Disclosure → admin+nonce

## ✅ NOUVEAU FINDING CONFIRMÉ (cette session)
### User Registration & Membership ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)
- Logs email écrits PAR DÉFAUT dans uploads/ur-logs/ (répertoire web public)
- Contiennent emails des inscrits + sujets en clair (class-ur-emailer.php:300-342)
- .htaccess deny from all = Apache-only → nginx/IIS/PHP intégré servent le fichier en 200
- Nom = ur_mail_logs-{HMAC-MD5(salt)}.log → calculable hors-ligne si salts par défaut (put your unique phrase here → cf529820450a38fa278b56d5618d80bb)
- PoC validé : POST inscription → GET /wp-content/uploads/ur-logs/ur_mail_logs-<hash>.log → 200 avec PII. Mauvais hash → 404.
- Rapport : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
- PoC : reports/user-registration/pocs/exploit-info-disclosure-mail-logs.sh

## 🔍 ANGLES DÉJÀ COUVERTS (ne pas re-tester)
- Tous les wp_ajax_nopriv_ des 5 plugins (testés un par un)
- Handlers jumeaux WPvivid post-patch (tous protégés)
- Webhook Stripe Forminator (HMAC validé)
- REST UR (tous capability-checkés), REST analytics (401)
- unserialize/phar:// sur input, call_user_func avec $_POST, redirects ouverts
- Shortcodes UM (um_show_content, loggedin/loggedout)
- Fichiers sans garde ABSPATH accessibles en direct (samples Forminator → erreur fatale, divulgation chemin si display_errors)
- Repertoires uploads : UM temp (hash contenu, faible), Forminator temp (.htaccess only), ur-logs (→ FINDING)
- Nonce UR form submission non vérifié dans ur_process_registration() (lacune qualité, impact nul)

## 💡 PISTES RESTANTES À EXPLORER (prochaines sessions)
1. Multisite : monter un réseau WP et re-tester les exports backup WPFM (code mentionne un fix cross-subsite récent = surface jeune)
2. Upload access token Forminator : mécanisme opaque récent (class-upload-access.php) — vérifier la validation côté submit
3. Rate limiting UM : UM()->is_rate_limited() — vérifier si contournable (par IP ? par session ?)
4. WPvivid staging : wpvividstg_* handlers (start_staging_free commenté mais get_staging_progress actif)
5. Vendor WPvivid : gros vendor/ (guzzle, phpseclib ?) → vérifier versions vs CVE connues
6. XSS stocké : données de formulaire UR/Forminator rendues dans l'admin (entries list) — non testé
7. Members directory UM : config par défaut après install_default_forms — tester les données exposées par défaut

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings (créée depuis main)
- Push : via GitHub App Mistral (github_app_create_or_update_file fonctionne — push multiple et create_branch multi-fichiers bloqués par le sandbox, utiliser create_or_update_file fichier par fichier)
- git push direct BLOQUÉ par le proxy sandbox ; gh api mutating BLOQUÉ
