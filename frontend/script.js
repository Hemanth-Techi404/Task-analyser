/**
 * Smart Task Analyzer - Frontend JavaScript
 *
 * Handles user interactions, form management, API communication,
 * and result display for the task prioritization system.
 */

// Configuration
const CONFIG = {
  API_BASE_URL: "http://localhost:8000/api",
  ENDPOINTS: {
    ANALYZE: "/tasks/analyze/",
    SUGGEST: "/tasks/suggest/",
    HEALTH: "/health/",
  },
}

// Application State
const state = {
  tasks: [],
  currentStrategy: "smart_balance",
  isLoading: false,
  inputMode: "form", // 'form' or 'json'
}

// DOM Elements
const elements = {
  // Input Mode
  formModeBtn: document.getElementById("formModeBtn"),
  jsonModeBtn: document.getElementById("jsonModeBtn"),
  formMode: document.getElementById("formMode"),
  jsonMode: document.getElementById("jsonMode"),

  // Form
  taskForm: document.getElementById("taskForm"),
  taskTitle: document.getElementById("taskTitle"),
  taskDueDate: document.getElementById("taskDueDate"),
  taskHours: document.getElementById("taskHours"),
  taskImportance: document.getElementById("taskImportance"),
  importanceValue: document.getElementById("importanceValue"),
  taskDependencies: document.getElementById("taskDependencies"),

  // JSON Input
  jsonInput: document.getElementById("jsonInput"),
  parseJsonBtn: document.getElementById("parseJsonBtn"),

  // Task List
  taskList: document.getElementById("taskList"),
  taskCount: document.getElementById("taskCount"),
  clearTasksBtn: document.getElementById("clearTasksBtn"),

  // Strategy
  strategyCards: document.querySelectorAll(".strategy-card"),

  // Actions
  analyzeBtn: document.getElementById("analyzeBtn"),
  suggestBtn: document.getElementById("suggestBtn"),

  // Display
  loadingIndicator: document.getElementById("loadingIndicator"),
  errorDisplay: document.getElementById("errorDisplay"),
  resultsSection: document.getElementById("resultsSection"),
  resultStrategy: document.getElementById("resultStrategy"),
  resultCount: document.getElementById("resultCount"),
  warningsContainer: document.getElementById("warningsContainer"),
  suggestionsContainer: document.getElementById("suggestionsContainer"),
  suggestionsList: document.getElementById("suggestionsList"),
  fullResultsContainer: document.getElementById("fullResultsContainer"),
  resultsList: document.getElementById("resultsList"),
}

// ============================================
// Initialization
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners()
  setDefaultDueDate()
  updateUI()
})

function initializeEventListeners() {
  // Input Mode Toggle
  elements.formModeBtn.addEventListener("click", () => switchInputMode("form"))
  elements.jsonModeBtn.addEventListener("click", () => switchInputMode("json"))

  // Form Submission
  elements.taskForm.addEventListener("submit", handleFormSubmit)

  // Importance Slider
  elements.taskImportance.addEventListener("input", (e) => {
    elements.importanceValue.textContent = e.target.value
  })

  // JSON Parse
  elements.parseJsonBtn.addEventListener("click", handleJsonParse)

  // Clear Tasks
  elements.clearTasksBtn.addEventListener("click", clearAllTasks)

  // Strategy Selection
  elements.strategyCards.forEach((card) => {
    card.addEventListener("click", () => handleStrategyChange(card))
  })

  // Action Buttons
  elements.analyzeBtn.addEventListener("click", handleAnalyze)
  elements.suggestBtn.addEventListener("click", handleSuggest)
}

function setDefaultDueDate() {
  // Set default due date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  elements.taskDueDate.value = formatDate(tomorrow)
}

// ============================================
// Input Mode Management
// ============================================

