#!/bin/sh
# Environnement de test dynamique WordPress SANS Docker ni root
# Prérequis: réseau sortant + /tmp inscriptible. Tout tourne en loopback 127.0.0.1.
set -e
BASE=/tmp
PHP=$BASE/php82
WPDIR=$BASE/wordpress

echo "[1/6] PHP 8.2 statique (modules mysqli, mbstring, gd, curl, zip...)"
if [ ! -x $PHP ]; then
  python3 -c "import urllib.request;urllib.request.urlretrieve('https://github.com/jcleng/staticphpbuild/releases/download/static-php_8.2_20261007042314/php-8.2_20261007042314','/tmp/php82')" && chmod +x $PHP
fi
$PHP -v | head -1

echo "[2/6] MariaDB 11.5.2 portable (user-space, no root)"
if [ ! -d $BASE/mariadb/linux ]; then
  mkdir -p $BASE/mariadb && cd $BASE/mariadb
  python3 -c "import urllib.request;urllib.request.urlretrieve('https://github.com/AndyTargino/mariadb-portable-driver/releases/download/v0.0.5/mariadb-linux.zip','mariadb-linux.zip')"
  unzip -q mariadb-linux.zip && chmod +x linux/bin/*
fi
cd $BASE/mariadb/linux
if [ ! -d $BASE/mariadb/data/mysql ]; then
  mkdir -p $BASE/mariadb/data
  printf 'CREATE DATABASE mysql;\nUSE mysql;\n' > /tmp/bootstrap.sql
  cat share/mariadb_system_tables.sql share/mariadb_system_tables_data.sql >> /tmp/bootstrap.sql
  ./bin/mariadbd --no-defaults --bootstrap --datadir=$BASE/mariadb/data --lc-messages-dir=./share/english < /tmp/bootstrap.sql
fi
(setsid ./bin/mariadbd --no-defaults --datadir=$BASE/mariadb/data --lc-messages-dir=./share/english --socket=$BASE/mariadb/mysql.sock --port=3306 --bind-address=127.0.0.1 </dev/null >$BASE/mariadb/server.log 2>&1 &)
sleep 6
$PHP -r '$p=new PDO("mysql:host=127.0.0.1;port=3306","root","");$p->exec("CREATE DATABASE IF NOT EXISTS wordpress");$p->exec("CREATE USER IF NOT EXISTS '"'"'wp'"'"'@'"'"'localhost'"'"' IDENTIFIED BY '"'"'wppass123'"'"'");$p->exec("GRANT ALL PRIVILEGES ON wordpress.* TO '"'"'wp'"'"'@'"'"'localhost'"'"'");echo "MariaDB OK\n";'

echo "[3/6] WordPress latest + plugins du repo"
if [ ! -d $WPDIR ]; then
  python3 -c "import urllib.request;urllib.request.urlretrieve('https://wordpress.org/latest.zip','/tmp/wp.zip')"
  unzip -q /tmp/wp.zip -d /tmp
  cat > $WPDIR/wp-config.php <<'WPEOF'
<?php
define('DB_NAME', 'wordpress'); define('DB_USER', 'wp'); define('DB_PASSWORD', 'wppass123'); define('DB_HOST', '127.0.0.1:3306');
define('DB_CHARSET', 'utf8mb4'); define('DB_COLLATE', '');
define('AUTH_KEY','a1'); define('SECURE_AUTH_KEY','a2'); define('LOGGED_IN_KEY','a3'); define('NONCE_KEY','a4');
define('AUTH_SALT','a5'); define('SECURE_AUTH_SALT','a6'); define('LOGGED_IN_SALT','a7'); define('NONCE_SALT','a8');
define('WP_HOME','http://127.0.0.1:8080'); define('WP_SITEURL','http://127.0.0.1:8080');
define('WP_DEBUG', true); define('WP_DEBUG_LOG', true); define('WP_DEBUG_DISPLAY', false);
$table_prefix = 'wp_'; if (!defined('ABSPATH')) define('ABSPATH', __DIR__ . '/');
require_once ABSPATH . 'wp-settings.php';
WPEOF
  REPO="$(dirname "$(dirname "$(readlink -f "$0")")")"
  mkdir -p $WPDIR/wp-content/plugins
  for P in forminator ultimate-member user-registration wp-file-manager wpvivid-backuprestore; do
    unzip -q -o "$REPO/"${P}-*.zip -d $WPDIR/wp-content/plugins/ 2>/dev/null || echo "  (plugin $P introuvable dans le repo)"
  done
fi

echo "[4/6] Installation WordPress + plugins + Subscriber"
cat > /tmp/install-wp.php <<'INSTEOF'
<?php
define('WP_INSTALLING', true);
require '/tmp/wordpress/wp-load.php';
require ABSPATH . 'wp-admin/includes/upgrade.php';
if (!get_user_by('login','admin')) wp_install('AuditSite','admin','admin@audit.local',false,'','adminPass123!');
if (!get_user_by('login','testsubscriber')) wp_insert_user(['user_login'=>'testsubscriber','user_pass'=>'subPass123!','user_email'=>'sub@audit.local','role'=>'subscriber','display_name'=>'TestSub']);
foreach (['forminator/forminator.php','ultimate-member/ultimate-member.php','user-registration/user-registration.php','wp-file-manager/file_folder_manager.php','wpvivid-backuprestore/wpvivid-backuprestore.php'] as $p) { if (is_plugin_active($p)) continue; $r=activate_plugin($p); echo is_wp_error($r)?"FAIL $p\n":"OK $p\n"; }
wp_set_current_user(1); delete_option('um_is_installed'); UM()->setup()->install_default_forms(); UR_Install::create_form();
update_option('users_can_register', 1);
echo "Setup termine. Form UR par defaut: " . get_option('user_registration_default_form_page_id') . "\n";
INSTEOF
cd $WPDIR && $PHP /tmp/install-wp.php

echo "[5/6] Serveur web loopback"
pkill -f "php82 -S" 2>/dev/null || true; sleep 1
cd $WPDIR && (setsid $PHP -S 127.0.0.1:8080 </dev/null >/tmp/php-srv.log 2>&1 &)
sleep 3
echo "Serveur: http://127.0.0.1:8080 (admin / adminPass123!, subscriber / subPass123!)"

echo "[6/6] Smoke test"
timeout 20 python3 -c "import urllib.request;print('front:', urllib.request.urlopen('http://127.0.0.1:8080/').status)"
echo "Termine."
