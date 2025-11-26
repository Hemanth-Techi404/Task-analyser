"""
Priority Scoring Algorithm for Smart Task Analyzer.

This module contains the core algorithm for calculating task priority scores
based on multiple factors: urgency, importance, effort, and dependencies.

Algorithm Overview:
-------------------
The scoring system uses a weighted multi-factor approach:
1. Urgency Score (0-100): Based on days until due date
2. Importance Score (0-100): Direct mapping from user rating (1-10)
3. Effort Score (0-100): Inverse relationship with estimated hours (quick wins)
4. Dependency Score (0-100): Bonus for tasks that unblock others

Final Score = (Urgency × W1) + (Importance × W2) + (Effort × W3) + (Dependency × W4)

The weights are configurable through different strategies.
"""

from datetime import date, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum


class SortingStrategy(Enum):
    """Available sorting strategies for task prioritization."""
    SMART_BALANCE = "smart_balance"
    FASTEST_WINS = "fastest_wins"
    HIGH_IMPACT = "high_impact"
    DEADLINE_DRIVEN = "deadline_driven"


@dataclass
class StrategyWeights:
    """Weight configuration for each scoring factor."""
    urgency: float
    importance: float
    effort: float
    dependency: float

    def normalize(self) -> 'StrategyWeights':
        """Normalize weights to sum to 1.0 for consistent scoring."""
        total = self.urgency + self.importance + self.effort + self.dependency
        if total == 0:
            return StrategyWeights(0.25, 0.25, 0.25, 0.25)
        return StrategyWeights(
            self.urgency / total,
            self.importance / total,
            self.effort / total,
            self.dependency / total
        )


# Predefined strategy weights
STRATEGY_WEIGHTS: Dict[SortingStrategy, StrategyWeights] = {
    SortingStrategy.SMART_BALANCE: StrategyWeights(0.30, 0.35, 0.15, 0.20),
    SortingStrategy.FASTEST_WINS: StrategyWeights(0.15, 0.15, 0.55, 0.15),
    SortingStrategy.HIGH_IMPACT: StrategyWeights(0.15, 0.60, 0.10, 0.15),
    SortingStrategy.DEADLINE_DRIVEN: StrategyWeights(0.60, 0.20, 0.05, 0.15),
}


class TaskValidator:
    """Validates and sanitizes task data."""

    @staticmethod
    def validate_task(task: Dict[str, Any]) -> Tuple[bool, List[str], Dict[str, Any]]:
        """
        Validate a single task and return sanitized data.
        
        Returns:
            Tuple of (is_valid, errors, sanitized_task)
        """
        errors = []
        sanitized = {}

        # Validate title (required)
        title = task.get('title', '').strip()
        if not title:
            errors.append("Title is required and cannot be empty")
        sanitized['title'] = title or "Untitled Task"

        # Validate and parse due_date
        due_date = task.get('due_date')
        if due_date:
            try:
                if isinstance(due_date, str):
                    sanitized['due_date'] = date.fromisoformat(due_date)
                elif isinstance(due_date, date):
                    sanitized['due_date'] = due_date
                else:
                    errors.append(f"Invalid due_date format: {due_date}")
                    sanitized['due_date'] = None
            except ValueError:
                errors.append(f"Invalid due_date format: {due_date}")
                sanitized['due_date'] = None
        else:
            sanitized['due_date'] = None

        # Validate estimated_hours
        estimated_hours = task.get('estimated_hours', 1)
        try:
            estimated_hours = float(estimated_hours)
            if estimated_hours <= 0:
                errors.append("estimated_hours must be positive, defaulting to 1")
                estimated_hours = 1.0
            elif estimated_hours > 1000:
                errors.append("estimated_hours seems unreasonably high, capping at 1000")
                estimated_hours = 1000.0
        except (TypeError, ValueError):
            errors.append(f"Invalid estimated_hours: {estimated_hours}, defaulting to 1")
            estimated_hours = 1.0
        sanitized['estimated_hours'] = estimated_hours

        # Validate importance (1-10 scale)
        importance = task.get('importance', 5)
        try:
            importance = int(importance)
            if importance < 1:
                importance = 1
            elif importance > 10:
                importance = 10
        except (TypeError, ValueError):
            errors.append(f"Invalid importance: {importance}, defaulting to 5")
            importance = 5
        sanitized['importance'] = importance

        # Validate dependencies
        dependencies = task.get('dependencies', [])
        if not isinstance(dependencies, list):
            errors.append(f"Dependencies must be a list, got: {type(dependencies)}")
            dependencies = []
        sanitized['dependencies'] = dependencies

        # Preserve ID if present
        if 'id' in task:
            sanitized['id'] = task['id']

        is_valid = len(errors) == 0
        return is_valid, errors, sanitized


