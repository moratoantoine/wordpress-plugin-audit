# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## ✅ FINDINGS CONFIRMÉS (4, soumettables Wordfence)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md — emails/sujets PII, PAS de clés de reset (vérifié session 13 : le body avec {{key}} n'est jamais loggé, seulement to/subject)
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md — RENFORCEMENT session 13 : UM n'a AUCUN lockout/throttle natif sur le login → chaîne complète ban-bypass + bruteforce illimité (documenter comme aggravation du rapport)
3. **WPvivid ≤ 0.9.136 — SSRF via test_remote_connection (CWE-918, admin/site)** → reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md (variante s3compat)
4. **WPFM ≤ 8.0.6 — Upload RCE fail-open MIME (CWE-434, admin)** → reports/wp-file-manager/wordfence-report-upload-rce-fail-open-mime.md — RENFORCEMENT session 13 : les ZIP passent aussi (application/zip accepté) ; seule l'EXTRACTION est contrôlée

## ⚙️ ENVIRONNEMENTS
Single-site 127.0.0.1:8080 + Multisite port 80 router.php (/site2/, subadmin). ⚠️ Ne jamais laisser WP_HOME en port 8080 en multisite (siteurl = DB). elFinder opérationnel : root hash l1_Lw, nonce = fmfparams.nonce de la page admin, Referer same-origin requis.

## 🔗 SESSION 13 — CHAÎNES D'ATTAQUE (5 explorées)
1. **Shortcode WPFM frontend → RCE low-priv** : shortcode = feature PRO seulement (free l'admin seul) → chaîne NON applicable au free, refermée
2. **IP ban bypass + bruteforce** : UM n'a AUCUN lockout natif (wp_login_failed hook delegate aux plugins tiers, aucune limite interne) → le finding #2 devient une CHAÎNE : banni + XFF spoof = ban bypassé + attempts illimitées sur le form login UM → à ajouter comme aggravation au rapport #2
3. **Zip Slip via elFinder extract** : testé dynamiquement avec zip contenant ../../evil.txt → extraction en QUARANTAINE + nettoyage des chemins : les fichiers traversal atterrissent DANS la racine (pas dehors), le second rejeté → elFinder défendu, refermé. NB: l'upload du zip lui-même passe le fail-open MIME (renforce #4)
4. **public_path admin (Preference)** : soudé à ABSPATH + strip ../ → pas de montage de dirs arbitraires, refermé
5. **Reset-password key → log public (chaîne critique potentielle du finding #1)** : lost_password_email passe bien par process_and_send_email (le flux loggé) MAIS le log ne contient JAMAIS le body (seulement to/subject/template_id dans « Email details », et to/subject/headers/attachments dans wp_mail_failed) → la clé de reset n'atteint PAS le log → finding #1 reste PII disclosure (emails + sujets), PAS account takeover → intégrité du rapport #1 préservée

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 🏁 ÉTAT (sessions 1-13)
4 findings soumettables + aggravations en chaîne documentées (#2 bruteforce illimité, #4 zips). Pattern du projet : fail-open de contrôles annoncés. Les 3 rapports « aggravés » à mettre à jour avant soumission : #2 (chaîne bruteforce), #1 (précision pas-de-clés), #4 (zip aussi).

## 💡 PISTES SESSION 14+
1. Mettre à jour les 3 rapports avec les aggravations de chaîne de la session 13
2. Autres chaînes : XSS stocké UM display_name (session 2 : sanitize à l'entrée mais si un ADMIN édite un profil avec display_name HTML via wp-admin ?) → tester si user-edit admin bypass le sanitize UM

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 4 rapports + PoC + env reproductibles + ce contexte
