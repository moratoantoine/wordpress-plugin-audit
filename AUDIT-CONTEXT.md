# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## ✅ FINDINGS CONFIRMÉS (4, soumettables Wordfence)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** → reports/ultimate-member/wordfence-report-ip-ban-bypass.md
3. **WPvivid ≤ 0.9.136 — SSRF via test_remote_connection (CWE-918, admin/site)** → reports/wpvivid-backup-plugin/wordfence-report-ssrf-test-remote-connection.md (variante s3compat)
4. **WPFM ≤ 8.0.6 — Upload RCE fail-open MIME (CWE-434, admin) 🆕 SESSION 12** → reports/wp-file-manager/wordfence-report-upload-rce-fail-open-mime.md
   - uploadAllow: image,text/plain est NON-FONCTIONNEL : uploadDeny VIDE + uploadOrder (deny,allow) = logique Apache Order → défaut ALLOW pour TOUT MIME
   - Prouvé dynamiquement : shell.php uploadé à la RACINE ABSPATH via le connecteur elFinder (nonce + session admin légitimes), **EXÉCUTÉ** (PWNED), puis nettoyé
   - Contrôle négatif : les 2 remédiations (deny peuplé OU order allow-deny) rejettent text/x-php — seule la config livrée fail-open
   - Angle trouvé par : correction de l'artefact multisite (siteurl DB corrompu réparé) → fuzz elFinder HTTP complet → uploadAllow annoncé ne filtre rien

## ⚙️ ENVIRONNEMENTS (scripts/setup-dynamic-env.sh + setup-multisite-env.sh)
Single-site: 127.0.0.1:8080. Multisite: port 80 + router.php, /site2/, subadmin admin blog 2. **FIX session 12** : le siteurl DB avait été corrompu (http:///wordpress) par les tests CLI — corrigé en http://127.0.0.1 → les pages admin (ajaxurl/fmfparams) fonctionnent, elFinder opérationnel (root hash l1_Lw).
⚠️ Ne PAS laisser un wp-config avec WP_HOME en port 8080 en multisite ; le siteurl/home vient de la DB.

## 🔍 SESSION 12 — LE FUZZ ELFINDER A PORTÉ
- Artefact corrigé (WP_HOME retiré + siteurl DB réparé) → connecteur elFinder pleinement opérationnel en HTTP
- Tests : open racine (l1_Lw) OK, upload shell.php → **ACCEPTÉ** (mime text/x-php passé !), upload .txt OK, exécution du shell → RCE prouvé, nettoyage
- Racine : allowPutMime (elFinderVolumeDriver:4494) = Order deny,allow avec deny vide → default ALLOW. Le uploadAllow n'est consulté que pour surcharger un deny — inutile si deny vide
- Contexte d'attaque honnête : admin single-site (manage_options) ou super admin multisite (manage_network) ; le filtre annoncé par le plugin ne fonctionne pas = fail-open réel, exploitable via accès étendu (feature PRO « give access to user roles ») ou toute vuln secondaire

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS — reports/BILAN-verification-dynamique.md

## 🏁 ÉTAT (sessions 1-12)
4 findings soumettables (2 Unauth, 1 SSRF admin, 1 RCE admin fail-open) + PoC + contrôles négatifs. 5 plugins couverture PROFONDE. ~50 surfaces refermées. Le pattern récurrent du projet : **les défauts restants sont des fail-open de contrôles annoncés** (logs « protégés » par .htaccess Apache-only, IP ban basé sur headers, allow-list sans effet).

## 💡 PISTES SESSION 13+
1. Vérifier si d'autres volumes elFinder de WPFM (Trash t1_Lw, ou la config public_path admin) permettent des écritures hors racine avec le même fail-open
2. re-vérifier les 4 findings à chaque nouvelle version

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 4 rapports Wordfence PRÊTS À SOUMETTRE + PoC + env reproductibles
