# Session 28 — dernières pistes v4 épuisées (2026-10-10)

## Testé ce tour (tous négatifs)
- DM wpdm_members/wpdm_authors shortcodes: profile-cards/default.php esc_html(display_name) → safe
- DM public-profile.php raw echo $store[bgcolor/banner/txtcolor]: écrit uniquement via wp-admin user-edit (admin cap) ou front (logo URL-validé) → OOS
- DM EditProfile: display_name = wp_strip_all_tags + sanitize_text_field + entity-decode x5 (anti double-encode); description/title 'txt' sanitized; payment_account meta non rendue front
- WPFM REST backups (CVE-2026-19708 hardening): permission_callback manage_options + re-check dans callback + storage migré privé → safe
- WPFM verify_filemanager_email: options par-user suffixed, nonce OK, non-sécuritaires → low value
- WJM ajax_log_stat: nonce per-post + rate limit + length limits + table dédiée → safe
- WPAI REST addon/fields: current_user_can(PMXI cap) → safe
- UM profile field rendering (view_field): test dynamique réel — phone_number avec <img onerror> STRIPPÉ au save (sanitize), rendu = texte pur → safe (testé POST réel + re-render)
- Forminator admin entries render: forminator_submissions_render_entry_value = esc_html (radio/select/checkbox) ou wp_kses_post (rich/textarea) ou forminator_submissions_value_filter (wp_kses allowlist stricte) — testé wp_kses strips javascript: + onerror → safe
- Forminator geolocation allowed tags: valeur générée server-side, pas user input

## VERDICT FINAL des 10 plugins
Les 10 versions sont durcies. Toutes surfaces Subscriber/Unauth testées:
1. Tous wp_ajax(_nopriv_) (280+ handlers) — capability+nonce systématiques
2. Tous REST routes — permission_callbacks réels
3. Uploads — MIME allowlist + wp_handle_upload_prefilter avant écriture
4. Rendus admin des données user — wp_kses/esc_html systématique
5. SQLi — prepare partout (sauf DM Asset::get mais callers gated admin)
6. Role injection — fail-closed (UR privileged check)
7. Nonce/IDOR — verrouillés sur get_current_user_id + caps

Les 6 findings initiaux (reports/) restent les seuls — tous OUT Wordfence v4, à soumettre Patchstack/WPScan.
Recommandation: passer à de nouveaux plugins (versions plus anciennes ou non-patchées) pour la suite de la chasse.
