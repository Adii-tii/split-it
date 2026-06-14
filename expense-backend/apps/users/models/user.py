from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    email = models.EmailField(unique=True)
    code = models.CharField(max_length=6, blank=True, null=True)
    code_expires_at = models.DateTimeField(blank=True, null=True)
    role = models.CharField(max_length=50, blank=True, null=True, default='admin')
    credits = models.IntegerField(default=99)
    admin_id = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    
    # We will use email as the primary USERNAME field for login
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'users'

    def __str__(self):
        return f"{self.username} ({self.email})"
