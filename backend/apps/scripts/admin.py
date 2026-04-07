from django.contrib import admin
from .models import Script, Scene

@admin.register(Script)
class ScriptAdmin(admin.ModelAdmin):
    list_display = ['project', 'hook_score', 'created_at']

@admin.register(Scene)
class SceneAdmin(admin.ModelAdmin):
    list_display = ['script', 'scene_order', 'duration']
    ordering = ['script', 'scene_order']
