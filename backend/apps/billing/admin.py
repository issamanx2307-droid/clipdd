from django.contrib import admin
from .models import Subscription, UsageLog

@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ['user', 'plan', 'status', 'start_date', 'end_date']
    list_filter = ['plan', 'status']

@admin.register(UsageLog)
class UsageLogAdmin(admin.ModelAdmin):
    list_display = ['user', 'action', 'credits_used', 'created_at']
    list_filter = ['action']
