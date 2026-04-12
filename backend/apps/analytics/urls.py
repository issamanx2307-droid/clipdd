from django.urls import path
from .views import AnalyticsView

urlpatterns = [
    path('projects/<int:pk>/analytics/', AnalyticsView.as_view(), name='project-analytics'),
]
