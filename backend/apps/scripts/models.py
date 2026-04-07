from django.db import models
from apps.projects.models import Project

class Script(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='script')
    hook = models.TextField()
    full_text = models.TextField()
    hook_score = models.FloatField(default=0)
    hashtags = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

class Scene(models.Model):
    script = models.ForeignKey(Script, on_delete=models.CASCADE, related_name='scenes')
    scene_order = models.IntegerField()
    text = models.TextField()
    duration = models.IntegerField(default=3)  # seconds
