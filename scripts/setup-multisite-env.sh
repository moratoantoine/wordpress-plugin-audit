#!/bin/sh
# Conversion MULTISITE de l'environnement de test (à exécuter APRÈS scripts/setup-dynamic-env.sh)
# Résultat : réseau à 2 sites — http://127.0.0.1/ (main, blog 1) + http://127.0.0.1/site2/ (blog 2)
# subadmin / SubAdmin123! = administrator du blog 2 UNIQUEMENT (isolation testée)
#
# Prérequis : /tmp/php82 (PHP statique), /tmp/wordpress (WP installé via setup-dynamic-env.sh)
# NOTE : le serveur intégré PHP ne route pas les sous-répertoires multisite sans router.php
#        (équivalent des règles .htaccess), et le multisite résout le blog par host SANS port.

set -e
BASE=/tmp
WPDIR=$BASE/wordpress
PHP=$BASE/php82
cd "$WPDIR"

echo "[1/5] Constantes multisite dans wp-config.php"
python3 - <<'PYEOF'
c = open('wp-config.php').read()
if 'MULTISITE' not in c:
    ms = """
define('WP_ALLOW_MULTISITE', true);
define('MULTISITE', true);
define('SUBDOMAIN_INSTALL', false);
define('DOMAIN_CURRENT_SITE', '127.0.0.1');
define('PATH_CURRENT_SITE', '/');
define('SITE_ID_CURRENT_SITE', 1);
define('BLOG_ID_CURRENT_SITE', 1);
define('COOKIE_DOMAIN', false);
"""
    c = c.replace("define('WP_DEBUG', true);", ms + "\ndefine('WP_DEBUG', true);")
    open('wp-config.php','w').write(c)
print("wp-config OK")
PYEOF

echo "[2/5] Router PHP pour le serveur intégré (équivalent .htaccess multisite)"
cat > router.php <<'REOF'
<?php
$uri = urldecode($_SERVER['REQUEST_URI']);
$path = parse_url($uri, PHP_URL_PATH);
if ($path !== '/' && file_exists(__DIR__ . $path) && !is_dir(__DIR__ . $path)) {
    return false;
}
$_SERVER['PATH_INFO'] = $path;
require __DIR__ . '/index.php';
REOF

echo "[3/5] Tables réseau (créées avec MULTISITE temporairement désactivé)"
sed -i "s/define('MULTISITE', true);/define('MULTISITE', false);/" wp-config.php
$PHP "$BASE/install-network.php"
$PHP "$BASE/fix-ms-tables.php"
sed -i "s/define('MULTISITE', false);/define('MULTISITE', true);/" wp-config.php

echo "[4/5] Sous-site /site2/ + subadmin (admin blog 2 uniquement)"
$PHP "$BASE/create-subsite.php"
$PHP "$BASE/fix-subadmin3.php"

echo "[5/5] Serveur web multisite (port 80)"
(setsid $PHP -S 127.0.0.1:80 router.php </dev/null >$BASE/php-srv80.log 2>&1 &)
sleep 2
echo ""
echo "MULTISITE PRÊT :"
echo "  main    : http://127.0.0.1/            (admin / adminPass123!)"
echo "  blog 2  : http://127.0.0.1/site2/      (subadmin / SubAdmin123!)"
echo "  login   : POST /wp-login.php avec redirect_to=/site2/wp-admin/ (PAS /site2/wp-login.php)"
