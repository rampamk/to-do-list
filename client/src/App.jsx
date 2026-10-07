import { useEffect, useState } from 'react';
import { getTodos, addTodo, toggleTodo, deleteTodo, getMe, logout } from './api';
import AuthForm from './AuthForm.jsx';

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [todos, setTodos] = useState([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setCheckingAuth(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    getTodos().then(setTodos).catch((e) => setError(e.message));
  }, [user]);

  async function handleAdd(e) {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    try {
      const todo = await addTodo(value);
      setTodos((prev) => [todo, ...prev]);
      setText('');
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleToggle(todo) {
    try {
      const updated = await toggleTodo(todo.id, !todo.completed);
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDelete(id) {
    try {
      await deleteTodo(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleLogout() {
    await logout();
    setUser(null);
    setTodos([]);
  }

  if (checkingAuth) return null;
  if (!user) return <AuthForm onAuthed={setUser} />;

  return (
    <main className="app">
      <div className="header-row">
        <h1>To-Do</h1>
        <button className="logout" onClick={handleLogout}>
          Log out ({user.email})
        </button>
      </div>

      <form onSubmit={handleAdd} className="add-form">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What needs doing?"
        />
        <button type="submit">Add</button>
      </form>

      {error && <p className="error">{error}</p>}

      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className={todo.completed ? 'completed' : ''}>
            <label>
              <input
                type="checkbox"
                checked={!!todo.completed}
                onChange={() => handleToggle(todo)}
              />
              <span>{todo.text}</span>
            </label>
            <button className="delete" onClick={() => handleDelete(todo.id)}>
              ✕
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && <p className="empty">No todos yet.</p>}
    </main>
  );
}
