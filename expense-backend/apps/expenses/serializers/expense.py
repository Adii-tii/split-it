from rest_framework import serializers
from django.contrib.auth import get_user_model
from apps.expenses.models import Expense, ExpenseSplit

User = get_user_model()

class ExpenseSplitSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(source='user.email', read_only=True)
    share = serializers.FloatField(source='amount', read_only=True)
    remaining = serializers.FloatField(source='amount', read_only=True)

    class Meta:
        model = ExpenseSplit
        fields = ['email', 'share', 'remaining', 'share_value']


class ExpenseSerializer(serializers.ModelSerializer):
    _id = serializers.IntegerField(source='id', read_only=True)
    title = serializers.CharField(source='description')
    splitType = serializers.CharField(source='split_type')
    paidBy = serializers.SerializerMethodField()
    splits = ExpenseSplitSerializer(many=True, read_only=True)

    class Meta:
        model = Expense
        fields = [
            'id', '_id', 'title', 'category', 'currency', 'amount', 
            'exchange_rate', 'splitType', 'date', 'notes', 'paidBy', 'splits', 'created_at'
        ]

    def get_paidBy(self, obj):
        # We serialize the single payer database record into a list format 
        # to match the multiple-payer frontend expectation transparently.
        return [{
            "email": obj.paid_by.email,
            "amount": float(obj.amount)
        }]
