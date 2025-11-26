/**
 * Smart Task Analyzer - Priority Scoring Algorithm
 *
 * This module implements the core algorithm for calculating task priority scores
 * based on multiple factors: urgency, importance, effort, and dependencies.
 *
 * Algorithm Overview:
 * The scoring system uses a weighted multi-factor approach:
 * 1. Urgency Score (0-100): Based on days until due date
 * 2. Importance Score (0-100): Direct mapping from user rating (1-10)
 * 3. Effort Score (0-100): Inverse relationship with estimated hours (quick wins)
 * 4. Dependency Score (0-100): Bonus for tasks that unblock others
 *
 * Final Score = (Urgency × W1) + (Importance × W2) + (Effort × W3) + (Dependency × W4)
 */

export interface Task {
  id: number
  title: string
  due_date: string | null
  estimated_hours: number
  importance: number
  dependencies: number[]
}

export interface ComponentScores {
  urgency: number
  importance: number
  effort: number
  dependency: number
}

export interface Explanations {
  urgency: string
  importance: string
  effort: string
  dependency: string
  summary: string
}

export interface ScoredTask extends Task {
  priority_score: number
  component_scores: ComponentScores
  explanations: Explanations
  weights_used: ComponentScores
  rank: number
}

export interface ValidationError {
  task_index: number
  task_title: string
  errors: string[]
}

export interface AnalysisResult {
  tasks: ScoredTask[]
  circular_dependencies: string[][]
  validation_errors: ValidationError[]
  strategy_used: string
  total_tasks: number
}

export interface Suggestion {
  rank: number
  task: ScoredTask
  priority_score: number
  recommendation: string
  reasons: string[]
  component_scores: ComponentScores
}

export interface SuggestionResult {
  suggestions: Suggestion[]
  strategy_used: string
  total_tasks_analyzed: number
  message: string
}

interface StrategyWeights {
  urgency: number
  importance: number
  effort: number
  dependency: number
}

const STRATEGY_WEIGHTS: Record<string, StrategyWeights> = {
  smart_balance: { urgency: 0.3, importance: 0.35, effort: 0.15, dependency: 0.2 },
  fastest_wins: { urgency: 0.15, importance: 0.15, effort: 0.55, dependency: 0.15 },
  high_impact: { urgency: 0.15, importance: 0.6, effort: 0.1, dependency: 0.15 },
  deadline_driven: { urgency: 0.6, importance: 0.2, effort: 0.05, dependency: 0.15 },
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.round((date1.getTime() - date2.getTime()) / oneDay)
}

function calculateUrgencyScore(dueDate: string | null): { score: number; explanation: string } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const parsedDate = parseDate(dueDate)
  if (!parsedDate) {
    return { score: 30, explanation: "No due date set - moderate priority" }
  }

  parsedDate.setHours(0, 0, 0, 0)
  const daysUntilDue = daysBetween(parsedDate, today)

  if (daysUntilDue < 0) {
    const daysOverdue = Math.abs(daysUntilDue)
    const score = Math.min(150, 100 + daysOverdue * 5)
    return { score, explanation: `OVERDUE by ${daysOverdue} day(s) - critical priority` }
  } else if (daysUntilDue === 0) {
    return { score: 95, explanation: "Due TODAY - very high urgency" }
  } else if (daysUntilDue === 1) {
    return { score: 85, explanation: "Due TOMORROW - high urgency" }
  } else if (daysUntilDue <= 3) {
    return { score: 75, explanation: `Due in ${daysUntilDue} days - urgent` }
  } else if (daysUntilDue <= 7) {
    return { score: 60, explanation: `Due in ${daysUntilDue} days - approaching deadline` }
  } else if (daysUntilDue <= 14) {
    return { score: 40, explanation: `Due in ${daysUntilDue} days - moderate urgency` }
  } else if (daysUntilDue <= 30) {
    return { score: 25, explanation: `Due in ${daysUntilDue} days - low urgency` }
  } else {
    return { score: 10, explanation: `Due in ${daysUntilDue} days - not urgent` }
  }
}

