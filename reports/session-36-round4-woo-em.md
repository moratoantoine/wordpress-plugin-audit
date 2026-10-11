# Session 36 — Chasse 0D round 4 (suite 2): Woo StoreApi + Events Manager (2026-10-10)

## WooCommerce 11.2.1 (3664 fichiers, 352 REST)
- 39x __return_true: presque tous = StoreApi V1 (cart/checkout public by design pour guests) + Jetpack vendored (remote_authorize = protocole Jetpack, pas Woo)
- Cart token: JWT HS256 + secret '@'+wp_salt, hash_equals, alg strict (pas d'alg-confusion), expiration vérifiée → SOLIDE
- Authentication StoreApi: routes protégées via cart-token HMAC ou nonce standard → pas de 0D
- Verdict: pas de 0D sur les surfaces examinées (Woo est probablement le plugin le plus audité au monde)

## Events Manager 7.4.7 (734 fichiers)
### Geocoding search (nopriv) — DEAD CODE: la fonction em_ajax_geocoding_search est COMMENTÉE (bloc /* */) dans em-actions.php:926-951. L'ancienne SSRF-proxy potentielle n'existe plus.
### search_events / search_cats / search_tags / search_locations (nopriv, SANS nonce)
- Le clamp status (fix anti-disclosure déjà en place): em-events.php:914+ — sans edit_others_events, status forcé à published (draft/pending/trash/all/everything ignorés pour guests)
- get_post_search: $_REQUEST fusionné sans sanitize pour les clés acceptées MAIS build_sql_conditions protège chaque chemin SQL:
  - owner: is_numeric/array_is_numeric gate
  - scope: preg_match date validation sur les 2 branches (array + string), named scopes whitelisted
  - status: mots whitelisted (pending/publish/draft/trash/all/everything)
  - orderby/groupby: build_sql_x_by_helper = accepted_fields whitelist stricte
  - timezone: wp->prepare par élément
  - recurrence_set: array_is_numeric
- Verdict: surface SQLi entièrement validée, pas de 0D. Le clamp status empêche la disclosure draft/pending via AJAX nopriv.
- Note: les handlers nopriv n'ont PAS de nonce (search public by design) ni rate limit — mais DoS OOS.

## Bilan round 4 jusqu'ici
| Plugin | Statut |
|---|---|
| wpForo | audité complet (CVE-diff + 29 nopriv) — défendu |
| wpDiscuz | wmu upload + deleteAttachment — défendu |
| Dokan | contact_seller + Abilities (MCP) — défendu |
| WPForms | get_token (anti-spam bypass, low) + paypal nopriv restants |
| Formidable | Stripe frm_strp_amount analysé en profondeur — écart validation à tester avec Stripe test keys |
| WooCommerce | StoreApi/cart-token — défendu |
| Events Manager | search nopriv + SQL conditions — défendu (dead code geocoding) |
| TEC | pas encore |
| CF7 | statique seulement (PHP 8.3 requis) |

## Prochaines cibles
- TEC 103 REST routes (the-events-calendar: historique CVE récents sur REST)
- CF7 6.2.1 statique (includes/ : submit + upload handlers)
- Formidable PayPal get_amount nopriv
