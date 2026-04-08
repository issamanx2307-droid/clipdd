from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    fingerprint = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['email', 'name', 'password', 'fingerprint']

    def validate_fingerprint(self, value):
        if value and User.objects.filter(fingerprint=value).exists():
            raise serializers.ValidationError('อุปกรณ์นี้เคยสมัครแล้ว')
        return value

    def create(self, validated_data):
        fingerprint = validated_data.pop('fingerprint', '')
        user = User.objects.create_user(
            username=validated_data['email'],
            email=validated_data['email'],
            password=validated_data['password'],
            name=validated_data.get('name', ''),
            fingerprint=fingerprint,
        )
        return user


class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        user = authenticate(username=data['email'], password=data['password'])
        if not user:
            raise serializers.ValidationError('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'email', 'name', 'plan', 'credits', 'created_at']
        read_only_fields = ['id', 'plan', 'credits', 'created_at']
