from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Script
from .serializers import ScriptSerializer
from apps.projects.models import Project


class ProjectScriptView(APIView):
    def get(self, request, project_id):
        try:
            project = Project.objects.get(pk=project_id, user=request.user)
            script = project.script
            return Response(ScriptSerializer(script).data)
        except Project.DoesNotExist:
            return Response({'detail': 'ไม่พบโปรเจค'}, status=status.HTTP_404_NOT_FOUND)
        except Script.DoesNotExist:
            return Response({'detail': 'ยังไม่มีสคริปต์'}, status=status.HTTP_404_NOT_FOUND)
