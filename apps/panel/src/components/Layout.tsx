import type { PropsWithChildren } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps extends PropsWithChildren {
  draftUrl: string;
  setDraftUrl: (value: string) => void;
  draftName: string;
  setDraftName: (value: string) => void;
  addAgent: () => void;
  pollIntervalMs: number;
  staleAfterMs: number;
  nodeCount: number;
  currentUser?: string;
  onLogout?: () => void;
}

export function Layout({
  children,
  draftUrl,
  setDraftUrl,
  draftName,
  setDraftName,
  addAgent,
  pollIntervalMs,
  staleAfterMs,
  nodeCount,
  currentUser,
  onLogout,
}: LayoutProps) {
  const location = useLocation();

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Enter') addAgent();
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">NEVERDIE</p>
          <h1>控制面板</h1>
          <p className="muted">
            Panel 主动轮询 Agent 获取采样快照。多 Panel 实例共享节点配置，各自独立拉取指标。
          </p>
        </div>

        <div className="card stack">
          <h2>连接 Agent</h2>
          <label className="field">
            <span>Agent Base URL</span>
            <input
              value={draftUrl}
              onChange={(event) => setDraftUrl(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="http://127.0.0.1:43110"
            />
          </label>
          <label className="field">
            <span>显示名称（可选）</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="my-vps-01"
            />
          </label>
          <button onClick={addAgent}>添加节点</button>
        </div>

        <div className="card stack compact-list">
          <div>
            <strong>{nodeCount}</strong> 个节点
          </div>
          <div>轮询周期：{pollIntervalMs} ms</div>
          <div>过期阈值：{staleAfterMs} ms</div>
        </div>

        <div className="card stack compact-list">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>监控面板</Link>
          <Link to="/admin" className={location.pathname === '/admin' ? 'active' : ''}>系统管理</Link>
          {currentUser && (
            <div className="row">
              <span className="muted">{currentUser}</span>
              <button onClick={onLogout}>退出</button>
            </div>
          )}
        </div>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
