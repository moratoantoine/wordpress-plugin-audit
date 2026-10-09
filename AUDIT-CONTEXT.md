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
- Formulaires prêts : UM register form 7 page 13 (nonce: name="_wpnonce" sur la page), UR form 19, UM members page 14 ; Draft forminator ID 20
⚠️ Le serveur PHP meurt entre sessions bash → relancer : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:8080 </dev/null >/tmp/php-srv.log 2>&1 &)`
⚠️ MariaDB survit avec setsid ; nonces liés au token de session (CLI ≠ HTTP).

## ✅ FINDINGS CONFIRMÉS (2, soumettables Wordfence)

### 1. User Registration & Membership ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)
- Logs email écrits PAR DÉFAUT dans uploads/ur-logs/ (répertoire web public) — emails des inscrits + sujets en clair (class-ur-emailer.php:300-342)
- .htaccess deny from all = Apache-only → nginx/IIS/PHP intégré servent le fichier en 200
- Nom = ur_mail_logs-{HMAC-MD5(salt)}.log → calculable hors-ligne si salts par défaut (put your unique phrase here → cf529820450a38fa278b56d5618d80bb)
- Rapport : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md — PoC : reports/user-registration/pocs/exploit-info-disclosure-mail-logs.sh

### 2. Ultimate Member ≤ 2.14.0 — IP Ban Bypass via X-Forwarded-For (CWE-348, Unauth)
- um_user_ip() (um-short-functions.php:279-312) lit HTTP_CLIENT_IP puis X-Forwarded-For AVANT REMOTE_ADDR
- Utilisé par um_submit_form_errors_hook__blockedips (um-actions-form.php:53-66) pour la liste Block IP admin
- Testé dynamiquement : IP 127.0.0.1 bannie → POST register sans header = 302 err=blocked_ip ; AVEC X-Forwarded-For: 8.8.8.8 → compte créé (um_user=bypassip1)
- Pas de doublon CVE (CVE-2023-3460, CVE-2026-19423 etc. = autres sujets)
- Rapport : reports/ultimate-member/wordfence-report-ip-ban-bypass.md — PoC : reports/ultimate-member/pocs/exploit-ip-ban-bypass.sh

## ❌ LES 13 FINDINGS D'ORIGINE RÉFUTÉS (détail dans reports/BILAN-verification-dynamique.md)

## 🔍 ANGLES COUVERTS (sessions 1-3, ne pas re-tester)
- Tous les wp_ajax_nopriv_ des 5 plugins ; handlers jumeaux WPvivid (protégés) ; webhook Stripe Forminator (HMAC ok)
- XSS : allowlist wp_kses UM saine ; account.php:98 self-XSS only ; UR colonnes admin échappées ; pas de $_GET/REQUEST rendu sans échappement (UM/UR/Forminator vérifiés)
- Rate-limiting UM is_rate_limited() : REMOTE_ADDR correct — um_user_ip() fautif (→ finding #2)
- WPvivid staging : nopriv commentés, protégés ; vendor obsolète (guzzle 6.3.3/3.9.3, php-jwt 5.0.0 CVE-2021-46719) mais chemins inatteignables (OAuth admin→Google)
- Forminator upload access tokens : bien conçu (transient 32 chars, révoqué, fallback non devinable) ; forminator_load_form avec ID de DRAFT → html vide, refuse les non-publiés (testé ID 20)
- Members directory UM défaut : sain
- Injection en-têtes email UR : rejeté — is_email() bloque CRLF (testé dynamiquement %0A rejeté) ; headers From/Reply-To = options admin uniquement ; smart tags → corps uniquement
- Async/cron UR : WP_Async_Request/WP_Background_Updater = pattern WooCommerce standard, nonce check_ajax_referer (protégé)
- Password reset UM : pattern core WP (cookie + check_password_reset_key + hash_equals) — correct
- uploads UR profile-pictures : vide + 404 direct — sain
- Multisite WPFM db-export-scope.php : fix récent EXCELLENT (longest-prefix match, exclusion globales, refuse blog_id client, testé sur vrai réseau 2 subsites selon commentaires) — aucune faille visible ; la piste multisite reste OUVERTE uniquement pour tester d'autres paths sur un vrai réseau

## 💡 PISTES RESTANTES (session 4+)
1. Multisite complet : convertir l'install en réseau (subdomains/subdirs) et tester les exports WPFM depuis un sous-site admin — le fix semble bon mais un vrai réseau permet de vérifier les RESIDUALS documentés (tables third-party base-prefix sur main site)
2. Forminator forminator_email_draft_link nopriv : non testé en détail (fuzz emails)
3. WPFM mk_file_manager_backup logs/callback : vérifier wpfm_write_backup_protection_files_at et le chemin legacy
4. UR membership/payment modules (modules/) : surface PRO non encore auditée (membership AJAX, payment-history)
5. Forminator quiz/poll nopriv (forminator_load_quiz, forminator_load_poll) : fuzz des IDs et données de réponses
6. UM um_download (CVE-2026-96451 dans versions ≤2.13.1 — vérifier si 2.14.0 patché, sinon VARIANTES du download_routing)

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file FONCTIONNE (fichier par fichier, SHA requis pour update via get_file_contents d'abord) ; push multiple/git direct bloqués par le sandbox
- Après chaque finding : rapport Wordfence + PoC sh + mise à jour de ce fichier
