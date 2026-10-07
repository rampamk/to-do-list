## Project Overview

A todo list application that uses SQlite database to store each user authentication [username and password]

# Rules
- Use SQlite for storing authentication password and username
- ask for user email and password
- Each user can see only their own task
- Each user can add,complete and delete their own to do task 
- User cannot see and alter another person to do list.

# Implementation

**Stack:** React + Vite (frontend), Node.js + Express (backend), Postgres via `pg` (database). Note: deviates from the SQLite rule above — switched to Postgres because the app targets Vercel, whose serverless functions have an ephemeral filesystem that SQLite can't persist to.

**Structure:**
- `server/app.js` — Express app (routes, middleware, auth) — exported, no listener
- `server/index.js` — local dev entry point, calls `app.listen`
- `server/db.js` — Postgres pool (`POSTGRES_URL`/`DATABASE_URL`), creates `users` and `todos` tables on startup
- `api/index.js` — Vercel serverless entry point, re-exports `server/app.js`
- `vercel.json` — build/install commands for the client, and rewrites so `/api/*` hits the one serverless function and all other paths fall back to `index.html`
- `client/` — React app (Vite)
  - `src/App.jsx` — checks auth on load, shows `AuthForm` or the todo list
  - `src/AuthForm.jsx` — login/signup form
  - `src/api.js` — fetch wrapper for `/api/auth/*` and `/api/todos` endpoints

**Auth:**
- Passwords hashed with `bcryptjs`, stored in `users` table (`email UNIQUE`, `password_hash`)
- Stateless JWT auth (`jsonwebtoken`) in an httpOnly cookie (`JWT_SECRET` env var overrides the dev default) — chosen over session storage so auth works across independent serverless invocations with no shared session store
- `requireAuth` middleware guards all `/api/todos` routes — returns `401` if the cookie is missing/invalid
- Frontend sends `credentials: 'include'` on every request so the cookie is attached

**Per-user task isolation:**
- `todos` table has a `user_id` column referencing `users.id`
- Every todo query (`GET`, `POST`, `PATCH`, `DELETE`) is scoped with `WHERE user_id = $1` using the ID decoded from the JWT — a user can never read or modify another user's rows, even by guessing an `id`

**Auth API:**
- `POST /api/auth/signup` — `{ email, password }`, creates user, sets auth cookie
- `POST /api/auth/login` — `{ email, password }`, sets auth cookie
- `POST /api/auth/logout` — clears auth cookie
- `GET /api/auth/me` — returns current user or `401`

**Todo API (all require a valid auth cookie):**
- `GET /api/todos` — list the current user's todos
- `POST /api/todos` — `{ text }`
- `PATCH /api/todos/:id` — `{ completed }`
- `DELETE /api/todos/:id`

**Run locally:** see README.md.

**Deploy:** single Vercel project (static frontend + `/api` serverless function) backed by Vercel Postgres/Neon — see README.md for setup steps.
