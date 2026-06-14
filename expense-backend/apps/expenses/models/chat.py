from django.db import models
from django.conf import settings
from .expense import Expense

class ExpenseChat(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='chats')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expense_chats')
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expense_chats'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.message[:20]}"
