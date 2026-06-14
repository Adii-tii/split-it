from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.db.models import Q
from datetime import date
from decimal import Decimal

from apps.groups.selectors.group import get_group_by_id
from apps.users.selectors import get_user_by_email
from apps.settlements.models.settlement import Settlement
from apps.settlements.serializers.settlement import SettlementSerializer

class GroupSettlementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        settlements = Settlement.objects.filter(group=group).order_by('-date', '-created_at')
        serializer = SettlementSerializer(settlements, many=True)
        return Response({"settlements": serializer.data}, status=status.HTTP_200_OK)

    def post(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found"}, status=status.HTTP_404_NOT_FOUND)

        from_email = request.data.get('fromUserEmail')
        to_email = request.data.get('toUserEmail')
        amount_val = request.data.get('amount')
        currency = request.data.get('currency', 'INR')
        note = request.data.get('note', '')

        if not from_email or not to_email or amount_val is None:
            return Response({"message": "Missing required fields"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            amount = Decimal(str(amount_val))
        except Exception:
            return Response({"message": "Invalid amount"}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({"message": "Amount must be greater than zero"}, status=status.HTTP_400_BAD_REQUEST)

        payer = get_user_by_email(from_email)
        payee = get_user_by_email(to_email)

        if not payer or not payee:
            return Response({"message": "Payer or Payee user not found"}, status=status.HTTP_400_BAD_REQUEST)

        from apps.groups.models import GroupMembership
        payer_membership = GroupMembership.objects.filter(group=group, user=payer).first()
        payee_membership = GroupMembership.objects.filter(group=group, user=payee).first()

        if not payer_membership or not payee_membership:
            return Response({"message": "Users are not members of the group"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Create Settlement record
                settlement = Settlement.objects.create(
                    group=group,
                    payer=payer,
                    payee=payee,
                    amount=amount,
                    currency=currency,
                    note=note,
                    date=date.today()
                )

                # Update balances: payer paid, so moves closer to 0 (positive net balance change)
                payer_membership.net_balance += amount
                payer_membership.save()

                # payee received, so moves closer to 0 (negative net balance change)
                payee_membership.net_balance -= amount
                payee_membership.save()

                serializer = SettlementSerializer(settlement)
                return Response({
                    "settlement": serializer.data,
                    "message": "Settlement recorded successfully"
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"message": f"Internal server error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class UserSettlementsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        settlements = Settlement.objects.filter(Q(payer=user) | Q(payee=user)).order_by('-date', '-created_at')
        serializer = SettlementSerializer(settlements, many=True)
        return Response({"settlements": serializer.data}, status=status.HTTP_200_OK)
