# 📤 GUIDE DE SOUMISSION — 5 Vulnerability Reports (triage final v2)

## Triage final (règles Wordfence vérifiées : admin-required = hors bounty ; catégories HIGH THREAT / COMMON AND DANGEROUS uniquement pour le bounty)

| # | Plugin | Vuln | Auth | Programme | Statut |
|---|---|---|---|---|---|
| 1 | User Registration ≤ 5.2.8 | Info Disclosure mail logs (CWE-538) | Unauth | **Wordfence** (bounty faible, $0-50) | Soumettable — conditionnel (non-Apache + salts défaut) ; la valeur est faible mais Unauth Info Disclosure est une catégorie acceptée. Vidéo déjà générée : poc-videos/poc-1-ur-mail-logs.mp4 |
| 2 | Ultimate Member ≤ 2.14.0 | IP Ban Bypass X-Forwarded-For (CWE-348) | Unauth | **Wordfence** (bounty faible) ou WPScan | Soumettable — Security Feature Bypass Unauth ; présenter l'exploit sans le terme bruteforce dans l'exploit direct. Vidéo déjà générée : poc-videos/poc-2-um-ip-ban-bypass.mp4 |
| 3 | Download Manager ≤ 3.3.72 | User/Email Enumeration resetPassword (CWE-203) | Unauth | **WPScan** | Hors scope bounty Wordfence (pas dans HIGH THREAT / COMMON AND DANGEROUS) — MAIS catégorie standard chez WPScan (des centaines d'advisories user enumeration dans leur base) → soumettre à WPScan pour advisory + CVE potentielle |
| 4 | WP File Manager ≤ 8.0.6 | Upload RCE fail-open MIME (CWE-434) | Admin | **WPScan** | Hors scope Wordfence (auth admin = pas de bounty). RCE authenticated admin = catégorie standard WPScan. Le fail-open du filtre annoncé (uploadAllow non fonctionnel) est un vrai défaut documenté avec contrôle négatif |
| 5 | WPvivid Backup ≤ 0.9.136 | SSRF test_remote_connection (CWE-918) | Admin | **WPScan** | Hors scope Wordfence (auth admin). SSRF authenticated admin = catégorie standard WPScan. Variantes : s3compat (SSRF HTTP PUT/DELETE endpoint arbitraire), media_upload WPFM (URL externe) |

## Décision recommandée
1. **Soumettre #1 et #2 à Wordfence** (bugcrowd.wordfence.com) — unauth + vidéos prêtes. Attente réaliste : bounty faible ($0-50 chacun), mais la soumission est quasi-gratuite (les rapports et vidéos existent)
2. **Soumettre #3, #4, #5 à WPScan** (wpscan.com) — advisory + CVE potentielle pour chacun. WPScan ne paie pas de bounty mais publie ces trois catégories en routine (user enum, RCE authenticated, SSRF authenticated)
3. **Ne PAS soumettre #3/#4/#5 en bounty Wordfence** (règle : 10 hors-scope = risque de ban)

## 📹 Vidéos PoC (exigence Wordfence)
Les vidéos des findings #1 et #2 sont déjà générées et poussées (MP4 H.264, 1920x1080, 36-41s) : poc-videos/poc-1-ur-mail-logs.mp4, poc-videos/poc-2-um-ip-ban-bypass.mp4. Les 4 générateurs Playwright (video-1..4.js) sont dans poc-videos/ pour reproduire ou générer celles des findings WPScan si besoin.

## ✅ Checklist avant soumission
1. Compte chercheur sur wordfence.com (requis pour le bounty) — sinon formulaire non-authentifié = pas de bounty
2. Wordfence : copier le rapport .md dans le formulaire + joindre le MP4 correspondant
3. Certifier « PoC tested step-by-step: YES » (chaque PoC a été réellement exécuté dans l'environnement de test)
4. Ne pas divulguer publiquement avant la fin du responsible disclosure
5. WPScan : soumettre via wpscan.com (formulaire "Report a Vulnerability") avec le rapport technique + PoC
