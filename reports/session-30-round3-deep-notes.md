# Session 30 — Round 3 chasse approfondie (2026-10-10)

## Cible principale: LearnPress lp-ajax-handle (dispatcher générique)
- /lp-ajax-handle?lp-load-ajax=<method>&nonce=<wp_rest nonce> invoque n'importe quelle méthode publique de 18 classes AbstractAjax
- Nonce wp_rest: obtenu par tout user connecté (testé: subscriber l'a obtenu et l'invocation passe le gate AbstractAjax)
- MÉTHODES SANS cap-check à la couche AJAX: SendEmailAjax::send_mail_order_status_* (emails de commande pour un order_id arbitraire — spam transactionnel déclenchable par subscriber), LessonAjax::user_complete_lesson, RefundOrderAjax::request_refund_order
- MAIS la couche MODÈLE vérifie les caps: PostModel::save() + save_meta_value_by_key() → check_capabilities_update_item_course (user_can edit_lp_lesson) — testé dynamiquement: subscriber BLOQUÉ sur update_question ("You do not have permission")
- RefundOrderAjax: order_users in_array check explicite
- SendEmailAjax: emails envoyés aux destinataires légitimes de la commande → spam vector only (low, pas High Threat)
- LoadContentViaAjax (nonce-EXEMPT): allowlist 5 callbacks admin-dashboard, chacun re-vérifie ROLE_ADMINISTRATOR en interne (LP_Admin_Dashboard:order_statistic etc.) → sûr
- SetupWizardAjax, SampleDataAJAX, CourseToolsAjax, ExportOrderCSVAjax: ROLE_ADMINISTRATOR dans chaque méthode → sûrs

## Autres tests session
- LP REST lessons: list = check_read_permission par item; detail = 401 guest; contenu protégé par enrollment/preview → sûr
- LP checkout REST: logged-in + gateway validation; payment bypass = business logic OOS
- LP users REST (reset/change-password/delete): permissions_check + wp_check_password → sûrs
- Tutor REST: API key/secret (Basic auth) usermeta hash → sûr
- Tutor render_lesson_content guest: 400 unauthorized (testé live avec cours créé)

## Verdict
Round 3 = mêmes défenses en profondeur. Les 3 couches (dispatcher → modèle → données) sont cohérentes sur LearnPress.
Finding candidat low (Patchstack): SendEmailAjax trigger transactionnel arbitraire par subscriber (spam/abus email) — à évaluer.
