from django.db import models
from apps.users.models import User

class Project(models.Model):
    STATUS = [('draft','Draft'),('processing','Processing'),('done','Done'),('failed','Failed')]
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=255)
    product_name = models.CharField(max_length=255)
    key_points = models.TextField(blank=True)
    tone = models.CharField(max_length=50, default='urgency')  # urgency/review/drama
    status = models.CharField(max_length=20, choices=STATUS, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.product_name} ({self.status})"