function calculateImportanceScore(importance: number): { score: number; explanation: string } {
  const score = importance * 10

  let level: string
  if (importance >= 9) level = "Critical importance"
  else if (importance >= 7) level = "High importance"
  else if (importance >= 5) level = "Medium importance"
  else if (importance >= 3) level = "Low importance"
  else level = "Minimal importance"

  return { score, explanation: `${level} (${importance}/10)` }
}

function calculateEffortScore(estimatedHours: number): { score: number; explanation: string } {
  const hours = Math.max(0.1, estimatedHours)
  const score = Math.max(5, Math.min(100, 100 - Math.log2(hours + 1) * 20))

  let level: string
  if (hours < 1) level = "Quick win - under 1 hour"
  else if (hours <= 2) level = `Short task - ${hours.toFixed(1)} hours`
  else if (hours <= 4) level = `Medium task - ${hours.toFixed(1)} hours`
  else if (hours <= 8) level = `Half-day task - ${hours.toFixed(1)} hours`
  else level = `Large task - ${hours.toFixed(1)} hours`

  return { score, explanation: level }
}

function countBlockingTasks(taskId: number, allTasks: Task[]): number {
  const dependents = new Set<number>()

  for (const task of allTasks) {
    if (task.dependencies?.includes(taskId)) {
      dependents.add(task.id)
    }
  }

  const queue = Array.from(dependents)
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const task of allTasks) {
      if (task.dependencies?.includes(current) && !dependents.has(task.id)) {
        dependents.add(task.id)
        queue.push(task.id)
      }
    }
  }

  return dependents.size
}

function calculateDependencyScore(taskId: number, allTasks: Task[]): { score: number; explanation: string } {
  const blockingCount = countBlockingTasks(taskId, allTasks)
  const score = Math.min(100, blockingCount * 20)

  let explanation: string
  if (blockingCount === 0) explanation = "No dependent tasks"
  else if (blockingCount === 1) explanation = "Blocks 1 other task"
  else explanation = `Blocks ${blockingCount} other tasks`

  return { score, explanation }
}

function detectCircularDependencies(tasks: Task[]): string[][] {
  const taskMap = new Map<number, Task>()
  tasks.forEach((task) => taskMap.set(task.id, task))

  const graph: Map<number, number[]> = new Map()
  tasks.forEach((task) => {
    const deps = (task.dependencies || []).filter((d) => taskMap.has(d))
    graph.set(task.id, deps)
  })

  const cycles: string[][] = []
  const visited = new Set<number>()
  const recStack = new Set<number>()
  const path: number[] = []

  function dfs(node: number): boolean {
    visited.add(node)
    recStack.add(node)
    path.push(node)

    for (const neighbor of graph.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) return true
      } else if (recStack.has(neighbor)) {
        const cycleStart = path.indexOf(neighbor)
        const cycle = path.slice(cycleStart).map((id) => taskMap.get(id)?.title || String(id))
        cycle.push(cycle[0])
        cycles.push(cycle)
        return false
      }
    }

    path.pop()
    recStack.delete(node)
    return false
  }

  for (const taskId of graph.keys()) {
    if (!visited.has(taskId)) {
      dfs(taskId)
    }
  }

  return cycles
}

