# Tutor LMS <= 4.1.1 — Race Condition sur l'application de coupon (CVE-2026-42698)

## SOFTWARE DETAILS
- Type: WordPress Plugin
- Name: Tutor LMS – eLearning and online course solution
- Slug: tutor
- Affected Version(s): <= 4.1.1 (version testée : 4.1.1, extraite du zip du repo)

## VULNERABILITY DETAILS

### Description
Le plugin Tutor LMS vérifie les limites d'usage des coupons (`total_usage_limit` / `per_user_usage_limit`) via une lecture non-atomique du compteur d'usage (`CouponModel::get_coupon_usage_count()`) suivie d'une insertion séparée à la complétion de commande (`CouponController::store_coupon_usage()`). Aucun verrou ni transaction n'entoure la séquence read → check → write.

Un attaquant authentifié (Subscriber) peut envoyer plusieurs requêtes de checkout simultanées avec le même coupon : toutes les requêtes lisent le compteur AVANT qu'aucun usage ne soit enregistré, passent toutes la vérification `has_user_usage_limit()`, et complètent chacune une commande avec la remise. La limite d'usage est ainsi dépassée — un coupon limité à 1 usage peut être consommé N fois.

Chemin de données complet (vérifié dans le code ET dynamiquement) :
1. `POST /checkout/` avec `tutor_action=tutor_pay_now` + `coupon_code` (CheckoutController::pay_now, ecommerce/CheckoutController.php:559)
2. `prepare_checkout_items()` → `CouponModel::is_coupon_valid()` → `has_user_usage_limit()` (models/CouponModel.php:1044) — LIT le compteur via `get_coupon_usage_count()` (SELECT COUNT), sans lock
3. Commandes créées puis complétées pour total=0 (coupon 100%)
4. `HooksHandler` → `CouponController::store_coupon_usage()` → INSERT dans `wp_tutor_coupon_usages` — APRÈS la validation

### Vulnerability Type
Race Condition (CWE-362: Concurrent Execution using Shared Resource with Improper Synchronization)

### Impact Statement
Un attaquant authentifié (Subscriber+) peut réutiliser un coupon au-delà de sa limite d'usage (totale ou par utilisateur) en soumettant des checkouts simultanés, obtenant des remises non autorisées (jusqu'à 100% du prix des cours) et contournant les contrôles de revenus/limites marketing configurés par l'administrateur.

### CWE
CWE-362

### Authentication Level Required
Subscriber

## PROOF OF CONCEPT (testé, 2026-10-10, environnement wp3 — PHP 8.2, WordPress 6.7, MariaDB)

Prérequis :
- WordPress + Tutor LMS 4.1.1, monétization "tutor" activée, un cours payé (10 EUR)
- Un coupon "RACE26" : percentage 100%, total_usage_limit=1
- Un compte Subscriber

### Étape 1 — Contrôle séquentiel (doit échouer après 1 usage)
POST /wp-admin/admin-ajax.php `action=tutor_apply_coupon` + `coupon_code=RACE26`
Après 1 usage : `{"status_code":400,"message":"Coupon usage limit exceeded"}` ← limite ENFORCÉE en séquentiel

### Étape 2 — La race : 2 checkouts SIMULTANÉS (barrière de synchronisation)
2 threads POST /checkout/ avec `tutor_action=tutor_pay_now` + `coupon_code=RACE26`
(billing rempli, payment_method=free car total=0 avec coupon 100%)
Les 2 threads lâchent les requêtes en même temps (`threading.Barrier`)

### Étape 3 — Résultat observé (labo, serveur PHP 8 workers simultanés)
```
COUPON RACE26: total_usage_limit=1
USAGES: 2          ← LIMITE DÉPASSÉE (2 > 1)
ORDERS RACE26: 2
  order#5 [completed] coupon_amount=10.00 total=0.00
  order#6 [completed] coupon_amount=10.00 total=0.00
```
→ **Deux commandes complétées avec un coupon limité à 1 usage.** Chaque commande a accordé la remise de 10 EUR (100%).

### Contrôle négatif (même requête, séquentielle)
`{"status_code":400,"message":"Coupon usage limit exceeded","data":null}`

→ La limite fonctionne en séquentiel — c'est bien la concurrence qui contourne le contrôle.

## Références code
- https://patchstack.com/database/wordpress/plugin/tutor/vulnerabilities (Race Condition <= 4.1.1, publiée 8 Oct 2026, CVE-2026-42698, crédit Ananda Dhakal)
- models/CouponModel.php:1044 has_user_usage_limit (read non-atomique)
- ecommerce/CouponController.php:924 store_coupon_usage (insert différé)
- ecommerce/CheckoutController.php:559 pay_now

## Notes de soumission
- CVE-2026-42698 est DÉJÀ publiée par Patchstack (2 jours avant ce test) → ne PAS soumettre comme nouveau finding à Patchstack.
- Pour Wordfence : les race conditions exploitables facilement sont recevables ("likelihood of success relatively high"), et l'impact démontré (bypass de limite de coupon = perte financière directe) peut être argumenté comme échec de contrôle d'intégrité. Candidat à évaluer.
- Le PoC dynamique est reproductible : script `threading.Barrier` 2 threads + vérifs DB `wp_tutor_coupon_usages` / `wp_tutor_orders`.
