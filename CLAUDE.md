## Project Overview

A todo list application that uses SQlite database to store each user authentication [username and password]

# Rules
- Use SQlite for storing authentication password and username
- ask for user email and password
- Each user can see only their own task
- Each user can add,complete and delete their own to do task 
- User cannot see and alter another person to do list.

# Implementation

**Stack:** React + Vite (frontend), Node.js + Express (backend), SQLite via `better-sqlite3` (database).

**Structure:**
- `server/` — Express API
  - `db.js` — opens `todos.sqlite`, creates `users` and `todos` tables on startup
  - `index.js` — routes, session middleware, auth
- `client/` — React app (Vite)
  - `src/App.jsx` — checks session on load, shows `AuthForm` or the todo list
  - `src/AuthForm.jsx` — login/signup form
  - `src/api.js` — fetch wrapper for `/api/auth/*` and `/api/todos` endpoints

**Auth:**
- Passwords hashed with `bcryptjs`, stored in `users` table (`email UNIQUE`, `password_hash`)
- Session-based login via `express-session`, httpOnly cookie (`SESSION_SECRET` env var overrides the dev default)
- `requireAuth` middleware guards all `/api/todos` routes — returns `401` if no active session
- Frontend sends `credentials: 'include'` on every request so the session cookie is attached

**Per-user task isolation:**
- `todos` table has a `user_id` column referencing `users.id`
- Every todo query (`GET`, `POST`, `PATCH`, `DELETE`) is scoped with `WHERE user_id = ?` using the ID from `req.session.userId` — a user can never read or modify another user's rows, even by guessing an `id`

**Auth API:**
- `POST /api/auth/signup` — `{ email, password }`, creates user, starts session
- `POST /api/auth/login` — `{ email, password }`, starts session
- `POST /api/auth/logout` — destroys session
- `GET /api/auth/me` — returns current user or `401`

**Todo API (all require an active session):**
- `GET /api/todos` — list the current user's todos
- `POST /api/todos` — `{ text }`
- `PATCH /api/todos/:id` — `{ completed }`
- `DELETE /api/todos/:id`

**Run locally:**
```
cd server && npm install && npm start   # http://localhost:3001
cd client && npm install && npm run dev # http://localhost:5173 (proxies /api to :3001)
```
