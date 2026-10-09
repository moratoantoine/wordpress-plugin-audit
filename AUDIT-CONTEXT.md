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
Port 80 + router.php (indispensable — le serveur intégré ne route pas /site2/ sans lui, et le multisite résout par host SANS port). Sous-site /site2/ (blog 2) + **subadmin** (ID 7, SubAdmin123!) = admin blog 2 UNIQUEMENT (pas blog 1, pas manage_network). WPvivid + WPFM activés sur blog 2. Login : POST /wp-login.php avec redirect_to=/site2/wp-admin/ (PAS /site2/wp-login.php — boucle).
⚠️ Relancer serveur MS : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:80 router.php </dev/null >/tmp/php-srv80.log 2>&1 &)`

## ✅ FINDINGS CONFIRMÉS (3, soumettables Wordfence)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md
3. **WPvivid ≤ 0.9.136 — SSRF via test_remote_connection (CWE-918, admin/site) 🆕 SESSION 8** → reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md
   - Le path TEST (test_connect) ignore sanitize_options : host:port arbitraires (le path SAVE impose port 21 — preuve que la validation existe mais est contournée)
   - Oracle : ~10s = port ouvert (attente bannière FTP) vs ~0s = fermé → scan de ports interne ; SFTP donne le fingerprint (« are you sure you're connected to an SSH server? »)
   - Vecteur d'escalade multisite : un admin de sous-site (frontière de confiance basse) sonde le réseau interne du host
   - PoC : reports/wpvivid-backup-plugin/pocs/exploit-ssrf-test-remote.sh

## 🔍 COUVERTURE — LES 5 PLUGINS SONT MAINTENANT TOUS PROFONDS ✅
- **UM 2.14.0** ✅ : nopriv, IP ban (FINDING 2), XSS, download CVE, reset, My Account, directory, staging
- **UR 5.2.8** ✅ : submit, mail logs (FINDING 1), REST, email-inject, async, drafts, modules PRO, content-restriction, My Account
- **Forminator 1.58.0** ✅ : submit, upload tokens, draft email, Stripe, XSS entries bout-en-bout, exports CSV (escape_csv_data), emails
- **WPFM 8.0.6** ✅ : backup/restore/logs, storage fail-closed, download, **multisite cross-subsite VALIDÉ en réel** (export blog 2 = 16 tables wp_2_* uniquement)
- **WPvivid 0.9.136** ✅ : restore v1/v2 + jumeaux, staging, vendor, **SSRF remote storages (FINDING 3)**

## 🏢 RÉSULTATS MULTISITE (sessions 7-8)
- WPFM cross-subsite fix : VALIDÉ (export blog 2 = tables wp_2_* uniquement, aucune fuite réseau)
- Isolation capabilities subadmin : confirmée (manage_options blog 2 oui / blog 1 non / manage_network non)
- WPvivid SSRF : le subadmin blog 2 exécute test_remote_connection (nonce + manage_options sur SON blog) → FINDING 3
- Restore WPFM : rejoue les dumps créés post-fix (tables du site appelant uniquement) — cohérent

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — détail : reports/BILAN-verification-dynamique.md

## 💡 PISTES RESTANTES (session 9+)
1. WPvivid autres remotes : amazons3/s3compat (endpoints S3 personnalisables → SSRF HTTP GET ?), dropbox/onedrive (URLs d'API fixes — faibles), webdav si présent
2. Fuzz elFinder WPFM (connecteur fichiers, session admin) : lecture hors racine ?
3. UM conditional logic : bypass champs required
4. UR payment webhooks : retours PayPal/Stripe paramétrables
5. WPvivid multisite : backups/restore du plugin sur le réseau (le plugin est maintenant actif sur blog 2 — comportement à tester)
6. test_send_mail WPvivid (class-wpvivid.php:412) : vecteur d'email arbitraire admin ?

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file (fichier par fichier, SHA via get_file_contents)
