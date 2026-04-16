import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

_secret_key = os.environ.get('SECRET_KEY', '')
if not _secret_key:
    import warnings
    warnings.warn('SECRET_KEY not set in environment — using insecure fallback. DO NOT use in production.', stacklevel=2)
    _secret_key = 'django-insecure-dev-key-change-in-production'
SECRET_KEY = _secret_key

DEBUG = os.environ.get('DEBUG', 'True') == 'True'

ALLOWED_HOSTS = os.environ.get('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# Public site origin (no trailing slash) — absolute media URLs for API / Celery
SITE_URL = os.environ.get('SITE_URL', 'https://clipdd.com').rstrip('/')

# Maintenance mode — set MAINTENANCE_MODE=false in .env to open clip creation to all users
MAINTENANCE_MODE = os.environ.get('MAINTENANCE_MODE', 'true').lower() == 'true'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'apps.users',
    'apps.projects',
    'apps.scripts',
    'apps.video_engine',
    'apps.billing',
    'apps.analytics',
    'rest_framework.authtoken',
    'apps.support',
    'drf_spectacular',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
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

WSGI_APPLICATION = 'config.wsgi.application'

# Database
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://clipdd:password@db:5432/clipdd')

import dj_database_url
DATABASES = {
    'default': dj_database_url.parse(DATABASE_URL, conn_max_age=600)
}

# Redis / Celery
REDIS_URL = os.environ.get('REDIS_URL', 'redis://redis:6379/0')
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
from kombu import Queue
CELERY_TASK_QUEUES = (
    Queue('default'),
    Queue('video'),
)
CELERY_TASK_DEFAULT_QUEUE = 'default'

# Auth
AUTH_USER_MODEL = 'users.User'
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'ClipDD API',
    'DESCRIPTION': 'API สำหรับระบบสร้างคลิปวิดีโออัตโนมัติด้วย AI',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# Internationalization
LANGUAGE_CODE = 'th'
TIME_ZONE = 'Asia/Bangkok'
USE_I18N = True
USE_TZ = True

# Static & Media
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# OpenAI
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

# Fal.ai (Flux Schnell + Kling)
FAL_KEY = os.environ.get('FAL_KEY', '')

# Gemini (AI Chat Support)
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

# Botnoi (Thai TTS)
BOTNOI_API_KEY = os.environ.get('BOTNOI_API_KEY', '')

# Admin Panel — must be set in .env; no hardcoded fallback in production
ADMIN_PANEL_PASSWORD = os.environ.get('ADMIN_PANEL_PASSWORD', '')
if not ADMIN_PANEL_PASSWORD:
    import warnings
    warnings.warn('ADMIN_PANEL_PASSWORD not set — admin panel will be inaccessible.', stacklevel=2)

# Google OAuth
GOOGLE_CLIENT_ID = os.environ.get('GOOGLE_CLIENT_ID', '')

# Cache (Redis) — for IP rate limiting
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': REDIS_URL,
    }
}

# CORS — allow Next.js frontend (same-origin via nginx, but needed in dev)
CORS_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    'https://clipdd.com',
    'https://www.clipdd.com',
]
CORS_ALLOW_CREDENTIALS = True

# Storage (MinIO / S3)
USE_S3 = os.environ.get('USE_S3', 'False') == 'True'
if USE_S3:
    DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
    AWS_ACCESS_KEY_ID = os.environ.get('MINIO_ACCESS_KEY', 'minioadmin')
    AWS_SECRET_ACCESS_KEY = os.environ.get('MINIO_SECRET_KEY', 'minioadmin')
    AWS_STORAGE_BUCKET_NAME = os.environ.get('MINIO_BUCKET', 'clipdd')
    AWS_S3_ENDPOINT_URL = f"http://{os.environ.get('MINIO_ENDPOINT', 'minio:9000')}"
    AWS_DEFAULT_ACL = 'public-read'
