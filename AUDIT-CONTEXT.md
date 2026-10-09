# 📋 CONTEXTE PROJET — Audit plugins WordPress (pour les prochaines sessions)

## 🎯 Mission
Audit de sécurité des 5 plugins WordPress du repo. Objectif : vulnérabilités réelles vérifiées DYNAMIQUEMENT (PoC + contrôle négatif), rapports au format Wordfence exact.

## 📦 Plugins audités (versions du header PHP)
| Plugin | Slug | Version |
|---|---|---|
| Forminator | forminator | 1.58.0 |
| Ultimate Member | ultimate-member | 2.14.0 |
| User Registration | user-registration | 5.2.8 |
| WP File Manager | wp-file-manager | 8.0.6 |
| WPvivid Backup | wpvivid-backuprestore | 0.9.136 |

## ⚙️ Environnement (reproductible SANS Docker/root)
`bash scripts/setup-dynamic-env.sh` — loopback 127.0.0.1:8080, admin/adminPass123!, testsubscriber/subPass123!, UM form 7 page 13, UR form 19, **tables Forminator créées (wp_frmt_*), entry test ID 1 avec payload XSS dans meta text-1, form forminator 25 (champ text-1) — NB: rendu front du form 25 ne marche pas (format wrappers non résolu), mais entries/tables OK**
⚠️ Relancer serveur : `cd /tmp/wordpress && (setsid /tmp/php82 -S 127.0.0.1:8080 </dev/null >/tmp/php-srv.log 2>&1 &)`

## ✅ FINDINGS CONFIRMÉS (2, soumettables)
1. **UR ≤ 5.2.8 — Info Disclosure ur_mail_logs (CWE-538, Unauth)** — logs email dans uploads/ur-logs/ public (emails PII en clair, .htaccess Apache-only, nom HMAC prévisible si salts défaut) → reports/user-registration/wordfence-report-info-disclosure-mail-logs.md
2. **UM ≤ 2.14.0 — IP Ban Bypass X-Forwarded-For (CWE-348, Unauth)** — um_user_ip() lit CLIENT_IP/XFF avant REMOTE_ADDR, contournement Block IP testé (compte créé depuis IP bannie) → reports/ultimate-member/wordfence-report-ip-ban-bypass.md

## ❌ 13 FINDINGS D'ORIGINE RÉFUTÉS + surfaces refermées (sessions 1-5)
Sessions 1-4 : tous wp_ajax_nopriv_, jumeaux WPvivid, webhook Stripe, XSS allowlist UM, rate-limit, staging, access tokens Forminator, vendor obsolètes, email-injection UR (CRLF bloqué), drafts Forminator/UR (refusés), async/cron (nonce), password-reset, uploads UR, multisite WPFM (fix excellent), UM download CVE (patché), email_draft_link (durci), quiz/poll, WPFM backup storage (fail-closed), modules PRO UR, content-restriction REST (manage_options), LFI urcr_get_template (templates fixes).

### Session 5 — XSS entries Forminator (test complet du data-flow)
**Méthode** : entry réelle en DB (wp_frmt_form_entry + meta) avec payload `<img src=x onerror=alert(1)>`, puis rendu via les 3 chemins :
- `render_entry()` / `forminator_get_entry_field_value(allow_html=true)` / `meta_value_to_string('text',...,true)` → **tous retournent le HTML BRUT** (pas de case 'text' dans le switch : default = (string)$meta_value sans esc_html, contrairement à 'email' qui échappe !) ⚠️ fonction potentiellement dangereuse pour d'autres consommateurs
- MAIS la vue admin (content-details.php) échappe TOUTES les sorties : summary = esc_html(wp_strip_all_tags()), détails = wp_kses_post(forminator_format_html()) ou wp_kses avec allowlist sans handlers, radio/select/checkbox = esc_html, rich/textarea = wp_kses_post → **XSS refermé**
- ⚠️ RESIDUEL : `render_entry()` brut (helper-fields.php) sert aux exports/emails — vérifier ces contextes dans une session future (si un export CSV/HTML/email rend les valeurs brutes → finding possible)

## 💡 PISTES RESTANTES (session 6+)
1. **Exports Forminator** (class-export.php) : si l'export CSV/HTML rend meta_value_to_string sans esc_html en contexte HTML → XSS/HTML-injection dans le fichier d'export ouvert par l'admin
2. **Emails Forminator** (notifications admin avec {all_fields} ou mode admin-notification) : le Forminator_Mail rend-il les valeurs brutes ? (is_email_context vu dans render_entry)
3. Multisite complet : convertir l'install en réseau pour WPFM residuals
4. UR My Account : XSS sur meta utilisateur rendues
5. UM conditional logic : bypass de champs required
6. WPvivid remote storages : SSRF admin-only

## 📤 LIVRAISON
- Branche : vibe/dynamic-audit-findings
- Push : github_app_create_or_update_file (fichier par fichier, SHA via get_file_contents)
