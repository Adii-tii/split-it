from django.urls import path
from apps.settlements.views.settlement import UserSettlementsView

urlpatterns = [
    path('user/', UserSettlementsView.as_view(), name='user_settlements'),
    path('user', UserSettlementsView.as_view(), name='user_settlements_no_slash'),
]
