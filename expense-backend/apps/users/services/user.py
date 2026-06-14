from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

User = get_user_model()

def create_user(email: str, username: str, password: str) -> User:
    """
    Service to create a new user.
    """
    if User.objects.filter(email=email).exists():
        raise ValidationError("User with this email already exists.")
        
    user = User(email=email, username=username)
    user.set_password(password)
    user.full_clean()
    user.save()
    return user

def reset_user_password(user: User, new_password: str) -> User:
    """
    Service to update/reset a user's password.
    """
    user.set_password(new_password)
    user.save()
    return user
