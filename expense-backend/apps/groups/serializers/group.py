from rest_framework import serializers
from apps.groups.models import Group, GroupMembership
from apps.users.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()

class GroupSerializer(serializers.ModelSerializer):
    memberEmail = serializers.SerializerMethodField()
    adminEmail = serializers.EmailField(source='admin_email', read_only=True)

    class Meta:
        model = Group
        fields = ['id', 'name', 'description', 'adminEmail', 'thumbnail', 'created_at', 'memberEmail']

    def get_memberEmail(self, obj):
        return list(obj.memberships.values_list('user__email', flat=True))

class GroupMembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    class Meta:
        model = GroupMembership
        fields = ['id', 'group', 'user', 'joined_at', 'left_at']

class AddMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    joined_at = serializers.DateField(required=False)

    def validate_joined_at(self, value):
        if not value:
            from datetime import date
            return date.today()
        return value

class RemoveMemberSerializer(serializers.Serializer):
    email = serializers.EmailField()
    left_at = serializers.DateField(required=False)

    def validate_left_at(self, value):
        if not value:
            from datetime import date
            return date.today()
        return value
