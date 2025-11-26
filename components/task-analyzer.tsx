"use client"

import { useState } from "react"
import { TaskForm } from "./task-form"
import { TaskResults } from "./task-results"
import { StrategySelector } from "./strategy-selector"
import { JsonInput } from "./json-input"
import { analyzeTasks, suggestTasks, type Task, type AnalysisResult, type SuggestionResult } from "@/lib/scoring"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, ListChecks } from "lucide-react"

export default function TaskAnalyzer() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [strategy, setStrategy] = useState<string>("smart_balance")
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null)
  const [suggestionResult, setSuggestionResult] = useState<SuggestionResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [activeTab, setActiveTab] = useState("form")
  const [error, setError] = useState<string | null>(null)

  const addTask = (task: Omit<Task, "id">) => {
    const newTask: Task = {
      ...task,
      id: tasks.length + 1,
    }
    setTasks([...tasks, newTask])
    setAnalysisResult(null)
    setSuggestionResult(null)
  }

  const removeTask = (id: number) => {
    setTasks(tasks.filter((t) => t.id !== id))
    setAnalysisResult(null)
    setSuggestionResult(null)
  }

  const handleJsonImport = (importedTasks: Task[]) => {
    const tasksWithIds = importedTasks.map((task, index) => ({
      ...task,
      id: task.id || index + 1,
    }))
    setTasks(tasksWithIds)
    setAnalysisResult(null)
    setSuggestionResult(null)
  }

  const handleAnalyze = async () => {
    if (tasks.length === 0) {
      setError("Please add at least one task to analyze")
      return
    }
    setError(null)
    setIsAnalyzing(true)
    setSuggestionResult(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const result = analyzeTasks(tasks, strategy)
      setAnalysisResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed")
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleSuggest = async () => {
    if (tasks.length === 0) {
      setError("Please add at least one task")
      return
    }
    setError(null)
    setIsSuggesting(true)
    setAnalysisResult(null)

    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const result = suggestTasks(tasks, 3, strategy)
      setSuggestionResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Suggestion failed")
    } finally {
      setIsSuggesting(false)
    }
  }

  const clearAll = () => {
    setTasks([])
    setAnalysisResult(null)
    setSuggestionResult(null)
    setError(null)
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="text-center mb-10">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <ListChecks className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground">Smart Task Analyzer</h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Intelligently prioritize your tasks based on urgency, importance, effort, and dependencies
        </p>
      </header>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <StrategySelector value={strategy} onChange={setStrategy} />

          <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="form">Add Task</TabsTrigger>
                <TabsTrigger value="json">Bulk JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="form">
                <TaskForm onSubmit={addTask} />
              </TabsContent>

              <TabsContent value="json">
                <JsonInput onImport={handleJsonImport} />
              </TabsContent>
            </Tabs>
          </div>

          {tasks.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-foreground">Tasks to Analyze ({tasks.length})</h3>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  Clear All
                </Button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{task.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Due: {task.due_date || "No date"} | {task.estimated_hours}h | Importance: {task.importance}/10
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTask(task.id)}
                      className="text-destructive hover:text-destructive ml-2"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleAnalyze} disabled={tasks.length === 0 || isAnalyzing} className="flex-1" size="lg">
              {isAnalyzing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ListChecks className="mr-2 h-4 w-4" />
                  Analyze Tasks
                </>
              )}
            </Button>
            <Button
              onClick={handleSuggest}
              disabled={tasks.length === 0 || isSuggesting}
              variant="secondary"
              size="lg"
              className="flex-1"
            >
              {isSuggesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suggesting...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Suggest Top 3
                </>
              )}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{error}</p>
            </div>
          )}
        </div>

        <div>
          <TaskResults analysisResult={analysisResult} suggestionResult={suggestionResult} strategy={strategy} />
        </div>
      </div>
    </div>
  )
}
