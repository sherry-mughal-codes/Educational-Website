#!/bin/sh
set -e

echo "==> Checking database readiness..."
python << 'EOF'
import os
import sys
import time
import psycopg

db_name = os.environ.get('POSTGRES_DB', 'fbise_db')
db_user = os.environ.get('POSTGRES_USER', 'fbise_user')
db_pass = os.environ.get('POSTGRES_PASSWORD', '')
db_host = os.environ.get('POSTGRES_HOST', 'db')
db_port = os.environ.get('POSTGRES_PORT', '5432')

conn_str = f"dbname={db_name} user={db_user} password={db_pass} host={db_host} port={db_port}"

max_retries = 30
for i in range(max_retries):
    try:
        conn = psycopg.connect(conn_str)
        conn.close()
        print("==> Database is reachable and ready.")
        sys.exit(0)
    except Exception as exc:
        print(f"Waiting for database... ({i+1}/{max_retries}) - {exc}")
        time.sleep(1)

print("==> Error: Database not ready after 30 seconds.")
sys.exit(1)
EOF

echo "==> Applying Django database migrations..."
python manage.py migrate --noinput

echo "==> Starting backend command: $@"
exec "$@"
