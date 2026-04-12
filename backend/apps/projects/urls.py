from django.urls import path
from .views import (
    ProjectListCreateView, ProjectDetailView,
    ScriptPreviewView, ApproveScriptView, RedoVideoView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='project-list'),
    # ละเอียดกว่า <pk>/ ต้องมาก่อน (และใช้ชื่อพารามิเตอร์ pk ให้ตรงกันทุก path)
    path('projects/<int:pk>/script/', ScriptPreviewView.as_view(), name='project-script'),
    path('projects/<int:pk>/approve-script/', ApproveScriptView.as_view(), name='project-approve-script'),
    path('projects/<int:pk>/redo/', RedoVideoView.as_view(), name='project-redo'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
]
