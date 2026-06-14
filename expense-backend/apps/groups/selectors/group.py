from apps.groups.models import Group, GroupMembership
from django.db.models import QuerySet, Q
from django.contrib.auth import get_user_model
from datetime import date
from typing import Optional

User = get_user_model()

def get_group_by_id(group_id: int) -> Optional[Group]:
    try:
        return Group.objects.get(id=group_id)
    except Group.DoesNotExist:
        return None

def get_user_groups(user: User) -> QuerySet[Group]:
    """
    Get all groups that the user is (or was) a member of.
    """
    group_ids = GroupMembership.objects.filter(user=user).values_list('group_id', flat=True)
    return Group.objects.filter(id__in=group_ids).order_by('-created_at')

def get_active_group_members(group: Group) -> QuerySet[User]:
    """
    Get all users who are currently active members in the group.
    """
    user_ids = GroupMembership.objects.filter(
        group=group,
        left_at__isnull=True
    ).values_list('user_id', flat=True)
    return User.objects.filter(id__in=user_ids)

def get_group_members_at_date(group: Group, target_date: date) -> QuerySet[User]:
    """
    Get all users who were members of the group on a specific date.
    This handles temporal membership validation.
    """
    user_ids = GroupMembership.objects.filter(
        group=group,
        joined_at__lte=target_date
    ).filter(
        Q(left_at__isnull=True) | Q(left_at__gte=target_date)
    ).values_list('user_id', flat=True)
    return User.objects.filter(id__in=user_ids)

def get_all_groups() -> QuerySet[Group]:
    return Group.objects.all().order_by('-created_at')

def get_user_net_balance_in_group(group: Group, user: User) -> float:
    membership = GroupMembership.objects.filter(group=group, user=user).first()
    if membership:
        return float(membership.net_balance)
    return 0.0

