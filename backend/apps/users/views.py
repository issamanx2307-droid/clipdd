from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from rest_framework.authtoken.models import Token
from django.core.cache import cache
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
        request.user.auth_token.delete()
        return Response({'detail': 'ออกจากระบบแล้ว'})


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)
