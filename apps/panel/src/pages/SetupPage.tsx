import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function SetupPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const res = await fetch('/api/auth/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    });
    if (res.ok) {
      navigate('/');
    } else {
      const body = await res.json().catch(() => ({}));
      setError((body as any).error ?? '初始化失败');
    }
  }

  return (
    <div className="auth-page">
      <form className="card stack" onSubmit={handleSubmit}>
        <p className="eyebrow">NEVERDIE</p>
        <h1>初始化管理员</h1>
        <p className="muted">首次使用，请创建管理员账户。</p>
        <label className="field">
          <span>用户名</span>
          <input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
        </label>
        <label className="field">
          <span>密码（至少 8 位）</span>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
        </label>
        {error && <p className="error-text">{error}</p>}
        <button type="submit">创建账户</button>
      </form>
    </div>
  );
}
