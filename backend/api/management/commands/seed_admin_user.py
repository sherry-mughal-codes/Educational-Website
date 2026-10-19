import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = "Seed or update administrator account for content management."

    def add_arguments(self, parser):
        parser.add_argument('--username', type=str, default=None)
        parser.add_argument('--password', type=str, default=None)

    def handle(self, *args, **options):
        username = options['username'] or os.environ.get('DJANGO_ADMIN_USERNAME', 'admin')
        password = options['password'] or os.environ.get('DJANGO_ADMIN_PASSWORD', 'fbise_admin_2026_dev')
        email = os.environ.get('DJANGO_ADMIN_EMAIL', 'admin@fbise-notes.local')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'is_staff': True,
                'is_superuser': True,
            }
        )

        user.set_password(password)
        user.is_staff = True
        user.is_superuser = True
        user.save()

        action = "Created" if created else "Updated"
        self.stdout.write(self.style.SUCCESS(
            f"Successfully {action} administrator account '{username}' with staff/superuser permissions."
        ))
