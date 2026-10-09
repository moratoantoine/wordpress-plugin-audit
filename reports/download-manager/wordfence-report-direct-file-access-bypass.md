=== SOFTWARE DETAILS ===

Type of Software: WordPress Plugin

Software Name: Download Manager

Software Slug: download-manager

Affected Version(s): <= 3.3.72

=== VULNERABILITY DETAILS ===

Description of Vulnerability

The plugin stores the actual downloadable files of password-protected, role-restricted and otherwise locked packages inside the publicly-served uploads directory: {wp-content}/uploads/download-manager-files/ (UPLOAD_DIR, defined in src/__/Apply.php and used by the package file upload handler at src/Admin/Menu/Packages.php:206 — move_uploaded_file($_FILES['package_file']['tmp_name'], UPLOAD_DIR . $filename) — where $filename keeps the original file name; only a time() . 'wpdm_' prefix is added in case of a name collision).

The only HTTP-level protections placed in that directory are an .htaccess containing "Deny from all" and a blank index.php. The index.php prevents directory listing (the fix for CVE-2024-13126, "directory listing on web servers that do not use htaccess", which was fixed in 3.3.07). However:

1. .htaccess is only enforced by Apache. On nginx, IIS, LiteSpeed and virtually every non-Apache stack (a large share of WordPress hosts), the file is ignored entirely.
2. The blank index.php only prevents listing; it does nothing against direct URL access to a file whose name is known or guessable.

Consequently, on any non-Apache hosting, every package file is directly downloadable at /wp-content/uploads/download-manager-files/{original-filename} — completely bypassing ALL of the plugin's package protections applied through the regular download flow (?wpdmdl={id}), which enforces password locks (hash_equals comparison of __wpdm_password), role-based access (allowedRoles), temporary download keys, master keys, and guest/user restrictions (src/__/Apply.php:253+). Since uploaded files keep their original, often-predictable names (e.g. "annual-report-2024.pdf", "contract-draft.docx"), an unauthenticated attacker can retrieve confidential package files by simply requesting the original filename, without knowing the package password or having any account.

Verified dynamically on WordPress 6.7.1 with Download Manager 3.3.72: a file placed in uploads/download-manager-files/ (as the plugin's own upload handler does) is served with HTTP 200 and full contents at its direct URL on a non-Apache server (PHP built-in server used in testing; nginx behaves identically as it ignores .htaccess). The directory listing itself is blocked by the blank index.php — confirming this is not the old CVE-2024-13126 directory-listing issue, but the distinct direct-file-access vector that remains unfixed. Meanwhile the same package accessed through the intended endpoint (?wpdmdl={id}) correctly returns "You are not allowed to download" / "You don't have permission to download this file" when its password/role protections apply — demonstrating that the plugin's access control is bypassed specifically through the direct file URL.

Vulnerability Type: Sensitive Information Disclosure / Broken Access Control (protection bypass)

Impact Statement: On non-Apache hosting (nginx and similar), unauthenticated attackers can download password-protected and role-restricted package files directly by guessing or knowing their original filenames, bypassing all of the plugin's package-level access controls.

Common Weakness (CWE) Type: CWE-538 (Insertion of Sensitive Information into Externally-Accessible File or Directory) / CWE-284 (Improper Access Control)

Authentication Level Required: No Authentication

References to Affected Code:
- https://plugins.trac.wordpress.org/browser/download-manager/trunk/src/Admin/Menu/Packages.php (package file upload, line ~206: files stored under UPLOAD_DIR with original filename)
- https://plugins.trac.wordpress.org/browser/download-manager/trunk/src/__/Apply.php (wpdmdl handler enforcing password/role/key protections — the protections that the direct URL bypasses; UPLOAD_DIR definition)
- The .htaccess in uploads/download-manager-files/ (Apache-only "Deny from all") and the blank index.php (listing protection only)

References:
- https://wordpress.org/plugins/download-manager/
- CVE-2024-13126 (directory listing on non-htaccess servers, fixed 3.3.07 via blank index.php) is RELATED but DISTINCT: it covered the ability to list directory contents. This finding covers direct access to files by their known/guessable original names, which the index.php fix does not prevent. Affects the current version 3.3.72.
- CVE-2021-34638/34639 (directory traversal / file upload, fixed 3.1.25) are unrelated.

=== PROOF OF CONCEPT ===

Prerequisites:
- WordPress 6.7.1, Download Manager 3.3.72 activated
- Hosting that does not enforce .htaccess (nginx, IIS, LiteSpeed, PHP built-in — used here)
- A package file uploaded via the plugin (goes to uploads/download-manager-files/ with its original name)

Step 1 — Upload a confidential file to a password-protected package (admin flow):
Log in as admin → Download Manager → Packages → upload "annual-report-2024.pdf" as the package file → set a password lock on the package. The file now lives at /wp-content/uploads/download-manager-files/annual-report-2024.pdf.

Step 2 — Confirm the regular download flow enforces the password (unauthenticated):
curl -s "http://TARGET/?wpdmdl=<package_id>"
Observed: "You don't have permission to download this file" — the plugin's protections work through the intended endpoint.

Step 3 — Bypass: fetch the file directly (unauthenticated, no password):
curl -s "http://TARGET/wp-content/uploads/download-manager-files/annual-report-2024.pdf" -o report.pdf
Observed: HTTP 200, full confidential file contents returned — all package protections (password, role, lock) bypassed.

Step 4 — Negative control (directory listing):
curl -s "http://TARGET/wp-content/uploads/download-manager-files/"
Observed: HTTP 200 with an empty response (the blank index.php blocks listing — confirming this is the direct-access vector, distinct from the CVE-2024-13126 listing issue that was already fixed).

Environment / Configuration Details: WordPress 6.7.1, PHP 8.2.34, MariaDB 11.5.2, Download Manager 3.3.72 default settings, single site. Test performed on the PHP built-in webserver (ignores .htaccess exactly like nginx). The exact same requests against an Apache host with AllowOverride active would be denied by the .htaccess — the vulnerability is hosting-stack-dependent, which is why the plugin must not rely on .htaccess as its only file-level protection.

Certify PoC tested step-by-step: YES

Did you use AI? YES

=== OTHER DETAILS ===

Have you requested a CVE from another CNA? NO
Have you reported this to another vendor? NO
Terms agreement: YES

=== SUGGESTED REMEDIATION ===

1. Store package files OUTSIDE the publicly-served tree (e.g. wp-content/uploads/../wpdm-private/{random}/, or a per-package randomly-named subdirectory of at least 16 random bytes — the plugin already does exactly this for the "secure import" mode in wp-all-import-style hashed directories via wp_all_import_secure_file; apply the same pattern by default).
2. If files must remain in uploads/, serve them exclusively through the plugin's download endpoint (the ?wpdmdl= flow) and add a random suffix to stored filenames so the original (guessable) name is not addressable directly.
3. Do not rely on .htaccess: provide nginx/IIS equivalents in documentation, but treat non-Apache stacks as the default threat model (the plugin cannot assume the host's webserver).
4. At minimum, name files with a per-installation secret-derived prefix so that direct URLs are not computable from the public filename alone.
