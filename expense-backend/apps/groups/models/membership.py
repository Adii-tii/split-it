from django.db import models
from django.conf import settings
from .group import Group

class GroupMembership(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='group_memberships')
    joined_at = models.DateField()
    left_at = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'group_memberships'
        unique_together = ('group', 'user', 'joined_at') # Allow joining, leaving, and joining again if necessary

    def __str__(self):
        left_str = f" to {self.left_at}" if self.left_at else " onwards"
        return f"{self.user} in {self.group.name} ({self.joined_at}{left_str})"
