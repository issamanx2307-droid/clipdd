"""
support/views.py — compatibility re-export layer.

All logic has been split into focused modules:
  - views_shared.py    : check_admin, _get_maintenance_mode, _auto_trigger_maintenance
  - views_chat.py      : ChatView, ChatPollView, AdminChatListView, AdminChatDetailView,
                         AdminReleaseChatView, AdminAIChatView
  - views_content.py   : PublicSiteContentView, AdminSiteContentView,
                         PublicClipThumbnailView, AdminClipThumbnailView,
                         SystemStatusView, AdminMaintenanceView,
                         AdminCreditsView, AdminDemoClipView,
                         DEFAULT_SITE_CONTENT
  - views_orders.py    : AdminDashboardView, AdminOrderListView,
                         AdminOrderActionView, AdminPaymentSettingsView
  - views_articles.py  : PublicArticleListView, PublicArticleDetailView,
                         AdminArticleListView, AdminArticleDetailView

This file re-exports everything so urls.py needs no changes.
"""

# shared helpers (used by apps.projects.views and apps.video_engine.tasks)
from .views_shared import check_admin, _get_maintenance_mode, _auto_trigger_maintenance  # noqa: F401

# chat
from .views_chat import (  # noqa: F401
    ChatView, ChatPollView,
    AdminChatListView, AdminChatDetailView, AdminReleaseChatView, AdminAIChatView,
)

# content, system, API keys, demos
from .views_content import (  # noqa: F401
    PublicSiteContentView, AdminSiteContentView,
    PublicClipThumbnailView, AdminClipThumbnailView,
    SystemStatusView, AdminMaintenanceView,
    AdminCreditsView, AdminDemoClipView,
    DEFAULT_SITE_CONTENT,
)

# orders, dashboard, payment
from .views_orders import (  # noqa: F401
    AdminDashboardView,
    AdminOrderListView, AdminOrderActionView, AdminPaymentSettingsView,
)

# articles
from .views_articles import (  # noqa: F401
    PublicArticleListView, PublicArticleDetailView,
    AdminArticleListView, AdminArticleDetailView,
)
