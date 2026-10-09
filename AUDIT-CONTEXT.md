# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v2)

## 🎯 Stratégie v2
Unauth/Subscriber dans catégories Wordfence payables uniquement (RCE, Arbitrary File Upload, Priv Esc, SQLi, Auth Bypass, Stored XSS, Sensitive Info Disclosure exploitable). OUT : admin-required, enumeration seule.

## ✅ FINDINGS RETENUS (3)

### 1. User Registration ≤ 5.2.8 — Info Disclosure mail logs (CWE-538, Unauth) — Wordfence
reports/user-registration/wordfence-report-info-disclosure-mail-logs.md + PoC + vidéo poc-1

### 2. Ultimate Member ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth) — Wordfence
reports/ultimate-member/wordfence-report-ip-ban-bypass.md + PoC + vidéo poc-2

### 3. Download Manager ≤ 3.3.72 — Accès direct aux fichiers de packages (CWE-538/284, Unauth) — Wordfence 🆕 SESSION 22
- Les fichiers de packages (password/role-locked) sont stockés dans uploads/download-manager-files/ avec leur NOM ORIGINAL (Packages.php:206)
- Seule protection : .htaccess Deny from all (Apache-ONLY) + index.php vide (anti-listing du fix CVE-2024-13126/3.3.07)
- Sur nginx/LiteSpeed/IIS : accès direct par nom devinable → 200 + contenu complet, CONTOURNE password/role/lock/masterkey (toutes les protections du flux ?wpdmdl)
- Testé dynamiquement : endpoint protégé = "You don't have permission" ✅ / URL directe = 200 + FUITE ✅ / listing = bloqué par index.php ✅
- DISTINCT du CVE-2024-13126 (listing vs accès direct par nom) — le fix index.php ne couvre PAS ce vecteur
- Rapport : reports/download-manager/wordfence-report-direct-file-access-bypass.md + PoC exploit-direct-file-access.sh
- → Wordfence (Unauth Sensitive Info Disclosure avec bypass complet des protections du plugin)

## 🔍 SESSIONS 20-22 — couverture complète des 10 plugins
Telemetry NF (manage_options ✅) · shortcodes round 2 (wpdm_direct_link vérifie isLocked ✅) · device ID DM (random_bytes 16 ✅) · keys DM (wp_generate_password 32 + stores multiples ✅) · ?wpdmdl handler (masterkey/key/lock/role checks ✅) · DM uploads dir = FINDING #6 ✅ · fichiers logs round 2 (aucun public)

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 3 rapports Wordfence + PoC + 2 vidéos + env reproductibles + contexte
