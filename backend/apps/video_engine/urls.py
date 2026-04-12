from django.urls import path
from .views import RenderStatusView, KlingWebhookView

urlpatterns = [
    path('projects/<int:pk>/render/', RenderStatusView.as_view(), name='render-status'),
    path('webhook/kling/', KlingWebhookView.as_view(), name='kling-webhook'),
]
