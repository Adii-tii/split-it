from django.urls import path, include
from apps.groups.views.group import (
    GroupMyGroupsView,
    GroupCreateView,
    GroupDetailView,
    GroupAddMembersView,
    GroupRemoveMembersView,
    GroupUploadThumbnailView
)

from apps.expenses.views.expense import (
    ExpenseListCreateView, 
    ExpenseDetailView,
    ExpenseTotalOwedView,
    ExpenseTotalIsOwedView,
    ExpensePeopleIOweView
)
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

class GroupDummySettlementsView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request, *args, **kwargs):
        return Response({"settlements": []})

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

    # Balance and settlements endpoints (with and without trailing slashes)
    path('<int:group_id>/total-owed', ExpenseTotalOwedView.as_view(), name='group_total_owed'),
    path('<int:group_id>/total-owed/', ExpenseTotalOwedView.as_view(), name='group_total_owed_slash'),
    path('<int:group_id>/total-is-owed', ExpenseTotalIsOwedView.as_view(), name='group_total_is_owed'),
    path('<int:group_id>/total-is-owed/', ExpenseTotalIsOwedView.as_view(), name='group_total_is_owed_slash'),
    path('<int:group_id>/people-i-owe', ExpensePeopleIOweView.as_view(), name='group_people_i_owe'),
    path('<int:group_id>/people-i-owe/', ExpensePeopleIOweView.as_view(), name='group_people_i_owe_slash'),
    path('<int:group_id>/settlements', GroupDummySettlementsView.as_view(), name='group_settlements_dummy'),
    path('<int:group_id>/settlements/', GroupDummySettlementsView.as_view(), name='group_settlements_dummy_slash'),
]
