from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Subscription, UsageLog


class BillingStatusView(APIView):
    def get(self, request):
        user = request.user
        data = {
            'plan': user.plan,
            'credits': user.credits,
        }
        try:
            sub = user.subscription
            data['subscription'] = {
                'status': sub.status,
                'end_date': sub.end_date,
            }
        except Subscription.DoesNotExist:
            data['subscription'] = None

        usage = UsageLog.objects.filter(user=user).order_by('-created_at')[:10]
        data['recent_usage'] = [
            {'action': u.action, 'credits_used': u.credits_used, 'created_at': u.created_at}
            for u in usage
        ]
        return Response(data)
