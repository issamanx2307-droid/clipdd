from django.urls import path
from .views import (
    ChatView, ChatPollView,
    AdminDashboardView, AdminChatListView, AdminChatDetailView, AdminReleaseChatView,
    AdminAIChatView, AdminCreditsView,
)

urlpatterns = [
    path('support/chat/', ChatView.as_view()),
    path('support/chat/poll/', ChatPollView.as_view()),
    path('admin-api/dashboard/', AdminDashboardView.as_view()),
    path('admin-api/chats/', AdminChatListView.as_view()),
    path('admin-api/chats/<int:session_id>/', AdminChatDetailView.as_view()),
    path('admin-api/chats/<int:session_id>/release/', AdminReleaseChatView.as_view()),
    path('admin-api/ai-chat/', AdminAIChatView.as_view()),
    path('admin-api/credits/', AdminCreditsView.as_view()),
]