class DependencyAnalyzer:
    """Analyzes task dependencies for circular references and blocking relationships."""

    @staticmethod
    def detect_circular_dependencies(tasks: List[Dict]) -> List[List[str]]:
        """
        Detect circular dependencies in a list of tasks.
        
        Uses DFS to find cycles in the dependency graph.
        
        Returns:
            List of cycles found (each cycle is a list of task IDs)
        """
        # Build adjacency list
        task_ids = {str(task.get('id', i)): task for i, task in enumerate(tasks)}
        graph = {}
        
        for i, task in enumerate(tasks):
            task_id = str(task.get('id', i))
            deps = task.get('dependencies', [])
            graph[task_id] = [str(d) for d in deps if str(d) in task_ids]

        cycles = []
        visited = set()
        rec_stack = set()
        path = []

        def dfs(node: str) -> bool:
            visited.add(node)
            rec_stack.add(node)
            path.append(node)

            for neighbor in graph.get(node, []):
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    # Found cycle - extract it
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
                    return False  # Continue to find more cycles

            path.pop()
            rec_stack.remove(node)
            return False

        for task_id in graph:
            if task_id not in visited:
                dfs(task_id)

        return cycles

    @staticmethod
    def count_blocking_tasks(task_id: str, all_tasks: List[Dict]) -> int:
        """
        Count how many tasks depend on a given task (directly or indirectly).
        
        A task with many dependents should be prioritized higher.
        """
        dependents = set()
        
        # Find direct dependents
        for task in all_tasks:
            deps = [str(d) for d in task.get('dependencies', [])]
            if task_id in deps:
                dependent_id = str(task.get('id', all_tasks.index(task)))
                dependents.add(dependent_id)

        # BFS to find indirect dependents
        queue = list(dependents)
        while queue:
            current = queue.pop(0)
            for task in all_tasks:
                deps = [str(d) for d in task.get('dependencies', [])]
                if current in deps:
                    dependent_id = str(task.get('id', all_tasks.index(task)))
                    if dependent_id not in dependents:
                        dependents.add(dependent_id)
                        queue.append(dependent_id)

        return len(dependents)


