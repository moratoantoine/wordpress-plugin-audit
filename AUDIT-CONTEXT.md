# 📋 CONTEXTE PROJET — Audit plugins WordPress (sessions 1-16)

## ✅ FINDINGS (4) + TRIAGE
1. UR mail logs (CWE-538, Unauth) — Wordfence bounty ✅
2. UM IP ban bypass (CWE-348, Unauth) — Wordfence borderline / WPScan
3. WPvivid SSRF (CWE-918, Admin) — WPScan
4. WPFM upload RCE fail-open (CWE-434, Admin) — WPScan
Borderline (non soumises seules) : user-enum UR, weak-password UR

## 🔍 SESSION 16 — CHEMINS PEU COMMUNS (Wordfence in-scope)
1. **Poisoning OAuth des remotes WPvivid (Google Drive/Dropbox/OneDrive)** ⚠️ FAIBLESSE RÉELLE DOCUMENTÉE :
   - handle_auth_actions sur init : le départ `wpvivid_*_auth` exige manage_options ✅
   - MAIS les callbacks `wpvivid_*_finish_auth` (Google/Dropbox/OneDrive, class-wpvivid-*.php) ne vérifient QUE le match du transient auth_id (900s) — **AUCUN current_user_can au retour**
   - Le POST des tokens (access_token/refresh_token) est accepté sans session ; l'auth_id voyage dans l'URL de redirection Google (setState) → historique navigateur/Referer
   - Impact potentiel : injecter SES tokens dans le transient en cours → l'admin sauvegarde ses backups (dump complet DB) vers le Drive de l'attaquant
   - Préconditions fortes (connaître l'auth_id aléatoire dans la fenêtre 900s via fuite Referer/historique) → NON soumettable Wordfence (unrealistic conditions) mais **hardening à mentionner au vendor** (le check manage_options devrait être répété au callback)
2. wpvivid_restore_failed (nopriv de restauration) : nonce + manage_options — refermé
3. MU-plugin de restauration WPvivid : contenu statique copié du plugin, handler shutdown fixe — refermé
4. Callbacks OAuth testés dynamiquement : finish_auth répond aux non-connectés mais transient fake = return silencieux — la gate transient tient

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 🏁 ÉTAT GÉNÉRAL (16 sessions)
4 findings soumettables + 1 faiblesse OAuth (hardening vendor) + 2 borderline + le bug um_get_avatar (impact nul). Toutes les surfaces Unauth/Sub des 5 plugins épuisées systématiquement : la surface restante exige des préconditions irréalistes.

## 💡 SI SESSION 17
1. Soumettre les 4 findings (2 Wordfence : #1 + chaîne #1, #2 ; 2 WPScan : #3, #4)
2. Ou nouveaux plugins dans le repo si tu en ajoutes

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 4 rapports + PoC + env + contexte
