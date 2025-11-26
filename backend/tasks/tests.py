"""
Unit tests for the Smart Task Analyzer scoring algorithm.

Run with: python manage.py test tasks
"""

from datetime import date, timedelta
from django.test import TestCase
from .scoring import (
    PriorityScorer, 
    TaskValidator, 
    DependencyAnalyzer,
    SortingStrategy,
    analyze_tasks,
    suggest_tasks
)


class TestTaskValidator(TestCase):
    """Tests for task validation logic."""
    
    def test_valid_task(self):
        """Test validation of a complete, valid task."""
        task = {
            'title': 'Test Task',
            'due_date': '2025-12-01',
            'estimated_hours': 3,
            'importance': 7,
            'dependencies': [1, 2]
        }
        is_valid, errors, sanitized = TaskValidator.validate_task(task)
        
        self.assertTrue(is_valid)
        self.assertEqual(len(errors), 0)
        self.assertEqual(sanitized['title'], 'Test Task')
        self.assertEqual(sanitized['importance'], 7)
    
    def test_missing_title(self):
        """Test handling of missing title."""
        task = {
            'due_date': '2025-12-01',
            'estimated_hours': 2
        }
        is_valid, errors, sanitized = TaskValidator.validate_task(task)
        
        self.assertFalse(is_valid)
        self.assertIn("Title is required", errors[0])
        self.assertEqual(sanitized['title'], 'Untitled Task')
    
    def test_invalid_importance_clamped(self):
        """Test that importance is clamped to valid range."""
        task = {'title': 'Test', 'importance': 15}
        _, _, sanitized = TaskValidator.validate_task(task)
        self.assertEqual(sanitized['importance'], 10)
        
        task = {'title': 'Test', 'importance': -5}
        _, _, sanitized = TaskValidator.validate_task(task)
        self.assertEqual(sanitized['importance'], 1)
    
    def test_invalid_date_format(self):
        """Test handling of invalid date format."""
        task = {'title': 'Test', 'due_date': 'not-a-date'}
        is_valid, errors, sanitized = TaskValidator.validate_task(task)
        
        self.assertFalse(is_valid)
        self.assertIsNone(sanitized['due_date'])
    
    def test_negative_hours_defaulted(self):
        """Test that negative hours are defaulted to 1."""
        task = {'title': 'Test', 'estimated_hours': -5}
        _, errors, sanitized = TaskValidator.validate_task(task)
        
        self.assertEqual(sanitized['estimated_hours'], 1.0)
        self.assertTrue(any('positive' in e for e in errors))


class TestDependencyAnalyzer(TestCase):
    """Tests for dependency analysis logic."""
    
    def test_no_circular_dependencies(self):
        """Test detection when no circular dependencies exist."""
        tasks = [
            {'id': 1, 'title': 'Task 1', 'dependencies': []},
            {'id': 2, 'title': 'Task 2', 'dependencies': [1]},
            {'id': 3, 'title': 'Task 3', 'dependencies': [2]},
        ]
        cycles = DependencyAnalyzer.detect_circular_dependencies(tasks)
        self.assertEqual(len(cycles), 0)
    
    def test_simple_circular_dependency(self):
        """Test detection of a simple A->B->A cycle."""
        tasks = [
            {'id': 1, 'title': 'Task 1', 'dependencies': [2]},
            {'id': 2, 'title': 'Task 2', 'dependencies': [1]},
        ]
        cycles = DependencyAnalyzer.detect_circular_dependencies(tasks)
        self.assertGreater(len(cycles), 0)
    
    def test_complex_circular_dependency(self):
        """Test detection of a longer A->B->C->A cycle."""
        tasks = [
            {'id': 1, 'title': 'Task 1', 'dependencies': [3]},
            {'id': 2, 'title': 'Task 2', 'dependencies': [1]},
            {'id': 3, 'title': 'Task 3', 'dependencies': [2]},
        ]
        cycles = DependencyAnalyzer.detect_circular_dependencies(tasks)
        self.assertGreater(len(cycles), 0)
    
    def test_blocking_count(self):
        """Test counting of tasks that depend on a given task."""
        tasks = [
            {'id': 1, 'title': 'Task 1', 'dependencies': []},
            {'id': 2, 'title': 'Task 2', 'dependencies': [1]},
            {'id': 3, 'title': 'Task 3', 'dependencies': [1]},
            {'id': 4, 'title': 'Task 4', 'dependencies': [2]},
        ]
        
        # Task 1 blocks tasks 2, 3, and indirectly 4
        count = DependencyAnalyzer.count_blocking_tasks('1', tasks)
        self.assertEqual(count, 3)
        
        # Task 2 only blocks task 4
        count = DependencyAnalyzer.count_blocking_tasks('2', tasks)
        self.assertEqual(count, 1)
        
        # Task 4 blocks nothing
        count = DependencyAnalyzer.count_blocking_tasks('4', tasks)
        self.assertEqual(count, 0)


