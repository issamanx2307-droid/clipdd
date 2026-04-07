from django.urls import path
from .views import BillingStatusView

urlpatterns = [
    path('billing/', BillingStatusView.as_view(), name='billing-status'),
]
