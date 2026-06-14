from django.urls import path
from apps.users.views import (
    RegisterView,
    LoginView,
    ValidLoginCheckView,
    GetUserView,
    LogoutView,
    GenerateCodeView,
    VerifyCodeView,
    ResetPasswordView,
    UsersListView,
    GoogleAuthView
)

urlpatterns = [
    # Auth Endpoints
    path('register', RegisterView.as_view(), name='register'),
    path('login', LoginView.as_view(), name='login'),
    path('valid-login', ValidLoginCheckView.as_view(), name='valid_login_check'),
    path('get-user', GetUserView.as_view(), name='get_user'),
    path('logout', LogoutView.as_view(), name='logout'),
    path('generate-code', GenerateCodeView.as_view(), name='generate_code'),
    path('verify-code', VerifyCodeView.as_view(), name='verify_code'),
    path('reset-password', ResetPasswordView.as_view(), name='reset_password'),
    path('google-auth', GoogleAuthView.as_view(), name='google_auth'),
]
