from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.backends import TokenBackend
from django.contrib.auth import get_user_model

User = get_user_model()

class JWTCookieAuthentication(BaseAuthentication):
    def authenticate(self, request):
        token = request.COOKIES.get('jwt')
        if not token:
            # Fallback to Authorization header if cookie not present
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
            else:
                return None
                
        try:
            valid_data = TokenBackend(algorithm='HS256').decode(token, verify=True)
            user_id = valid_data.get('user_id')
            user = User.objects.get(id=user_id)
            return (user, token)
        except Exception:
            raise AuthenticationFailed('Invalid or expired token')
