from django.contrib import admin
from .models import RenderJob, VideoOutput

@admin.register(RenderJob)
class RenderJobAdmin(admin.ModelAdmin):
    list_display = ['project', 'status', 'progress', 'created_at']
    list_filter = ['status']

@admin.register(VideoOutput)
class VideoOutputAdmin(admin.ModelAdmin):
    list_display = ['project', 'duration', 'created_at']
