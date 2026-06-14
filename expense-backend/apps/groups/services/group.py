from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from datetime import date
from apps.groups.models import Group, GroupMembership
from typing import Optional

User = get_user_model()

def create_group(name: str) -> Group:
    """
    Service to create a new group.
    """
    if not name.strip():
        raise ValidationError("Group name cannot be empty.")
    group = Group(name=name)
    group.save()
    return group

def add_member_to_group(group: Group, user: User, joined_at: date, left_at: Optional[date] = None) -> GroupMembership:
    """
    Service to add a user to a group with a specific temporal joined_at and optional left_at.
    """
    # Check if there is an active membership for this user in the group
    active_membership = GroupMembership.objects.filter(
        group=group,
        user=user,
        left_at__isnull=True
    ).exists()
    
    if active_membership:
         raise ValidationError(f"{user.username} is already an active member of this group.")
         
    membership = GroupMembership(
        group=group,
        user=user,
        joined_at=joined_at,
        left_at=left_at
    )
    membership.full_clean()
    membership.save()
    return membership

def remove_member_from_group(group: Group, user: User, left_at: date) -> GroupMembership:
    """
    Service to set the left_at date for a user, effectively removing them from active status.
    """
    try:
        membership = GroupMembership.objects.get(
            group=group,
            user=user,
            left_at__isnull=True
        )
    except GroupMembership.DoesNotExist:
        raise ValidationError(f"{user.username} is not an active member of this group.")
        
    if left_at < membership.joined_at:
        raise ValidationError("Leave date cannot be before join date.")
        
    membership.left_at = left_at
    membership.save()
    return membership
