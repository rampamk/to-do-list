const express = require('express');
const cors = require('cors');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const db = require('./db');

const app = express();
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 },
  })
);

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'not authenticated' });
  next();
}

// --- Auth routes ---

app.post('/api/auth/signup', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) return res.status(409).json({ error: 'email already registered' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const { lastInsertRowid } = db
    .prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)')
    .run(email, passwordHash);

  req.session.userId = lastInsertRowid;
  res.status(201).json({ id: lastInsertRowid, email });
});

app.post('/api/auth/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid email or password' });
  }

  req.session.userId = user.id;
  res.json({ id: user.id, email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => res.status(204).end());
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'not authenticated' });
  const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'not authenticated' });
  res.json(user);
});

// --- Todo routes (scoped to the logged-in user) ---

app.get('/api/todos', requireAuth, (req, res) => {
  const todos = db
    .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY id DESC')
    .all(req.session.userId);
  res.json(todos);
});

app.post('/api/todos', requireAuth, (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  const { lastInsertRowid } = db
    .prepare('INSERT INTO todos (user_id, text) VALUES (?, ?)')
    .run(req.session.userId, text);
  const todo = db.prepare('SELECT * FROM todos WHERE id = ?').get(lastInsertRowid);
  res.status(201).json(todo);
});

app.patch('/api/todos/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const existing = db
    .prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?')
    .get(id, req.session.userId);
  if (!existing) return res.status(404).json({ error: 'not found' });

  const completed = req.body.completed !== undefined ? (req.body.completed ? 1 : 0) : existing.completed;
  db.prepare('UPDATE todos SET completed = ? WHERE id = ?').run(completed, id);
  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(id));
});

app.delete('/api/todos/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const result = db
    .prepare('DELETE FROM todos WHERE id = ? AND user_id = ?')
    .run(id, req.session.userId);
  if (result.changes === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Todo API listening on http://localhost:${PORT}`);
});
