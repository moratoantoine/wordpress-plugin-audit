# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v3 — post-rejet)

## 🚨 LEÇON DU REJET (Finding DM « Content Disclosure (Private Content) » — Rejected, Oct 10 2026)

Wordfence rejette le pattern **« .htaccess Apache-only + host-dependent (nginx) »** : ils le classent comme un problème de CONFIG SERVEUR, pas du plugin (le plugin a déployé une protection « raisonnable » avec .htaccess).

### Règle de triage v3 (cumule v2)
OUT (écartés d'office) :
- Admin/Editor/Author/Contributor required
- User/Email enumeration seule
- SSRF admin
- **🆕 Toute divulgation par fichier dans uploads/ protégé par .htaccess et dépendante du webserver (nginx)** — rejet confirmé par triage DM

## ✅ FINDINGS RETENUS (2 — après application v3)

### 1. User Registration ≤ 5.2.8 — mail logs (CWE-538, Unauth) ⚠️ RISQUE DE REJET
Pattern .htaccess-nginx → probablement rejeté sur la même base. Peut-être soutenable si argumenté différemment (le log contient des PII par DÉFAUT sans action admin — contrairement à DM où l'admin a choisi de mettre des fichiers). À toi de décider si tu soumets ou non.

### 2. Ultimate Member ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth) ✅ SOLIDE
Ce finding N'EST PAS touché par la règle du rejet : le contournement (um_user_ip() lit les headers client avant REMOTE_ADDR) est purement applicatif, aucun facteur serveur. C'est notre meilleur candidat.

## ❌ RÉTROGRADÉS (pattern rejeté — .htaccess/nginx)
- DM direct file access (#3) — REJETÉ par Wordfence (confirmé)
- NF export CSV (#4) — même pattern, ne pas soumettre
- (UR mail logs = borderline, même famille)

## 🎯 STRATÉGIE v3 POUR LA SUITE DES RECHERCHES
Ne chasser QUE des failles **100% applicatives** (aucune dépendance serveur) :
1. Auth bypass applicatif (login/nonce/token logic)
2. Priv esc par injection de rôle/cap dans les flux applicatifs
3. SQLi (toujours applicatif)
4. XSS stocké rendu par le plugin (pas dépendant du serveur)
5. IDOR entre utilisateurs (accès aux données d'autrui via handlers applicatifs)

Le pattern « où sont les données physiquement » est MORTE comme catégorie Wordfence — garder les 3 rapports pour un éventuel dépôt Patchstack/WPScan à la place (ils publient ce type de findings, ex. les 76 vulns DM déjà chez Patchstack).

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — le finding UM IP ban = priorité soumission ; les 3 pattern-htaccess peuvent partir chez Patchstack/WPScan
