from rest_framework import serializers
from .models import Script, Scene


class SceneSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scene
        fields = ['scene_order', 'text', 'duration']


class ScriptSerializer(serializers.ModelSerializer):
    scenes = SceneSerializer(many=True, read_only=True)

    class Meta:
        model = Script
        fields = ['id', 'hook', 'full_text', 'hook_score', 'hashtags', 'scenes', 'created_at']
