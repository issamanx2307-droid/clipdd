from django.urls import path
from .views import RenderStatusView, KlingWebhookView, RecentCustomerClipsView

urlpatterns = [
    path('projects/<int:pk>/render/', RenderStatusView.as_view(), name='render-status'),
    path('webhook/kling/', KlingWebhookView.as_view(), name='kling-webhook'),
    path('videos/recent/', RecentCustomerClipsView.as_view(), name='recent-customer-clips'),
]
