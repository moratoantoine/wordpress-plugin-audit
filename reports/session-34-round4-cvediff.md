# Session 34 — Round 4: CVE-diff chasse wpForo + labo wp4 monté (2026-10-10)

## Labo wp4 (port 8084, DB wp_audit4)
- 9 nouveaux plugins installés: CF7 6.2.1 (STATIQUE SEULEMENT — exige PHP 8.3, nous avons 8.2.34), Dokan 5.3.0, Events Manager 7.4.7, Formidable 6.35, TEC 6.18.0, WooCommerce 11.2.1, wpDiscuz 7.6.72, WPForms 2.0.2.2, wpForo 3.2.2
- Note: CLI exige memory_limit=1G (Woo+TEC+wpForo ensemble)

## CVE-diff (l'idée du jour: "regarde où ça flanchait, cherche le jumeau non patché")
- wpForo: CVE-2026-93747 Stored XSS <=3.1.6 via champ profil 'telegram' (Subscriber+) — NOTRE zip 3.2.2 = PATCHÉ
  - Patch vérifié par test dynamique complet: form profile_update (wpfaction) avec payloads XSS dans skype/telegram/facebook/twitter/instagram
  - SAVE: sanitize_field(text)=sanitize_text_field strip les tags (DB = 'SKYPE-XSS-3' propre)
  - RENDER: esc_html à l'affichage profil (vérifié en guest: &lt;img escaped)
  - Champs URL (facebook): FILTER_VALIDATE_URL rejette javascript: → toute la mise à jour avortée
- wpForo: CVE-2026-1581 SQLi time-based <=2.4.14 (param wpfob) — patché depuis 2.4.15, notre 3.2.2 OK

## Zones wpForo vérifiées (toutes défendues)
- 29 handlers nopriv: nonce wpforo + referer check (Error 2252/2253) + forum_can/owns_post
- is_display_value_safe_html: safe_names (skype/location/signature/about) rendus sans esc_html MAIS l'écriture sanitisé partout → pas de chemin raw reachable
- wpforo_check_request filter: aucun plugin ne le désactive → nonce always-on
- AI handlers nopriv: semantic_search=manage_options, summarize/translate=usergroup perm + view_access par topic/post
- get_member_template/overview/chunk nopriv: nonce + view_access
- bigintval: numeric-only (SQLi safe)

## Points notables (non-failles)
- facebook/javascript: URI stocké via injection CLI directe (bypass form) → rendu via esc_url_raw (scheme stripped)
- Les custom fields socials ne sont éditables que par usergroups avec 'em' (admin) MAIS le validate() du form permet au proprio du profil de les soumettre (can_edit owner-based)
- Le render members.php utilise esc_url_raw/esc_attr partout (skype: href="skype:"+esc_attr — scheme après skype: non exécutable)

## Prochaines cibles CVE-diff
- Dokan 5.3.0 (contact_seller nopriv + 104 REST routes)
- wpDiscuz 7.6.72 (social login nopriv)
- Formidable 6.35 (paypal/stripe nopriv webhooks)
- WPForms 2.0.2.2 (nopriv submit + restricted_email)
