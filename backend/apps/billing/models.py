from django.db import models
from apps.users.models import User

CREDIT_PACKAGES = {
    '1': {'credits': 1, 'amount': 89},
    '5': {'credits': 5, 'amount': 399},
}


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


class CreditOrder(models.Model):
    PACKAGE_CHOICES = [('1', '1 เครดิต — 89 บาท'), ('5', '5 เครดิต — 399 บาท')]
    STATUS_CHOICES = [
        ('pending', 'รอตรวจสลิป'),
        ('approved', 'อนุมัติแล้ว'),
        ('rejected', 'ปฏิเสธ'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_orders')
    package = models.CharField(max_length=5, choices=PACKAGE_CHOICES)
    credits = models.IntegerField()
    amount = models.IntegerField()
    slip_image = models.ImageField(upload_to='slips/', null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    admin_note = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.email} — {self.package} credits — {self.status}'
