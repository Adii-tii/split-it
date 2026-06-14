import json
from rest_framework import serializers
from apps.expenses.models import ImportJob, ImportAnomaly

class JSONFieldSerializer(serializers.Field):
    """
    Custom serializer field to convert database TextField containing JSON
    into standard dictionary/list objects for API responses, and vice-versa.
    """
    def to_representation(self, value):
        if not value:
            return None
        try:
            return json.loads(value)
        except Exception:
            return value

    def to_internal_value(self, data):
        if data is None:
            return None
        return json.dumps(data)


class ImportAnomalySerializer(serializers.ModelSerializer):
    raw_data = JSONFieldSerializer()
    resolved_data = JSONFieldSerializer(required=False, allow_null=True)

    class Meta:
        model = ImportAnomaly
        fields = [
            'id', 'row_index', 'anomaly_type', 'description', 
            'suggested_action', 'status', 'raw_data', 'resolved_data'
        ]


class ImportJobSerializer(serializers.ModelSerializer):
    anomalies = ImportAnomalySerializer(many=True, read_only=True)

    class Meta:
        model = ImportJob
        fields = ['id', 'group', 'uploaded_at', 'status', 'anomalies']
