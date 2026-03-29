import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      navigate('/');
    } else {
      const body = await res.json().catch(() => ({}));
      setError((body as any).error ?? '登录失败');
    }
  }

  return (
    <div className="auth-page">
      <form className="card stack" onSubmit={handleSubmit}>
        <p className="eyebrow">NEVERDIE</p>
        <h1>登录</h1>
        <label className="field">
          <span>用户名</span>
          <input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>密码</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit">登录</button>
      </form>
    </div>
  );
}
