from django.db import models
from django.conf import settings
from .expense import Expense

class ExpenseSplit(models.Model):
    expense = models.ForeignKey(Expense, on_delete=models.CASCADE, related_name='splits')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='expense_splits')
    amount = models.DecimalField(max_digits=12, decimal_places=4) # calculated amount in INR
    share_value = models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True) # raw % / share / amount

    class Meta:
        db_table = 'expense_splits'
        unique_together = ('expense', 'user')

    def __str__(self):
        return f"{self.user.username} share for {self.expense.description}: {self.amount} INR"
