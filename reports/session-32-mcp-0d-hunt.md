# Session 32 — Chasse 0D : module MCP LearnPress (jamais audité) (2026-10-10)

## Cible
LearnPress 4.4.10 inc/MCP/ (Model Context Protocol / Abilities API — code récent, feature IA)
+ WP 7.1.3 core Abilities API (/wp-abilities/v1/.../run) + plugin officiel mcp-adapter 0.7 (installé sur wp3 pour la chaîne complète)

## Chaîne complète montée et testée dynamiquement
1. /wp-json/lp/v1/mcp (alias LP, permission __return_true) → proxy → /mcp/mcp-adapter-default-server
2. ApiKeyAuthenticator: Basic auth (ck_/cs_ HMAC sha256), alias + adapter routes = target, cookie-only = 401
3. MCP JSON-RPC complet: initialize (Mcp-Session-Id + MCP-Protocol-Version) → tools/list (3 meta-tools) → tools/call execute-ability
4. LP permission_callback par ability: AuthContext api-key REQUIS + base capability manage_options + scope read/write vs permissions clé

## Tests dynamiques (tous BLOQUÉS — LearnPress défendu)
- Sans clé → 401 api_key_required
- Subscriber (cookies) via core /wp-abilities/v1/.../run → 403 missing_auth (AuthContext vide hors routes MCP)
- Subscriber + clé Basic via /run → 401 (route non-target → clé ignorée → missing_auth)
- Clé owned-by-SUBSCRIBER via chaîne MCP complète → execute learnpress/get-student-progress(user_id=1=admin) → "Current user does not have required base capability: manage_options" → BLOQUÉ
- get-student-progress (read, PII: display_name+email) : require manage_options à la gate → une clé non-admin ne peut JAMAIS lire, même des données "read"
- scope_allows: read_write bypass read/write mais la capability reste le mur
- parse_credentials: Basic header uniquement (pas de query params → pas de leak Referer)
- hash: HMAC-SHA256 static salt (deterministic mais non réversible) — pas exploitable

## Verdict module MCP
Aucun 0D exploitable dans la chaîne MCP LearnPress. Défenses cohérentes sur 3 couches (transport, AuthContext, capability). 
Observation de conception (non-faille): la gate manage_options pour TOUTES les abilities (même read/get-courses qui affiche des données publiques) rend les clés non-admin inutilisables — sur-contraignant mais sûr.

## Découvertes environnement utiles
- WP 7.1.3 embarque l'Abilities API + endpoint /wp-abilities/v1/abilities/<name>/run (GET pour readonly)
- mcp-adapter (github.com/WordPress/mcp-adapter, 40k installs): transport default = is_user_logged_in (n'importe quel subscriber peut connecter un client MCP — mais chaque ability garde son permission_callback)
- Pour audit LP dynamique: enable_mcp_integration=yes + plugin mcp-adapter requis

## Prochaines cibles 0D (modules récents jamais audités)
- Tutor: includes/kirki + droip (builder backends — HelperFunctions manquant en free, vérifier ce qui DÉMARRE quand même)
- LearnPress: inc/TemplateHooks/Course/CourseAIAssistantTemplate + OpenAiAjax (feature IA récente)
- WP Statistics: src/Service/CustomEvent (events table) + modules premium hooks
