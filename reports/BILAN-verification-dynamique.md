# BILAN DE LA VÉRIFICATION DYNAMIQUE — 5 plugins (WordPress 6.7.1 / PHP 8.2.34 / MariaDB 11.5.2)

Environnement de test construit sans Docker ni root : PHP 8.2 statique (jcleng/staticphpbuild), MariaDB 11.5.2 portable (bootstrap manuel), WordPress 6.7.1 installé par wp_install(), les 5 plugins extraits des zips du repo et activés. Site en loopback 127.0.0.1:8080 (serveur intégré PHP, 8 workers — .htaccess ignoré, comportement identique à nginx pour l'accès aux fichiers).

## Vérification des 13 findings statiques d'origine — TOUS RÉFUTÉS

| # | Finding d'origine | Test dynamique | Verdict |
|---|---|---|---|
| 1 | WPvivid Unauth RCE (wpvivid_do_restore_2) | nonce invalide 403 ; code vérifie check_ajax_referer + current_user_can('manage_options') (class-wpvivid-restore2.php:604-611) | Réfuté — patch CVE-2024-10705 en place |
| 2 | UM File Upload RCE (um_fileupload) | .php, .php5, .pht, .php.txt, .PHP tous rejetés ; .txt accepté avec nom haché sha1 | Réfuté — whitelist stricte |
| 3 | Forminator Nonce Bypass RCE | constante FORMINATOR_FORCE_VALIDATE_SUBMISSIONS_NONCE à définir par l'admin, pas par l'attaquant | Réfuté — pas de chemin input→impact |
| 4 | WPFM SQLi→RCE (db-restore.php) | admin+nonce 400 ; code durci (CVE-2026-19708) | Réfuté |
| 5 | UR Blind SQLi (functions-ur-admin.php:186,265) | fonctions GDPR (admin), user_id issu de get_user_by() | Réfuté — pas de chemin attaquant |
| 6 | UR Arbitrary Registration | inscription avec nonce invalide réussit MAIS respecte users_can_register=0 | Réfuté — comportement by-design (formulaire public) |
| 7 | UM Path Traversal (class-files.php) | esc_url_raw + um_is_temp_upload borne l'unlink au temp dir + nonce | Réfuté |
| 8 | Forminator Path Traversal upload | sanitize_file_name + wp_check_filetype partout | Réfuté |
| 9 | UM IDOR (um_get_members) | 403 sans nonce ; check_ajax_referer('um-directory-') + can_view_directory() | Réfuté |
| 10 | UR Info Disclosure REST | 401 rest_forbidden ; capability manage_user_registration | Réfuté |
| 11 | WPvivid Info Disclosure (restauration) | même protection que #1 | Réfuté |
| 12 | WPFM Arbitrary File Write (db-backup.php) | admin+nonce (400 en test) | Réfuté |
| 13 | WPFM Info Disclosure (métadonnées backup) | handler logs admin+nonce | Réfuté |

Variantes handlers jumeaux vérifiées : tous les handlers nopriv de restauration WPvivid (get_restore_progress_2, finish_restore_2, restore_failed_2, v1 wpvivid_restore, wpvivid_get_restore_progress) sont protégés à l'identique (nonce + manage_options). Le webhook Stripe Forminator (permission_callback __return_true) valide la signature HMAC Stripe.

## NOUVEAU FINDING CONFIRMÉ DYNAMIQUEMENT

### User Registration & Membership ≤ 5.2.8 — Information Disclosure des logs email (CWE-538, Unauth)

- Le handler de log fichier est enregistré PAR DÉFAUT (ur_register_default_log_handler, functions-ur-core.php:2134) — aucune option à activer.
- Chaque email sortant (inscription, reset) logge destinataire + sujet en clair (class-ur-emailer.php:300-342) dans uploads/ur-logs/ur_mail_logs-{wp_hash}.log.
- Vérifié dynamiquement : le fichier est servi en HTTP 200 immédiatement après une inscription (serveur non-Apache : nginx, IIS, PHP intégré ignorent le .htaccess deny from all).
- Le nom de fichier est un HMAC-MD5 clé sur AUTH_KEY/AUTH_SALT — calculable hors-ligne pour les installations aux salts par défaut/faibles.
- Contrôle négatif : mauvais hash 404. Contrôle positif : bon hash 200 avec emails en clair.
- Impact : collecte d'adresses email d'utilisateurs inscrits, user enumeration, phishing ciblé.
- Rapport Wordfence : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
- PoC : reports/user-registration/pocs/exploit-info-disclosure-mail-logs.sh

## Autres observations (defense-in-depth, non soumettables seules)

1. UM temp uploads publics : uploads/ultimatemember/temp/ sert les fichiers avant validation, nommé par hash de contenu (risque faible).
2. Forminator temp : même pattern Apache-only (.htaccess Require all denied).
3. Forminator ships samples/ : accessible en HTTP direct, erreur fatale PHP (divulgation de chemin si display_errors=On — config serveur).
4. UR nonce de soumission non vérifié : ur_process_registration() reçoit $nonce_value mais ne le vérifie jamais ; contrôle d'accès uniquement via users_can_register (lacune de durcissement).
