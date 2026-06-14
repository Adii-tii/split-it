from rest_framework import serializers
from apps.settlements.models.settlement import Settlement

class SettlementSerializer(serializers.ModelSerializer):
    _id = serializers.IntegerField(source='id', read_only=True)
    groupId = serializers.IntegerField(source='group.id', read_only=True)
    fromUserEmail = serializers.EmailField(source='payer.email', read_only=True)
    toUserEmail = serializers.EmailField(source='payee.email', read_only=True)
    amount = serializers.FloatField()
    createdAt = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = Settlement
        fields = [
            'id', '_id', 'groupId', 'fromUserEmail', 'toUserEmail', 
            'amount', 'currency', 'note', 'created_at', 'createdAt'
        ]