function switchInputMode(mode) {
  state.inputMode = mode

  if (mode === "form") {
    elements.formModeBtn.classList.add("active")
    elements.jsonModeBtn.classList.remove("active")
    elements.formMode.classList.remove("hidden")
    elements.jsonMode.classList.add("hidden")
  } else {
    elements.formModeBtn.classList.remove("active")
    elements.jsonModeBtn.classList.add("active")
    elements.formMode.classList.add("hidden")
    elements.jsonMode.classList.remove("hidden")
  }
}

// ============================================
// Task Management
// ============================================

function handleFormSubmit(e) {
  e.preventDefault()

  const title = elements.taskTitle.value.trim()
  if (!title) {
    showError("Please enter a task title")
    return
  }

  const task = {
    id: Date.now(), // Simple ID generation
    title: title,
    due_date: elements.taskDueDate.value || null,
    estimated_hours: Number.parseFloat(elements.taskHours.value) || 1,
    importance: Number.parseInt(elements.taskImportance.value) || 5,
    dependencies: parseDependencies(elements.taskDependencies.value),
  }

  addTask(task)
  resetForm()
}

function parseDependencies(value) {
  if (!value.trim()) return []

  return value
    .split(",")
    .map((s) => Number.parseInt(s.trim()))
    .filter((n) => !isNaN(n))
}

function addTask(task) {
  state.tasks.push(task)
  updateUI()
  hideError()
}

function removeTask(taskId) {
  state.tasks = state.tasks.filter((t) => t.id !== taskId)
  updateUI()
}

function clearAllTasks() {
  if (state.tasks.length === 0) return

  if (confirm("Are you sure you want to clear all tasks?")) {
    state.tasks = []
    updateUI()
    hideResults()
  }
}

function handleJsonParse() {
  const jsonText = elements.jsonInput.value.trim()

  if (!jsonText) {
    showError("Please enter JSON data")
    return
  }

  try {
    const parsed = JSON.parse(jsonText)

    if (!Array.isArray(parsed)) {
      showError("JSON must be an array of tasks")
      return
    }

    // Validate and add tasks
    const validTasks = []
    const errors = []

    parsed.forEach((task, index) => {
      if (!task.title) {
        errors.push(`Task ${index + 1}: Missing title`)
        return
      }

      validTasks.push({
        id: task.id || Date.now() + index,
        title: task.title,
        due_date: task.due_date || null,
        estimated_hours: Number.parseFloat(task.estimated_hours) || 1,
        importance: Math.min(10, Math.max(1, Number.parseInt(task.importance) || 5)),
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
      })
    })

    if (errors.length > 0) {
      showError(`Validation errors:\n${errors.join("\n")}`)
      return
    }

    // Replace existing tasks with parsed tasks
    state.tasks = validTasks
    updateUI()
    hideError()

    // Switch to form mode to show task list
    switchInputMode("form")
  } catch (e) {
    showError(`Invalid JSON: ${e.message}`)
  }
}

function resetForm() {
  elements.taskTitle.value = ""
  setDefaultDueDate()
  elements.taskHours.value = "1"
  elements.taskImportance.value = "5"
  elements.importanceValue.textContent = "5"
  elements.taskDependencies.value = ""
  elements.taskTitle.focus()
}

// ============================================
// Strategy Management
// ============================================

function handleStrategyChange(selectedCard) {
  const strategy = selectedCard.dataset.strategy
  state.currentStrategy = strategy

  elements.strategyCards.forEach((card) => {
    card.classList.remove("active")
    card.querySelector("input").checked = false
  })

  selectedCard.classList.add("active")
  selectedCard.querySelector("input").checked = true
}

// ============================================
// API Communication
// ============================================

async function handleAnalyze() {
  if (state.tasks.length === 0) {
    showError("Please add at least one task to analyze")
    return
  }

  setLoading(true)
  hideError()

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.ANALYZE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: state.tasks,
        strategy: state.currentStrategy,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || errorData.error || "Analysis failed")
    }

    const result = await response.json()
    displayResults(result, "analyze")
  } catch (error) {
    showError(`Failed to analyze tasks: ${error.message}`)
  } finally {
    setLoading(false)
  }
}

