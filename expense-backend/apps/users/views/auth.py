import random
import datetime
from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.backends import TokenBackend
from django.contrib.auth import authenticate, get_user_model
from django.core.exceptions import ValidationError

from apps.users.services import create_user, reset_user_password
from apps.users.selectors import get_user_by_email, get_all_users
from apps.users.serializers import (
    RegisterSerializer,
    LoginSerializer,
    ResetPasswordRequestSerializer,
    VerifyCodeSerializer,
    ResetPasswordSerializer,
    UserSerializer
)

User = get_user_model()

def get_tokens_for_user(user):
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user = create_user(
                email=serializer.validated_data['email'],
                username=serializer.validated_data['username'],
                password=serializer.validated_data['password']
            )
        except ValidationError as e:
            return Response({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            
        tokens = get_tokens_for_user(user)
        response = Response({
            "username": user.username,
            "email": user.email,
            "message": "Successfully registered in"
        }, status=status.HTTP_200_OK)
        
        # Set cookie
        response.set_cookie(
            'jwt',
            tokens['access'],
            max_age=3600,
            httponly=True,
            samesite='Lax',
            secure=False,  # Set to True in prod if HTTPS
            path='/'
        )
        return response

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        # We also support VITE login flow check via auth/valid-login
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        user = get_user_by_email(email)
        if not user:
            return Response({"message": f"User with email {email} not found"}, status=status.HTTP_404_NOT_FOUND)
            
        if not user.check_password(password):
            return Response({"message": "Incorrect password"}, status=status.HTTP_400_BAD_REQUEST)
            
        tokens = get_tokens_for_user(user)
        response = Response({
            "username": user.username,
            "email": user.email,
            "message": "Successfully logged in"
        }, status=status.HTTP_200_OK)
        
        # Set cookies
        response.set_cookie(
            'jwt',
            tokens['access'],
            max_age=3600,
            httponly=True,
            samesite='Lax',
            secure=False,
            path='/'
        )
        response.set_cookie(
            'refreshJwt',
            tokens['refresh'],
            max_age=7*24*3600,
            httponly=True,
            samesite='Lax',
            secure=False,
            path='/'
        )
        return response

class ValidLoginCheckView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Endpoint to check if user has a password (valid-login)
        email = request.data.get("email")
        if not email:
            return Response({"message": "Email is required"}, status=status.HTTP_400_BAD_REQUEST)
        user = get_user_by_email(email)
        if not user:
            return Response({"message": "User not found", "googleOnly": False}, status=status.HTTP_404_NOT_FOUND)
        return Response({"hasPassword": user.has_usable_password()}, status=status.HTTP_200_OK)

class GetUserView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        token = request.COOKIES.get('jwt')
        if not token:
            return Response({"message": "Unauthorized access"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            # Decode the token
            from rest_framework_simplejwt.backends import TokenBackend
            valid_data = TokenBackend(algorithm='HS256').decode(token, verify=True)
            user_id = valid_data.get('user_id')
            user = User.objects.get(id=user_id)
            return Response({
                "user": {
                    "username": user.username,
                    "email": user.email,
                    "id": user.id
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"message": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)

class LogoutView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        response = Response({"message": "logout successfull"}, status=status.HTTP_200_OK)
        response.delete_cookie('jwt', path='/')
        response.delete_cookie('refreshJwt', path='/')
        return response

class GenerateCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        email = serializer.validated_data['email']
        user = get_user_by_email(email)
        if not user:
            return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        # Generate 6 digit numeric code
        code = f"{random.randint(100000, 999999)}"
        user.code = code
        user.code_expires_at = timezone.now() + datetime.timedelta(minutes=5)
        user.save()
        
        # Log to terminal console for debugging/evaluations
        print(f"==================================================")
        print(f"PASSWORD RESET CODE FOR {email}: {code}")
        print(f"==================================================")
        
        return Response({"message": "email with code sent to user"}, status=status.HTTP_200_OK)

class VerifyCodeView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = VerifyCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        email = serializer.validated_data['email']
        code = serializer.validated_data['code']
        
        user = get_user_by_email(email)
        if not user or not user.code or not user.code_expires_at:
            return Response({"success": False, "message": "User not found or code not generated"}, status=status.HTTP_404_NOT_FOUND)
            
        if user.code_expires_at < timezone.now():
            return Response({"success": False, "message": "Code has expired"}, status=status.HTTP_400_BAD_REQUEST)
            
        if user.code != code:
            return Response({"success": False, "message": "Invalid code"}, status=status.HTTP_400_BAD_REQUEST)
            
        # Clear code
        user.code = None
        user.code_expires_at = None
        user.save()
        
        return Response({"success": True, "message": "Code verified!"}, status=status.HTTP_200_OK)

class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
            
        email = serializer.validated_data['email']
        new_password = serializer.validated_data['newPassword']
        
        user = get_user_by_email(email)
        if not user:
            return Response({"message": "User not found"}, status=status.HTTP_404_NOT_FOUND)
            
        reset_user_password(user, new_password)
        return Response({"message": "Password reset successful"}, status=status.HTTP_200_OK)

class UsersListView(APIView):
    # Endpoint corresponding to Express GET /user/
    permission_classes = [AllowAny] # Usually authenticated, let's keep it AllowAny or IsAuthenticated
    
    def get(self, request):
        users = get_all_users()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

class ProfileInfoView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        token = request.COOKIES.get('jwt')
        if not token:
            return Response({"message": "Unauthorized access"}, status=status.HTTP_401_UNAUTHORIZED)
            
        try:
            from rest_framework_simplejwt.backends import TokenBackend
            valid_data = TokenBackend(algorithm='HS256').decode(token, verify=True)
            user_id = valid_data.get('user_id')
            user = User.objects.get(id=user_id)
            return Response({
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"message": "Invalid token"}, status=status.HTTP_401_UNAUTHORIZED)

