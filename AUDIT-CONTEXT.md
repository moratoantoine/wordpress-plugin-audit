# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v2)

## 🎯 Stratégie v2
Unauth/Subscriber dans catégories Wordfence payables uniquement. OUT : admin-required, enumeration seule.

## ✅ FINDINGS RETENUS (4)

### 1. User Registration ≤ 5.2.8 — Info Disclosure mail logs (CWE-538, Unauth) — Wordfence
reports/user-registration/wordfence-report-info-disclosure-mail-logs.md + PoC + vidéo poc-1

### 2. Ultimate Member ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth) — Wordfence
reports/ultimate-member/wordfence-report-ip-ban-bypass.md + PoC + vidéo poc-2

### 3. Download Manager ≤ 3.3.72 — Accès direct fichiers de packages (CWE-538/284, Unauth) — Wordfence
reports/download-manager/wordfence-report-direct-file-access-bypass.md + PoC exploit-direct-file-access.sh
- Fichiers de packages dans uploads/download-manager-files/ avec nom ORIGINAL, .htaccess Apache-only → bypass password/role/lock sur nginx (distinct du CVE-2024-13126 listing)

### 4. Ninja Forms ≤ 3.15.5 — Export CSV direct access (CWE-538, Unauth) — Wordfence 🆕 SESSION 23
reports/ninja-forms/wordfence-report-export-csv-direct-access.md + PoC exploit-export-csv-direct-access.sh
- Export CSV des soumissions (PII) dans uploads/nf-field-exports/, .htaccess Apache-only (FieldUtils.php:1033)
- Nom ENTIERMENT PRÉVISIBLE : field-export_{label}_{form_id}_{datetime}.csv (label public + form_id + timestamp seconde)
- Testé : 200 + données fuitées (noms/emails/téléphones des 3 soumissions)
- Précondition : admin a fait un export (workflow suppression de champ) — le CSV RESTE sur disque après

## 🔍 SESSION 23 — application du pattern #6 aux autres plugins
- Fluent Forms : FLUENTFORM_UPLOAD_DIR non défini dans le free (uploads Pro-only) → pas de fichiers côté free — refermé
- WP Job Manager / WP All Import : pas de wp_upload_dir de fichiers sensibles découverts à ce stade (à confirmer)
- Ninja Forms : nf-field-exports/ → FINDING #4 (ce rapport) ✅

## 💡 Le pattern gagnant du projet (à réutiliser)
**« Où sont physiquement les données ? »** — chercher les wp_upload_dir/mkdir_p de données sensibles + vérifier la protection : .htaccess Apache-only + nom devinable = finding. Appliqué : UR logs (#1), DM files (#3), NF exports (#4).

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 4 rapports Wordfence + 4 PoC + 2 vidéos + env reproductibles
