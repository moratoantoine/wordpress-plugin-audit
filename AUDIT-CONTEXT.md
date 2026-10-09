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
- PHP 8.2.34 statique (jcleng/staticphpbuild) → /tmp/php82 ; MariaDB 11.5.2 portable (AndyTargino/mariadb-portable-driver) → 127.0.0.1:3306 root sans mdp, db wordpress/wp/wppass123
- WordPress 6.7.1 (admin/adminPass123!, subscriber testsubscriber/subPass123!) sur 127.0.0.1:8080 (serveur intégré PHP, .htaccess IGNORÉ = comportement nginx)
- Formulaires prêts : UM register form 7 page 13 (nonce: name="_wpnonce" sur la page), UR form 19, UM members page 14
⚠️ Le serveur PHP meurt entre sessions bash → relancer : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:8080 </dev/null >/tmp/php-srv.log 2>&1 &)`
⚠️ MariaDB survit avec setsid ; nonces liés au token de session (CLI ≠ HTTP).

## ✅ FINDINGS CONFIRMÉS (2)

### 1. User Registration & Membership ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)
- Logs email écrits PAR DÉFAUT dans uploads/ur-logs/ (répertoire web public) — emails des inscrits + sujets en clair (class-ur-emailer.php:300-342)
- .htaccess deny from all = Apache-only → nginx/IIS/PHP intégré servent le fichier en 200
- Nom = ur_mail_logs-{HMAC-MD5(salt)}.log → calculable hors-ligne si salts par défaut (put your unique phrase here → cf529820450a38fa278b56d5618d80bb)
- Rapport : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md — PoC : reports/user-registration/pocs/exploit-info-disclosure-mail-logs.sh

### 2. Ultimate Member ≤ 2.14.0 — IP Ban Bypass via X-Forwarded-For (CWE-348, Unauth) 🆕 SESSION 2
- um_user_ip() (um-short-functions.php:279-312) lit HTTP_CLIENT_IP puis X-Forwarded-For AVANT REMOTE_ADDR
- Utilisé par um_submit_form_errors_hook__blockedips (um-actions-form.php:53-66) pour la liste Block IP admin
- Testé dynamiquement : IP 127.0.0.1 bannie → POST register sans header = 302 err=blocked_ip ; AVEC X-Forwarded-For: 8.8.8.8 → compte créé (um_user=bypassip1, ID 6)
- Vérifié : pas de doublon CVE (CVE-2023-3460, CVE-2026-19423 etc. = autres sujets)
- Rapport : reports/ultimate-member/wordfence-report-ip-ban-bypass.md — PoC : reports/ultimate-member/pocs/exploit-ip-ban-bypass.sh

## ❌ LES 13 FINDINGS D'ORIGINE RÉFUTÉS (détail dans reports/BILAN-verification-dynamique.md)
WPvivid RCE/ID (patché CVE-2024-10705), UM Upload RCE (whitelist), Forminator nonce-const (admin-defined), WPFM SQLi/write/ID (admin+nonce, durci CVE-2026-19708), UR SQLi GDPR (pas d'entrée), UR registration (by-design), UM traversal (borné), Forminator traversal (sanitize), UM IDOR (nonce+can_view), UR REST ID (capability).

## 🔍 ANGLES DÉJÀ COUVERTS (sessions 1-2, ne pas re-tester)
- Tous les wp_ajax_nopriv_ des 5 plugins ; handlers jumeaux WPvivid (protégés) ; webhook Stripe Forminator (HMAC ok)
- XSS : allowlist wp_kses UM saine (pas de onerror/script) ; account.php:98 um_user('display_name','html') = self-XSS seulement ; UR colonnes admin échappées
- Rate-limiting UM is_rate_limited() : utilise REMOTE_ADDR correctement (non spoofable) — c'est um_user_ip() qui est fautif (→ finding #2)
- WPvivid staging : tous les nopriv commentés, wp_ajax_ protégés nonce+manage_options
- Forminator upload access tokens (class-upload-access.php) : transient 32 chars lié au form, révoqué après usage, fallback file_name exige un nom temporaire non devinable (wp_generate_password(12)) — bien conçu
- Vendor WPvivid : guzzle 6.3.3 (CVE-2022-31042+), guzzle 3.9.3, firebase/php-jwt v5.0.0 (CVE-2021-46719) OBSOLÈTES mais chemins d'attaque inatteignables par un attaquant (OAuth admin→Google uniquement) — observation supply-chain, non soumettable
- Members directory UM par défaut : ne liste rien sans config — sain

## 💡 PISTES RESTANTES (session 3+)
1. Multisite : monter un réseau WP et re-tester les exports backup WPFM (fix cross-subsite récent = code frais, db-export-scope.php)
2. Emails UR : injection d'en-têtes (paramètre to/subject contrôlable via form ?) — class-ur-emailer.php, non testé
3. Emails UM : idem — templates et expéditeurs configurables
4. forminator_load_form / forminator_get_nonce nopriv : fuzz des paramètres (module_id arbitraire → données ?)
5. WPFM logs.php / system_properties.php : contenus exposés en direct ?
6. UR conditional logic (um_get_custom_field_array) : logique de conditions sur $_POST — tentatives de bypass de champs required
7. Cron/async UR (wp-async-request.php) : jobs de fond avec données contrôlables

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file FONCTIONNE (fichier par fichier) ; push multiple/branches/git direct bloqués par le sandbox
- Après chaque finding : rapport Wordfence + PoC sh + mise à jour de ce fichier
