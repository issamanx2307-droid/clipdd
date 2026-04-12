from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Analytics
from apps.projects.models import Project


class AnalyticsView(APIView):
    def get(self, request, pk):
        try:
            project = Project.objects.get(pk=pk, user=request.user)
            analytics, _ = Analytics.objects.get_or_create(project=project)
            return Response({
                'views': analytics.views,
                'likes': analytics.likes,
                'shares': analytics.shares,
            })
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)
