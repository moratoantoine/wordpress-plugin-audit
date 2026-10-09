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

## ⚙️ ENVIRONNEMENT — 2 modes
### Single-site (scripts/setup-dynamic-env.sh)
127.0.0.1:8080 — admin/adminPass123!, testsubscriber/subPass123! — UM form 7 page 13, UR form 19, UM account page 16, tables Forminator wp_frmt_* + entry ID 1 payload XSS.
### MULTISITE (scripts/setup-multisite-env.sh)
Port 80 + router.php (le serveur intégré ne route pas /site2/ sans lui ; multisite résout par host SANS port). Sous-site /site2/ (blog 2) + **subadmin** (ID 7, SubAdmin123!) = admin blog 2 UNIQUEMENT. WPvivid + WPFM activés sur blog 2. Login : POST /wp-login.php avec redirect_to=/site2/wp-admin/.
⚠️ Relancer serveur MS : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:80 router.php </dev/null >/tmp/php-srv80.log 2>&1 &)`

## ✅ FINDINGS CONFIRMÉS (3, soumettables Wordfence)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md
3. **WPvivid ≤ 0.9.136 — SSRF via test_remote_connection (CWE-918, admin/site)** → reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md
   - Path TEST ignore sanitize_options : host:port arbitraires (le path SAVE impose port 21 — preuve du bypass)
   - Oracle timing (10s ouvert / 0s fermé) + fingerprinting SFTP ; VARIANTE s3compat : endpoint HTTPS arbitraire → SSRF HTTP avec PUT+DELETE (renforce la gravité du finding 3)

## 🔍 COUVERTURE FINALE — SESSIONS 1-9, TOUTES SURFACES TRAÇÉES
### Réfutés/Refermés en sessions 8-9 :
- WPvivid test_send_mail : sanitize_email + contenu fixe + admin-only — by design, refermé
- WPvivid s3compat/amazons3 : endpoint arbitraire = VARIANTE du finding 3 (même handler), pas un nouveau finding
- elFinder WPFM : manage_network en multisite (subadmin exclu !) + nonce + same-origin + uploadAllow image/text-plain + anti-LAN uploadAllowedLanIpClasses + .tmb/.quarantine verrouillés — TOUTES les défenses historiques (CVE-2020-25213 et suivantes) en place, refermé
- UM conditional logic : um_check_conditions_on_submit valide CÔTÉ SERVEUR à la soumission (try/catch « wrong conditions ») — refermé
- UR webhooks paiement : Stripe = signature HMAC (constructEvent), PayPal REST = verify_webhook_signature via API PayPal (cert URL), PayPal redirect = hash_equals(wp_hash(membership,member,token secret)) — tous refermés
- UM multisite : erreur fatale de la page admin du main site en réseau (class-plugin-updater) — bug de compatibilité (deny), pas une faille

### Synthèse par plugin (tous PROFONDS ✅) :
- **UM** : nopriv, IP ban (F2), XSS, download CVE, reset, My Account, directory, staging, conditional logic
- **UR** : submit, mail logs (F1), REST, email-inject, async, drafts, modules PRO, CR, My Account, webhooks paiement
- **Forminator** : submit, upload tokens, draft email, Stripe, XSS entries bout-en-bout, exports CSV, emails
- **WPFM** : backup/restore/logs, storage fail-closed, download, multisite cross-subsite VALIDÉ, elFinder durci
- **WPvivid** : restore v1/v2+jumeaux, staging, vendor, SSRF (F3) + variantes s3/s3compat, test_send_mail

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — détail : reports/BILAN-verification-dynamique.md

## 💡 PISTES RESTANTES (session 10+ — terrain secondaire)
1. WPvivid : autres remotes (dropbox/onedrive — URLs d'API fixes, faible) et le code interne admin-only restant (1410 fichiers — chemins CSRF/XSS admin)
2. Fuzz session complète elFinder en HTTP (upload réel avec le bon nonce de page — la défense mime est statiquement confirmée)
3. UM multisite : comportement des formulaires sur le réseau (le main site a un bug de page admin — creuser si corrigé)
4. Test des 3 findings contre les DERNIÈRES versions publiées (aujourd'hui : 2.14.0 / 5.2.8 / 0.9.136 du repo)

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file (fichier par fichier, SHA via get_file_contents)
- Les 3 rapports Wordfence sont PRÊTS À SOUMETTRE (reports/{user-registration,ultimate-member,wpvivid-backup-plugin}/wordfence-report-*.md)
