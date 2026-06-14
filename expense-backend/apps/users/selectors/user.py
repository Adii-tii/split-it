from django.contrib.auth import get_user_model
from django.db.models import QuerySet
from typing import Optional

User = get_user_model()

def get_user_by_email(email: str) -> Optional[User]:
    """
    Selector to retrieve a user by email.
    """
    try:
        return User.objects.get(email=email)
    except User.DoesNotExist:
        return None

def get_all_users() -> QuerySet[User]:
    """
    Selector to list all registered users.
    """
    return User.objects.all().order_by('username')
