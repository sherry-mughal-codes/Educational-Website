"""
Django settings for FBISE Educational Platform.
Configured dynamically using environment variables for Docker and production readiness.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from django.core.exceptions import ImproperlyConfigured

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env file from base directory or parent directory if present
load_dotenv(BASE_DIR / '.env')
load_dotenv(BASE_DIR.parent / '.env')

# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.1/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-dev-key-fbise-educational-platform-fallback-dev'
)

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DJANGO_DEBUG', '1').strip().lower() in ('1', 'true', 'yes')

if not DEBUG and (not SECRET_KEY or 'fallback-dev' in SECRET_KEY or 'change_me' in SECRET_KEY):
    raise ImproperlyConfigured(
        "In production (DJANGO_DEBUG=0), a secure, non-default DJANGO_SECRET_KEY must be provided via environment variables."
    )

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1,backend').split(',')
    if host.strip()
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party apps
    'corsheaders',

    # Local apps
    'api.apps.ApiConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be near the top, before CommonMiddleware
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'
ASGI_APPLICATION = 'core.asgi.application'

# Database
# https://docs.djangoproject.com/en/5.1/ref/settings/#databases
DB_NAME = os.environ.get('POSTGRES_DB', 'fbise_db')
DB_USER = os.environ.get('POSTGRES_USER', 'fbise_user')
DB_PASSWORD = os.environ.get('POSTGRES_PASSWORD', 'fbise_dev_password_change_me')
DB_HOST = os.environ.get('POSTGRES_HOST', 'db')
DB_PORT = os.environ.get('POSTGRES_PORT', '5432')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASSWORD,
        'HOST': DB_HOST,
        'PORT': DB_PORT,
    }
}

# Password validation
# https://docs.djangoproject.com/en/5.1/ref/settings/#auth-password-validators
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
# https://docs.djangoproject.com/en/5.1/topics/i18n/
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.1/howto/static-files/
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
# https://docs.djangoproject.com/en/5.1/ref/settings/#default-auto-field
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS Configuration
cors_origins_env = os.environ.get(
    'CORS_ALLOWED_ORIGINS',
    'http://localhost:3001,http://127.0.0.1:3001,http://localhost:3000,http://127.0.0.1:3000'
)
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in cors_origins_env.split(',')
    if origin.strip()
]
CORS_ALLOW_CREDENTIALS = True

# CSRF Trusted Origins (Frontend to Backend admin communication)
csrf_origins_env = os.environ.get(
    'CSRF_TRUSTED_ORIGINS',
    'http://localhost:3001,http://127.0.0.1:3001,http://localhost:3000,http://127.0.0.1:3000'
)
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in csrf_origins_env.split(',')
    if origin.strip()
]
SESSION_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True

if not DEBUG:
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'SAMEORIGIN'
    SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'true').strip().lower() in ('1', 'true', 'yes')
    CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'true').strip().lower() in ('1', 'true', 'yes')

# Caching Architecture for Rate Limiting & Session Protection
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'fbise-security-cache',
        'TIMEOUT': 900,
        'OPTIONS': {
            'MAX_ENTRIES': 20000,
        }
    }
}

# Upload limits (Default: 50MB, configurable via environment variable)
MAX_UPLOAD_SIZE_MB = int(os.environ.get('MAX_UPLOAD_SIZE_MB', '50'))
DATA_UPLOAD_MAX_MEMORY_SIZE = MAX_UPLOAD_SIZE_MB * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024

# Frontend URL
FRONTEND_BASE_URL = os.environ.get('FRONTEND_BASE_URL', 'http://localhost:3001')

# Email Configuration (Real-Time SMTP Relay or Console Fallback)
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.environ.get('EMAIL_USE_TLS', 'true').strip().lower() in ('1', 'true', 'yes')
EMAIL_USE_SSL = os.environ.get('EMAIL_USE_SSL', 'false').strip().lower() in ('1', 'true', 'yes')
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '').strip()
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '').strip()
DEFAULT_FROM_EMAIL = (
    os.environ.get('DEFAULT_FROM_EMAIL', '').strip()
    or (f"FBISE Study Notes <{EMAIL_HOST_USER}>" if EMAIL_HOST_USER else 'FBISE Study Notes <noreply@fbise-notes.local>')
)
EMAIL_TIMEOUT = int(os.environ.get('EMAIL_TIMEOUT', '10'))

# If EMAIL_BACKEND is explicitly defined in environment, use that.
# Otherwise, if EMAIL_HOST_USER is configured, use smtp.EmailBackend for real delivery;
# fallback to console backend if no SMTP user has been supplied yet.
_default_backend = 'django.core.mail.backends.smtp.EmailBackend' if EMAIL_HOST_USER else 'django.core.mail.backends.console.EmailBackend'
_configured_backend = os.environ.get('EMAIL_BACKEND', '').strip()
EMAIL_BACKEND = _configured_backend if _configured_backend else _default_backend
PASSWORD_RESET_TIMEOUT = 259200  # 3 days in seconds

# Payment Gateway Configuration (Pakistan: JazzCash, Easypaisa, Direct Transfer, Sandbox)
PAYMENT_GATEWAY_DEFAULT = os.environ.get('PAYMENT_GATEWAY_DEFAULT', 'direct_transfer')
# Sandbox is disabled by default in production (DEBUG=False)
_default_sandbox = 'false' if not DEBUG else 'true'
PAYMENT_SANDBOX_ENABLED = os.environ.get('PAYMENT_SANDBOX_ENABLED', _default_sandbox).strip().lower() in ('1', 'true', 'yes')

# Direct Transfer Platform Credentials (Configurable via environment)
DIRECT_TRANSFER_ACCOUNT_TITLE = os.environ.get('DIRECT_TRANSFER_ACCOUNT_TITLE', 'FBISE Educational Notes Official')
DIRECT_TRANSFER_ACCOUNT_NUMBER = os.environ.get('DIRECT_TRANSFER_ACCOUNT_NUMBER', '0300-8889999')
DIRECT_TRANSFER_BANK_NAME = os.environ.get('DIRECT_TRANSFER_BANK_NAME', 'JazzCash / Easypaisa / Raast')
DIRECT_TRANSFER_IBAN = os.environ.get('DIRECT_TRANSFER_IBAN', '')
DIRECT_TRANSFER_INSTRUCTIONS = os.environ.get(
    'DIRECT_TRANSFER_INSTRUCTIONS',
    'Transfer the exact fee using your JazzCash, Easypaisa, or Mobile Banking app to our verified platform account and submit your Transaction ID (TID) for fast administrative verification.'
)

JAZZ_CASH_MERCHANT_ID = os.environ.get('JAZZ_CASH_MERCHANT_ID', '')
JAZZ_CASH_PASSWORD = os.environ.get('JAZZ_CASH_PASSWORD', '')
JAZZ_CASH_INTEGRITY_SALT = os.environ.get('JAZZ_CASH_INTEGRITY_SALT', '')
JAZZ_CASH_RETURN_URL = os.environ.get('JAZZ_CASH_RETURN_URL', f"{FRONTEND_BASE_URL}/checkout/result/")
JAZZ_CASH_ENDPOINT = os.environ.get(
    'JAZZ_CASH_ENDPOINT',
    'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/'
)

EASYPAISA_STORE_ID = os.environ.get('EASYPAISA_STORE_ID', '')
EASYPAISA_HASH_KEY = os.environ.get('EASYPAISA_HASH_KEY', '')
EASYPAISA_RETURN_URL = os.environ.get('EASYPAISA_RETURN_URL', f"{FRONTEND_BASE_URL}/checkout/result/")
EASYPAISA_ENDPOINT = os.environ.get(
    'EASYPAISA_ENDPOINT',
    'https://easypay.easypaisa.com.pk/easypay/Index.jsf'
)


