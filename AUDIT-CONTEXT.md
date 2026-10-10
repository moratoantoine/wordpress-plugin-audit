# 📋 CONTEXTE PROJET — Audit WordPress (STRATÉGIE v4, session 24)

## 🎯 Stratégie v4 — grille High Threat Wordfence uniquement (voir REFERENCE.md pour la grille complète)
Rappel : ne chasser que Arbitrary PHP File Upload/Read/Deletion, Options Update, RCE, Auth Bypass to Admin, Priv Esc to Admin (>= 25 installs) ; Stored XSS applicatif + SQLi (>= 500) — le tout Unauth/Subscriber. OUT définitif : .htaccess/host-config, IP spoofing, SSRF, enumeration, PR:H, reflected XSS, CSRF, DoS.

## ✅ FINDINGS 1-6 : statut inchangé — tous hors scope Wordfence (rejet DM confirmé), redirigés Patchstack/WPScan

## 🔍 SESSION 24 — chasse High Threat (6 cibles majeures, toutes refermées avec preuves)
1. **DM showLockOptions** (nopriv jamais testé) : downloadLink HTML du form lock, by-design
2. **Options Update Subscriber** (scan 4 plugins round 2) : 0 hit — tous les update_option sont des writes internes (migrations/cron)
3. **PHP Object Injection** Fluent/NF : tous unserialize avec allowed_classes:false
4. **wpdm_category shortcode XSS** : packages créés par Author+ seulement (mid-level = hors scope)
5. **WJM submit-job complet (flux public majeur)** :
   - Soumission visiteur OK (nonce skipé pour non-connectés) ; job créé status preview (approval=1 par défaut)
   - XSS titre/description : kses WP strippé event handlers (onerror) ; <img src=x> sans handler autorisé (inoffensif, testé)
   - Metas company/application : esc_attr + wp_strip_all_tags + wp_kses_post (triple échappement, testé avec payloads)
   - IDOR job_id d'autrui : job_manager_user_can_edit_job → visitor=false → job_id réinitialisé (testé dynamiquement avec job preview d'un user A édité par visiteur B : job de A INTACT)
   - upload file : whitelist MIME stricte (s20)
6. **Fluent 16 handlers wp_ajax_ subscriber-tier** : tous derrière Acl::verify — subscriber → getCurrentUserCapability=false → refusé (testé dynamiquement) ; payments/install/migrate/ai tous Acl-gated

## 📊 Vérité statistique du projet (24 sessions)
Ces 10 plugins (versions récentes, massivement audités publiquement) sont extrêmement durcis sur les surfaces High Threat classiques. Les 6 findings trouvés étaient tous dans des catégories OUT du scope Wordfence (host-config, spoofing, SSRF, PR:H). La rareté d'un finding High Threat in-scope sur ce corpus est élevée — chaque session de chasse supplémentaire a un rendement marginal décroissant.

## 💡 Si session 25 : dernières pistes inexplorées
1. Les ADD-ONS/PRO présents physiquement dans les zips free (fluentform/app/Modules/Payments/... : code Pro embarqué ? vérifier les gatekeepers Pro du free)
2. Les intégrations Fluent (mailchimp_interest_groups, select_group_ajax_data : handlers intégrations tierces)
3. WPAI (1121 fichiers, le moins couvert) : ses cron/import endpoints avec chemins de fichiers
4. NF : les settings des champs stockés en nf3_field_meta avec unserialize (Model.php:344 allowed_classes:false — mais les gadgets de tableau ?)
5. Les vieux handlers de round 1 jamais retracés en contexte subscriber (pas admin) — re-grille UM/UR handlers avec l'oeil High Threat v4

## ⚙️ ENVIRONNEMENTS
wp2 port 8082 OK (config WJM test soumission publique active : submit page 21, requires_approval=1) · wp1 port 80 OK

## 📤 LIVRAISON
Branche vibe/dynamic-audit-findings — 6 rapports + PoC + vidéos + REFERENCE.md (grille complète) + env
