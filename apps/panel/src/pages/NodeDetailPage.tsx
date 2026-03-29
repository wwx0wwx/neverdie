import { Link, useParams } from 'react-router-dom';
import type { AgentNodeView } from '@neverdie/protocol';
import { formatAge, formatBytes } from '@neverdie/shared';
import { MetricCard } from '../components/MetricCard';
import { StatusPill } from '../components/StatusPill';
import { decodeNodeId } from '../lib';

interface NodeDetailPageProps {
  nodes: AgentNodeView[];
  removeAgent: (baseUrl: string) => void;
  refreshAll: () => Promise<void>;
  polling: boolean;
}

export function NodeDetailPage({ nodes, removeAgent, refreshAll, polling }: NodeDetailPageProps) {
  const params = useParams();
  const baseUrl = params.base64Id ? decodeNodeId(params.base64Id) : '';
  const node = nodes.find((item) => item.controlPlane.baseUrl === baseUrl);

  if (!node) {
    return (
      <section className="card stack">
        <h2>节点不存在</h2>
        <Link to="/">返回列表</Link>
      </section>
    );
  }

  const snapshot = node.latestStatus?.snapshot;

  return (
    <div className="stack gap-lg">
      <section className="page-header">
        <div>
          <p className="eyebrow">Node detail</p>
          <h2>{node.identity?.name ?? node.controlPlane.baseUrl}</h2>
          <p className="muted">控制面元数据和实时快照是分离建模的：前者用于管理，后者表示最近一次采样值。</p>
        </div>
        <div className="row">
          <button onClick={() => void refreshAll()} disabled={polling}>
            {polling ? '轮询中…' : '立即刷新'}
          </button>
          <button className="button-secondary" onClick={() => removeAgent(node.controlPlane.baseUrl)}>
            移除节点
          </button>
        </div>
      </section>

      <section className="card stack">
        <div className="row between start">
          <div>
            <h3>控制面信息</h3>
            <p className="muted small">Base URL: {node.controlPlane.baseUrl}</p>
          </div>
          <StatusPill stale={node.latestStatus?.stale} reachable={node.latestStatus?.agentReachable} />
        </div>
        <div className="detail-grid muted small">
          <div>Agent ID：{node.identity?.agentId ?? '未获取'}</div>
          <div>版本：{node.identity?.version ?? '未获取'}</div>
          <div>启动时间：{node.identity?.startedAt ?? '未获取'}</div>
          <div>区域：{node.region ? `${node.region.regionName} (${node.region.regionCode})` : '未获取'}</div>
          <div>地区来源：{node.region?.source ?? '未获取'}</div>
          <div>主机名：{node.hardware?.hostname ?? '未获取'}</div>
        </div>
      </section>

      {snapshot ? (
        <>
          <section className="metrics-grid">
            <MetricCard label="CPU 使用率" value={`${snapshot.cpuUsagePercent.toFixed(1)}%`} hint="采样值" />
            <MetricCard label="RAM 使用率" value={`${snapshot.ramUsagePercent.toFixed(1)}%`} hint="采样值" />
            <MetricCard
              label="磁盘使用率"
              value={snapshot.diskUsagePercent === null ? '不可用' : `${snapshot.diskUsagePercent.toFixed(1)}%`}
              hint="主磁盘"
            />
            <MetricCard label="上传吞吐" value={`${formatBytes(snapshot.uploadThroughput.bytesPerSecond)}/s`} hint="瞬时速率" />
            <MetricCard label="下载吞吐" value={`${formatBytes(snapshot.downloadThroughput.bytesPerSecond)}/s`} hint="瞬时速率" />
            <MetricCard label="累计上传流量" value={formatBytes(snapshot.cumulativeTraffic.uploadedBytes)} hint="自安装以来" />
            <MetricCard label="累计下载流量" value={formatBytes(snapshot.cumulativeTraffic.downloadedBytes)} hint="自安装以来" />
            <MetricCard label="快照年龄" value={formatAge(node.latestStatus?.snapshotAgeMs ?? 0)} hint={snapshot.timestamp} />
          </section>

          <section className="card stack">
            <h3>硬件与网络</h3>
            <div className="detail-grid muted small">
              <div>系统：{node.hardware ? `${node.hardware.platform} / ${node.hardware.arch}` : '未获取'}</div>
              <div>CPU：{node.hardware ? `${node.hardware.cpu.model} (${node.hardware.cpu.cores} cores)` : '未获取'}</div>
              <div>内存总量：{node.hardware ? formatBytes(node.hardware.memory.totalBytes) : '未获取'}</div>
              <div>
                主磁盘：
                {node.hardware?.primaryDisk
                  ? `${node.hardware.primaryDisk.mount} (${formatBytes(node.hardware.primaryDisk.totalBytes)})`
                  : '未获取'}
              </div>
              <div className="span-2">
                网卡：
                {node.hardware?.networkInterfaces.length
                  ? node.hardware.networkInterfaces
                      .map((item) => `${item.name} [${item.addresses.join(', ') || 'no-ip'}]`)
                      .join(' · ')
                  : '未获取'}
              </div>
              <div className="span-2">轮询错误：{node.latestStatus?.error ?? '无'}</div>
            </div>
          </section>
        </>
      ) : (
        <section className="card stack">
          <h3>尚无快照</h3>
          <p className="muted">Panel 会在轮询成功后显示最近一次采样结果。</p>
        </section>
      )}

      <Link to="/">← 返回节点列表</Link>
    </div>
  );
}