async function handleSuggest() {
  if (state.tasks.length === 0) {
    showError("Please add at least one task to get suggestions")
    return
  }

  setLoading(true)
  hideError()

  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.ENDPOINTS.SUGGEST}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tasks: state.tasks,
        count: 3,
        strategy: state.currentStrategy,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || errorData.error || "Suggestion failed")
    }

    const result = await response.json()
    displayResults(result, "suggest")
  } catch (error) {
    showError(`Failed to get suggestions: ${error.message}`)
  } finally {
    setLoading(false)
  }
}

// ============================================
// Display Functions
// ============================================

function updateUI() {
  // Update task count
  elements.taskCount.textContent = state.tasks.length

  // Update task list
  renderTaskList()

  // Update button states
  const hasTasks = state.tasks.length > 0
  elements.analyzeBtn.disabled = !hasTasks
  elements.suggestBtn.disabled = !hasTasks
  elements.clearTasksBtn.disabled = !hasTasks
}

function renderTaskList() {
  elements.taskList.innerHTML = ""

  state.tasks.forEach((task) => {
    const li = document.createElement("li")
    li.className = "task-item"
    li.innerHTML = `
            <div class="task-item-info">
                <div class="task-item-title">${escapeHtml(task.title)}</div>
                <div class="task-item-meta">
                    <span>📅 ${task.due_date || "No due date"}</span>
                    <span>⏱️ ${task.estimated_hours}h</span>
                    <span>⭐ ${task.importance}/10</span>
                    ${task.dependencies.length > 0 ? `<span>🔗 Deps: ${task.dependencies.join(", ")}</span>` : ""}
                </div>
            </div>
            <button class="task-item-remove" data-task-id="${task.id}" title="Remove task">×</button>
        `

    li.querySelector(".task-item-remove").addEventListener("click", () => {
      removeTask(task.id)
    })

    elements.taskList.appendChild(li)
  })
}

function displayResults(result, type) {
  elements.resultsSection.classList.remove("hidden")

  // Update meta info
  const strategyName = formatStrategyName(result.strategy_used)
  elements.resultStrategy.textContent = strategyName
  elements.resultCount.textContent = `${result.total_tasks_analyzed || result.total_tasks || 0} tasks`

  // Handle warnings
  if (result.warning || (result.circular_dependencies && result.circular_dependencies.length > 0)) {
    elements.warningsContainer.classList.remove("hidden")
    let warningHtml = ""

    if (result.warning) {
      warningHtml += `<p>${result.warning}</p>`
    }

    if (result.circular_dependencies && result.circular_dependencies.length > 0) {
      warningHtml += `<p>⚠️ Circular dependencies detected in ${result.circular_dependencies.length} chain(s)</p>`
    }

    elements.warningsContainer.innerHTML = warningHtml
  } else {
    elements.warningsContainer.classList.add("hidden")
  }

  if (type === "suggest") {
    // Show suggestions
    elements.suggestionsContainer.classList.remove("hidden")
    elements.fullResultsContainer.classList.add("hidden")
    renderSuggestions(result.suggestions)
  } else {
    // Show full results
    elements.suggestionsContainer.classList.add("hidden")
    elements.fullResultsContainer.classList.remove("hidden")
    renderFullResults(result.tasks)
  }

  // Scroll to results
  elements.resultsSection.scrollIntoView({ behavior: "smooth", block: "start" })
}

