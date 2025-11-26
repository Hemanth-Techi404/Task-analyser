# Smart Task Analyzer

A Django-based task management system that intelligently scores and prioritizes tasks based on multiple factors including urgency, importance, effort, and dependencies.

## 🚀 Quick Start

### Prerequisites

- Python 3.8+
- pip (Python package manager)

### Installation

1. **Clone the repository**
   \`\`\`bash
   git clone <repository-url>
   cd task-analyzer
   \`\`\`

2. **Create and activate a virtual environment**
   \`\`\`bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   \`\`\`

3. **Install dependencies**
   \`\`\`bash
   cd backend
   pip install -r requirements.txt
   \`\`\`

4. **Run database migrations**
   \`\`\`bash
   python manage.py migrate
   \`\`\`

5. **Start the Django server**
   \`\`\`bash
   python manage.py runserver
   \`\`\`

6. **Open the frontend**
   - Open `frontend/index.html` in your browser
   - Or serve it with a simple HTTP server:
     \`\`\`bash
     cd frontend
     python -m http.server 5500
     \`\`\`
   - Then navigate to `http://localhost:5500`

7. **Run tests**
   \`\`\`bash
   cd backend
   python manage.py test tasks
   \`\`\`

## 📊 Algorithm Explanation

### Overview

The Smart Task Analyzer uses a **multi-factor weighted scoring algorithm** to calculate task priority. The final score is computed as:

\`\`\`
Final Score = (Urgency × W1) + (Importance × W2) + (Effort × W3) + (Dependency × W4)
\`\`\`

Where W1, W2, W3, W4 are configurable weights based on the selected strategy.

### Scoring Components

#### 1. Urgency Score (0-150)
Based on days until the due date:
- **Overdue tasks**: 100 + (days_overdue × 5), capped at 150 - these receive the highest urgency
- **Due today**: 95 points
- **Due tomorrow**: 85 points
- **Due within 3 days**: 75 points
- **Due within 7 days**: 60 points
- **Due within 14 days**: 40 points
- **Due within 30 days**: 25 points
- **Due later**: 10 points
- **No due date**: 30 points (moderate urgency to prevent indefinite postponement)

#### 2. Importance Score (10-100)
Direct linear mapping from the user's 1-10 rating:
\`\`\`
Score = Importance × 10
\`\`\`

#### 3. Effort Score (5-100)
Inverse logarithmic relationship with estimated hours, implementing the "quick wins" concept:
\`\`\`
Score = 100 - (log2(hours + 1) × 20)
\`\`\`
- Tasks under 1 hour: 80-100 points (quick wins)
- 1-2 hours: 60-80 points
- 2-4 hours: 40-60 points
- 4-8 hours: 25-40 points
- 8+ hours: 5-25 points

#### 4. Dependency Score (0-100)
Based on how many other tasks depend on this task (directly and transitively):
\`\`\`
Score = min(100, blocking_count × 20)
\`\`\`
Tasks that unblock others receive higher priority to prevent bottlenecks.

### Sorting Strategies

| Strategy | Urgency | Importance | Effort | Dependency |
|----------|---------|------------|--------|------------|
| **Smart Balance** | 30% | 35% | 15% | 20% |
| **Fastest Wins** | 15% | 15% | 55% | 15% |
| **High Impact** | 15% | 60% | 10% | 15% |
| **Deadline Driven** | 60% | 20% | 5% | 15% |

## 🎯 Design Decisions

### 1. Overdue Task Handling
Overdue tasks receive scores above 100 (up to 150) to ensure they always surface at the top. The penalty increases by 5 points per day overdue, creating urgency without being punitive.

### 2. No Due Date Strategy
Tasks without due dates receive a moderate urgency score (30) rather than 0. This prevents tasks from being perpetually deprioritized while still respecting deadlines.

### 3. Circular Dependency Detection
Using DFS-based cycle detection to identify circular dependencies. When detected, warnings are shown but tasks are still scored (their dependency bonus may be affected).

### 4. Quick Wins Emphasis
The logarithmic effort scale ensures diminishing returns - the difference between a 1-hour and 2-hour task is more significant than between a 20-hour and 21-hour task.

### 5. Configurable Weights
Rather than a single algorithm, four strategies allow users to adapt prioritization to their work style and current needs.

### Trade-offs Made

1. **Simplicity vs. Precision**: Chose discrete scoring brackets over continuous functions for urgency to make the algorithm more understandable and debuggable.

2. **Static vs. Learning**: Implemented fixed strategies rather than ML-based learning due to time constraints. A learning system could adapt to user preferences over time.

3. **Memory vs. Performance**: Tasks are processed in-memory rather than stored persistently. This simplifies the API but means tasks must be re-submitted for each analysis.

## ⏱️ Time Breakdown

| Section | Time Spent |
|---------|------------|
| Algorithm Design & Planning | 45 min |
| Backend Development (Django) | 1.5 hours |
| Frontend Development | 1.25 hours |
| Testing & Documentation | 30 min |
| **Total** | ~4 hours |

## 🎁 Bonus Challenges

### Implemented
- ✅ **Circular Dependency Detection**: Full DFS-based cycle detection with warnings in the API response

### Not Implemented (Future Work)
- ❌ Date Intelligence (weekends/holidays)
- ❌ Eisenhower Matrix View
- ❌ Learning System

## 🔮 Future Improvements

With more time, I would add:

1. **Persistent Storage**: Save tasks to the database for session persistence
2. **User Preferences**: Allow users to customize their own weight configurations
3. **Batch Operations**: Import/export tasks as CSV
4. **Eisenhower Matrix View**: Visual 2D grid plotting urgent vs. important
5. **Time-Based Suggestions**: Consider current time of day and available work hours
6. **Calendar Integration**: Factor in meetings and blocked time
7. **Task Categories/Tags**: Group tasks and apply category-specific weights
8. **Mobile-Responsive Improvements**: Better touch interactions for mobile users

## 📁 Project Structure

\`\`\`
task-analyzer/
├── backend/
│   ├── manage.py
│   ├── task_analyzer/
│   │   ├── __init__.py
│   │   ├── settings.py
│   │   ├── urls.py
│   │   └── wsgi.py
│   ├── tasks/
│   │   ├── __init__.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── scoring.py      # Core algorithm
│   │   ├── urls.py
│   │   └── tests.py        # Unit tests
│   └── requirements.txt
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── script.js
└── README.md
\`\`\`

## 🔌 API Endpoints

### POST /api/tasks/analyze/
Analyze and sort tasks by priority.

**Request:**
\`\`\`json
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
  "strategy": "smart_balance"
}
\`\`\`

**Response:**
\`\`\`json
{
  "tasks": [...],
  "circular_dependencies": [],
  "validation_errors": [],
  "strategy_used": "smart_balance",
  "total_tasks": 1
}
\`\`\`

### POST /api/tasks/suggest/
Get top N task recommendations with explanations.

**Request:**
\`\`\`json
{
  "tasks": [...],
  "count": 3,
  "strategy": "smart_balance"
}
\`\`\`

### GET /api/health/
Health check endpoint.

## 🧪 Running Tests

\`\`\`bash
cd backend
python manage.py test tasks -v 2
\`\`\`

The test suite covers:
- Task validation (missing/invalid fields)
- Circular dependency detection
- Urgency score calculations
- Different sorting strategies
- Edge cases (overdue tasks, no due date, etc.)
