"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { Task } from "@/lib/scoring"
import { Plus } from "lucide-react"

interface TaskFormProps {
  onSubmit: (task: Omit<Task, "id">) => void
}

export function TaskForm({ onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("")
  const [dueDate, setDueDate] = useState("")
  const [estimatedHours, setEstimatedHours] = useState("2")
  const [importance, setImportance] = useState([5])
  const [dependencies, setDependencies] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!title.trim()) {
      newErrors.title = "Title is required"
    }

    const hours = Number.parseFloat(estimatedHours)
    if (isNaN(hours) || hours <= 0) {
      newErrors.estimatedHours = "Please enter a valid positive number"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) return

    const parsedDeps = dependencies
      .split(",")
      .map((d) => Number.parseInt(d.trim()))
      .filter((d) => !isNaN(d))

    onSubmit({
      title: title.trim(),
      due_date: dueDate || null,
      estimated_hours: Number.parseFloat(estimatedHours),
      importance: importance[0],
      dependencies: parsedDeps,
    })

    setTitle("")
    setDueDate("")
    setEstimatedHours("2")
    setImportance([5])
    setDependencies("")
    setErrors({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Task Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Fix login bug"
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && <p className="text-sm text-destructive">{errors.title}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="estimatedHours">Estimated Hours</Label>
        <Input
          id="estimatedHours"
          type="number"
          step="0.5"
          min="0.1"
          value={estimatedHours}
          onChange={(e) => setEstimatedHours(e.target.value)}
          className={errors.estimatedHours ? "border-destructive" : ""}
        />
        {errors.estimatedHours && <p className="text-sm text-destructive">{errors.estimatedHours}</p>}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Importance</Label>
          <span className="text-sm font-medium text-primary">{importance[0]}/10</span>
        </div>
        <Slider value={importance} onValueChange={setImportance} min={1} max={10} step={1} className="py-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dependencies">Dependencies (comma-separated IDs)</Label>
        <Input
          id="dependencies"
          value={dependencies}
          onChange={(e) => setDependencies(e.target.value)}
          placeholder="e.g., 1, 2, 3"
        />
        <p className="text-xs text-muted-foreground">Enter task IDs that must be completed before this task</p>
      </div>

      <Button type="submit" className="w-full">
        <Plus className="mr-2 h-4 w-4" />
        Add Task
      </Button>
    </form>
  )
}
