# 📋 CONTEXTE PROJET — Audit plugins WordPress (sessions 1-17)

## ✅ FINDINGS (4) + TRIAGE
1. UR mail logs (CWE-538, Unauth) — Wordfence bounty ✅
2. UM IP ban bypass (CWE-348, Unauth) — Wordfence borderline / WPScan
3. WPvivid SSRF (CWE-918, Admin) — WPScan
4. WPFM upload RCE fail-open (CWE-434, Admin) — WPScan
+ Faiblesse OAuth WPvivid (3 clouds, finish_auth sans current_user_can) — hardening vendor
+ Borderline : user-enum UR, weak-password UR, media_upload SSRF admin (même profil que #3)

## 🔍 SESSION 17 — DERNIERS CHEMINS INHABITUELS
1. media_upload WPFM (jamais testé) : nonce+manage_options ✅ MAIS upload_to_media_library télécharge une URL externe (esc_url_raw) = SSRF admin supplémentaire (même vecteur/auth que finding #3 — noté comme variante, pas nouveau rapport)
2. Fichiers vendor/secrets en direct : client_secrets.json/onedrive.json/dropbox.json N'EXISTENT PAS dans l'install (config inline) — aucun secret exposé — refermé
3. LFI par includes de templates : 0 include avec variable dans les 5 plugins (hors vendor) — refermé
4. Captcha UR : fail-open si désactivé/mal configuré (by-design), wp_safe_remote_get fixe l'host hCaptcha (pas de SSRF), response concaténé mais host contrôlé — refermé
5. MU-plugin WPvivid : pas de login custom, juste handler shutdown — refermé

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 🏁 CONCLUSION FINALE (17 sessions)
La totalité de la surface d'attaque réaliste des 5 plugins est couverte : endpoints (280 handlers scannés), REST, hooks init (OAuth), formulaires, uploads, emails, exports, crons, MU-plugins, templates, captcha, chaînes (5 explorées), global-state (1 bug impact-nul), multisite (réseau réel). Résultat stable : 4 findings soumettables + 1 hardening + 3 borderline documentés. Le rendement marginal de nouvelles sessions sur ce périmètre est désormais très faible — recommandation formelle : soumettre.

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 4 rapports Wordfence + 4 PoC + contrôles négatifs + 2 env reproductibles + contexte complet
