from django.urls import path
from .views import (
    ProjectListCreateView, ProjectDetailView,
    ScriptPreviewView, ApproveScriptView, RedoVideoView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='project-list'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('projects/<int:project_id>/script/', ScriptPreviewView.as_view(), name='project-script'),
    path('projects/<int:project_id>/approve-script/', ApproveScriptView.as_view(), name='project-approve-script'),
    path('projects/<int:project_id>/redo/', RedoVideoView.as_view(), name='project-redo'),
]