class TestPriorityScorer(TestCase):
    """Tests for the priority scoring algorithm."""
    
    def setUp(self):
        self.scorer = PriorityScorer(SortingStrategy.SMART_BALANCE)
        self.today = date.today()
    
    def test_overdue_task_high_urgency(self):
        """Test that overdue tasks get very high urgency scores."""
        yesterday = self.today - timedelta(days=1)
        score, explanation = self.scorer.calculate_urgency_score(yesterday, self.today)
        
        self.assertGreater(score, 100)
        self.assertIn('OVERDUE', explanation)
    
    def test_due_today_high_urgency(self):
        """Test that tasks due today get high urgency scores."""
        score, explanation = self.scorer.calculate_urgency_score(self.today, self.today)
        
        self.assertGreaterEqual(score, 90)
        self.assertIn('TODAY', explanation)
    
    def test_future_task_lower_urgency(self):
        """Test that tasks due far in the future get lower scores."""
        future_date = self.today + timedelta(days=60)
        score, _ = self.scorer.calculate_urgency_score(future_date, self.today)
        
        self.assertLess(score, 20)
    
    def test_no_due_date_moderate_urgency(self):
        """Test that tasks without due dates get moderate urgency."""
        score, _ = self.scorer.calculate_urgency_score(None, self.today)
        
        self.assertEqual(score, 30.0)
    
    def test_high_importance_high_score(self):
        """Test that high importance (10) maps to high score."""
        score, _ = self.scorer.calculate_importance_score(10)
        self.assertEqual(score, 100.0)
    
    def test_low_importance_low_score(self):
        """Test that low importance (1) maps to low score."""
        score, _ = self.scorer.calculate_importance_score(1)
        self.assertEqual(score, 10.0)
    
    def test_quick_win_high_effort_score(self):
        """Test that short tasks get high effort scores."""
        score, _ = self.scorer.calculate_effort_score(0.5)  # 30 minutes
        self.assertGreater(score, 80)
    
    def test_large_task_low_effort_score(self):
        """Test that large tasks get lower effort scores."""
        score, _ = self.scorer.calculate_effort_score(40)  # 40 hours
        self.assertLess(score, 30)


class TestAnalyzeTasks(TestCase):
    """Integration tests for the main analyze_tasks function."""
    
    def test_tasks_sorted_by_priority(self):
        """Test that tasks are returned sorted by priority score."""
        today = date.today()
        tasks = [
            {
                'id': 1,
                'title': 'Low priority',
                'due_date': (today + timedelta(days=30)).isoformat(),
                'estimated_hours': 20,
                'importance': 2,
                'dependencies': []
            },
            {
                'id': 2,
                'title': 'High priority',
                'due_date': today.isoformat(),
                'estimated_hours': 1,
                'importance': 9,
                'dependencies': []
            },
        ]
        
        result = analyze_tasks(tasks, 'smart_balance')
        
        # High priority task should be first
        self.assertEqual(result['tasks'][0]['title'], 'High priority')
        self.assertEqual(result['tasks'][1]['title'], 'Low priority')
    
    def test_different_strategies_produce_different_results(self):
        """Test that different strategies can change task ordering."""
        today = date.today()
        tasks = [
            {
                'id': 1,
                'title': 'Important but slow',
                'due_date': (today + timedelta(days=14)).isoformat(),
                'estimated_hours': 20,
                'importance': 10,
                'dependencies': []
            },
            {
                'id': 2,
                'title': 'Quick but less important',
                'due_date': (today + timedelta(days=14)).isoformat(),
                'estimated_hours': 0.5,
                'importance': 3,
                'dependencies': []
            },
        ]
        
        # High impact should favor important task
        high_impact = analyze_tasks(tasks, 'high_impact')
        self.assertEqual(high_impact['tasks'][0]['title'], 'Important but slow')
        
        # Fastest wins should favor quick task
        fastest = analyze_tasks(tasks, 'fastest_wins')
        self.assertEqual(fastest['tasks'][0]['title'], 'Quick but less important')


class TestSuggestTasks(TestCase):
    """Tests for the suggest_tasks function."""
    
    def test_returns_requested_count(self):
        """Test that suggest returns the requested number of tasks."""
        tasks = [
            {'id': i, 'title': f'Task {i}', 'importance': 5}
            for i in range(10)
        ]
        
        result = suggest_tasks(tasks, count=3)
        self.assertEqual(len(result['suggestions']), 3)
        
        result = suggest_tasks(tasks, count=5)
        self.assertEqual(len(result['suggestions']), 5)
    
    def test_suggestions_include_reasons(self):
        """Test that suggestions include explanatory reasons."""
        today = date.today()
        tasks = [{
            'id': 1,
            'title': 'Urgent task',
            'due_date': today.isoformat(),
            'importance': 9,
            'estimated_hours': 1
        }]
        
        result = suggest_tasks(tasks, count=1)
        suggestion = result['suggestions'][0]
        
        self.assertIn('reasons', suggestion)
        self.assertIsInstance(suggestion['reasons'], list)
        self.assertGreater(len(suggestion['reasons']), 0)
