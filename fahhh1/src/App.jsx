import { useEffect, useState } from 'react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

async function request(path, options) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const result = await response.json().catch(() => ({}))
    throw new Error(result.error || 'The request could not be completed.')
  }

  return response.status === 204 ? null : response.json()
}

function Icon({ name }) {
  const paths = {
    plus: <path d="M12 5v14m-7-7h14" />,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    trash: <><path d="M3 6h18" /><path d="M8 6V4h8v2m3 0-1 14H6L5 6" /><path d="M10 11v5m4-5v5" /></>,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    arrow: <path d="M5 12h14m-7-7 7 7-7 7" />,
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  )
}

function TaskDialog({ task, busy, onClose, onSave }) {
  const [title, setTitle] = useState(task?.title || '')
  const [description, setDescription] = useState(task?.description || '')

  function handleSubmit(event) {
    event.preventDefault()
    onSave({ title: title.trim(), description: description.trim() })
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onClose()
    }}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">{task ? 'MAKE IT BETTER' : 'ONE STEP AT A TIME'}</span>
            <h2 id="dialog-title">{task ? 'Edit task' : 'Create a task'}</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close dialog" disabled={busy}>
            <Icon name="close" />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <label htmlFor="task-title">Task name</label>
          <input
            autoFocus
            id="task-title"
            maxLength={120}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="What needs to get done?"
            required
            value={title}
          />
          <label htmlFor="task-description">A little more detail <span className="optional">(optional)</span></label>
          <textarea
            id="task-description"
            maxLength={500}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Add notes or context..."
            rows={4}
            value={description}
          />
          <div className="dialog-actions">
            <button className="button button-quiet" type="button" onClick={onClose} disabled={busy}>Cancel</button>
            <button className="button button-primary" type="submit" disabled={busy || !title.trim()}>
              {busy ? 'Saving…' : task ? 'Save changes' : 'Add task'}
              {!busy && <Icon name="arrow" />}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function App() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogTask, setDialogTask] = useState(undefined)

  useEffect(() => {
    let active = true
    request('/api/tasks')
      .then((data) => {
        if (active) setTasks(data)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  const completedCount = tasks.filter((task) => task.completed).length
  const remainingCount = tasks.length - completedCount
  const visibleTasks = tasks.filter((task) => {
    const matchesFilter = filter === 'all' || (filter === 'completed' ? task.completed : !task.completed)
    const matchesSearch = `${task.title} ${task.description}`.toLowerCase().includes(search.toLowerCase())
    return matchesFilter && matchesSearch
  })

  async function saveTask(values) {
    setSaving(true)
    setError('')
    try {
      const isEditing = Boolean(dialogTask)
      const task = await request(isEditing ? `/api/tasks/${dialogTask.id}` : '/api/tasks', {
        method: isEditing ? 'PATCH' : 'POST',
        body: JSON.stringify(values),
      })
      setTasks((current) => isEditing
        ? current.map((item) => item.id === task.id ? task : item)
        : [task, ...current])
      setDialogTask(undefined)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  async function toggleTask(task) {
    setError('')
    try {
      const updatedTask = await request(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      })
      setTasks((current) => current.map((item) => item.id === task.id ? updatedTask : item))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(`Delete “${task.title}”? This can’t be undone.`)) return
    setError('')
    try {
      await request(`/api/tasks/${task.id}`, { method: 'DELETE' })
      setTasks((current) => current.filter((item) => item.id !== task.id))
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  const filters = [
    { id: 'all', label: 'All tasks', count: tasks.length },
    { id: 'active', label: 'In progress', count: remainingCount },
    { id: 'completed', label: 'Completed', count: completedCount },
  ]

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Daymark home">
          <span className="brand-mark"><span /></span>
          <span>daymark<span className="brand-period">.</span></span>
        </a>
        <div className="topbar-note"><span className="status-dot" /> YOUR DAILY SPACE</div>
      </header>

      <section className="workspace">
        <div className="welcome-row">
          <div>
            <span className="eyebrow">A CLEARER DAY STARTS HERE</span>
            <h1>Make room for<br /><span>what matters.</span></h1>
            <p className="intro">Small steps add up. Keep your focus on the next one.</p>
          </div>
          <div className="progress-card">
            <div className="progress-orbit">
              <span>{tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0}<small>%</small></span>
            </div>
            <div>
              <span className="progress-label">YOUR PROGRESS</span>
              <strong>{completedCount} of {tasks.length} done</strong>
              <span className="progress-caption">Keep your momentum going</span>
            </div>
          </div>
        </div>

        <section className="task-panel" aria-label="Your tasks">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">YOUR LIST</span>
              <h2>Today’s focus<span className="heading-dot">.</span></h2>
            </div>
            <button className="button button-primary add-button" type="button" onClick={() => setDialogTask(null)}>
              <Icon name="plus" /> New task
            </button>
          </div>

          <div className="list-toolbar">
            <div className="filter-tabs" role="tablist" aria-label="Filter tasks">
              {filters.map((item) => (
                <button
                  aria-selected={filter === item.id}
                  className={`filter-tab${filter === item.id ? ' selected' : ''}`}
                  key={item.id}
                  onClick={() => setFilter(item.id)}
                  role="tab"
                  type="button"
                >
                  {item.label}<span>{item.count}</span>
                </button>
              ))}
            </div>
            <label className="search-box">
              <Icon name="search" />
              <input aria-label="Search tasks" onChange={(event) => setSearch(event.target.value)} placeholder="Find a task..." value={search} />
              <kbd>/</kbd>
            </label>
          </div>

          {error && <div className="error-banner" role="alert">{error}</div>}

          <div className="task-list" aria-live="polite">
            {loading ? (
              <div className="empty-state"><span className="loading-spinner" /><p>Getting your tasks…</p></div>
            ) : visibleTasks.length ? visibleTasks.map((task) => (
              <article className={`task-row${task.completed ? ' is-complete' : ''}`} key={task.id}>
                <button
                  aria-label={task.completed ? `Mark ${task.title} as in progress` : `Complete ${task.title}`}
                  aria-pressed={task.completed}
                  className="task-check"
                  onClick={() => toggleTask(task)}
                  type="button"
                >
                  {task.completed && <Icon name="check" />}
                </button>
                <div className="task-copy">
                  <h3>{task.title}</h3>
                  {task.description && <p>{task.description}</p>}
                  <span className="task-date">{task.completed ? 'COMPLETED' : 'IN PROGRESS'} <i /> ADDED {new Date(task.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="task-actions">
                  <button className="icon-button" type="button" aria-label={`Edit ${task.title}`} onClick={() => setDialogTask(task)}><Icon name="edit" /></button>
                  <button className="icon-button delete-button" type="button" aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task)}><Icon name="trash" /></button>
                </div>
              </article>
            )) : (
              <div className="empty-state">
                <span className="empty-mark"><Icon name={search ? 'search' : 'check'} /></span>
                <h3>{search ? 'No matching tasks' : filter === 'completed' ? 'Nothing completed just yet' : 'Your list is clear'}</h3>
                <p>{search ? 'Try another search or clear the search box.' : filter === 'completed' ? 'When you finish a task, it’ll show up here.' : 'Add a task to give your day a little direction.'}</p>
                {!search && filter === 'all' && <button className="text-button" type="button" onClick={() => setDialogTask(null)}>Create your first task <Icon name="arrow" /></button>}
              </div>
            )}
          </div>

          <footer className="panel-footer">
            <span><span className="footer-spark">✳</span> One thing at a time.</span>
            <span>{remainingCount} {remainingCount === 1 ? 'task' : 'tasks'} left to focus on</span>
          </footer>
        </section>
        <footer className="page-footer">A little progress is still progress<span> ✳ </span>Make today count.</footer>
      </section>

      {dialogTask !== undefined && (
        <TaskDialog
          busy={saving}
          onClose={() => setDialogTask(undefined)}
          onSave={saveTask}
          task={dialogTask}
        />
      )}
    </main>
  )
}

export default App
