from django.urls import path
from .views import (
    ChatView, ChatPollView,
    AdminDashboardView, AdminChatListView, AdminChatDetailView, AdminReleaseChatView,
    AdminAIChatView, AdminCreditsView, AdminDemoClipView,
    PublicSiteContentView, AdminSiteContentView,
    PublicClipThumbnailView, AdminClipThumbnailView,
    SystemStatusView, AdminMaintenanceView,
)

urlpatterns = [
    path('system-status/', SystemStatusView.as_view()),
    path('support/chat/', ChatView.as_view()),
    path('support/chat/poll/', ChatPollView.as_view()),
    path('site-content/', PublicSiteContentView.as_view()),
    path('clip-thumbnails/', PublicClipThumbnailView.as_view()),
    path('admin-api/dashboard/', AdminDashboardView.as_view()),
    path('admin-api/chats/', AdminChatListView.as_view()),
    path('admin-api/chats/<int:session_id>/', AdminChatDetailView.as_view()),
    path('admin-api/chats/<int:session_id>/release/', AdminReleaseChatView.as_view()),
    path('admin-api/ai-chat/', AdminAIChatView.as_view()),
    path('admin-api/credits/', AdminCreditsView.as_view()),
    path('admin-api/demo-clips/', AdminDemoClipView.as_view()),
    path('admin-api/site-content/', AdminSiteContentView.as_view()),
    path('admin-api/clip-thumbnails/', AdminClipThumbnailView.as_view()),
    path('admin-api/maintenance/', AdminMaintenanceView.as_view()),
]
