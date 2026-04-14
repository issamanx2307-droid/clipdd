from rest_framework import serializers
from django.contrib.auth import authenticate
from django.db import IntegrityError
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    fingerprint = serializers.CharField(write_only=True, required=False, allow_blank=True, max_length=64)

    class Meta:
        model = User
        fields = ['email', 'password', 'fingerprint']

    def validate_fingerprint(self, value):
        # ไม่ query DB ที่นี่ (กัน TOCTOU); uniqueness = DB + IntegrityError ใน create
        if not value or not str(value).strip():
            return None
        return str(value).strip()

    def create(self, validated_data):
        fingerprint = validated_data.pop('fingerprint', None)
        email = validated_data['email']
        # Derive display name from email local-part (e.g. "john.doe@..." → "john.doe")
        derived_name = email.split('@')[0]
        try:
            user = User.objects.create_user(
                username=email,
                email=email,
                password=validated_data['password'],
                name=derived_name,
                fingerprint=fingerprint,
            )
        except IntegrityError as exc:
            err = str(exc).lower()
            if 'fingerprint' in err:
                raise serializers.ValidationError({'fingerprint': 'อุปกรณ์นี้เคยสมัครแล้ว'})
            if 'email' in err or 'username' in err:
                raise serializers.ValidationError({'email': 'อีเมลนี้ถูกใช้แล้ว'})
            raise
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
        fields = ['id', 'email', 'name', 'plan', 'credits', 'is_staff', 'created_at']
        read_only_fields = ['id', 'plan', 'credits', 'is_staff', 'created_at']
