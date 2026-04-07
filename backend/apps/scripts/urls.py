from django.urls import path
from .views import ProjectScriptView

urlpatterns = [
    path('projects/<int:project_id>/script/', ProjectScriptView.as_view(), name='project-script'),
]
