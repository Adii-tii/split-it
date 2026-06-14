from django.db import models
from apps.groups.models import Group

class ImportJob(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='import_jobs')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, default='pending') # pending, processed

    class Meta:
        db_table = 'import_jobs'

    def __str__(self):
        return f"Job #{self.id} for {self.group.name} ({self.status})"

class ImportAnomaly(models.Model):
    job = models.ForeignKey(ImportJob, on_delete=models.CASCADE, related_name='anomalies')
    row_index = models.IntegerField()
    anomaly_type = models.CharField(max_length=50) # duplicate, currency, invalid_split, missing_payer, etc.
    description = models.TextField()
    suggested_action = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, default='pending') # pending, approved, ignored
    raw_data = models.TextField() # JSON serialized string of raw CSV row
    resolved_data = models.TextField(null=True, blank=True) # JSON serialized string of resolved CSV row

    class Meta:
        db_table = 'import_anomalies'
        ordering = ['row_index']

    def __str__(self):
        return f"Anomaly in row {self.row_index}: {self.anomaly_type} ({self.status})"
