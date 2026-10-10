# Session 33 — Chasse 0D, 3 pistes en parallèle (2026-10-10)

## PISTE 1 : LearnPress AI (OpenAiAjax / AIAssistantAjax / Assistant) — HARDENED
- openai_generate_prompt_course/data_course/create_course: gate ROLE_ADMINISTRATOR|ROLE_INSTRUCTOR à CHAQUE méthode
- AIAssistantAjax::openai_assistant_chat (learner-facing): login requis + AIAssistantController::resolve_item_access — gate par-item autoritaire (item_type validé, curriculum membership asserté, post_status publish requis, can_view_content_course + can_view_item, preview-only). Testé dynamiquement: subscriber NON-enrolled sur cours payé → "You do not have permission to use the AI Assistant for this course item." ✅ bloqué
- QuickQuizEngine: quizzes générés par l'IA (ses propres réponses), pas les vraies réponses du quiz
- Smart Review (get_quiz_review_result): requiert tentative COMPLÉTÉE de l'utilisateur lui-même
- TokenQuotaGuard: quota quotidien par user + lock explicite (race-aware, commenté dans le code)
- sanitize history (rôle/content pairs uniquement), action_hint allowlisté (4 valeurs), active_quiz_state sanitisé
- Contexte prompt: lesson content uniquement (grounded) — pas de fuite de réponses
- Verdict: défense en profondeur cohérente, pas de 0D

## PISTE 2 : Tutor kirki/droip — CODE MORT en free
- classes/Tutor.php:648-665: kirki chargé SEULEMENT si kirki-pro/kirki-pro.php actif (class_exists KirkiProMain), droip si droip/droip.php actif
- Sans ces plugins tiers: aucun handler tutor_handle_api_calls/tde_get_apis enregistré → test dynamique: réponse "0" (handler inexistant) ✅ confirmé
- Si Kirki Pro actif: tutor_handle_api_calls exposerait enroll_course (gate: is_course_purchasable → do_enroll → STATUS_PENDING si payé, donc pas d'accès contenu), cart ops. enroll_course sur cours gratuit = comportement normal. complete_course exige is_enrolled. Pas de 0D évident même conditionnellement.
- Verdict: surface morte en standard; pas exploitable sans plugin tiers payant

## PISTE 3 : WP Statistics restant — couvert
- hit_record ajax: enregistré via la liste admin-ajax (contexte is_admin) → pas hit_record nopriv en front-standard (tracking passe par REST v2 signé, vérifié session 29)
- Signature: wp_salt + hash_equals (constant-time), payload = valeurs stockées (anti identity-split), filtre opt-out documenté
- Modules premium/hooks (referrals source detection, emails): free = pas d'output utilisateur à échapper
- Verdict: pas de 0D additionnel

## Bilan 0D de la journée
3 pistes épuisées: 1 module AI durci (4 couches), 2 confirmations de code mort. Le pattern MCP émergent (session 32) reste le meilleur angle futur: guetter les plugins qui enregistrent des abilities SANS permission_callback solide dès leur sortie.
