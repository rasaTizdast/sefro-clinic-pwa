#!/bin/bash
set -e

# Run Django migrations
echo "Running Django migrations..."
cd /srv/backend
python manage.py migrate --noinput

# Create superuser if not exists
python manage.py shell -c "
from accounts.models import ClinicUser
import os
username = os.environ.get('CLINIC_ADMIN_USERNAME', 'admin')
password = os.environ.get('CLINIC_ADMIN_PASSWORD', 'admin')
email = os.environ.get('CLINIC_ADMIN_EMAIL', 'admin@example.com')
if not ClinicUser.objects.filter(username=username).exists():
    ClinicUser.objects.create_superuser(username, email, password)
    print(f'Superuser {username} created')
else:
    print(f'Superuser {username} already exists')
" 2>/dev/null || true

# Start supervisord (manages nginx, gunicorn, nextjs)
echo "Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
