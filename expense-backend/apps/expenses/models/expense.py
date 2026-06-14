from django.db import models
from django.conf import settings
from apps.groups.models import Group

class Expense(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='expenses')
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=12, decimal_places=4) # Using decimal_places=4 to avoid rounding issues
    currency = models.CharField(max_length=10, default='INR')
    exchange_rate = models.DecimalField(max_digits=12, decimal_places=6, default=1.0) # conversion rate to INR
    paid_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='paid_expenses')
    split_type = models.CharField(max_length=20, default='equal') # equal, unequal, percentage, share
    category = models.CharField(max_length=100, default='Food')
    date = models.DateField()
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.description} ({self.amount} {self.currency})"
