# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v4 — scope officiel Wordfence)

## 🎯 GRILLE DE CHASSE v4 (basée sur le scope officiel fourni)

### CIBLES IN-SCOPE EXCLUSIFS (High Threat = >= 25 installs ; Common = >= 500 ; Autre = >= 50 000 pour tier standard)
| # | Vulnérabilité | Seuil installs | Nos plugins éligibles (tous >= 50k sauf WPAI/WJM = 100k/70k)
|---|---|---|---|
| 1 | Arbitrary PHP File Upload or Read | >= 25 | TOUS |
| 2 | Arbitrary PHP File Deletion | >= 25 | TOUS |
| 3 | Arbitrary Options Update | >= 25 | TOUS |
| 4 | Remote Code Execution | >= 25 | TOUS |
| 5 | Authentication Bypass to Admin | >= 25 | TOUS |
| 6 | Privilege Escalation to Admin | >= 25 | TOUS |
| 7 | Stored XSS (rendu à d'autres via flux applicatif) | >= 500 | Fluent 700k, NF 500k, Ninja… |
| 8 | SQL Injection | >= 500 | Fluent 700k, NF 500k |
| 9 | LFI/RFI, Directory Traversal, Arbitrary File Download/Read | >= 50k | Fluent, NF, DM, WPAI, WJM |
| 10 | Priv Esc / Auth Bypass to Non-Admin | >= 50k | idem |
| 11 | Sensitive Info Disclosure (NON « Basic Info Exposure ») | >= 50k | idem |
| 12 | PHP Object Injection AVEC gadget | >= 50k | idem |

### OUT-OF-SCOPE EXPLICITES (à ne JAMAIS rapporter — leçons des rejets)
- .htaccess/nginx/host-config (confirmé par rejet DM) — TOUTE la famille « où sont les données physiquement » est morte
- **IP Spoofing** (= liste Common False Positives) → le finding UM #2 est probablement OUT
- SSRF (toutes catégories) → WPvivid SSRF était OUT
- User/Email enumeration (False Positive list) → DM enum était OUT
- Reflected XSS, CSRF, DoS, cache poisoning, open redirect
- Uploads dans uploads/ sans « site compromise »
- PHP Object Injection sans gadget exploitable
- Tout PR:H (admin/editor/shop manager/unfiltered_html)
- Tout mid-level (Contributor/Author)

## ✅ BILAN DES FINDINGS EXISTANTS vs v4
| Finding | Verdict v4 |
|---|---|
| UR mail logs | ❌ OUT (uploads dir sans site compromise + .htaccess) |
| UM IP ban bypass | ❌ OUT probable (IP Spoofing = False Positive) |
| DM direct file access | ❌ REJETÉ (confirmé) |
| NF export CSV | ❌ OUT (même pattern) |
| WPvivid SSRF | ❌ OUT (SSRF explicite) |
| WPFM RCE admin | ❌ OUT (PR:H) |

**Aucun finding actuel n'est soumettable Wordfence sous la grille v4.** Les 6 rapports restent valides pour Patchstack/WPScan (grilles différentes).

## 🆕 CHASSE v4 — angles applicatifs purs sur les 10 plugins
1. **Arbitrary Options Update** : chercher update_option() reachable par Subscriber (settings non protégées)
2. **Priv Esc via rôle** : formulaires d'inscription publics avec champ role exploitable (attention : injection de role déjà testée UR — résistée — à étendre aux 9 autres)
3. **Stored XSS applicatif** : données utilisateur rendues dans du HTML côté serveur (pas React/JS) chez Fluent/NF/DM
4. **PHP File Read** : file_get_contents/readfile avec paramètre contrôlable Subscriber (pas admin)
5. **PHP Object Injection avec gadget** : unserialize() sur données contrôlables + classes du plugin en gadget (pas seulement allowed_classes=false)
6. **Auth Bypass** : flux de login custom (DM Login.php — déjà vu durci, mais re-vérifier les variantes)

## ⚙️ ENVIRONNEMENTS
wp1 multisite port 80 · wp2 single-site port 8082 (admin/adminPass123!, round 2 actifs)

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 6 rapports (tous redirigés Patchstack/WPScan) + PoC + vidéos + env
