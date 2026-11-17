# Daymark

A simple full-stack task manager with a React/Vite interface and an Express API. Tasks are stored in the Supabase `tasks` table. Connection settings live in `fahhhhback/.env`.

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

Copy `fahhhhback/.env.example` to `fahhhhback/.env` and set `SUPABASE_SERVICE_ROLE_KEY` from Project Settings → API in the [Supabase project](https://supabase.com/dashboard/project/xiaqrzpf). Run `fahhhhback/supabase/migrations/20261117000000_create_tasks.sql` once in the SQL editor so the `tasks` table exists.

The frontend connects directly to the API at `http://localhost:3000`. The API allows `http://localhost:5173` and `http://localhost:5174`. If your frontend runs at a different origin, set `FRONTEND_ORIGIN` in `fahhhhback/.env` (comma-separated for more than one). To use a different API address, set `VITE_API_URL` for the frontend (for example, in `fahhh1/.env.local`).

## API

- `GET /api/tasks` — list tasks
- `GET /api/tasks/:id` — get one task
- `POST /api/tasks` — create a task (`title`, optional `description`)
- `PATCH /api/tasks/:id` — update `title`, `description`, or `completed`
- `DELETE /api/tasks/:id` — delete a task
