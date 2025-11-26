"use client"

import type React from "react"

import type { AnalysisResult, SuggestionResult, ScoredTask } from "@/lib/scoring"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Target, Zap, GitBranch, AlertTriangle, Trophy, Sparkles, Calendar } from "lucide-react"

interface TaskResultsProps {
  analysisResult: AnalysisResult | null
  suggestionResult: SuggestionResult | null
  strategy: string
}

function getPriorityColor(score: number): string {
  if (score >= 70) return "bg-red-500"
  if (score >= 50) return "bg-amber-500"
  if (score >= 30) return "bg-blue-500"
  return "bg-slate-400"
}

function getPriorityLabel(score: number): string {
  if (score >= 70) return "High"
  if (score >= 50) return "Medium"
  if (score >= 30) return "Low"
  return "Minimal"
}

function getPriorityBadgeVariant(score: number): "destructive" | "default" | "secondary" | "outline" {
  if (score >= 70) return "destructive"
  if (score >= 50) return "default"
  return "secondary"
}

function TaskCard({ task, rank }: { task: ScoredTask; rank: number }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-sm ${getPriorityColor(task.priority_score)}`}
            >
              {rank}
            </div>
            <div>
              <CardTitle className="text-lg leading-tight">{task.title}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={getPriorityBadgeVariant(task.priority_score)}>
                  {getPriorityLabel(task.priority_score)} Priority
                </Badge>
                <span className="text-sm font-semibold text-primary">Score: {task.priority_score.toFixed(1)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{task.due_date || "No due date"}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{task.estimated_hours}h estimated</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Target className="h-4 w-4" />
            <span>Importance: {task.importance}/10</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <GitBranch className="h-4 w-4" />
            <span>{task.dependencies?.length || 0} dependencies</span>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">Score Breakdown</p>
          <div className="space-y-2">
            <ScoreBar
              label="Urgency"
              score={task.component_scores.urgency}
              icon={<Clock className="h-3 w-3" />}
              explanation={task.explanations.urgency}
            />
            <ScoreBar
              label="Importance"
              score={task.component_scores.importance}
              icon={<Target className="h-3 w-3" />}
              explanation={task.explanations.importance}
            />
            <ScoreBar
              label="Effort"
              score={task.component_scores.effort}
              icon={<Zap className="h-3 w-3" />}
              explanation={task.explanations.effort}
            />
            <ScoreBar
              label="Dependencies"
              score={task.component_scores.dependency}
              icon={<GitBranch className="h-3 w-3" />}
              explanation={task.explanations.dependency}
            />
          </div>
        </div>

        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground">{task.explanations.summary}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreBar({
  label,
  score,
  icon,
  explanation,
}: {
  label: string
  score: number
  icon: React.ReactNode
  explanation: string
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <span className="font-medium">{score.toFixed(0)}</span>
      </div>
      <Progress value={Math.min(score, 100)} className="h-1.5" />
      <p className="text-xs text-muted-foreground truncate" title={explanation}>
        {explanation}
      </p>
    </div>
  )
}

export function TaskResults({ analysisResult, suggestionResult, strategy }: TaskResultsProps) {
  if (!analysisResult && !suggestionResult) {
    return (
      <div className="bg-card border border-border rounded-xl p-8 h-full flex flex-col items-center justify-center text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <Sparkles className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Ready to Analyze</h3>
        <p className="text-muted-foreground max-w-sm">
          Add your tasks and click &quot;Analyze Tasks&quot; or &quot;Suggest Top 3&quot; to see intelligent
          prioritization results.
        </p>
      </div>
    )
  }

  if (suggestionResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Top Tasks to Work On</h2>
        </div>
        <p className="text-muted-foreground text-sm">{suggestionResult.message}</p>

        <div className="space-y-4">
          {suggestionResult.suggestions.map((suggestion) => (
            <Card key={suggestion.rank} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                    #{suggestion.rank}
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{suggestion.task.title}</CardTitle>
                    <Badge variant={getPriorityBadgeVariant(suggestion.priority_score)} className="mt-1">
                      Score: {suggestion.priority_score.toFixed(1)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{suggestion.recommendation}</p>
                <div className="space-y-1">
                  {suggestion.reasons.map((reason, idx) => (
                    <p key={idx} className="text-sm">
                      {reason}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Strategy: {strategy.replace("_", " ")} | {suggestionResult.total_tasks_analyzed} tasks analyzed
        </p>
      </div>
    )
  }

  if (analysisResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Prioritized Tasks</h2>
          <Badge variant="outline">{analysisResult.total_tasks} tasks</Badge>
        </div>

        {analysisResult.circular_dependencies.length > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Circular Dependencies Detected</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Found {analysisResult.circular_dependencies.length} circular dependency chain(s). Review task dependencies
              to avoid blockers.
            </p>
          </div>
        )}

        {analysisResult.validation_errors.length > 0 && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">Validation Warnings</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {analysisResult.validation_errors.map((err, idx) => (
                <li key={idx}>
                  {err.task_title}: {err.errors.join(", ")}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-4">
          {analysisResult.tasks.map((task, index) => (
            <TaskCard key={task.id || index} task={task} rank={index + 1} />
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center">Strategy: {strategy.replace("_", " ")}</p>
      </div>
    )
  }

  return null
}
