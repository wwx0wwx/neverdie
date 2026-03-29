import { Link } from 'react-router-dom';
import type { AgentNodeView } from '@neverdie/protocol';
import { formatAge, formatBytes, summarizeStatus } from '@neverdie/shared';
import { encodeNodeId } from '../lib';
import { StatusPill } from '../components/StatusPill';

interface NodeListPageProps {
  nodes: AgentNodeView[];
  removeAgent: (baseUrl: string) => void;
  refreshAll: () => Promise<void>;
  polling: boolean;
}

export function NodeListPage({ nodes, removeAgent, refreshAll, polling }: NodeListPageProps) {
  return (
    <div className="stack gap-lg">
      <section className="page-header">
        <div>
          <p className="eyebrow">Node list</p>
          <h2>受控节点</h2>
          <p className="muted">每个 panel 都独立轮询 agent，因此不同 panel 在不同时刻看到的值允许略有差异。</p>
        </div>
        <button onClick={() => void refreshAll()} disabled={polling}>
          {polling ? '轮询中…' : '立即刷新'}
        </button>
      </section>

      <div className="grid-list">
        {nodes.map((node) => {
          const status = node.latestStatus;
          return (
            <article className="card stack" key={node.controlPlane.baseUrl}>
              <div className="row between start">
                <div>
                  <h3>{node.identity?.name ?? node.controlPlane.displayName ?? node.controlPlane.baseUrl}</h3>
                  <p className="muted small">{node.controlPlane.baseUrl}</p>
                </div>
                <StatusPill stale={status?.stale} reachable={status?.agentReachable} />
              </div>

              <div className="compact-list muted small">
                <div>{node.region ? `${node.region.regionName} / ${node.region.regionCode}` : '区域信息未获取'}</div>
                <div>{node.hardware ? `${node.hardware.platform} ${node.hardware.arch}` : '硬件信息未获取'}</div>
                <div>{summarizeStatus(status)}</div>
              </div>

              {status ? (
                <div className="mini-stats">
                  <div>
                    <span>CPU</span>
                    <strong>{status.snapshot.cpuUsagePercent.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span>RAM</span>
                    <strong>{status.snapshot.ramUsagePercent.toFixed(1)}%</strong>
                  </div>
                  <div>
                    <span>Down</span>
                    <strong>{formatBytes(status.snapshot.downloadThroughput.bytesPerSecond)}/s</strong>
                  </div>
                  <div>
                    <span>Age</span>
                    <strong>{formatAge(status.snapshotAgeMs)}</strong>
                  </div>
                </div>
              ) : null}

              <div className="row between">
                <Link to={`/nodes/${encodeNodeId(node.controlPlane.baseUrl)}`}>查看详情</Link>
                <button className="button-secondary" onClick={() => removeAgent(node.controlPlane.baseUrl)}>
                  移除
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
