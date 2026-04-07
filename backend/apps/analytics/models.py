from django.db import models
from apps.projects.models import Project


class Analytics(models.Model):
    project = models.OneToOneField(Project, on_delete=models.CASCADE, related_name='analytics')
    views = models.IntegerField(default=0)
    likes = models.IntegerField(default=0)
    shares = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Analytics for {self.project.product_name}'
