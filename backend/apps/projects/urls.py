from django.urls import path
from .views import (
    ProjectListCreateView, ProjectDetailView,
    RegenerateImagesView, SelectImageView, ProjectImagesView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='project-list'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('projects/<int:project_id>/images/', ProjectImagesView.as_view(), name='project-images'),
    path('projects/<int:project_id>/regenerate/', RegenerateImagesView.as_view(), name='project-regenerate'),
    path('projects/<int:project_id>/select-image/', SelectImageView.as_view(), name='project-select-image'),
]
