"""
Task model for the Smart Task Analyzer.
"""

from django.db import models


class Task(models.Model):
    """
    Task model representing a task with priority scoring attributes.
    """
    title = models.CharField(max_length=255)
    due_date = models.DateField(null=True, blank=True)
    estimated_hours = models.FloatField(default=1.0)
    importance = models.IntegerField(default=5)  # 1-10 scale
    dependencies = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title

    def to_dict(self):
        """Convert model to dictionary for API responses."""
        return {
            'id': self.id,
            'title': self.title,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'estimated_hours': self.estimated_hours,
            'importance': self.importance,
            'dependencies': self.dependencies,
        }
