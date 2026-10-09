# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## 🎯 Mission
Audit de sécurité des 5 plugins du repo. Couverture : TOUS les plugins. Rapports Wordfence pour chaque finding confirmé dynamiquement.

## ✅ VALIDATION DES VERSIONS (session 10)
**Les 5 zips du repo sont EXACTEMENT les dernières versions publiées sur wordpress.org** (vérifié via l'API plugins/info 1.2 le 2026-10-09) : UR 5.2.8, UM 2.14.0, WPvivid 0.9.136, WPFM 8.0.6, Forminator 1.58.0 → **les 3 rapports sont valides pour les versions actuelles**.

## 📦 Plugins
UR 5.2.8 · UM 2.14.0 · Forminator 1.58.0 · WPFM 8.0.6 · WPvivid 0.9.136

## ⚙️ ENVIRONNEMENT — 2 modes
Single-site : `bash scripts/setup-dynamic-env.sh` (127.0.0.1:8080, admin/adminPass123!, testsubscriber/subPass123!, UM form 7 page 13, UR form 19, tables wp_frmt_* + entry XSS)
Multisite : `bash scripts/setup-multisite-env.sh` (port 80 + router.php, /site2/, subadmin ID 7/SubAdmin123! admin blog 2 uniquement)
⚠️ Artefact connu multisite : le wp-config hybride rend ajaxurl = "http:///wordpress/..." (host vide) pour certaines pages admin du main site — le check same-origin de WPFM elFinder échoue POUR TOUS (y compris le JS légitime) dans CET environnement ; en production ça marcherait. Les défenses elFinder sont par ailleurs confirmées statiquement (uploadAllow image/text-plain, anti-LAN, manage_network en multisite, .tmb/.quarantine).

## ✅ FINDINGS CONFIRMÉS (3, soumettables Wordfence)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md
3. **WPvivid ≤ 0.9.136 — SSRF via test_remote_connection (CWE-918, admin/site)** → reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md (variante s3compat : SSRF HTTP PUT/DELETE via endpoint arbitraire — même handler)

## 🔍 SESSION 10 — BALAYAGE SYSTÉMATIQUE DES HANDLERS wp_ajax_
- **WPvivid : 97 handlers admin scannés automatiquement → 0 sans nonce+capability** (chaîne check_ajax_referer + manage_options + filtre wpvivid_ajax_check_security partout) — CSRF-résistant
- **Forminator : 125 handlers** — 107 flaggés par le premier scan grossier, mais vérification manuelle : la validation est CENTRALISÉE via forminator_validate_ajax (check_ajax_referer + forminator_is_user_allowed, helper-core.php:146) et validate_ajax des addons (class-integration-admin-ajax.php:96) → scanner affiné : 10 restants, tous vérifiés manuellement = protégés (get_nonce by-design, addon_* via validate_ajax, payment flows avec nonce au submit) → **0 vrais non-protégés**
- **UM : 6 flaggés / 37** — tous des handlers user-connectés (profile ajax) avec nonce vérifié précédemment
- **UR : 4 flaggés / 11** — nocache_headers + handlers membership déjà vérifiés (nonce)
- **WPFM : 2 flaggés / 10** — backup handlers vérifiés sessions précédentes (nonce+manage_options, + manage_network multisite pour elFinder)
- **elFinder fuzz HTTP** : bloqué par l'artefact ajaxurl de l'environnement (voir note) — défenses statiques complètes confirmées

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 🏁 ÉTAT : AUDIT COMPLET (sessions 1-10)
- 5 plugins en couverture PROFONDE et uniforme (endpoints publics, auth, admin, multisite, handlers systématiquement scannés)
- 3 findings soumettables + 3 PoC + 3 contrôles négatifs + 13 réfutations documentées
- 2 environnements reproductibles + mémoire complète (ce fichier)

## 💡 PISTES SESSION 11+ (fond, terrain épuisé)
1. Corriger l'artefact multisite (wp-config propre pour réseau) et refaire le fuzz elFinder HTTP complet
2. Fuzz du connecteur elFinder avec les commandes mkfile/put (contenu de fichiers) — au-delà de l'upload
3. Re-vérifier les findings quand de nouvelles versions sortiront

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings — push via github_app_create_or_update_file (fichier par fichier)
- Les 3 rapports Wordfence PRÊTS À SOUMETTRE
