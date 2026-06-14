from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.db import transaction
from datetime import date
from decimal import Decimal

from apps.groups.selectors.group import get_group_by_id, get_user_net_balance_in_group
from apps.expenses.models import Expense, ExpenseSplit
from apps.expenses.serializers.expense import ExpenseSerializer
from apps.users.selectors import get_user_by_email

User = get_user_model()

class ExpenseListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        expenses = Expense.objects.filter(group=group).order_by('-date', '-created_at')
        net_balance = get_user_net_balance_in_group(group, request.user)

        serializer = ExpenseSerializer(expenses, many=True)
        return Response({
            "expenses": serializer.data,
            "netBalance": net_balance
        }, status=status.HTTP_200_OK)

    def post(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        title = request.data.get('title')
        category = request.data.get('category', 'Food')
        currency = request.data.get('currency', 'INR')
        amount_val = request.data.get('amount')
        splits_data = request.data.get('splits')
        paid_by_data = request.data.get('paidBy')
        split_type = request.data.get('splitType', 'equal')
        notes = request.data.get('notes', '')

        if not title or amount_val is None or not splits_data or not paid_by_data:
            return Response({"message": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_val))
        except Exception:
            return Response({"message": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        # Identify primary payer (highest paying user)
        valid_payers = [p for p in paid_by_data if float(p.get('amount', 0)) > 0]
        if not valid_payers:
            return Response({"message": "No valid payers specified"}, status=status.HTTP_400_BAD_REQUEST)

        # Verify paid and split totals match the expense amount
        paid_total = Decimal(str(sum(float(p.get('amount', 0)) for p in paid_by_data)))
        split_total = Decimal(str(sum(float(s.get('share', 0)) for s in splits_data)))

        if abs(paid_total - amount) > Decimal('0.05') or abs(split_total - amount) > Decimal('0.05'):
            return Response({
                "message": f"Paid total ({paid_total}) and split total ({split_total}) must equal expense amount ({amount})"
            }, status=status.HTTP_400_BAD_REQUEST)

        primary_payer_data = max(valid_payers, key=lambda p: float(p['amount']))
        primary_payer = get_user_by_email(primary_payer_data['email'])
        if not primary_payer:
            return Response({"message": f"Primary payer {primary_payer_data['email']} not found"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Create Expense
                expense = Expense.objects.create(
                    group=group,
                    description=title,
                    amount=amount,
                    currency=currency,
                    exchange_rate=Decimal('1.0'),  # Defaults to 1.0 for local/MVP
                    paid_by=primary_payer,
                    split_type=split_type,
                    category=category,
                    date=date.today(),
                    notes=notes
                )

                # Create ExpenseSplit records and deduct from member net balances
                for split in splits_data:
                    email = split.get('email')
                    share = split.get('share', 0)
                    if not email:
                        continue
                    
                    split_user = get_user_by_email(email)
                    if not split_user:
                        # Auto-create invited shell user
                        import uuid
                        username_part = email.split('@')[0]
                        split_user = User.objects.create_user(
                            email=email,
                            username=username_part,
                            password=str(uuid.uuid4())
                        )
                        # Add membership if missing
                        from apps.groups.models import GroupMembership
                        if not GroupMembership.objects.filter(group=group, user=split_user).exists():
                            GroupMembership.objects.create(
                                group=group,
                                user=split_user,
                                joined_at=date.today()
                            )

                    # Deduct split share from net balance
                    from apps.groups.models import GroupMembership
                    membership = GroupMembership.objects.filter(group=group, user=split_user).first()
                    if membership:
                        membership.net_balance -= Decimal(str(share))
                        membership.save()

                    ExpenseSplit.objects.create(
                        expense=expense,
                        user=split_user,
                        amount=Decimal(str(share)),
                        share_value=Decimal(str(split.get('share_value', share) or share))
                    )

                # Add paid amounts to member net balances
                for payer in paid_by_data:
                    email = payer.get('email')
                    amt = Decimal(str(payer.get('amount', 0)))
                    payer_user = get_user_by_email(email)
                    if payer_user:
                        from apps.groups.models import GroupMembership
                        membership = GroupMembership.objects.filter(group=group, user=payer_user).first()
                        if not membership:
                            membership = GroupMembership.objects.create(
                                group=group,
                                user=payer_user,
                                joined_at=date.today()
                            )
                        membership.net_balance += amt
                        membership.save()

                serializer = ExpenseSerializer(expense)
                return Response({
                    "expense": serializer.data,
                    "message": "Expense created successfully"
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"message": f"Internal server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ExpenseDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, group_id, expense_id):
        return Response({
            "message": "Editing expenses after settlements is restricted. Create a correction expense instead."
        }, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, group_id, expense_id):
        try:
            with transaction.atomic():
                expense = Expense.objects.get(id=expense_id, group_id=group_id)

                # Reverse splits
                for split in expense.splits.all():
                    from apps.groups.models import GroupMembership
                    membership = GroupMembership.objects.filter(group=expense.group, user=split.user).first()
                    if membership:
                        membership.net_balance += split.amount
                        membership.save()

                # Reverse paid amount
                from apps.groups.models import GroupMembership
                membership = GroupMembership.objects.filter(group=expense.group, user=expense.paid_by).first()
                if membership:
                    membership.net_balance -= expense.amount
                    membership.save()

                expense.delete()
                return Response({"message": "Expense deleted"}, status=status.HTTP_200_OK)
        except Expense.DoesNotExist:
            return Response({"message": "Expense does not exist"}, status=status.HTTP_404_NOT_FOUND)


class ExpenseTotalOwedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        balance = get_user_net_balance_in_group(group, request.user)
        total_owed = abs(balance) if balance < 0 else 0.0
        return Response({"totalOwed": round(total_owed, 2)}, status=status.HTTP_200_OK)


class ExpenseTotalIsOwedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        balance = get_user_net_balance_in_group(group, request.user)
        total_is_owed = balance if balance > 0 else 0.0
        return Response({"totalIsOwed": round(total_is_owed, 2)}, status=status.HTTP_200_OK)


class ExpensePeopleIOweView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        my_balance = get_user_net_balance_in_group(group, request.user)
        if my_balance >= 0:
            return Response({"creditors": []}, status=status.HTTP_200_OK)

        remaining_debt = abs(my_balance)
        creditors = []

        # Get all members of the group
        from apps.groups.models import GroupMembership
        memberships = GroupMembership.objects.filter(group=group).select_related('user')
        
        # Deduplicate to find the active net balance per email
        balances = {}
        for ms in memberships:
            balances[ms.user.email] = float(ms.net_balance)

        for email, bal in balances.items():
            if remaining_debt <= 0:
                break
            if email == request.user.email:
                continue
            if bal > 0:
                amount = min(remaining_debt, bal)
                creditors.append({
                    "email": email,
                    "amount": round(amount, 2)
                })
                remaining_debt -= amount

        return Response({"creditors": creditors}, status=status.HTTP_200_OK)
