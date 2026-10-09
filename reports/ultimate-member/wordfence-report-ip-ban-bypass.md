=== SOFTWARE DETAILS ===

Type of Software: WordPress Plugin

Software Name: Ultimate Member

Software Slug: ultimate-member

Affected Version(s): <= 2.14.0

=== VULNERABILITY DETAILS ===

Description of Vulnerability

The plugin provides a "Blocked IPs" moderation feature (Ultimate Member > Settings > Access > Block IPs) that administrators use to ban specific IP addresses or ranges (wildcards supported) from submitting any Ultimate Member form (login, registration, profile).

The ban check is implemented in um_submit_form_errors_hook__blockedips() (includes/core/um-actions-form.php:53-66), which obtains the visitor's IP by calling um_user_ip(). That helper (includes/um-short-functions.php:279-312) resolves the client IP in this priority order: $_SERVER['HTTP_CLIENT_IP'], then $_SERVER['HTTP_X_FORWARDED_FOR'], and only falls back to $_SERVER['REMOTE_ADDR'] if neither is present.

Both HTTP_CLIENT_IP and X-Forwarded-For are client-controlled request headers. By simply adding a header such as "X-Forwarded-For: 8.8.8.8" to any UM form submission, a banned visitor causes um_user_ip() to return the spoofed value, so the comparison against the administrator's blocked list never sees the real REMOTE_ADDR, and the submission proceeds. The form then executes normally (account creation on registration forms, session issuance on login forms, profile modification on profile forms).

This was verified dynamically on WordPress 6.7.1 / Ultimate Member 2.14.0: with "127.0.0.1" in the Block IP list, a registration POST from 127.0.0.1 without the header is redirected to err=blocked_ip, while the identical POST with "X-Forwarded-For: 8.8.8.8" creates the account (user redirected to the post-registration welcome page, account present in wp_users).

Notably, the plugin's own AJAX rate-limiting (UM()->is_rate_limited(), includes/class-functions.php) correctly uses REMOTE_ADDR, which shows the header-based resolution in um_user_ip() is an inconsistency rather than an intentional design for proxied environments.

Vulnerability Type: Security Control Bypass (IP Ban Bypass)

Impact Statement: Unauthenticated attackers whose IP addresses are banned by the administrator can fully bypass the ban by sending a spoofed X-Forwarded-For or Client-IP header, regaining the ability to submit registration, login, and profile forms (spam registrations, credential stuffing against the UM login form, continued abuse the ban was meant to stop).

Common Weakness (CWE) Type: CWE-348 (Use of a Less Trustworthy Source) / CWE-807 (Reliance on Untrusted Inputs in a Security Decision)

Authentication Level Required: No Authentication

References to Affected Code:
- https://plugins.trac.wordpress.org/browser/ultimate-member/trunk/includes/core/um-actions-form.php (um_submit_form_errors_hook__blockedips, line ~53-66)
- https://plugins.trac.wordpress.org/browser/ultimate-member/trunk/includes/um-short-functions.php (um_user_ip, line ~279-312: HTTP_CLIENT_IP / X_FORWARDED_FOR prioritized over REMOTE_ADDR)

References:
- https://wordpress.org/plugins/ultimate-member/
- Existing UM CVEs (CVE-2023-3460 privilege escalation, CVE-2026-19423 role validation, password-reset-chain advisories) are unrelated to this IP-ban bypass; no prior advisory covers um_user_ip()/blocked_ips.

=== PROOF OF CONCEPT ===

Prerequisites:
- WordPress 6.7.1, Ultimate Member 2.14.0, a published UM registration form ([ultimatemember form_id="7"] on page 13 in the test env)
- Administrator sets "Block IP addresses" (Ultimate Member > Settings > Access) to the attacker's IP, e.g. 127.0.0.1

Step 1 — Confirm the ban works without the header (negative control for the feature):
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -X POST "http://TARGET/?page_id=13" \
  -d "form_id=7&_wpnonce=<register_nonce>&user_login-7=bypassip1&user_email-7=bypassip1@audit.local&user_password-7=Pass12345!x&confirm_user_password-7=Pass12345!x"
Observed: 302 -> http://TARGET/?page_id=13&err=blocked_ip  (submission correctly blocked)

Step 2 — Bypass with a spoofed header (PoC):
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" -X POST "http://TARGET/?page_id=13" \
  -H "X-Forwarded-For: 8.8.8.8" \
  -d "form_id=7&_wpnonce=<register_nonce>&user_login-7=bypassip1&user_email-7=bypassip1@audit.local&user_password-7=Pass12345!x&confirm_user_password-7=Pass12345!x"
Observed: 302 -> http://TARGET/?page_id=11&um_user=bypassip1  (post-registration redirect)
Verification: user "bypassip1" exists in wp_users with role subscriber despite its IP being on the blocked list. The same bypass applies to UM login and profile forms.

Negative control (feature working, exploit path only via header): see Step 1 — identical request without the header is blocked with err=blocked_ip.

Environment / Configuration Details: WordPress 6.7.1, PHP 8.2.34, Ultimate Member 2.14.0 with default settings; blocked_ips option set to "127.0.0.1"; default registration form (ID 7) published on page 13; direct connection (no reverse proxy in front).

Certify PoC tested step-by-step: YES

Did you use AI? YES

=== OTHER DETAILS ===

Have you requested a CVE from another CNA? NO
Have you reported this to another vendor? NO
Terms agreement: YES

=== SUGGESTED REMEDIATION ===

1. Use $_SERVER['REMOTE_ADDR'] for the blocked-IP security decision (as is_rate_limited() already does). Client-controlled headers (X-Forwarded-For, Client-IP) must never be trusted for security decisions unless the site is explicitly configured as behind a trusted proxy.
2. If proxy support is required, gate it behind an explicit administrator setting (list of trusted proxy IPs) and parse X-Forwarded-For right-to-left, taking the first address not belonging to a trusted proxy.
3. Apply the same fix to every other consumer of um_user_ip() used in a security or moderation context.
