import { useEffect, useState } from 'react';
import type { PanelRecord, AgentKeyRecord } from '@neverdie/protocol';

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text);
}

export function AdminPage() {
  const [panels, setPanels] = useState<PanelRecord[]>([]);
  const [agentKeys, setAgentKeys] = useState<AgentKeyRecord[]>([]);
  const [panelName, setPanelName] = useState('');
  const [agentName, setAgentName] = useState('');
  const [newPanelCmd, setNewPanelCmd] = useState('');
  const [newAgentCmd, setNewAgentCmd] = useState('');

  useEffect(() => {
    void fetchPanels();
    void fetchAgentKeys();
  }, []);

  async function fetchPanels() {
    const res = await fetch('/api/admin/panels', { credentials: 'include' });
    if (res.ok) setPanels(await res.json());
  }

  async function fetchAgentKeys() {
    const res = await fetch('/api/admin/agent-keys', { credentials: 'include' });
    if (res.ok) setAgentKeys(await res.json());
  }

  async function addPanel() {
    const res = await fetch('/api/admin/panels', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ displayName: panelName }),
    });
    if (res.ok) {
      const body = await res.json();
      setNewPanelCmd(body.installCmd);
      setPanelName('');
      void fetchPanels();
    }
  }

  async function removePanel(id: string) {
    await fetch(`/api/admin/panels/${id}`, { method: 'DELETE', credentials: 'include' });
    void fetchPanels();
  }

  async function addAgentKey() {
    const res = await fetch('/api/admin/agent-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ displayName: agentName }),
    });
    if (res.ok) {
      const body = await res.json();
      setNewAgentCmd(body.installCmd);
      setAgentName('');
      void fetchAgentKeys();
    }
  }

  async function removeAgentKey(agentId: string) {
    await fetch(`/api/admin/agent-keys/${agentId}`, { method: 'DELETE', credentials: 'include' });
    void fetchAgentKeys();
  }

  return (
    <div className="admin-page stack">
      <h1>管理面板</h1>

      <section className="card stack">
        <h2>主控节点（Panel Peers）</h2>
        <div className="row">
          <input
            placeholder="显示名称（可选）"
            value={panelName}
            onChange={e => setPanelName(e.target.value)}
          />
          <button onClick={() => void addPanel()}>生成加入命令</button>
        </div>
        {newPanelCmd && (
          <div className="cmd-box">
            <code>{newPanelCmd}</code>
            <button onClick={() => copyToClipboard(newPanelCmd)}>复制</button>
          </div>
        )}
        <ul className="compact-list">
          {panels.map(p => (
            <li key={p.id} className="row">
              <span>{p.displayName ?? p.id}</span>
              <span className="muted">{p.domain}</span>
              <button onClick={() => void removePanel(p.id)}>移除</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="card stack">
        <h2>被控节点（Agent Keys）</h2>
        <div className="row">
          <input
            placeholder="显示名称（可选）"
            value={agentName}
            onChange={e => setAgentName(e.target.value)}
          />
          <button onClick={() => void addAgentKey()}>生成安装命令</button>
        </div>
        {newAgentCmd && (
          <div className="cmd-box">
            <code>{newAgentCmd}</code>
            <button onClick={() => copyToClipboard(newAgentCmd)}>复制</button>
          </div>
        )}
        <ul className="compact-list">
          {agentKeys.map(k => (
            <li key={k.agentId} className="row">
              <span>{k.displayName ?? k.agentId}</span>
              <span className="muted">{k.baseUrl ?? '未连接'}</span>
              <button onClick={() => void removeAgentKey(k.agentId)}>移除</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
