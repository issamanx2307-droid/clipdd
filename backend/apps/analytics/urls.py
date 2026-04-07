from django.urls import path
from .views import AnalyticsView

urlpatterns = [
    path('projects/<int:project_id>/analytics/', AnalyticsView.as_view(), name='project-analytics'),
]
