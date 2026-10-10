# Session 31 — Round 3 chasse dynamique (suite, 2026-10-10)

## Sujets couverts ce tour (tous négatifs / défendus)
- WPUA avatar upload (ImageUploader): wp_check_filetype_and_ext + allowlist MIME png/jpeg/gif + md5 filename + index.php → sûr
- WPUA EditUserProfile: eup_* allowlist fixe, bio=wp_kses_post, custom_usermeta gated par champs form-defined → sûr
- WPUA pp_ajax_login/signup: HMAC form signature obligatoire (tab widget aussi) → sûr
- Tutor reviews: add_or_update_review exige has_enrolled_content_access; rendu clean_html_content=wp_kses (testé javascript:/data: strippés par wp_kses); delete_review can_user_manage; edit path review_id non joignable depuis AJAX free → sûr
- Tutor quiz start/attempt: checking_nonce + is_user_logged_in + has_quiz_access → sûr
- Tutor REST (v1): Basic auth API key/secret en usermeta, hash direct — pas d'endpoint nopriv → sûr
- LP REST users/start-quiz (__return_true): la route existe (découverte: nécessite /wp-json/ pretty permalinks à cause de isRestApiLP strpos) — testé dynamiquement en GUEST sur cours payé: "Please enroll in the course before starting the quiz" — check_can_start() au niveau MODÈLE vérifie UserCourseModel status=ENROLLED → sûr
- LP check_answer: guest seulement si no_required_enroll; include_is_true gated quiz setting → sûr
- LP UserItemModel::save: pas de cap-check mais quiz/lesson passent par check_can_start/check_capabilities → couvert
- Tutor lp/v1 users/start-quiz: même modèle, même verdict

## Découverte environnementale importante
- LearnPress 4.x: les routes lp/v1 ne s'enregistrent QUE si l'URL contient /wp-json/lp/ ou /wp-json/learnpress/ (LP_Helper::isRestApiLP) → sur des sites sans pretty permalinks, lp/v1 REST est mort ; avec permalinks (99% des sites), actif. Pour tout audit dynamique LP: activer les permalinks !

## Verdict Round 3 (5 plugins) après sessions 29-31
Aucune faille exploitable Subscriber/Unauth dans la grille Wordfence v4. Tous les chemins sensibles ont des contrôles au niveau modèle (défense en profondeur), pas seulement AJAX/REST.
Candidats basse valeur (Patchstack, à évaluer):
1. LP SendEmailAjax: trigger d'emails transactionnels pour order_id arbitraire par subscriber (spam vector)
2. WPUA reg-select-role sans options: tous rôles editables non-admin si config admin (misconfiguration-dependent)
