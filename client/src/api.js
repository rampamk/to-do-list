const TODOS_BASE = '/api/todos';
const AUTH_BASE = '/api/auth';

async function request(url, options) {
  const res = await fetch(url, { credentials: 'include', ...options });
  if (!res.ok && res.status !== 204) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || `Request failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.status === 204 ? null : res.json();
}

function withJson(options) {
  return {
    ...options,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options.body),
  };
}

// --- Auth ---

export function signup(email, password) {
  return request(`${AUTH_BASE}/signup`, withJson({ method: 'POST', body: { email, password } }));
}

export function login(email, password) {
  return request(`${AUTH_BASE}/login`, withJson({ method: 'POST', body: { email, password } }));
}

export function logout() {
  return request(`${AUTH_BASE}/logout`, { method: 'POST' });
}

export function getMe() {
  return request(`${AUTH_BASE}/me`);
}

// --- Todos ---

export function getTodos() {
  return request(TODOS_BASE);
}

export function addTodo(text) {
  return request(TODOS_BASE, withJson({ method: 'POST', body: { text } }));
}

export function toggleTodo(id, completed) {
  return request(`${TODOS_BASE}/${id}`, withJson({ method: 'PATCH', body: { completed } }));
}

export function deleteTodo(id) {
  return request(`${TODOS_BASE}/${id}`, { method: 'DELETE' });
}
