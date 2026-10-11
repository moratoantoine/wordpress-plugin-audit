# Session 35 — Chasse 0D round 4 (2026-10-10, suite)

## Cibles testées ce tour

### WPForms get_token (nopriv)
- ajax_get_token retourne token anti-spam valide (md5(date+secret)) à tout guest avec formId
- = bypass du token anti-spam → bots peuvent spammer les forms. Connu/low, pas notre 0D.

### wpDiscuz Media Uploader (wmu)
- uploadFiles: validation isAllowedFileType (ext===clé ET mime content via wp_get_image_mime/finfo)
- Défaut = images only; polyglot jpg avec PHP dedans = "malicious content in safe file types" = Wordfence FP
- uploadSingleFile: filename = sanitize_file_name + microtime; ext non re-vérifié ici MAIS validé en amont
- deleteAttachment: AES-encrypted ID (key=__FILE__), ownership via canUserEditComment → pas d'IDOR
- Verdict: pas de 0D

### Dokan contact_seller (nopriv)
- nonce + sanitize_email + recaptcha optionnel → email propre (from_address = contact_email sanitisé)
- Verdict: pas de 0D

### Formidable Stripe frm_strp_amount (nopriv) — ANALYSE PROFONDE 🎯
- Chaîne: update_intent_ajax (nopriv + nonce frm_strp_ajax public) → update_intent_pricing:
  - intent client-fourni, récupéré depuis Stripe (get_intent), metadata->action doit matcher une action réelle
  - amount = formule admin ($action->post_content['amount'])
  - generate_false_entry($form_data) → metas 100% contrôlés par le client (wp_kses_post sur valeurs)
  - process_shortcodes → frm_content → replace_content_shortcodes: [field] remplacé par valeurs client
  - sanitize_embedded_shortcodes neutralise l'injection de shortcodes 2e couche ([ → &#91;) ✅ défendu
  - L'AMOUNT du Stripe PaymentIntent est mis à jour avec le résultat → la charge réelle !
- Au submit (trigger_gateway): prepare_amount recalculé avec $_POST réel PUIS update_intent à nouveau (serveur re-set l'amount AVANT confirmation) → le client ne peut pas garder un intent manipulé avec un montant différent du POST final... SAUF si le POST final contient la même valeur manipulée (champ user-priced légitime).
- L'écart 0D potentiel: le path nopriv AJAX skip les validations de champs Formidable (min/max/required). Un attacker peut: page1 du form → intent créé avec montant initial → POST frm_strp_amount avec item_meta[price]=0.01 → intent mis à jour à 0.01 → complete card → POST final avec price=0.01 passe les validations si min non défini... = business logic si validations absentes. À tester dynamiquement avec Stripe test keys.
- verify_intent au submit: client_secret vérifié + intent_matches_form_action + pas de charges existantes + pas de paiement dupliqué → anti-replay solide.

## Prochaines cibles
- Formidable PayPal get_amount (nopriv) — même pattern à vérifier
- Woo 352 REST routes — survey des permission_callbacks faibles
- Events Manager 29 REST + TEC 103 REST — survey
