# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v2)

## 🎯 Stratégie v2
Unauth/Subscriber dans catégories Wordfence payables uniquement (RCE, File Upload, Priv Esc, SQLi, Auth Bypass, Stored XSS, File Read). OUT : admin, enum seule, SSRF admin, disclosure seule.

## ✅ FINDINGS RETENUS (2)
1. UR ≤ 5.2.8 mail logs (CWE-538, Unauth) — Wordfence — reports/user-registration/ + vidéo poc-1
2. UM ≤ 2.14.0 IP ban bypass (CWE-348, Unauth) — Wordfence — reports/ultimate-member/ + vidéo poc-2

## 🔍 SESSION 21 — NINJA FORMS REST (dernière surface round 2) — REFERMÉE
- **nf-be-data/store** (Telemetry) : à re-vérifier mais mineur
- **Token views Ninja** : système solide — secret 128 hex random, rotation 90j, HMAC-SHA256, hash_equals, expiration 15 min, formIds signés, rate limiter 60/min, MAX_TOKEN_LENGTH anti-DoS, validateSignatureOnly séparé
- **Accès croisé testé dynamiquement** : token du form public 9 → form secret 16 = **401 bloqué** (le check in_array(formId, token.formIds) tient)
- **Route forms (collection)** : filtrée par formIds du token (pas d'énumération des forms)
- **Bloc submissions-table public** : testé de bout en bout (page publique → token public dans le HTML → REST → 3 soumissions d'autres utilisateurs lues) MAIS **by-design** : c'est la fonction même du bloc que l'admin insère volontairement (modèle sécurité Issue #8013 : filtre allowed_block_types_all + strip content_save_pre + capability pour les drafts — triple défense documentée dans le code)
- **Submissions format NF3** reconstitué (nf_sub posts + _form_id + _seq_num + _field_N) — get_subs() fonctionnel

## 🏁 CONCLUSION DE LA CHASSE STRATÉGIE v2 (sessions 20-21)
Toutes les surfaces Unauth/Subscriber des 10 plugins sont épuisées :
- Round 1 (5 plugins) : sessions 1-17, tout couvert
- Round 2 (5 plugins) : upload WJM (MIME strict), priv esc Fluent (Pro only), XSS Fluent (rendu React), REST unauth DM (search by-design, validate-password hash_equals, captcha nonce), REST WJM (nonces aléatoires + gates re-assertées), SQLi 10 plugins (0 hit réel), Ninja REST (token system solide, cross-form bloqué, bloc by-design)

**Résultat : les 2 findings retenus restent les seuls soumettables Wordfence.** Les 10 plugins sont des versions récentes durcies par des audits antérieurs. Le pattern du projet : les failles restantes sont by-design (bloc public Ninja) ou config-conditionnelles (option admin).

## 💡 Si nouvelle session
1. Vérifier nf-be-data/store (Telemetry NF — dernière route non testée)
2. Test bruteforce du token Ninja (rate limiter 60/min permet-il assez de requêtes ?)
3. Nouveaux plugins si ajoutés au repo

## ⚙️ ENVIRONNEMENTS
wp1 multisite port 80 · wp2 single-site port 8082 (admin/adminPass123!, 5 plugins round 2 actifs, NF form 9 avec 3 subs + form secret 16 + page 14 avec bloc)

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 2 rapports Wordfence + PoC + vidéos + env + contexte
