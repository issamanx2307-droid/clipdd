from django.urls import path
from .views import (
    ProjectListCreateView, ProjectDetailView,
    ScriptPreviewView, ApproveScriptView, RedoVideoView,
    VoicePreviewView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='project-list'),
    path('projects/<int:pk>/script/', ScriptPreviewView.as_view(), name='project-script'),
    path('projects/<int:pk>/approve-script/', ApproveScriptView.as_view(), name='project-approve-script'),
    path('projects/<int:pk>/redo/', RedoVideoView.as_view(), name='project-redo'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('voice-preview/', VoicePreviewView.as_view(), name='voice-preview'),
]
