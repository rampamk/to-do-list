const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool, ready } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'token';

const app = express();
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Vercel serverless functions may cold-start before the schema is ready.
app.use(async (req, res, next) => {
  try {
    await ready;
    next();
  } catch (err) {
    res.status(500).json({ error: 'database unavailable' });
  }
});

function setAuthCookie(res, userId) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

function requireAuth(req, res, next) {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'not authenticated' });
  try {
    req.userId = jwt.verify(token, JWT_SECRET).userId;
    next();
  } catch {
    res.status(401).json({ error: 'not authenticated' });
  }
}

// --- Auth routes ---

app.post('/api/auth/signup', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'password must be at least 6 characters' });

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length) return res.status(409).json({ error: 'email already registered' });

  const passwordHash = bcrypt.hashSync(password, 10);
  const { rows } = await pool.query(
    'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
    [email, passwordHash]
  );

  setAuthCookie(res, rows[0].id);
  res.status(201).json(rows[0]);
});

app.post('/api/auth/login', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'invalid email or password' });
  }

  setAuthCookie(res, user.id);
  res.json({ id: user.id, email: user.email });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME);
  res.status(204).end();
});

app.get('/api/auth/me', async (req, res) => {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ error: 'not authenticated' });
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query('SELECT id, email FROM users WHERE id = $1', [userId]);
    if (!rows[0]) return res.status(401).json({ error: 'not authenticated' });
    res.json(rows[0]);
  } catch {
    res.status(401).json({ error: 'not authenticated' });
  }
});

// --- Todo routes (scoped to the logged-in user) ---

app.get('/api/todos', requireAuth, async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM todos WHERE user_id = $1 ORDER BY id DESC', [
    req.userId,
  ]);
  res.json(rows);
});

app.post('/api/todos', requireAuth, async (req, res) => {
  const text = (req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'text is required' });

  const { rows } = await pool.query(
    'INSERT INTO todos (user_id, text) VALUES ($1, $2) RETURNING *',
    [req.userId, text]
  );
  res.status(201).json(rows[0]);
});

app.patch('/api/todos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const existing = await pool.query('SELECT * FROM todos WHERE id = $1 AND user_id = $2', [
    id,
    req.userId,
  ]);
  if (!existing.rows[0]) return res.status(404).json({ error: 'not found' });

  const completed =
    req.body.completed !== undefined ? !!req.body.completed : existing.rows[0].completed;
  const { rows } = await pool.query('UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *', [
    completed,
    id,
  ]);
  res.json(rows[0]);
});

app.delete('/api/todos/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const result = await pool.query('DELETE FROM todos WHERE id = $1 AND user_id = $2', [
    id,
    req.userId,
  ]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'not found' });
  res.status(204).end();
});

module.exports = app;
