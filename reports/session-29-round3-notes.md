# Round 3 — Session 29 : 5 nouveaux plugins (2026-10-10)

## Environnement
- wp3 créé : single-site port 8083, DB wp_audit3, admin/adminPass123!, sub subPass123!
- Plugins actifs : LearnPress 4.4.10 (1141 php), Tutor 4.1.1 (869), WP-Members 3.5.7 (90), WP Statistics 14.16.15 (737), WP User Avatar (ProfilePress) 4.17.6 (66)

## Inventaire surfaces (statique)
- LP : nopriv admin-ajax gated is_user_logged_in; REST lp/v1 front (ajax allowlisté class:method + nonce wp_rest; users list = instructors by-design; materials = instructor-own/admin; JWT token routes __return_true mais wp_authenticate complet; token/register gated users_can_register, role défaut)
- Tutor : nopriv wishlist (auth requise), render_lesson_content (nonce+public course/enrollment check; TypeError 500 si lesson invalide — DoS OOS), reviews_load_more (nonce, rendu neutre); kirki/droip HelperFunctions non bundlé (free)
- WPM : do_field_reorder nonce+manage_options; registration role = get_option(default_role) server-side; fields itérés depuis config admin
- WPS : custom_event nonce + events table (non rendue en free); hit REST/JS = Signature wp_salt hash_equals; option_updater is_admin+manage+nonce; toutes vues admin esc_*
- WPUA : signup HMAC-signed form ID (tab widget aussi signé); checkout nonce+honeypot; role-select acceptable_defined_roles = form-defined options OU TOUS editable roles si champ sans options (administrator bloqué littéralement) — ATTENTION : role=editor possible si admin configure reg-select-role sans options → misconfiguration-dependent (OOS Wordfence, candidat Patchstack)

## Tests dynamiques (wp3)
- tutor wishlist unauth → redirect login; bad nonce → error; reviews → empty html; lesson invalide → TypeError 500 (pas de leak)

## Pistes restantes round 3
- Tutor : quiz attempt AJAX, instructor registration flow
- LP : instructor 'become_teacher' meta + admin approval; lazy-load REST
- WPUA : les 15+ handlers ppress_ nopriv checkout restants (apply_discount etc.) —需要 form/plan setup pour tester

## Session 29 (suite) — compléments testés
- Tutor add_instructor: nonce + manage_options + users_can_register → safe
- Tutor tutor_action_* dynamic hooks: regenerate_tutor_pages (nonce+cap), tutor_user_login (nonce+wp_signon), retrieve/reset password (standard WP flow) → safe
- Tutor coupon/cart AJAX: nonce OK; coupon abuse = business logic OOS
- LP JWT REST (token, token/validate, token/register __return_true): wp_authenticate complet; register gated users_can_register + validations; args merge fixed fields only (pas de role injectable depuis REST)
- LP _lp_custom_register meta → rendu admin user profile: esc_attr/esc_textarea partout → safe
- LP backend-user-profile + ProfileGeneralInfoTemplate: échappement systématique

## Conclusion round 3 (5 plugins)
Tous les 5 sont des versions récentes durcies (même constat que rounds 1-2):
- Nonce + capability systématiques sur les handlers sensibles
- Signatures HMAC (WPUA form ID, WPS hit signature avec wp_salt + hash_equals)
- Role assignment server-side partout (default_role / form-builder roles)
- Rendus admin échappés (esc_* / wp_kses)
- Le seul écart: WPUA reg-select-role sans options → tous rôles editables non-admin (editor!) mais nécessite config admin spécifique → candidat Patchstack, OOS Wordfence (misconfiguration-dependent)

Prochaines sessions possibles: épuiser WPUA checkout handlers avec plan/form configurés; Tutor ecommerce order flows; LP course-enroll flow (payment bypass = business logic OOS).
