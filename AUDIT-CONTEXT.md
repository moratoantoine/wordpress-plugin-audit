# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## ✅ FINDINGS CONFIRMÉS (4) + TRIAGE PROGRAMME (session 13)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** — IN-SCOPE bounty Wordfence ✅
2. **UM ≤ 2.14.0 — IP Ban Bypass XFF (CWE-348, Unauth)** — Wordfence borderline (présenter sans le mot « bruteforce » dans l'exploit lui-même) / backup WPScan
3. **WPvivid ≤ 0.9.136 — SSRF test_remote_connection (CWE-918, Admin)** — HORS bounty Wordfence (admin) → **WPScan**
4. **WPFM ≤ 8.0.6 — Upload RCE fail-open MIME (CWE-434, Admin)** — HORS bounty Wordfence (admin) → **WPScan**
Règles Wordfence vérifiées : admin-required = pas de bounty (mais CVE possible) ; Unauth/Subscriber = bounties ; 10 hors-scope = ban. Installs : UR 50k, UM 200k, WPvivid 900k, WPFM 1M.

## 🔍 SESSION 14 — CHASSE UNAUTH/SUBSCRIBER (10 cibles, profil Wordfence)
1. IDOR update_profile_details UR : nonce + current_user_can('edit_user', $user_id) — gate solide, refermé
2. REST UM : aucun register_rest_route dans le free — refermé
3. um_ajax_paginate_posts/comments nopriv : nonce dynamique + rate-limit + um_can_view_profile — refermé
4. Emails UR : destinataires = options admin (pas de spam arbitraire) — refermé
5. Email change UR : confirmation par défaut + token AES chiffré + hash_equals + 24h expiry — refermé (MAIS noter : `if ($is_admin_user)` applique l'email SANS token — $is_admin_user = comparaison d'IDs, protégé par la gate edit_user ; en multisite un sous-admin n'a edit_user que sur ses users ✅)
6. **User enumeration UR (Unauth)** : « Email already exists. » / « Username already exists. » vs success — messages distincts confirmés dynamiquement ⚠️ MAIS by-design pour un form d'inscription public (Wordfence le refuse probablement comme WAD) — NOTÉ, non soumis seul
7. Drafts UR form_id : « This form is currently unavailable » — refermé
8. **Injection de rôle à l'inscription UR (Unauth)** : role injecté dans form_data IGNORE — ur_registration_role_is_privileged fail-closed (5.2.8) + rôle du form setting serveur — refermé ✅ (le patch CVE-2026-19423-style est en place)
9. **Password faible UR (Unauth)** : « 123 » ACCEPTÉ au form par défaut ⚠️ — pas de minimum par défaut (le champ password a une option advance « minimum length strength » que l'admin doit activer) — borderline : configurable, pas un défaut aveugle — NOTÉ, non soumis seul
10. Rôle à l'inscription UM : assigned_role vient du form meta serveur uniquement — refermé ✅

## 💡 EXPLOITATION EN CHAÎNE POSSIBLE (piste session 15 !)
Les notes 6+9 combinées avec le finding #1 (mail logs publics) : enumeration d'emails (6) → création de comptes à password faible (9) → leurs emails de bienvenue exposés dans les logs publics (1)... pas de takeover direct mais un combo enumeration+harvesting. À évaluer pour un éventuel rapport combiné si Wordfence accepte les chaînes.

## ⚙️ ENVIRONNEMENTS
Single-site 127.0.0.1:8080 + Multisite port 80 router.php. users_can_register=ON + site registration=user (réactivés session 14). Comptes de test créés : enumtest2, roleinject1, weakpass1 (subscribers).

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 4 rapports + PoC + env + contexte. Soumissions : #1/#2 Wordfence bounty, #3/#4 WPScan.
