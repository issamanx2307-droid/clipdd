from django.db import models
from apps.projects.models import Project

class RenderJob(models.Model):
    STATUS = [('pending','Pending'),('processing','Processing'),('done','Done'),('failed','Failed')]
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='render_job')
    status = models.CharField(max_length=20, choices=STATUS, default='pending')
    progress = models.IntegerField(default=0)
    error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class VideoOutput(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='video')
    video_url = models.URLField()
    audio_url = models.URLField(blank=True)
    duration = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
