from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.projects.urls')),
    path('api/', include('apps.scripts.urls')),
    path('api/', include('apps.video_engine.urls')),
    path('api/', include('apps.billing.urls')),
    path('api/', include('apps.analytics.urls')),
    path('api/', include('apps.support.urls')),
    # OpenAPI
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
