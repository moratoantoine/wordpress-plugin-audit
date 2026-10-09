=== SOFTWARE DETAILS ===

Type of Software: WordPress Plugin

Software Name: Ninja Forms

Software Slug: ninja-forms

Affected Version(s): <= 3.15.5

=== VULNERABILITY DETAILS ===

Description of Vulnerability

The plugin's field-data export feature (ninja_forms_export_field_data_to_csv(), includes/Abilities/Utils/FieldUtils.php:1033, invoked by the field-removal ability workflow) writes a CSV of ALL form submissions for the exported field to the publicly-served uploads directory:

    $export_dir = $upload_dir['basedir'] . '/nf-field-exports/';
    if ( ! file_exists( $export_dir ) ) {
        wp_mkdir_p( $export_dir );
        // Protect directory with .htaccess
        file_put_contents( $export_dir . '.htaccess', 'Deny from all' );
    }
    $filename = sprintf('field-export_%s_%s_%s.csv', sanitize_title($field_label), $form_id, gmdate('Y-m-d_H-i-s'));

Two problems combine:

1. The ONLY access protection is the generated .htaccess ("Deny from all") — enforced exclusively by Apache. On nginx, IIS, LiteSpeed and other non-Apache stacks (a very large share of WordPress hosting), the file is ignored and the CSV is directly downloadable.
2. The filename is entirely predictable: it is built from the field label (publicly visible in the form's HTML), the form ID (visible in shortcodes/pages), and a timestamp with second precision. An attacker who knows the site's forms can enumerate plausible export filenames without any listing capability.

The CSV contains the submission data of every user for that field — names, emails, phone numbers, or whatever the form collects (personally identifiable information). The REST endpoints that trigger the export correctly require manage_options, but that only protects the *creation* step: once an administrator has used the field-removal workflow (which first exports the data as a mandatory workflow step), the CSV remains on disk in a web-accessible directory, and on non-Apache hosting any unauthenticated visitor can fetch it by guessing the predictable filename.

Verified dynamically on WordPress 6.7.1 with Ninja Forms 3.15.5: after triggering the export workflow (as an administrator does when removing a field with data), the generated CSV (containing submission names/emails/phones of all test users) is served with HTTP 200 and full contents at /wp-content/uploads/nf-field-exports/field-export_name_9_2026-10-09_23-55-25.csv on a non-Apache server.

Vulnerability Type: Sensitive Information Disclosure (Unauthenticated)

Impact Statement: On non-Apache hosting (nginx and similar), unauthenticated attackers can download CSV exports of form submission data (PII: names, emails, phone numbers) by requesting the predictable export filename, after an administrator has performed a field-data export via the plugin's field-removal workflow.

Common Weakness (CWE) Type: CWE-538 (Insertion of Sensitive Information into Externally-Accessible File or Directory)

Authentication Level Required: No Authentication

References to Affected Code:
- https://plugins.trac.wordpress.org/browser/ninja-forms/trunk/includes/Abilities/Utils/FieldUtils.php (ninja_forms_export_field_data_to_csv, line ~1033: export to uploads/nf-field-exports/ with .htaccess-only protection and predictable filename)

References:
- https://wordpress.org/plugins/ninja-forms/
- No existing CVE covers this export-directory exposure.

=== PROOF OF CONCEPT ===

Prerequisites:
- WordPress 6.7.1, Ninja Forms 3.15.5, a form with submissions containing user data
- Hosting that does not enforce .htaccess (nginx, IIS, LiteSpeed, PHP built-in — used here)
- An administrator has used the plugin's field-removal ability workflow (which performs the data export as a mandatory first step) on at least one field

Step 1 — (Admin, workflow context) The export runs when an admin removes a field that holds submission data. The file is created at:
{wp-content}/uploads/nf-field-exports/field-export_{field-label}_{form-id}_{YYYY-MM-DD_HH-II-SS}.csv
Observed file: field-export_name_9_2026-10-09_23-55-25.csv containing all 3 test submissions' names, emails and phone numbers.

Step 2 — (Unauthenticated) Fetch the export directly:
curl -s "http://TARGET/wp-content/uploads/nf-field-exports/field-export_name_9_2026-10-09_23-55-25.csv"
Observed: HTTP 200, full CSV contents returned:
"Submission ID","Date Submitted",Name
11,"2026-10-09 22:33:02","Donnee-privee-user-1: email1@example.com tel 0601020301"
12,"...","Donnee-privee-user-2: email2@example.com tel 0601020302"

Negative control (Apache hosting / listing):
On Apache with AllowOverride, the same request is denied by the .htaccess; directory listing is disabled by the absence of index files — confirming the issue is the non-Apache direct-access path with predictable filenames.

Environment / Configuration Details: WordPress 6.7.1, PHP 8.2.34, MariaDB 11.5.2, Ninja Forms 3.15.5 default settings, single site. Form with 3 submissions (name/email/phone test data). Export triggered via the plugin's own ninja_forms_export_field_data_to_csv(). Direct access tested on the PHP built-in webserver (ignores .htaccess exactly like nginx).

Certify PoC tested step-by-step: YES

Did you use AI? YES

=== OTHER DETAILS ===

Have you requested a CVE from another CNA? NO
Have you reported this to another vendor? NO
Terms agreement: YES

=== SUGGESTED REMEDIATION ===

1. Write exports outside the publicly-served tree (e.g. a directory above web root), or in a per-session randomly-named subdirectory.
2. Never rely on .htaccess as the only protection — treat non-Apache stacks as the default threat model.
3. Use unpredictable filenames (random suffix of at least 16 bytes) if exports must remain in uploads, and delete the export immediately after download instead of leaving it on disk.
4. Stream the CSV to the admin's browser directly rather than persisting it to disk.
