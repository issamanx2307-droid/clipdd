from django.urls import path
from .views import ChatView

urlpatterns = [
    path('support/chat/', ChatView.as_view(), name='support-chat'),
]
