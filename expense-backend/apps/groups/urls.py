from django.urls import path, include
from apps.groups.views.group import (
    GroupMyGroupsView,
    GroupCreateView,
    GroupDetailView,
    GroupAddMembersView,
    GroupRemoveMembersView,
    GroupUploadThumbnailView
)

from apps.expenses.views.expense import ExpenseListCreateView, ExpenseDetailView

urlpatterns = [
    path('my-groups', GroupMyGroupsView.as_view(), name='group_my_groups'),
    path('create', GroupCreateView.as_view(), name='group_create'),
    path('<int:group_id>', GroupDetailView.as_view(), name='group_update'),
    path('<int:group_id>/delete', GroupDetailView.as_view(), name='group_delete'),
    path('<int:group_id>/add-members', GroupAddMembersView.as_view(), name='group_add_members'),
    path('<int:group_id>/remove-members', GroupRemoveMembersView.as_view(), name='group_remove_members'),
    path('<int:group_id>/thumbnail', GroupUploadThumbnailView.as_view(), name='group_upload_thumbnail'),
    
    # Nested Expenses direct mappings (with and without trailing slashes)
    path('<int:group_id>/expenses', ExpenseListCreateView.as_view(), name='expense_list_create'),
    path('<int:group_id>/expenses/', ExpenseListCreateView.as_view(), name='expense_list_create_slash'),
    path('<int:group_id>/expenses/<int:expense_id>', ExpenseDetailView.as_view(), name='expense_detail'),
    path('<int:group_id>/expenses/<int:expense_id>/', ExpenseDetailView.as_view(), name='expense_detail_slash'),
]
