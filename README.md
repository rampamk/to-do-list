# To-Do List

Minimal fullstack to-do app: React (Vite) frontend, Express backend, Postgres database, JWT cookie auth. Deployable as a single Vercel project (static frontend + `/api` serverless function).

## Run locally

Requires a local Postgres database. Create one and note its connection string.

In one terminal:

```
cd server
npm install
DATABASE_URL="postgres://localhost:5432/todoapp" JWT_SECRET="dev-secret" npm start
```

Runs the API on http://localhost:3001 (creates `users`/`todos` tables automatically).

In another terminal:

```
cd client
npm install
npm run dev
```

Opens the app on http://localhost:5173 (proxies `/api` requests to the backend).

## Deploy to Vercel

1. Push this repo to GitHub (already done) and import it in the Vercel dashboard as a single project (not split into separate client/server projects — `vercel.json` at the repo root handles both).
2. Add a Postgres database (Vercel Postgres, powered by Neon, from the Storage tab) and connect it to the project — this sets the `POSTGRES_URL` env var automatically.
3. Add a `JWT_SECRET` environment variable (any long random string).
4. Deploy. Vercel runs `vercel.json`'s `installCommand`/`buildCommand` to build the client and deploys `/api` as a serverless function running the same Express app.

No `CLIENT_ORIGIN` env var is needed in production since the frontend and API are served from the same domain.
