# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v2)

## 🎯 Stratégie v2 (en vigueur)

Cible EXCLUSIVE : **vulnérabilités Unauth ou Subscriber-level dans les catégories Wordfence payables**.

### IN-SCOPE (à chasser uniquement)
| Catégorie | Bounty typique (100k-1M installs) |
|---|---|
| Unauth RCE / Arbitrary File Upload | $600-1,600+ |
| Unauth Privilege Escalation | $600-1,600+ |
| Unauth SQLi | $320-1,000+ |
| Unauth Authentication Bypass | $600-1,600+ |
| Unauth Stored XSS | $320-1,000+ |
| Subscriber Priv Esc / Arbitrary File Read-Upload | $320-1,000+ |

### OUT (écartés dès la découverte — ne pas rapporter, ne pas documenter dans le repo)
- Tout ce qui exige Admin/Editor/Author/Contributor
- User/Email enumeration seule
- SSRF (sauf unauth + impact fort)
- Info disclosure seule (sauf secrets / exploitable en chaîne)
- Security feature bypass sans catégorie payable
- Reflected XSS, CSRF sans impact fort

## ✅ FINDINGS RETENUS (2)

### 1. User Registration & Membership ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)
- Logs email (adresses des inscrits + sujets) écrits par défaut dans uploads/ur-logs/ public ; .htaccess Apache-only ; nom de fichier hashé prévisible si salts par défaut
- Rapport : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
- PoC : reports/user-registration/pocs/exploit-info-disclosure-mail-logs.sh
- Vidéo : poc-videos/poc-1-ur-mail-logs.mp4 (générateur : poc-videos/video-1-ur-mail-logs.js)
- → Wordfence (bounty faible attendu)

### 2. Ultimate Member ≤ 2.14.0 — IP Ban Bypass via X-Forwarded-For (CWE-348, Unauth)
- um_user_ip() lit CLIENT_IP/X-Forwarded-For avant REMOTE_ADDR → la liste Block IP est contournable (testé : compte créé depuis IP bannie avec XFF: 8.8.8.8)
- Rapport : reports/ultimate-member/wordfence-report-ip-ban-bypass.md
- PoC : reports/ultimate-member/pocs/exploit-ip-ban-bypass.sh
- Vidéo : poc-videos/poc-2-um-ip-ban-bypass.mp4 (générateur : poc-videos/video-2-um-ip-ban.js)
- → Wordfence (bounty faible attendu)

## 🗑️ Findings écartés (stratégie v2) — supprimés du repo

3 findings découverts pendant l'audit ont été écartés car hors catégories Wordfence payables et leurs rapports/PoC/vidéos supprimés du repo :
- Download Manager ≤ 3.3.72 : user/email enumeration (Unauth mais catégorie non payable)
- WP File Manager ≤ 8.0.6 : upload RCE fail-open (Admin = hors scope)
- WPvivid ≤ 0.9.136 : SSRF (Admin = hors scope)

## 🆕 ROUND 2 — 5 plugins à auditer (chasse selon stratégie v2)

| Plugin | Version | Installs | Installé sur |
|---|---|---|---|
| Fluent Forms | 6.2.15 | 700 000 | wp2 (port 8082) |
| Ninja Forms | 3.15.5 | 500 000 | wp2 |
| Download Manager | 3.3.72 | 100 000 | wp2 |
| WP All Import | 4.1.3 | 100 000 | wp2 |
| WP Job Manager | 2.4.8 | 70 000 | wp2 |

### Chasse priorisée (par bounty)
1. **Upload sans auth → RCE Unauth** : job_manager_upload_file est nopriv ; conditionnel (option user_requires_account décochée = upload possible unauth) → si la validation MIME accepte .php en mode unauth = RCE Unauth (top bounty)
2. **Priv esc via formulaires publics** : Fluent Forms / Ninja Forms registrations — injecter rôles/caps dans les soumissions
3. **SQLi unauth** : endpoints nopriv avec paramètres SQL
4. **Auth bypass** : flux login custom download-manager (src/User/Login.php)
5. **Stored XSS unauth** : soumissions rendues côté admin (pattern entries)

## ⚙️ ENVIRONNEMENTS
- wp1 : multisite port 80 (round 1) — 5 plugins round 1 actifs
- **wp2 : single-site port 8082** (round 2) — WP 6.7.1, admin/adminPass123!, les 5 nouveaux plugins actifs
- Playwright opérationnel (libs Chromium user-space /tmp/chromium-libs) pour les vidéos

## ❌ Findings round 1 réfutés (13) — détail : reports/BILAN-verification-dynamique.md

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 2 rapports Wordfence + 2 PoC + 2 vidéos + env reproductibles + ce contexte
