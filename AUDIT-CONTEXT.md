# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## 🎯 Mission
Audit de sécurité des 5 plugins WordPress présents dans ce repo (zips à la racine). Objectif : vulnérabilités réelles vérifiées DYNAMIQUEMENT (PoC + contrôle négatif), rapports au format Wordfence exact.

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
- PHP 8.2.34 statique → /tmp/php82 ; MariaDB 11.5.2 portable → 127.0.0.1:3306 (root, db wordpress/wp/wppass123)
- WordPress 6.7.1 (admin/adminPass123!, subscriber testsubscriber/subPass123!) sur 127.0.0.1:8080 (serveur intégré, .htaccess IGNORÉ = nginx)
- Formulaires : UM register form 7 page 13, UR form 19 (page register UR), drafts test : forminator ID 20, UR ID 22/23
⚠️ Relancer le serveur web entre sessions : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:8080 </dev/null >/tmp/php-srv.log 2>&1 &)`

## ✅ FINDINGS CONFIRMÉS (2, soumettables Wordfence)

### 1. User Registration & Membership ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)
- Logs email PAR DÉFAUT dans uploads/ur-logs/ (public) — emails + sujets en clair ; .htaccess Apache-only ; nom hashé HMAC(salts) calculable si salts par défaut
- Rapport : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md — PoC : reports/user-registration/pocs/exploit-info-disclosure-mail-logs.sh

### 2. Ultimate Member ≤ 2.14.0 — IP Ban Bypass via X-Forwarded-For (CWE-348, Unauth)
- um_user_ip() lit CLIENT_IP/XFF avant REMOTE_ADDR → la liste Block IP admin est contournable (testé : compte créé depuis IP bannie avec XFF: 8.8.8.8)
- Rapport : reports/ultimate-member/wordfence-report-ip-ban-bypass.md — PoC : reports/ultimate-member/pocs/exploit-ip-ban-bypass.sh

## ❌ LES 13 FINDINGS D'ORIGINE RÉFUTÉS (détail : reports/BILAN-verification-dynamique.md)

## 🔍 ANGLES COUVERTS (sessions 1-4, ne pas re-tester)
- Sessions 1-3 : tous wp_ajax_nopriv_, jumeaux WPvivid, webhook Stripe, XSS (wp_kses sain), rate-limit (REMOTE_ADDR ok), staging, access tokens Forminator, vendor obsolètes, email-injection UR (is_email bloque CRLF), load_form drafts (refuse), async/cron (nonce), password-reset UM, uploads UR, fix multisite WPFM (excellent), UM download CVE-2026-96451 (patché dans 2.14.0)
- Session 4 :
  - forminator_email_draft_link : nonce + token one-time hash_equals + consommation immédiate — durci, refermé
  - forminator_get_nonce nopriv : by-design (nonce de soumission publique)
 - quiz/poll Forminator : mêmes classes rendu → drafts refusés (vérifié session 3) ; preview_data → nonce preview + capability
  - WPFM inc/logs.php : page promo, rien ; wpfm_get_secure_backup_path : fail-closed à l'écriture, fm_get_key aléatoire en option — solide ; fm_download_backup : capability + regex filename + whitelist types + prepare
  - UR modules membership/payment-history : nopriv uniquement validate_stripe_card_mode (nonce+service) ; payment-history tous false ; REST content-restriction : manage_options partout ; urcr_get_template : templates fixes, pas de LFI
  - UR shortcode [user_registration_form] avec ID de DRAFT : get_form sans publish:true retourne le draft en interne MAIS tous les chemins de rendu produisent un wrapper vide (testé avec contenu réel copié) — non exploitable en output

## 💡 PISTES RESTANTES (session 5+)
1. Multisite complet : convertir l'install en réseau et tester WPFM residuals (tables third-party base-prefix sur main site) + le behavior de restore sur sous-site admin
2. UR My Account page (/my-account) : rendu des données utilisateur connecté — vérifier XSS sur meta rendues (session 4 : my_account draft len 2805 — non creusé)
3. Forminator submissions/entries : XSS admin lors de l'affichage des entrées (form-entry list/table) — jamais testé avec vrai payload
4. UM conditional logic fields : um_get_custom_field_array / conditions sur $_POST (bypass de required/visibility)
5. WPvivid remote storages (Google Drive S3 etc.) : handlers de test de connexion avec credentials saisis — SSRF ? (admin-only, faible)
6. UR webhook/payment return URLs : endpoints de retour PayPal/Stripe avec paramètres de contrôle

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file (fichier par fichier ; SHA requis pour update : get_file_contents d'abord)
- Après chaque finding : rapport Wordfence + PoC sh + mise à jour de ce fichier
