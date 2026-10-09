# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## 🎯 Mission
Audit de sécurité des 5 plugins du repo. Objectif : vulnérabilités réelles vérifiées DYNAMIQUEMENT (PoC + contrôle négatif), rapports Wordfence. Couverture : TOUS les plugins à chaque session.

## 📦 Plugins (versions du header PHP)
| Plugin | Slug | Version |
|---|---|---|
| Forminator | forminator | 1.58.0 |
| Ultimate Member | ultimate-member | 2.14.0 |
| User Registration | user-registration | 5.2.8 |
| WP File Manager | wp-file-manager | 8.0.6 |
| WPvivid Backup | wpvivid-backuprestore | 0.9.136 |

## ⚙️ ENVIRONNEMENT — 2 modes désormais
### Mode 1 : Single-site (setup-dynamic-env.sh)
127.0.0.1:8080 — admin/adminPass123!, testsubscriber/subPass123! — UM form 7 page 13, UR form 19, UM account page 16. Tables Forminator wp_frmt_* + entry ID 1 avec payload XSS.
### Mode 2 : MULTISITE 🆕 (scripts ci-dessous)
- Conversion réussie : constantes MULTISITE dans wp-config + COOKIE_DOMAIN=false + tables réseau (wp_blogs, wp_site, wp_sitemeta, wp_signups, wp_registration_log, wp_blogmeta) + colonnes spam/deleted dans wp_users
- **Serveur : port 80 avec router.php** (`cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:80 router.php ...& )`) — le serveur intégré ne route pas /site2/ sans router ; le multisite résout le blog par host donc PAS de port dans les URLs
- Sous-site **/site2/** (blog 2) + **subadmin** (ID 7, SubAdmin123!) = administrator du blog 2 UNIQUEMENT (pas de caps sur blog 1, pas manage_network) — créé en SQL direct (wp_insert_user échoue en CLI multisite)
- Login multisite : POST /wp-login.php avec redirect_to=/site2/wp-admin/ (PAS /site2/wp-login.php — boucle)
- Scripts de conversion : /tmp/install-network.php, /tmp/fix-ms-tables.php, /tmp/create-subsite.php, /tmp/fix-subadmin3.php, /tmp/setup-ms-env.sh

## ✅ FINDINGS CONFIRMÉS (2, soumettables Wordfence)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md

## 🏢 RÉSULTATS MULTISITE (session 7) — WPFM fix VALIDÉ en conditions réelles
- **Export depuis blog 2 (subadmin)** : wpfm_get_db_export_tables() retourne exactement 16 tables wp_2_* — **PAS de wp_users, PAS de wp_usermeta, aucune table blog 1** ✅
- **Export depuis blog 1** : 22 tables, aucune wp_2_*, pas de wp_users (global exclu) ✅
- **Résiduel documenté** : tables third-party au préfixe nu (wp_user_registration_sessions, wp_wpfm_backup, wp_wpvivid_options) incluses depuis le main site — limitation assumée du fix, non soumettable
- **Isolation capabilities** : subadmin = manage_options sur blog 2 OUI, blog 1 NON, manage_network NON ✅
- **Restore** : rejoue le dump tel quel mais le dump créé post-fix ne contient que les tables du site appelant — cohérent, refermé
- **Verdict : le fix cross-subsite (CVE-2026-19708) fonctionne parfaitement sur un réseau réel à 2 sites**

## 🔍 COUVERTURE (sessions 1-7) — résumé par plugin
- **UM 2.14.0** : PROFOND ✅ (nopriv, IP ban=FINDING, XSS, download, reset, My Account, account, directory, staging)
- **UR 5.2.8** : PROFOND ✅ (submit, mail logs=FINDING, REST, email-inject, async, drafts, modules PRO, CR, My Account)
- **Forminator 1.58.0** : PROFOND ✅ (submit, upload tokens, draft email, Stripe, XSS entries bout-en-bout, exports CSV, emails)
- **WPFM 8.0.6** : PROFOND ✅ (backup/restore/logs, storage fail-closed, download, **multisite validé session 7**)
- **WPvivid 0.9.136** : CORRECT ✅ (restore v1/v2 + jumeaux, staging, vendor) — restent remote storages + code interne admin-only

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — détail : reports/BILAN-verification-dynamique.md

## 💡 PISTES RESTANTES (session 8+)
1. **WPvivid remote storages** : handlers test-connexion (S3/GDrive/FTP) — SSRF admin-only (dernier plugin pas encore à couverture PROFONDE)
2. **WPvivid multisite** : comportement des backups/restore sur le réseau (maintenant testable ! le mode multisite est opérationnel)
3. **Fuzz elFinder WPFM** (connecteur fichiers, session admin) : lecture hors racine ?
4. UM conditional logic : bypass champs required
5. UR payment webhooks : retours PayPal/Stripe paramétrables
6. UM/UR multisite : comportements des formulaires sur le réseau (testable maintenant)

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file (fichier par fichier, SHA via get_file_contents)
