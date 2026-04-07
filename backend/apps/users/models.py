from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    credits = models.IntegerField(default=3)
    plan = models.CharField(max_length=20, default='free')  # free / pro / vip
    created_at = models.DateTimeField(auto_now_add=True)