export function analyzeTasks(tasks: Task[], strategy = "smart_balance"): AnalysisResult {
  const weights = STRATEGY_WEIGHTS[strategy] || STRATEGY_WEIGHTS.smart_balance
  const validationErrors: ValidationError[] = []

  tasks.forEach((task, index) => {
    const errors: string[] = []
    if (!task.title?.trim()) errors.push("Title is required")
    if (task.estimated_hours !== undefined && task.estimated_hours <= 0) {
      errors.push("Estimated hours must be positive")
    }
    if (task.importance !== undefined && (task.importance < 1 || task.importance > 10)) {
      errors.push("Importance must be between 1 and 10")
    }
    if (errors.length > 0) {
      validationErrors.push({
        task_index: index,
        task_title: task.title || `Task ${index}`,
        errors,
      })
    }
  })

  const circularDeps = detectCircularDependencies(tasks)

  const scoredTasks: ScoredTask[] = tasks.map((task) => {
    const urgency = calculateUrgencyScore(task.due_date)
    const importance = calculateImportanceScore(task.importance || 5)
    const effort = calculateEffortScore(task.estimated_hours || 1)
    const dependency = calculateDependencyScore(task.id, tasks)

    const priorityScore =
      urgency.score * weights.urgency +
      importance.score * weights.importance +
      effort.score * weights.effort +
      dependency.score * weights.dependency

    const primaryFactors: string[] = []
    if (urgency.score >= 75) primaryFactors.push("urgent deadline")
    if (importance.score >= 70) primaryFactors.push("high importance")
    if (effort.score >= 70) primaryFactors.push("quick win")
    if (dependency.score >= 40) primaryFactors.push("blocks other tasks")

    const summary =
      primaryFactors.length > 0
        ? `Prioritized due to: ${primaryFactors.join(", ")}`
        : "Standard priority - balanced factors"

    return {
      ...task,
      priority_score: Math.round(priorityScore * 100) / 100,
      component_scores: {
        urgency: Math.round(urgency.score * 100) / 100,
        importance: Math.round(importance.score * 100) / 100,
        effort: Math.round(effort.score * 100) / 100,
        dependency: Math.round(dependency.score * 100) / 100,
      },
      explanations: {
        urgency: urgency.explanation,
        importance: importance.explanation,
        effort: effort.explanation,
        dependency: dependency.explanation,
        summary,
      },
      weights_used: weights,
      rank: 0,
    }
  })

  scoredTasks.sort((a, b) => b.priority_score - a.priority_score)

  scoredTasks.forEach((task, index) => {
    task.rank = index + 1
  })

  return {
    tasks: scoredTasks,
    circular_dependencies: circularDeps,
    validation_errors: validationErrors,
    strategy_used: strategy,
    total_tasks: scoredTasks.length,
  }
}

export function suggestTasks(tasks: Task[], count = 3, strategy = "smart_balance"): SuggestionResult {
  const analysis = analyzeTasks(tasks, strategy)
  const topTasks = analysis.tasks.slice(0, count)

  const suggestions: Suggestion[] = topTasks.map((task, index) => {
    const reasons: string[] = []
    const scores = task.component_scores

    if (scores.urgency >= 75) reasons.push(`🔴 ${task.explanations.urgency}`)
    else if (scores.urgency >= 50) reasons.push(`🟡 ${task.explanations.urgency}`)

    if (scores.importance >= 70) reasons.push(`⭐ ${task.explanations.importance}`)
    if (scores.effort >= 70) reasons.push(`⚡ ${task.explanations.effort}`)
    if (scores.dependency >= 20) reasons.push(`🔗 ${task.explanations.dependency}`)

    let recommendation: string
    if (index === 0) {
      recommendation = `This should be your top priority. ${task.explanations.summary}.`
    } else if (index === 1) {
      recommendation = `Work on this after completing the first task. ${task.explanations.summary}.`
    } else {
      recommendation = `Consider this task when you have capacity. ${task.explanations.summary}.`
    }

    return {
      rank: index + 1,
      task,
      priority_score: task.priority_score,
      recommendation,
      reasons,
      component_scores: task.component_scores,
    }
  })

  return {
    suggestions,
    strategy_used: strategy,
    total_tasks_analyzed: analysis.total_tasks,
    message: `Based on ${strategy.replace("_", " ")} strategy, here are your top ${suggestions.length} tasks to focus on today.`,
  }
}
