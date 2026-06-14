from django.urls import path
from apps.groups.views.group import (
    GroupMyGroupsView,
    GroupCreateView,
    GroupDetailView,
    GroupAddMembersView,
    GroupRemoveMembersView,
    GroupUploadThumbnailView
)

urlpatterns = [
    path('my-groups', GroupMyGroupsView.as_view(), name='group_my_groups'),
    path('create', GroupCreateView.as_view(), name='group_create'),
    path('<int:group_id>', GroupDetailView.as_view(), name='group_update'),
    path('<int:group_id>/delete', GroupDetailView.as_view(), name='group_delete'),
    path('<int:group_id>/add-members', GroupAddMembersView.as_view(), name='group_add_members'),
    path('<int:group_id>/remove-members', GroupRemoveMembersView.as_view(), name='group_remove_members'),
    path('<int:group_id>/thumbnail', GroupUploadThumbnailView.as_view(), name='group_upload_thumbnail'),
]
