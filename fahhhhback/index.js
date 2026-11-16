const express = require("express")
const cors = require("cors")
const fs = require("node:fs")
const path = require("node:path")
const { randomUUID } = require("node:crypto")

const app = express()
const port = process.env.PORT || 3000
const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173"
const dataDirectory = path.join(__dirname, "data")
const dataFile = path.join(dataDirectory, "tasks.json")

fs.mkdirSync(dataDirectory, { recursive: true })
if (!fs.existsSync(dataFile)) {
  fs.writeFileSync(dataFile, "[]\n")
}

app.use(cors({ origin: frontendOrigin }))
app.use(express.json({ limit: "16kb" }))

function readTasks() {
  return JSON.parse(fs.readFileSync(dataFile, "utf8"))
}

function writeTasks(tasks) {
  fs.writeFileSync(dataFile, `${JSON.stringify(tasks, null, 2)}\n`)
}

function validateTaskInput(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "A task object is required."
  }

  if (!partial || Object.hasOwn(body, "title")) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return "Title is required."
    }
    if (body.title.trim().length > 120) {
      return "Title must be 120 characters or fewer."
    }
  }

  if (Object.hasOwn(body, "description")) {
    if (typeof body.description !== "string") {
      return "Description must be text."
    }
    if (body.description.length > 500) {
      return "Description must be 500 characters or fewer."
    }
  } else if (!partial) {
    body.description = ""
  }

  if (Object.hasOwn(body, "completed") && typeof body.completed !== "boolean") {
    return "Completed must be true or false."
  }

  if (partial && !["title", "description", "completed"].some((key) => Object.hasOwn(body, key))) {
    return "At least one task field must be provided."
  }

  return null
}

app.get("/api/tasks", (req, res) => {
  res.json(readTasks())
})

app.get("/api/tasks/:id", (req, res) => {
  const task = readTasks().find((item) => item.id === req.params.id)
  if (!task) {
    return res.status(404).json({ error: "Task not found." })
  }
  return res.json(task)
})

app.post("/api/tasks", (req, res) => {
  const validationError = validateTaskInput(req.body)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const now = new Date().toISOString()
  const task = {
    id: randomUUID(),
    title: req.body.title.trim(),
    description: (req.body.description || "").trim(),
    completed: false,
    createdAt: now,
    updatedAt: now,
  }
  const tasks = readTasks()
  tasks.unshift(task)
  writeTasks(tasks)
  return res.status(201).json(task)
})

app.patch("/api/tasks/:id", (req, res) => {
  const validationError = validateTaskInput(req.body, true)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const tasks = readTasks()
  const index = tasks.findIndex((item) => item.id === req.params.id)
  if (index === -1) {
    return res.status(404).json({ error: "Task not found." })
  }

  const updates = {}
  if (Object.hasOwn(req.body, "title")) updates.title = req.body.title.trim()
  if (Object.hasOwn(req.body, "description")) updates.description = req.body.description.trim()
  if (Object.hasOwn(req.body, "completed")) updates.completed = req.body.completed

  tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() }
  writeTasks(tasks)
  return res.json(tasks[index])
})

app.delete("/api/tasks/:id", (req, res) => {
  const tasks = readTasks()
  const filteredTasks = tasks.filter((item) => item.id !== req.params.id)
  if (filteredTasks.length === tasks.length) {
    return res.status(404).json({ error: "Task not found." })
  }

  writeTasks(filteredTasks)
  return res.status(204).end()
})

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ error: "Request body must be valid JSON." })
  }
  console.error(error)
  return res.status(500).json({ error: "Something went wrong. Please try again." })
})

app.listen(port, () => {
  console.log(`Task API is running on http://localhost:${port}`)
})
