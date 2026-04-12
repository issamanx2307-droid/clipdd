from django.urls import path
from .views import ProjectScriptView

urlpatterns = [
    path('projects/<int:pk>/script/', ProjectScriptView.as_view(), name='project-script-legacy'),
]
