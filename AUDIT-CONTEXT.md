# 📋 CONTEXTE PROJET — Audit plugins WordPress (sessions 1-15)

## ✅ FINDINGS (4) + TRIAGE
1. UR mail logs (CWE-538, Unauth) — Wordfence bounty ✅
2. UM IP ban bypass (CWE-348, Unauth) — Wordfence borderline / WPScan backup
3. WPvivid SSRF (CWE-918, Admin) — WPScan
4. WPFM upload RCE fail-open (CWE-434, Admin) — WPScan
Notes borderline (non soumises seules) : user-enum UR, password faible UR (by-design/configurable)

## 🔍 SESSION 15 — ANGLES RADICAUX (5 explorés)
1. **Fuite de metas privées sur profil public UM** : champ phone_number public=1 rendu au visiteur — BY DESIGN (l'admin choisit public) ; le pattern des CVE 2.11.0 (allowed_fields avant required_perm) est PATCHÉ dans 2.14.0 (um_can_view_field appliqué partout : profile, files, directory) — refermé
2. **um_fetch_user global state sans um_reset_user (audit systémique)** : compté fetch/reset par fichier — class-users.php 18/0 MAIS pattern temp_id save/restore correct ; um-filters-avatars.php : **BUG RÉEL TROUVÉ** — `if (!empty($temp_id))` rate la restauration quand temp_id=0 (visiteur non-connecté) → l'état global UM reste commuté sur l'avatar-rendering ; IMPACT QUASI-NUL (visiteur sans caps, fin de requête) — noté, non soumettable
3. **um_dispatch_email (Action Scheduler)** : args uniquement internes (enqueue_async_action du plugin) — pas d'input externe dans user_email/tags — refermé
4. Secure fields/member-directory : tous protégés par um_can_view_field en 2.14.0 — refermé
5. set_status/deactivate UM : pattern temp_id correct partout — refermé

## ⚠️ SUBTILITÉS ENVIRONNEMENT
- users_can_register=1 + site registration=user (réactivés s14)
- Champ phone_number ajouté au profil form UM 9 (by-design test) + metas sensibles sur testsubscriber — à nettoyer si env partagé

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 💡 PISTES SESSION 16
1. **Bug um_get_avatar (temp_id=0 sans restore)** : chercher un hook footer/shutdown qui lit um_user() après le rendu avatar → si un code sensible s'exécute après, il lit l'avatar-user. En CLI/cron (Action Scheduler UM) ce serait critique
2. Cookies UM : um_profile_id cookie — flags httpOnly/secure, session fixation ?
3. Hooks core rares (wp_login, password_reset) des 5 plugins : fuites dans les handlers ?

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 4 rapports + PoC + env + contexte
