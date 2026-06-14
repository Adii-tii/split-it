from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model

User = get_user_model()

class JWTHeaderAuthentication(BaseAuthentication):
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return None
            
        token = auth_header.split(' ')[1]
        try:
            validated_token = AccessToken(token)
            user_id = validated_token.get('user_id')
            user = User.objects.get(id=user_id)
            return (user, token)
        except (TokenError, User.DoesNotExist) as e:
            raise AuthenticationFailed(f'Invalid or expired token: {e}')


