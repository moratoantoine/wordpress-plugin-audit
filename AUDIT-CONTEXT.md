# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## 🎯 Mission
Audit de sécurité des 5 plugins du repo. Objectif : vulnérabilités réelles vérifiées DYNAMIQUEMENT (PoC + contrôle négatif), rapports Wordfence exacts. Couverture : TOUS les plugins, à chaque session.

## 📦 Plugins (versions du header PHP)
| Plugin | Slug | Version |
|---|---|---|
| Forminator | forminator | 1.58.0 |
| Ultimate Member | ultimate-member | 2.14.0 |
| User Registration | user-registration | 5.2.8 |
| WP File Manager | wp-file-manager | 8.0.6 |
| WPvivid Backup | wpvivid-backuprestore | 0.9.136 |

## ⚙️ Environnement (scripts/setup-dynamic-env.sh)
loopback 127.0.0.1:8080 — admin/adminPass123!, testsubscriber/subPass123! — UM form 7 page 13, UR form 19, UM account page 16. **Tables Forminator wp_frmt_* créées + entry ID 1 avec payload XSS en meta text-1** (prêt pour tests rendu/exports).
⚠️ Relancer serveur : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:8080 </dev/null >/tmp/php-srv.log 2>&1 &)`

## ✅ FINDINGS CONFIRMÉS (2, soumettables Wordfence)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md

## 🔍 COUVERTURE PAR PLUGIN (sessions 1-6)

### Ultimate Member 2.14.0 — PROFOND ✅
Handlers nopriv (upload/resize/remove/get_members/select_options/paginate), IP ban (FINDING), rate-limit (REMOTE_ADDR ok), XSS allowlist wp_kses (saine), download CVE (patché), password reset (pattern core), My Account rendus (échappés — testé avec payload first_name/display_name), account.php:98 display_name 'html' = self-XSS seulement (UM sanitize les composants à l'entrée via sanitize_text_field, um-actions-account.php:139), members directory défaut (sain), shortcodes, staging nopriv (commentés), conditional hooks

### User Registration 5.2.8 — PROFOND ✅
Form submit nopriv (by-design + respecte users_can_register), mail logs (FINDING), REST (tous capability-checkés + analytics 401), email injection (is_email bloque CRLF — testé), GDPR SQLi (pas de chemin), async/cron (nonce), shortcode drafts (wrapper vide — testé), modules membership/payment (nopriv unique = validate_stripe_card_mode avec nonce), content-restriction REST (manage_options), LFI urcr_get_template (templates fixes), My Account meta (rendus via inputs value échappés — testé), uploads profile-pictures (vides + 404)

### Forminator 1.58.0 — PROFOND ✅
Submit nopriv (nonce), upload + access tokens (transient 32 chars révocable), email_draft_link (token one-time hash_equals), webhook Stripe (HMAC), load_form/quiz/poll (drafts refusés — testé ID 20), XSS entries **tracé de bout en bout** (render_entry retourne brut MAIS toutes les sorties admin = wp_kses/esc_html/wp_strip_all_tags — refermé), **exports CSV : escape_csv_data préfixe ' devant =+-@ \t\r\n (durcissement en place, référmé)**, emails (subject = wp_strip_all_tags, corps HTML mais rendu client mail non soumettable)

### WP File Manager 8.0.6 — CORRECT ✅ (reste: multisite, fuzz elFinder session)
Backup/restore/logs (admin+nonce+regex filename+whitelist types), storage fail-closed (CVE-2026-19708 fixé), fm_download (capability+whitelist), fm_key aléatoire, legacy dir protections, multisite fix db-export-scope (excellent — longest-prefix match)

### WPvivid 0.9.136 — CORRECT ✅ (reste: remote storages SSRF admin, multisite, code interne admin-only)
Tous handlers restore/staging v1+v2 (nonce+manage_options, jumeaux inclus), vendor (guzzle 6.3.3/3.9.3, php-jwt 5.0.0 obsolètes MAIS chemins OAuth admin→Google inatteignables — observation supply-chain), uploaders, feedback

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — détail : reports/BILAN-verification-dynamique.md

## 💡 PISTES RESTANTES (session 7+)
1. **Multisite complet** (le plus gros trou de couverture) : convertir l'install en réseau, tester WPFM residuals + restore depuis sous-site + UR/UM sur réseau
2. **WPvivid remote storages** : handlers de test de connexion (S3/GDrive/FTP) — SSRF admin-only
3. **Fuzz elFinder WPFM** : le connecteur (lib/php) avec session admin — lecture de fichiers hors racine ?
4. UM conditional logic : um_get_custom_field_array — bypass de champs required/visibility
5. UR payment webhooks : retours PayPal/Stripe avec paramètres contrôlables
6. WPvivid includes/ interne (1410 fichiers) : chemins admin-only non couverts ligne par ligne (CSRF/XSS admin)

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file (fichier par fichier, SHA via get_file_contents)
- Après chaque finding : rapport Wordfence + PoC sh + mise à jour de ce fichier
