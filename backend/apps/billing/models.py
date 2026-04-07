from django.db import models
from apps.users.models import User


class Subscription(models.Model):
    PLANS = [('free', 'Free'), ('pro', 'Pro'), ('vip', 'VIP')]
    STATUS = [('active', 'Active'), ('expired', 'Expired'), ('cancelled', 'Cancelled')]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='subscription')
    plan = models.CharField(max_length=20, choices=PLANS, default='free')
    start_date = models.DateTimeField(auto_now_add=True)
    end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS, default='active')

    def __str__(self):
        return f'{self.user.email} - {self.plan}'


class UsageLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='usage_logs')
    action = models.CharField(max_length=50, default='generate_video')
    credits_used = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
