from django.contrib import admin
from .models import Project

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ['product_name', 'user', 'tone', 'status', 'created_at']
    list_filter = ['status', 'tone']
    search_fields = ['product_name', 'user__email']
