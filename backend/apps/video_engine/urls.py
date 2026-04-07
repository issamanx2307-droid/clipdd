from django.urls import path
from .views import RenderStatusView

urlpatterns = [
    path('projects/<int:project_id>/render/', RenderStatusView.as_view(), name='render-status'),
]