class PriorityScorer:
    """
    Core scoring engine for task prioritization.
    
    This class implements the multi-factor scoring algorithm that weighs:
    - Urgency: Time pressure based on due dates
    - Importance: User-assigned priority rating
    - Effort: Inverse of time required (quick wins concept)
    - Dependencies: How many other tasks this task unblocks
    """

    def __init__(self, strategy: SortingStrategy = SortingStrategy.SMART_BALANCE):
        self.strategy = strategy
        self.weights = STRATEGY_WEIGHTS[strategy].normalize()

    def calculate_urgency_score(self, due_date: Optional[date], today: Optional[date] = None) -> Tuple[float, str]:
        """
        Calculate urgency score based on due date.
        
        Scoring logic:
        - Overdue tasks: 100 + (days_overdue * 5), capped at 150
        - Due today: 95
        - Due tomorrow: 85
        - Due within 3 days: 75
        - Due within 7 days: 60
        - Due within 14 days: 40
        - Due within 30 days: 25
        - Due later: 10
        - No due date: 30 (medium urgency to prevent indefinite postponement)
        
        Returns:
            Tuple of (score, explanation)
        """
        if today is None:
            today = date.today()

        if due_date is None:
            return 30.0, "No due date set - moderate priority"

        days_until_due = (due_date - today).days

        if days_until_due < 0:
            # Overdue - high urgency
            days_overdue = abs(days_until_due)
            score = min(150.0, 100.0 + (days_overdue * 5))
            return score, f"OVERDUE by {days_overdue} day(s) - critical priority"
        elif days_until_due == 0:
            return 95.0, "Due TODAY - very high urgency"
        elif days_until_due == 1:
            return 85.0, "Due TOMORROW - high urgency"
        elif days_until_due <= 3:
            return 75.0, f"Due in {days_until_due} days - urgent"
        elif days_until_due <= 7:
            return 60.0, f"Due in {days_until_due} days - approaching deadline"
        elif days_until_due <= 14:
            return 40.0, f"Due in {days_until_due} days - moderate urgency"
        elif days_until_due <= 30:
            return 25.0, f"Due in {days_until_due} days - low urgency"
        else:
            return 10.0, f"Due in {days_until_due} days - not urgent"

    def calculate_importance_score(self, importance: int) -> Tuple[float, str]:
        """
        Calculate importance score from user rating.
        
        Direct linear mapping from 1-10 to 10-100.
        
        Returns:
            Tuple of (score, explanation)
        """
        score = importance * 10.0
        
        if importance >= 9:
            level = "Critical importance"
        elif importance >= 7:
            level = "High importance"
        elif importance >= 5:
            level = "Medium importance"
        elif importance >= 3:
            level = "Low importance"
        else:
            level = "Minimal importance"
        
        return score, f"{level} ({importance}/10)"

    def calculate_effort_score(self, estimated_hours: float) -> Tuple[float, str]:
        """
        Calculate effort score (quick wins concept).
        
        Lower effort tasks get higher scores to enable quick wins.
        Uses an inverse logarithmic scale for diminishing returns.
        
        Scoring:
        - < 1 hour: 90-100 (quick win)
        - 1-2 hours: 70-90
        - 2-4 hours: 50-70
        - 4-8 hours: 30-50
        - 8-16 hours: 15-30
        - > 16 hours: 5-15
        
        Returns:
            Tuple of (score, explanation)
        """
        import math
        
        # Inverse logarithmic scale
        if estimated_hours <= 0:
            estimated_hours = 0.5
        
        # Score decreases as hours increase
        # Formula: 100 - (log2(hours + 1) * 15), bounded [5, 100]
        score = max(5.0, min(100.0, 100 - (math.log2(estimated_hours + 1) * 20)))
        
        if estimated_hours < 1:
            level = "Quick win - under 1 hour"
        elif estimated_hours <= 2:
            level = f"Short task - {estimated_hours:.1f} hours"
        elif estimated_hours <= 4:
            level = f"Medium task - {estimated_hours:.1f} hours"
        elif estimated_hours <= 8:
            level = f"Half-day task - {estimated_hours:.1f} hours"
        else:
            level = f"Large task - {estimated_hours:.1f} hours"
        
        return score, level

    def calculate_dependency_score(self, task_id: str, all_tasks: List[Dict]) -> Tuple[float, str]:
        """
        Calculate dependency score based on how many tasks this unblocks.
        
        Tasks that block many other tasks get higher scores.
        
        Returns:
            Tuple of (score, explanation)
        """
        blocking_count = DependencyAnalyzer.count_blocking_tasks(task_id, all_tasks)
        
        # Score increases with number of dependent tasks
        # Cap at 100 for tasks blocking 5+ tasks
        score = min(100.0, blocking_count * 20.0)
        
        if blocking_count == 0:
            explanation = "No dependent tasks"
        elif blocking_count == 1:
            explanation = "Blocks 1 other task"
        else:
            explanation = f"Blocks {blocking_count} other tasks"
        
        return score, explanation

    def calculate_priority_score(
        self, 
        task: Dict[str, Any], 
        all_tasks: List[Dict],
        task_index: int
    ) -> Dict[str, Any]:
        """
        Calculate the complete priority score for a task.
        
        Returns a dictionary with:
        - priority_score: Final weighted score
        - component_scores: Individual factor scores
        - explanations: Human-readable explanations
        - strategy: The scoring strategy used
        """
        task_id = str(task.get('id', task_index))
        
        # Calculate individual component scores
        urgency_score, urgency_explanation = self.calculate_urgency_score(
            task.get('due_date')
        )
        importance_score, importance_explanation = self.calculate_importance_score(
            task.get('importance', 5)
        )
        effort_score, effort_explanation = self.calculate_effort_score(
            task.get('estimated_hours', 1)
        )
        dependency_score, dependency_explanation = self.calculate_dependency_score(
            task_id, all_tasks
        )
        
        # Calculate weighted final score
        final_score = (
            (urgency_score * self.weights.urgency) +
            (importance_score * self.weights.importance) +
            (effort_score * self.weights.effort) +
            (dependency_score * self.weights.dependency)
        )
        
        # Build explanation summary
        primary_factors = []
        if urgency_score >= 75:
            primary_factors.append("urgent deadline")
        if importance_score >= 70:
            primary_factors.append("high importance")
        if effort_score >= 70:
            primary_factors.append("quick win")
        if dependency_score >= 40:
            primary_factors.append("blocks other tasks")
        
        if primary_factors:
            summary = f"Prioritized due to: {', '.join(primary_factors)}"
        else:
            summary = "Standard priority - balanced factors"
        
        return {
            'priority_score': round(final_score, 2),
            'component_scores': {
                'urgency': round(urgency_score, 2),
                'importance': round(importance_score, 2),
                'effort': round(effort_score, 2),
                'dependency': round(dependency_score, 2),
            },
            'explanations': {
                'urgency': urgency_explanation,
                'importance': importance_explanation,
                'effort': effort_explanation,
                'dependency': dependency_explanation,
                'summary': summary,
            },
            'weights_used': {
                'urgency': round(self.weights.urgency, 2),
                'importance': round(self.weights.importance, 2),
                'effort': round(self.weights.effort, 2),
                'dependency': round(self.weights.dependency, 2),
            },
            'strategy': self.strategy.value,
        }


