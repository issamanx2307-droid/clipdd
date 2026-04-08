from django.urls import path
from .views import RegisterView, LoginView, LogoutView, MeView, GoogleAuthView

urlpatterns = [
    path('auth/register/', RegisterView.as_view(), name='register'),
    path('auth/login/', LoginView.as_view(), name='login'),
    path('auth/logout/', LogoutView.as_view(), name='logout'),
    path('auth/me/', MeView.as_view(), name='me'),
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
]
