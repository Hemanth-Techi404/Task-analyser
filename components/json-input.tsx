"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import type { Task } from "@/lib/scoring"
import { Upload, FileJson } from "lucide-react"

interface JsonInputProps {
  onImport: (tasks: Task[]) => void
}

const exampleJson = `[
  {
    "title": "Fix login bug",
    "due_date": "2025-11-28",
    "estimated_hours": 2,
    "importance": 9,
    "dependencies": []
  },
  {
    "title": "Write documentation",
    "due_date": "2025-12-05",
    "estimated_hours": 4,
    "importance": 6,
    "dependencies": [1]
  },
  {
    "title": "Deploy to staging",
    "due_date": "2025-11-30",
    "estimated_hours": 1,
    "importance": 8,
    "dependencies": [1]
  }
]`

export function JsonInput({ onImport }: JsonInputProps) {
  const [jsonText, setJsonText] = useState("")
  const [error, setError] = useState<string | null>(null)

  const handleImport = () => {
    setError(null)

    if (!jsonText.trim()) {
      setError("Please enter JSON data")
      return
    }

    try {
      const parsed = JSON.parse(jsonText)

      if (!Array.isArray(parsed)) {
        setError("JSON must be an array of tasks")
        return
      }

      if (parsed.length === 0) {
        setError("Array must contain at least one task")
        return
      }

      for (let i = 0; i < parsed.length; i++) {
        const task = parsed[i]
        if (!task.title || typeof task.title !== "string") {
          setError(`Task at index ${i} is missing a valid title`)
          return
        }
      }

      onImport(parsed)
      setJsonText("")
    } catch {
      setError("Invalid JSON format. Please check your input.")
    }
  }

  const loadExample = () => {
    setJsonText(exampleJson)
    setError(null)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="jsonInput">Paste JSON Array of Tasks</Label>
          <Button variant="ghost" size="sm" onClick={loadExample}>
            <FileJson className="mr-2 h-3 w-3" />
            Load Example
          </Button>
        </div>
        <Textarea
          id="jsonInput"
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          placeholder={`Paste your JSON array here...\n\nExample:\n${exampleJson}`}
          className={`min-h-[250px] font-mono text-sm ${error ? "border-destructive" : ""}`}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

      <Button onClick={handleImport} className="w-full">
        <Upload className="mr-2 h-4 w-4" />
        Import Tasks
      </Button>
    </div>
  )
}
