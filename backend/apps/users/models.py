from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    email = models.EmailField(unique=True)
    name = models.CharField(max_length=255, blank=True)
    credits = models.IntegerField(default=1)   # ลด free tier เหลือ 1
    plan = models.CharField(max_length=20, default='free')
    fingerprint = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    is_google = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.email or self.username
