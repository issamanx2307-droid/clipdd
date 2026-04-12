from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from django.core.cache import cache
from django.conf import settings
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer

def get_client_ip(request):
    x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
    return x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR', '')

class RegisterView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        # IP rate limit: 3 registrations per IP per day
        ip = get_client_ip(request)
        cache_key = f'reg_ip_{ip}'
        count = cache.get(cache_key, 0)
        if count >= 3:
            return Response({'detail': 'สมัครได้สูงสุด 3 ครั้ง/วัน จาก IP นี้'}, status=status.HTTP_429_TOO_MANY_REQUESTS)

        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            cache.set(cache_key, count + 1, 86400)  # 24h
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token, _ = Token.objects.get_or_create(user=user)
            return Response({'token': token.key, 'user': UserSerializer(user).data})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    def post(self, request):
        try:
            request.user.auth_token.delete()
        except Exception:
            pass
        return Response({'detail': 'ออกจากระบบแล้ว'})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class GoogleAuthView(APIView):
    """Sign in / sign up with Google (access_token from implicit flow)."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        name = request.data.get('name', '').strip()
        access_token = request.data.get('access_token', '').strip()

        if not email or not access_token:
            return Response({'detail': 'email และ access_token required'}, status=400)

        # Verify token via Google userinfo
        import urllib.request as _ur
        import json as _json
        try:
            req = _ur.Request(
                'https://www.googleapis.com/oauth2/v3/userinfo',
                headers={'Authorization': f'Bearer {access_token}'}
            )
            with _ur.urlopen(req, timeout=8) as r:
                info = _json.loads(r.read())
            if info.get('email', '').lower() != email:
                return Response({'detail': 'email ไม่ตรงกับ token'}, status=400)
        except Exception as e:
            return Response({'detail': f'Google token ไม่ถูกต้อง: {str(e)}'}, status=400)

        from .models import User

        # Check if user already exists — skip IP limit for existing users (login flow)
        existing = User.objects.filter(email=email).first()
        if not existing:
            # New account: enforce IP rate limit (3 new accounts/IP/day)
            ip = get_client_ip(request)
            cache_key = f'reg_ip_{ip}'
            count = cache.get(cache_key, 0)
            if count >= 3:
                return Response(
                    {'detail': 'สมัครได้สูงสุด 3 ครั้ง/วัน จาก IP นี้'},
                    status=status.HTTP_429_TOO_MANY_REQUESTS
                )
            cache.set(cache_key, count + 1, 86400)

        user, created = User.objects.get_or_create(
            email=email,
            defaults={'name': name, 'is_google': True, 'username': email},
        )
        if not user.name and name:
            user.name = name
            user.save(update_fields=['name'])

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'token': token.key,
            'user': UserSerializer(user).data,
            'created': created,
        })
