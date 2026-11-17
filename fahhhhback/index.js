require("dotenv").config({ path: require("node:path").join(__dirname, ".env") })

const express = require("express")
const cors = require("cors")
const { createClient } = require("@supabase/supabase-js")

const app = express()
const port = process.env.PORT || 3000
const frontendOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in fahhhhback/.env")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

app.use(cors({ origin: frontendOrigins }))
app.use(express.json({ limit: "16kb" }))

const taskIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function toTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    completed: row.completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
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

function sendDatabaseError(res, error) {
  console.error(error)
  return res.status(500).json({ error: "Something went wrong. Please try again." })
}

app.get("/api/tasks", async (req, res) => {
  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) return sendDatabaseError(res, error)
  return res.json(data.map(toTask))
})

app.get("/api/tasks/:id", async (req, res) => {
  if (!taskIdPattern.test(req.params.id)) {
    return res.status(404).json({ error: "Task not found." })
  }

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", req.params.id)
    .maybeSingle()

  if (error) return sendDatabaseError(res, error)
  if (!data) return res.status(404).json({ error: "Task not found." })
  return res.json(toTask(data))
})

app.post("/api/tasks", async (req, res) => {
  const validationError = validateTaskInput(req.body)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      title: req.body.title.trim(),
      description: (req.body.description || "").trim(),
      completed: false,
    })
    .select("*")
    .single()

  if (error) return sendDatabaseError(res, error)
  return res.status(201).json(toTask(data))
})

app.patch("/api/tasks/:id", async (req, res) => {
  const validationError = validateTaskInput(req.body, true)
  if (validationError) {
    return res.status(400).json({ error: validationError })
  }

  if (!taskIdPattern.test(req.params.id)) {
    return res.status(404).json({ error: "Task not found." })
  }

  const updates = {}
  if (Object.hasOwn(req.body, "title")) updates.title = req.body.title.trim()
  if (Object.hasOwn(req.body, "description")) updates.description = req.body.description.trim()
  if (Object.hasOwn(req.body, "completed")) updates.completed = req.body.completed

  const { data, error } = await supabase
    .from("tasks")
    .update(updates)
    .eq("id", req.params.id)
    .select("*")
    .maybeSingle()

  if (error) return sendDatabaseError(res, error)
  if (!data) return res.status(404).json({ error: "Task not found." })
  return res.json(toTask(data))
})

app.delete("/api/tasks/:id", async (req, res) => {
  if (!taskIdPattern.test(req.params.id)) {
    return res.status(404).json({ error: "Task not found." })
  }

  const { data, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", req.params.id)
    .select("id")

  if (error) return sendDatabaseError(res, error)
  if (!data.length) return res.status(404).json({ error: "Task not found." })
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
