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

                # Create ExpenseSplit records
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

                    ExpenseSplit.objects.create(
                        expense=expense,
                        user=split_user,
                        amount=Decimal(str(share)),
                        share_value=Decimal(str(split.get('share_value', share) or share))
                    )

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
            expense = Expense.objects.get(id=expense_id, group_id=group_id)
            expense.delete()
            return Response({"message": "Expense deleted"}, status=status.HTTP_200_OK)
        except Expense.DoesNotExist:
            return Response({"message": "Expense does not exist"}, status=status.HTTP_404_NOT_FOUND)
