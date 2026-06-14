from django.db import models
from django.conf import settings
from apps.groups.models import Group

class Settlement(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='settlements')
    payer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='paid_settlements')
    payee = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='received_settlements')
    amount = models.DecimalField(max_digits=12, decimal_places=4)
    currency = models.CharField(max_length=10, default='INR')
    date = models.DateField()
    note = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'settlements'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.payer.username} paid {self.payee.username} {self.amount} {self.currency}"
