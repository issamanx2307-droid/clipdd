from rest_framework import serializers
from .models import Project


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['id', 'name', 'product_name', 'key_points', 'tone', 'status', 'created_at']
        read_only_fields = ['id', 'status', 'created_at']


class CreateProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        fields = ['name', 'product_name', 'key_points', 'tone']
