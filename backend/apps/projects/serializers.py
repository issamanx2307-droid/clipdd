from rest_framework import serializers
from .models import Project, GeneratedImage


class GeneratedImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedImage
        fields = ['id', 'image_url', 'generation_round', 'is_selected', 'created_at']


class ProjectSerializer(serializers.ModelSerializer):
    video_url = serializers.SerializerMethodField()
    audio_url = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'name', 'product_name', 'key_points', 'tone',
            'template_url', 'duration', 'include_person', 'status', 'created_at',
            'video_url', 'audio_url',
        ]
        read_only_fields = ['id', 'status', 'created_at', 'video_url', 'audio_url']

    def get_video_url(self, obj):
        try:
            return obj.video.video_url
        except Exception:
            return None

    def get_audio_url(self, obj):
        try:
            return obj.video.audio_url
        except Exception:
            return None


class CreateProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['name', 'product_name', 'key_points', 'tone', 'voice', 'template_url', 'duration', 'include_person', 'extra_requirements']
