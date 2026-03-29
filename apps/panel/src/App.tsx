import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import type { AgentControlPlaneRecord } from '@neverdie/protocol';
import { Layout } from './components/Layout';
import { NodeDetailPage } from './pages/NodeDetailPage';
import { NodeListPage } from './pages/NodeListPage';
import { SetupPage } from './pages/SetupPage';
import { LoginPage } from './pages/LoginPage';
import { AdminPage } from './pages/AdminPage';
import { useAgentPolling } from './useAgentPolling';
import { addAgentToStore, fetchAgents, removeAgentFromStore } from './lib';

type AuthState = 'loading' | 'setup' | 'login' | 'ok';

function ProtectedApp() {
  const [agents, setAgents] = useState<AgentControlPlaneRecord[]>([]);
  const [draftUrl, setDraftUrl] = useState('');
  const [draftName, setDraftName] = useState('');
  const [currentUser, setCurrentUser] = useState('');
  const pollIntervalMs = Number(import.meta.env.VITE_POLL_INTERVAL_MS ?? 5000);
  const staleAfterMs = Number(import.meta.env.VITE_STALE_AFTER_MS ?? 15000);
  const state = useAgentPolling(agents, pollIntervalMs, staleAfterMs);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(b => setCurrentUser(b.username ?? ''))
      .catch(() => {});
    fetchAgents()
      .then(setAgents)
      .catch(() => {});
  }, []);

  const sortedNodes = useMemo(
    () =>
      [...state.nodes].sort((a, b) =>
        (a.controlPlane.displayName ?? a.controlPlane.baseUrl).localeCompare(
          b.controlPlane.displayName ?? b.controlPlane.baseUrl,
        ),
      ),
    [state.nodes],
  );

  async function addAgent() {
    const baseUrl = draftUrl.trim();
    if (!baseUrl || agents.some((item) => item.baseUrl === baseUrl)) return;
    await addAgentToStore(baseUrl, draftName.trim() || undefined);
    setAgents((current) => [
      ...current,
      { baseUrl, displayName: draftName.trim() || undefined, enabled: true },
    ]);
    setDraftUrl('');
    setDraftName('');
  }

  async function removeAgent(baseUrl: string) {
    await removeAgentFromStore(baseUrl);
    setAgents((current) => current.filter((item) => item.baseUrl !== baseUrl));
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    navigate('/login');
  }

  return (
    <Layout
      draftUrl={draftUrl}
      setDraftUrl={setDraftUrl}
      draftName={draftName}
      setDraftName={setDraftName}
      addAgent={() => void addAgent()}
      pollIntervalMs={pollIntervalMs}
      staleAfterMs={staleAfterMs}
      nodeCount={sortedNodes.length}
      currentUser={currentUser}
      onLogout={() => void logout()}
    >
      <Routes>
        <Route
          path="/"
          element={
            <NodeListPage
              nodes={sortedNodes}
              removeAgent={(url) => void removeAgent(url)}
              refreshAll={state.refreshAll}
              polling={state.polling}
            />
          }
        />
        <Route
          path="/nodes/:base64Id"
          element={
            <NodeDetailPage
              nodes={sortedNodes}
              removeAgent={(url) => void removeAgent(url)}
              refreshAll={state.refreshAll}
              polling={state.polling}
            />
          }
        />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('loading');

  useEffect(() => {
    fetch('/api/auth/status')
      .then(r => r.json())
      .then(b => {
        if (b.needsSetup) { setAuthState('setup'); return; }
        return fetch('/api/auth/me', { credentials: 'include' })
          .then(r => setAuthState(r.ok ? 'ok' : 'login'));
      })
      .catch(() => setAuthState('login'));
  }, []);

  if (authState === 'loading') return null;

  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />
      {authState === 'setup' && <Route path="*" element={<Navigate to="/setup" replace />} />}
      {authState === 'login' && <Route path="*" element={<Navigate to="/login" replace />} />}
      {authState === 'ok' && <Route path="*" element={<ProtectedApp />} />}
    </Routes>
  );
}
