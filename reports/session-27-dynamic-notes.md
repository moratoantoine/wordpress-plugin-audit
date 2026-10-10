# Session 27 (dynamique, post-session-26) — 2026-10-10

## Couvert cette session (tous NÉGATIFS / défenses solides)
- UM um_imageupload/um_fileupload/um_resize_image (nopriv): nonce um_upload_nonce-ts + prefilter wp_handle_upload_prefilter → validation AVANT move (PHP-in-GIF rejeté, rien sur disque). delete_file: temp-dir only.
- UM ajax_select_options: callbacks allowlist admin (empty default → refus), blacklist internal+WP funcs.
- UM member directory sorting_query: sortby gated in_array custom_sort admin; prepare_search sanitize.
- UM account/profile edit: um_current_user_can('edit') — verrouillé sur get_current_user_id + caps.
- UR update_profile_details IDOR: edit_user cap — fermé (contrôle négatif propre).
- UR role assignment à l'inscription: ur_registration_role_is_privileged() fail-closed (caps restricted list), role toujours subscriber si non-admin.
- UR registration AJAX sans nonce: intentionnel (formulaire public), approval/check_status_on_login server-side → false positive Wordfence (registration intentionally enabled).
- Forminator upload custom file types: mimes filtrés par forminator_allowed_mime_types(false) blacklist (pht/php7 exige config admin → OOS).
- Forminator Stripe webhook (REST __return_true): si secret configuré, signature Stripe vérifiée; sinon event jamais construit → rien traité. OK.
- WPvivid nopriv restore/do_restore_2: check_ajax_referer + manage_options même en nopriv (les handlers nopriv sont pour le mid-restore, guests rejetés par cap).
- NF free: aucune action user-creation (DeleteDataRequest = wp_create_user_request, core, OK).
- DM Asset::get() SQL concat (Asset.php:52): tous les callers passent int ou admin-cap gated (WPDM_ADMIN_CAP / access_server_browser). Pas exploitable Subscriber.
- DM AssetManager root(): confine non-admin à UPLOAD_DIR/<login> + realpath check. wpdmfmdl route logged-in only mais contenu = propre dossier user.
- Scan options-update/file-read/unserialize front-side sur les 10 plugins: rien de Subscriber-reachable.

## Piste encore ouverte
- REFERENCE.md chasse v4 #2: NF add-ons payants (registration) non présents. #4 Stored XSS serveur-echo: à creuser dans DM shortcodes rendant des données d'autres users (wpdm_category etc.).

## État environnements
- wp1 multisite (port 80) + wp2 single (8082) opérationnels; MariaDB OK; UR form id=28 + page 29 (id sans quotes!) créés sur blog1.