function renderSuggestions(suggestions) {
  elements.suggestionsList.innerHTML = ""

  suggestions.forEach((suggestion) => {
    const card = document.createElement("div")
    card.className = "suggestion-card"

    const task = suggestion.task
    const reasons = suggestion.reasons.map((r) => `<div class="reason-item">${r}</div>`).join("")

    card.innerHTML = `
            <div class="suggestion-header">
                <div class="suggestion-rank">
                    <span class="rank-badge">${suggestion.rank}</span>
                    <span class="suggestion-title">${escapeHtml(task.title)}</span>
                </div>
                <span class="suggestion-score">${suggestion.priority_score.toFixed(1)}</span>
            </div>
            <div class="suggestion-meta">
                <span>📅 ${task.due_date || "No due date"}</span>
                <span>⏱️ ${task.estimated_hours} hours</span>
                <span>⭐ Importance: ${task.importance}/10</span>
            </div>
            <div class="suggestion-reasons">
                ${reasons}
            </div>
        `

    elements.suggestionsList.appendChild(card)
  })
}

function renderFullResults(tasks) {
  elements.resultsList.innerHTML = ""

  tasks.forEach((task) => {
    const card = document.createElement("div")
    card.className = "result-card"

    const priority = getPriorityLevel(task.priority_score)
    const scores = task.component_scores

    card.innerHTML = `
            <div class="result-header">
                <div class="result-rank-title">
                    <span class="result-rank">#${task.rank}</span>
                    <span class="result-title">${escapeHtml(task.title)}</span>
                </div>
                <div class="result-score-container">
                    <div class="result-score priority-${priority.class}">${task.priority_score.toFixed(1)}</div>
                    <div class="result-priority priority-${priority.class}">${priority.label}</div>
                </div>
            </div>
            <div class="result-meta">
                <span>📅 ${task.due_date || "No due date"}</span>
                <span>⏱️ ${task.estimated_hours} hours</span>
                <span>⭐ ${task.importance}/10</span>
                ${task.dependencies && task.dependencies.length > 0 ? `<span>🔗 Deps: ${task.dependencies.join(", ")}</span>` : ""}
            </div>
            <div class="result-explanation">${task.explanations.summary}</div>
            <div class="result-scores">
                <span class="score-chip">
                    <span class="score-chip-label">Urgency:</span>
                    <span class="score-chip-value">${scores.urgency}</span>
                </span>
                <span class="score-chip">
                    <span class="score-chip-label">Importance:</span>
                    <span class="score-chip-value">${scores.importance}</span>
                </span>
                <span class="score-chip">
                    <span class="score-chip-label">Effort:</span>
                    <span class="score-chip-value">${scores.effort}</span>
                </span>
                <span class="score-chip">
                    <span class="score-chip-label">Dependency:</span>
                    <span class="score-chip-value">${scores.dependency}</span>
                </span>
            </div>
        `

    elements.resultsList.appendChild(card)
  })
}

function getPriorityLevel(score) {
  if (score >= 70) return { label: "High Priority", class: "high" }
  if (score >= 40) return { label: "Medium Priority", class: "medium" }
  return { label: "Low Priority", class: "low" }
}

// ============================================
// UI State Functions
// ============================================

function setLoading(isLoading) {
  state.isLoading = isLoading

  if (isLoading) {
    elements.loadingIndicator.classList.remove("hidden")
    elements.analyzeBtn.disabled = true
    elements.suggestBtn.disabled = true
  } else {
    elements.loadingIndicator.classList.add("hidden")
    elements.analyzeBtn.disabled = state.tasks.length === 0
    elements.suggestBtn.disabled = state.tasks.length === 0
  }
}

function showError(message) {
  elements.errorDisplay.textContent = message
  elements.errorDisplay.classList.remove("hidden")
}

function hideError() {
  elements.errorDisplay.classList.add("hidden")
}

function hideResults() {
  elements.resultsSection.classList.add("hidden")
}

// ============================================
// Utility Functions
// ============================================

function formatDate(date) {
  return date.toISOString().split("T")[0]
}

function formatStrategyName(strategy) {
  const names = {
    smart_balance: "Smart Balance",
    fastest_wins: "Fastest Wins",
    high_impact: "High Impact",
    deadline_driven: "Deadline Driven",
  }
  return names[strategy] || strategy
}

function escapeHtml(text) {
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}
