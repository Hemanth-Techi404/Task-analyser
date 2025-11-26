"use client"

import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Zap, Target, Clock, Brain } from "lucide-react"

interface StrategySelectorProps {
  value: string
  onChange: (value: string) => void
}

const strategies = [
  {
    value: "smart_balance",
    label: "Smart Balance",
    description: "Balanced algorithm weighing all factors",
    icon: Brain,
  },
  {
    value: "fastest_wins",
    label: "Fastest Wins",
    description: "Prioritize low-effort quick tasks",
    icon: Zap,
  },
  {
    value: "high_impact",
    label: "High Impact",
    description: "Focus on most important tasks",
    icon: Target,
  },
  {
    value: "deadline_driven",
    label: "Deadline Driven",
    description: "Prioritize by due date urgency",
    icon: Clock,
  },
]

export function StrategySelector({ value, onChange }: StrategySelectorProps) {
  const selectedStrategy = strategies.find((s) => s.value === value)

  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
      <Label className="text-base font-semibold mb-3 block">Sorting Strategy</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            {selectedStrategy && (
              <div className="flex items-center gap-2">
                <selectedStrategy.icon className="h-4 w-4 text-primary" />
                <span>{selectedStrategy.label}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {strategies.map((strategy) => (
            <SelectItem key={strategy.value} value={strategy.value}>
              <div className="flex items-center gap-3">
                <strategy.icon className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium">{strategy.label}</div>
                  <div className="text-xs text-muted-foreground">{strategy.description}</div>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedStrategy && <p className="text-sm text-muted-foreground mt-3">{selectedStrategy.description}</p>}
    </div>
  )
}
