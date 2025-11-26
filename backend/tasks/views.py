"""
API Views for the Smart Task Analyzer.
"""

from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .scoring import analyze_tasks, suggest_tasks
from .serializers import AnalyzeRequestSerializer, SuggestRequestSerializer


@api_view(['POST'])
def analyze_tasks_view(request):
    """
    POST /api/tasks/analyze/
    
    Accept a list of tasks and return them sorted by priority score.
    Each task includes its calculated score and explanations.
    
    Request Body:
    {
        "tasks": [
            {
                "id": 1,
                "title": "Fix login bug",
                "due_date": "2025-11-30",
                "estimated_hours": 3,
                "importance": 8,
                "dependencies": []
            }
        ],
        "strategy": "smart_balance"  // optional
    }
    
    Response:
    {
        "tasks": [...],  // sorted by priority
        "circular_dependencies": [...],
        "validation_errors": [...],
        "strategy_used": "smart_balance",
        "total_tasks": 5
    }
    """
    serializer = AnalyzeRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'error': 'Invalid request data',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    tasks = serializer.validated_data['tasks']
    strategy = serializer.validated_data.get('strategy', 'smart_balance')
    
    if not tasks:
        return Response({
            'error': 'No tasks provided',
            'message': 'Please provide at least one task to analyze'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = analyze_tasks(tasks, strategy)
        return Response(result)
    except Exception as e:
        return Response({
            'error': 'Analysis failed',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'POST'])
def suggest_tasks_view(request):
    """
    GET/POST /api/tasks/suggest/
    
    Return the top 3 (or specified count) tasks the user should work on today,
    with explanations for why each was chosen.
    
    For GET: Uses query parameters
    For POST: Uses request body with tasks list
    
    Request Body (POST):
    {
        "tasks": [...],
        "count": 3,  // optional
        "strategy": "smart_balance"  // optional
    }
    
    Response:
    {
        "suggestions": [
            {
                "rank": 1,
                "task": {...},
                "priority_score": 85.5,
                "recommendation": "...",
                "reasons": ["...", "..."],
                "component_scores": {...}
            }
        ],
        "strategy_used": "smart_balance",
        "total_tasks_analyzed": 10,
        "warning": null,
        "message": "Here are your top 3 tasks..."
    }
    """
    if request.method == 'GET':
        # For GET requests, we need tasks in the database or return instructions
        return Response({
            'message': 'Please use POST with tasks in the request body',
            'example': {
                'tasks': [
                    {
                        'id': 1,
                        'title': 'Example task',
                        'due_date': '2025-11-30',
                        'estimated_hours': 2,
                        'importance': 7,
                        'dependencies': []
                    }
                ],
                'count': 3,
                'strategy': 'smart_balance'
            }
        })
    
    serializer = SuggestRequestSerializer(data=request.data)
    
    if not serializer.is_valid():
        return Response({
            'error': 'Invalid request data',
            'details': serializer.errors
        }, status=status.HTTP_400_BAD_REQUEST)
    
    tasks = serializer.validated_data.get('tasks', [])
    count = serializer.validated_data.get('count', 3)
    strategy = serializer.validated_data.get('strategy', 'smart_balance')
    
    if not tasks:
        return Response({
            'error': 'No tasks provided',
            'message': 'Please provide tasks in the request body'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        result = suggest_tasks(tasks, count, strategy)
        return Response(result)
    except Exception as e:
        return Response({
            'error': 'Suggestion generation failed',
            'message': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def health_check(request):
    """
    GET /api/health/
    
    Simple health check endpoint.
    """
    return Response({
        'status': 'healthy',
        'service': 'Smart Task Analyzer API',
        'version': '1.0.0'
    })
