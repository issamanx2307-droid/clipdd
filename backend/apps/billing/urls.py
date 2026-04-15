from django.urls import path
from .views import BillingStatusView, CreditOrderView, PublicPaymentSettingsView

urlpatterns = [
    path('billing/', BillingStatusView.as_view(), name='billing-status'),
    path('orders/', CreditOrderView.as_view(), name='credit-orders'),
    path('payment-settings/', PublicPaymentSettingsView.as_view(), name='payment-settings'),
]