def analyze_tasks(
    tasks: List[Dict[str, Any]], 
    strategy: str = "smart_balance"
) -> Dict[str, Any]:
    """
    Main entry point for task analysis.
    
    Validates tasks, detects circular dependencies, calculates priority scores,
    and returns sorted results.
    
    Args:
        tasks: List of task dictionaries
        strategy: Sorting strategy name
    
    Returns:
        Dictionary with analyzed results, including:
        - tasks: Sorted list of tasks with scores
        - circular_dependencies: Any detected cycles
        - validation_errors: Any validation issues
        - strategy_used: The scoring strategy applied
    """
    # Parse strategy
    try:
        sort_strategy = SortingStrategy(strategy.lower())
    except ValueError:
        sort_strategy = SortingStrategy.SMART_BALANCE

    scorer = PriorityScorer(sort_strategy)
    validator = TaskValidator()
    
    # Validate and sanitize all tasks
    validated_tasks = []
    validation_errors = []
    
    for i, task in enumerate(tasks):
        is_valid, errors, sanitized = validator.validate_task(task)
        if not is_valid:
            validation_errors.append({
                'task_index': i,
                'task_title': sanitized.get('title', f'Task {i}'),
                'errors': errors
            })
        sanitized['original_index'] = i
        validated_tasks.append(sanitized)
    
    # Detect circular dependencies
    circular_deps = DependencyAnalyzer.detect_circular_dependencies(validated_tasks)
    
    # Calculate priority scores for all tasks
    scored_tasks = []
    for i, task in enumerate(validated_tasks):
        score_result = scorer.calculate_priority_score(task, validated_tasks, i)
        
        scored_task = {
            **task,
            'priority_score': score_result['priority_score'],
            'component_scores': score_result['component_scores'],
            'explanations': score_result['explanations'],
            'weights_used': score_result['weights_used'],
        }
        
        # Convert date back to string for JSON serialization
        if scored_task.get('due_date'):
            scored_task['due_date'] = scored_task['due_date'].isoformat()
        
        scored_tasks.append(scored_task)
    
    # Sort by priority score (descending)
    scored_tasks.sort(key=lambda x: x['priority_score'], reverse=True)
    
    # Add rank
    for rank, task in enumerate(scored_tasks, 1):
        task['rank'] = rank
    
    return {
        'tasks': scored_tasks,
        'circular_dependencies': circular_deps,
        'validation_errors': validation_errors,
        'strategy_used': sort_strategy.value,
        'total_tasks': len(scored_tasks),
    }


def suggest_tasks(
    tasks: List[Dict[str, Any]], 
    count: int = 3,
    strategy: str = "smart_balance"
) -> Dict[str, Any]:
    """
    Suggest the top N tasks to work on today with detailed explanations.
    
    Args:
        tasks: List of task dictionaries
        count: Number of tasks to suggest (default 3)
        strategy: Sorting strategy name
    
    Returns:
        Dictionary with top suggested tasks and reasoning
    """
    analysis = analyze_tasks(tasks, strategy)
    
    top_tasks = analysis['tasks'][:count]
    suggestions = []
    
    for i, task in enumerate(top_tasks, 1):
        # Build detailed recommendation
        reasons = []
        scores = task['component_scores']
        explanations = task['explanations']
        
        # Identify primary contributing factors
        if scores['urgency'] >= 75:
            reasons.append(f"🔴 {explanations['urgency']}")
        elif scores['urgency'] >= 50:
            reasons.append(f"🟡 {explanations['urgency']}")
        
        if scores['importance'] >= 70:
            reasons.append(f"⭐ {explanations['importance']}")
        
        if scores['effort'] >= 70:
            reasons.append(f"⚡ {explanations['effort']}")
        
        if scores['dependency'] >= 20:
            reasons.append(f"🔗 {explanations['dependency']}")
        
        if not reasons:
            reasons.append(explanations['summary'])
        
        suggestion = {
            'rank': i,
            'task': {
                'id': task.get('id', task.get('original_index')),
                'title': task['title'],
                'due_date': task.get('due_date'),
                'estimated_hours': task['estimated_hours'],
                'importance': task['importance'],
            },
            'priority_score': task['priority_score'],
            'recommendation': f"#{i} Priority: {task['title']}",
            'reasons': reasons,
            'component_scores': task['component_scores'],
        }
        suggestions.append(suggestion)
    
    # Generate overall summary
    if circular_deps := analysis.get('circular_dependencies'):
        warning = f"⚠️ Warning: {len(circular_deps)} circular dependency chain(s) detected"
    else:
        warning = None
    
    return {
        'suggestions': suggestions,
        'strategy_used': analysis['strategy_used'],
        'total_tasks_analyzed': analysis['total_tasks'],
        'warning': warning,
        'message': f"Here are your top {len(suggestions)} tasks to focus on today:",
    }
