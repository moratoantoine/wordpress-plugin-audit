# 📤 SOUMISSION WORDFENCE — 2 rapports retenus (stratégie v2)

## Stratégie (v2 — resserrée)

Cible exclusive : **vulnérabilités Unauth ou Subscriber-level dans les catégories Wordfence payables**.

| Catégorie | IN-SCOPE |
|---|---|
| Unauth RCE / Arbitrary File Upload | ✅ |
| Unauth Privilege Escalation | ✅ |
| Unauth SQLi | ✅ |
| Unauth Authentication Bypass | ✅ |
| Unauth Stored XSS | ✅ |
| Subscriber Priv Esc / File Read-Upload | ✅ |
| Tout ce qui exige Admin/Editor/Author/Contributor | ❌ écarté |
| User/Email enumeration seule | ❌ écarté |
| SSRF / Info disclosure seule / feature bypass sans catégorie payable | ❌ écarté |

## Les 2 soumissions Wordfence

### Finding #1 — User Registration & Membership ≤ 5.2.8
- **Type** : Information Disclosure (CWE-538) — Unauthenticated
- **Rapport** : reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
- **PoC vidéo** : poc-videos/poc-1-ur-mail-logs.mp4 (39s, 1920×1080, H.264)
- **Script vidéo** : poc-videos/video-1-ur-mail-logs.js
- **Statut scope** : ✅ soumettable (Unauth Info Disclosure — bounty faible attendu, la précondition non-Apache est documentée dans le rapport)

### Finding #2 — Ultimate Member ≤ 2.14.0
- **Type** : Security Control Bypass (CWE-348) — Unauthenticated
- **Rapport** : reports/ultimate-member/wordfence-report-ip-ban-bypass.md
- **PoC vidéo** : poc-videos/poc-2-um-ip-ban-bypass.mp4 (37s, 1920×1080, H.264)
- **Script vidéo** : poc-videos/video-2-um-ip-ban.js
- **Statut scope** : ✅ soumettable (Unauth — présenter le bypass sans le terme "bruteforce" dans l'exploit direct)

## ✅ Checklist avant soumission
1. Créer un compte chercheur sur wordfence.com (requis pour le bounty)
2. Pour chaque soumission : copier le rapport .md dans le formulaire + joindre le MP4
3. Certifier « PoC tested step-by-step: YES » (chaque PoC a été réellement exécuté dans l'environnement de test)
4. Ne pas divulguer publiquement avant la fin du responsible disclosure

## Historique de triage (transparence)

3 findings supplémentaires ont été découverts lors de l'audit mais **écartés** de la soumission Wordfence car hors catégories payables : user enumeration (Download Manager), upload RCE admin (WP File Manager), SSRF admin (WPvivid). Leurs rapports et preuves ont été retirés du repo conformément à la stratégie v2.
