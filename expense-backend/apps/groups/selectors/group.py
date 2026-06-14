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
    from django.db import models as dj_models
    from django.db.models import Sum
    from decimal import Decimal
    from apps.expenses.models import Expense, ExpenseSplit
    from apps.settlements.models import Settlement
    
    # 1. Total paid by user in expenses in this group
    total_paid = Expense.objects.filter(group=group, paid_by=user).aggregate(
        total=Sum(dj_models.F('amount') * dj_models.F('exchange_rate'))
    )['total'] or Decimal('0.0')
    
    # 2. Total owed by user (splits) in this group
    total_owed = ExpenseSplit.objects.filter(expense__group=group, user=user).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.0')
    
    # 3. Total paid by user in settlements
    settlements_paid = Settlement.objects.filter(group=group, payer=user).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.0')
    
    # 4. Total received by user in settlements
    settlements_received = Settlement.objects.filter(group=group, payee=user).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.0')
    
    net_balance = total_paid - total_owed + settlements_paid - settlements_received
    return float(net_balance)

