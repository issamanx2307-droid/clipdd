from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.projects.urls')),
    path('api/', include('apps.scripts.urls')),
    path('api/', include('apps.video_engine.urls')),
    path('api/', include('apps.billing.urls')),
    path('api/', include('apps.analytics.urls')),
    path('api/', include('apps.support.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
