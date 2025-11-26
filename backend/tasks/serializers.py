"""
Serializers for the Tasks API.
"""

from rest_framework import serializers


class TaskSerializer(serializers.Serializer):
    """Serializer for individual task input."""
    id = serializers.IntegerField(required=False)
    title = serializers.CharField(max_length=255)
    due_date = serializers.DateField(required=False, allow_null=True)
    estimated_hours = serializers.FloatField(default=1.0, min_value=0.1, max_value=1000)
    importance = serializers.IntegerField(default=5, min_value=1, max_value=10)
    dependencies = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list
    )


class AnalyzeRequestSerializer(serializers.Serializer):
    """Serializer for the analyze endpoint request."""
    tasks = TaskSerializer(many=True)
    strategy = serializers.ChoiceField(
        choices=[
            ('smart_balance', 'Smart Balance'),
            ('fastest_wins', 'Fastest Wins'),
            ('high_impact', 'High Impact'),
            ('deadline_driven', 'Deadline Driven'),
        ],
        default='smart_balance'
    )


class SuggestRequestSerializer(serializers.Serializer):
    """Serializer for the suggest endpoint request."""
    tasks = TaskSerializer(many=True, required=False)
    count = serializers.IntegerField(default=3, min_value=1, max_value=10)
    strategy = serializers.ChoiceField(
        choices=[
            ('smart_balance', 'Smart Balance'),
            ('fastest_wins', 'Fastest Wins'),
            ('high_impact', 'High Impact'),
            ('deadline_driven', 'Deadline Driven'),
        ],
        default='smart_balance'
    )
