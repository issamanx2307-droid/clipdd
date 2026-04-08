from rest_framework import serializers
from .models import Project, GeneratedImage


class GeneratedImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = GeneratedImage
        fields = ['id', 'image_url', 'generation_round', 'is_selected', 'created_at']


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'product_name', 'key_points', 'tone', 'template_url', 'duration', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']


class CreateProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['name', 'product_name', 'key_points', 'tone', 'voice', 'template_url', 'duration']
