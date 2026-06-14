from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.db import transaction
from django.core.files.storage import default_storage
from datetime import date
import uuid

from apps.groups.models import Group, GroupMembership
from apps.groups.serializers.group import GroupSerializer
from apps.groups.selectors.group import (
    get_user_groups,
    get_group_by_id,
    get_user_net_balance_in_group
)
from apps.groups.services.group import add_member_to_group, remove_member_from_group
from apps.users.selectors import get_user_by_email

User = get_user_model()

class GroupMyGroupsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 8))
        sort_by = request.query_params.get('sortBy', 'newest')

        groups_qs = get_user_groups(user)

        # Apply sorting
        if sort_by == 'oldest':
            groups_qs = groups_qs.order_by('created_at')
        elif sort_by == 'atoz':
            groups_qs = groups_qs.order_by('name')
        elif sort_by == 'ztoa':
            groups_qs = groups_qs.order_by('-name')
        else:
            groups_qs = groups_qs.order_by('-created_at')

        # Pagination
        paginator = Paginator(groups_qs, limit)
        current_page_obj = paginator.get_page(page)

        serializer = GroupSerializer(current_page_obj.object_list, many=True)

        return Response({
            "message": "All groups fetched successfully!",
            "groups": serializer.data,
            "groupCount": paginator.count,
            "pagination": {
                "totalItems": paginator.count,
                "totalPages": paginator.num_pages,
                "currentPage": page,
                "itemsPerPage": limit
            }
        }, status=status.HTTP_200_OK)


class GroupCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        name = request.data.get('name')
        description = request.data.get('description', '')
        member_emails = request.data.get('memberEmail', [])
        thumbnail = request.data.get('thumbnail', '')

        user = request.user
        
        # Check credits constraints
        if user.credits is not None and user.credits <= 0:
            return Response({
                "message": "Insufficient credits available to create group"
            }, status=status.HTTP_400_BAD_REQUEST)

        # Validate name
        if not name or not name.strip():
            return Response({
                "message": "Group name cannot be empty."
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            with transaction.atomic():
                # Deduct credits
                if user.credits is not None:
                    user.credits -= 1
                    user.save()

                # Create group instance
                group = Group.objects.create(
                    name=name,
                    description=description,
                    admin_email=user.email,
                    thumbnail=thumbnail
                )

                # Deduplicate and add admin
                unique_emails = set(member_emails)
                unique_emails.add(user.email)

                today = date.today()

                for email in unique_emails:
                    if not email.strip():
                        continue
                    member_user = get_user_by_email(email)
                    if not member_user:
                        # Auto-create invited shell user
                        username_part = email.split('@')[0]
                        member_user = User.objects.create_user(
                            email=email,
                            username=username_part,
                            password=str(uuid.uuid4())
                        )
                    add_member_to_group(group, member_user, joined_at=today)

                serializer = GroupSerializer(group)
                return Response({
                    "message": "Group created successfully",
                    "group": serializer.data
                }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({
                "message": f"Internal server error: {e}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GroupDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found!"}, status=status.HTTP_404_NOT_FOUND)
        serializer = GroupSerializer(group)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def patch(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found!"}, status=status.HTTP_404_NOT_FOUND)

        if group.admin_email != request.user.email:
            return Response({"message": "Only admin can edit group details"}, status=status.HTTP_403_FORBIDDEN)

        name = request.data.get('name')
        description = request.data.get('description')
        thumbnail = request.data.get('thumbnail')
        admin_email = request.data.get('adminEmail')

        if name:
            group.name = name
        if description is not None:
            group.description = description
        if thumbnail is not None:
            group.thumbnail = thumbnail
        if admin_email:
            group.admin_email = admin_email
            
        group.save()

        serializer = GroupSerializer(group)
        return Response({
            "message": "Group details updated successfully",
            "group": serializer.data
        }, status=status.HTTP_200_OK)

    def delete(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found!"}, status=status.HTTP_404_NOT_FOUND)

        if group.admin_email != request.user.email:
            return Response({"message": "Only admin can delete group"}, status=status.HTTP_403_FORBIDDEN)

        group.delete()
        return Response({"message": "Removed group successfully"}, status=status.HTTP_200_OK)


class GroupAddMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found!"}, status=status.HTTP_404_NOT_FOUND)

        if group.admin_email != request.user.email:
            return Response({"message": "Only admin can add members"}, status=status.HTTP_403_FORBIDDEN)

        new_members = request.data.get('newMembers', [])
        today = date.today()

        try:
            with transaction.atomic():
                for email in new_members:
                    if not email.strip():
                        continue
                    member_user = get_user_by_email(email)
                    if not member_user:
                        # Auto-create user
                        username_part = email.split('@')[0]
                        member_user = User.objects.create_user(
                            email=email,
                            username=username_part,
                            password=str(uuid.uuid4())
                        )
                    
                    exists = GroupMembership.objects.filter(
                        group=group, 
                        user=member_user, 
                        left_at__isnull=True
                    ).exists()
                    
                    if not exists:
                        add_member_to_group(group, member_user, joined_at=today)

            serializer = GroupSerializer(group)
            return Response({
                "message": "Members added successfully",
                "group": serializer.data
            }, status=status.HTTP_200_OK)

        except Exception as e:
            return Response({
                "message": f"Internal server error: {e}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GroupRemoveMembersView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found!"}, status=status.HTTP_404_NOT_FOUND)

        if group.admin_email != request.user.email:
            return Response({"message": "Only admin can remove members"}, status=status.HTTP_403_FORBIDDEN)

        emails = request.data.get('emails', [])
        today = date.today()

        try:
            with transaction.atomic():
                for email in emails:
                    if not email.strip():
                        continue
                    member_user = get_user_by_email(email)
                    if member_user:
                        balance = get_user_net_balance_in_group(group, member_user)
                        if balance != 0:
                            return Response({
                                "message": f"Cannot remove {email}, unsettled balances exist"
                            }, status=status.HTTP_400_BAD_REQUEST)
                        
                        remove_member_from_group(group, member_user, left_at=today)

            serializer = GroupSerializer(group)
            return Response({
                "message": "Members removed successfully",
                "group": serializer.data
            }, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response({"message": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                "message": f"Internal server error: {e}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class GroupUploadThumbnailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, group_id):
        group = get_group_by_id(group_id)
        if not group:
            return Response({"message": "Group not found!"}, status=status.HTTP_404_NOT_FOUND)

        image_file = request.FILES.get('image')
        if not image_file:
            return Response({"message": "No image provided"}, status=status.HTTP_400_BAD_REQUEST)

        # Save to media/group_thumbnails directory
        file_name = default_storage.save(
            f"group_thumbnails/group_{group_id}_{image_file.name}", 
            image_file
        )
        file_url = request.build_absolute_uri(default_storage.url(file_name))
        
        group.thumbnail = file_url
        group.save()

        serializer = GroupSerializer(group)
        return Response({
            "thumbnail": file_url,
            "group": serializer.data
        }, status=status.HTTP_200_OK)
