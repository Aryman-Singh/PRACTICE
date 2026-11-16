# Daymark

A simple full-stack task manager with a React/Vite interface and an Express API. Tasks are stored in `fahhhhback/data/tasks.json`.

## Run locally

Open two terminals from the repository root:

```sh
cd fahhhhback
npm start
```

```sh
cd fahhh1
npm run dev
```

Open the Vite URL shown in the frontend terminal.

The frontend connects directly to the API at `http://localhost:3000`; the API enables CORS for `http://localhost:5173`. If your frontend runs at a different origin, set `FRONTEND_ORIGIN` when starting the API. To use a different API address, set `VITE_API_URL` for the frontend (for example, in `fahhh1/.env.local`).

## API

- `GET /api/tasks` — list tasks
- `GET /api/tasks/:id` — get one task
- `POST /api/tasks` — create a task (`title`, optional `description`)
- `PATCH /api/tasks/:id` — update `title`, `description`, or `completed`
- `DELETE /api/tasks/:id` — delete a task
