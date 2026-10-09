# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v2)

## 🎯 Stratégie v2 (en vigueur)
Cible EXCLUSIVE : Unauth/Subscriber dans les catégories Wordfence payables (RCE, Arbitrary File Upload, Priv Esc, SQLi, Auth Bypass, Stored XSS, File Read). OUT : admin-required, enumeration seule, SSRF admin, info disclosure seule.

## ✅ FINDINGS RETENUS (2)
1. UR ≤ 5.2.8 mail logs (CWE-538, Unauth) — Wordfence — reports/user-registration/ + vidéo poc-1
2. UM ≤ 2.14.0 IP ban bypass (CWE-348, Unauth) — Wordfence — reports/ultimate-member/ + vidéo poc-2

## 🔍 SESSION 20 — CHASSE STRATÉGIE v2 SUR LES 10 PLUGINS (toutes cibles refermées)
1. **WP Job Manager upload_file nopriv → RCE ?** : whitelist MIME stricte (jpg/gif/png/pdf/doc/docx, job_manager_get_allowed_mime_types) + wp_handle_upload avec vérif serveur → PAS de RCE, refermé
2. **Priv esc via Fluent Forms** : le free n'a PAS de module user registration (addon Pro) → refermé
3. **Stored XSS unauth Fluent Forms** : form réel créé + soumission XSS acceptée (insert_id=1) MAIS rendu des entries = React/JS (échappement natif framework) + emails = contenu texte → refermé
4. **REST __return_true exhaustif (10 plugins)** : forminator 1 (Stripe webhook, HMAC validé s2), download-manager 4, wp-job-manager 5 :
   - DM /wpdm/search unauth : testé dynamiquement avec 4 packages (publish/private/password/draft) → NE retourne QUE les publish NON-protégés (total=1, l'ID publish seul ; password-protected exclu par WP_Query) → refermé (by-design search public)
   - DM validate-password : hash_equals strict (durci anti type-juggling) → by-design oracle de password de package (le form demande le mot de passe)
   - DM validate-captcha : nonce NONCE_KEY + comparaison stricte (s19) → durci
   - WJM receive-wpcom-license-key : custom_nonce aléatoire 15 chars + hash_equals + TTL 60s → protégé
   - WJM promoted-jobs (4 routes) : get_job_data re-assert password + capability + job_manager_user_can_view_job_listing (le code montre un audit antérieur) → protégés
5. **SQLi unauth (10 plugins)** : balayage $wpdb avec input direct → 0 hit sur les 5 round 2 ; UM = faux positifs (prepare multi-lignes) ; WPAI 58 non-prepare = admin-only → refermé

## 🆕 ROUND 2 — couverture restante selon stratégie v2
- Ninja Forms REST (nf-be-data, submissions, views) : à vérifier (seule surface round 2 non couverte)
- Fluent Forms : test des conditional logic / bypass required (piste s19)
- WPAI : historique/ imports mode non-secure (borderline conditionnel, s19)
- Round 1 : surfaces Unauth déjà épuisées (sessions 1-17)

## ⚙️ ENVIRONNEMENTS
wp1 multisite port 80 (round 1) · wp2 single-site port 8082 (round 2, 5 nouveaux actifs, admin/adminPass123!) · Fluent form ID 3 créé · packages DM de test 5-8 créés (à nettoyer si besoin)

## ❌ Findings round 1 réfutés (13) — reports/BILAN-verification-dynamique.md

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 2 rapports Wordfence + PoC + vidéos + env + contexte
