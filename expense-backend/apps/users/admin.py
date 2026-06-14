from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['email', 'username', 'is_staff', 'is_active']
    fieldsets = UserAdmin.fieldsets + (
        ('OTP Reset Config', {'fields': ('code', 'code_expires_at')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('OTP Reset Config', {'fields': ('code', 'code_expires_at')}),
    )
