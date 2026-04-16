"""
Shared utilities used across support view modules.
"""
import secrets
import logging
from django.conf import settings
from django.utils import timezone
from .models import ChatSession, SiteContent

logger = logging.getLogger(__name__)

# ── Admin auth ──────────────────────────────────────────────────────────────

_ADMIN_PASSWORD = getattr(settings, 'ADMIN_PANEL_PASSWORD', '') or ''


def check_admin(request):
    """Timing-safe admin token check via X-Admin-Token header."""
    if not _ADMIN_PASSWORD:
        return False
    token = request.headers.get('X-Admin-Token') or ''
    try:
        return secrets.compare_digest(token, _ADMIN_PASSWORD)
    except (TypeError, ValueError):
        return False


# ── Maintenance helpers ──────────────────────────────────────────────────────

def _get_maintenance_mode():
    """Read maintenance mode from DB (SiteContent key=system_settings), fallback to env var."""
    obj = SiteContent.objects.filter(key='system_settings').first()
    if obj and 'maintenance' in obj.content:
        return bool(obj.content['maintenance'])
    return settings.MAINTENANCE_MODE


def _auto_trigger_maintenance(reason: str):
    """
    Called by Celery tasks when a critical pipeline failure occurs after max retries.
    Enables maintenance mode automatically and records the reason.
    """
    obj, _ = SiteContent.objects.get_or_create(key='system_settings', defaults={'content': {}})
    obj.content = {
        **obj.content,
        'maintenance': True,
        'maintenance_reason': str(reason)[:300],
        'maintenance_auto': True,
        'maintenance_triggered_at': timezone.now().strftime('%d/%m/%Y %H:%M'),
    }
    obj.save()
    logger.error(f'[AUTO-MAINTENANCE] ระบบถูกหยุดอัตโนมัติ: {reason[:120]}')
