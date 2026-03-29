# NeverDie 高可用 VPS 监控探针系统 - 完整需求文档

**版本**: v1.0.0
**日期**: 2026-03-29
**目标**: 一次性完成整个高可用探针系统，交付生产可用的 MVP

---

## 一、项目概述

### 1.1 项目愿景

NeverDie 是一个**高可用方向的 VPS 监控探针系统**，用于监控多台 VPS 的健康状态、资源使用和网络状况。系统采用 **Panel 主动拉取 Agent 快照** 的架构，支持多 Panel 并发监控，为用户提供可靠的节点状态可视化。

### 1.2 核心价值

- **高可用监控**: 实时监控 VPS 节点的 CPU、内存、磁盘、网络等关键指标
- **轻量级 Agent**: Agent 只暴露 HTTP 接口，无需主动上报，部署简单
- **多节点管理**: Panel 支持管理多个 Agent，统一查看节点状态
- **采样模型**: 明确的采样快照语义，避免误导性的"实时一致"承诺
- **生产可用**: 完整的错误处理、状态展示、配置管理

### 1.3 技术栈

- **Agent**: Node.js + Fastify + systeminformation
- **Panel**: React + Vite + TypeScript + Tailwind CSS
- **Protocol**: TypeScript 共享类型定义
- **包管理**: pnpm monorepo

---

## 二、当前状态

### 2.1 已完成

- ✅ Monorepo 架构搭建 (pnpm workspace)
- ✅ Protocol 包定义了核心数据类型
- ✅ Agent 实现了基本的指标采集和 HTTP API
- ✅ Panel 实现了基本的轮询、节点列表和详情页
- ✅ 基础的 UI 组件 (StatusPill, MetricCard, Layout)

### 2.2 待完善

**Agent 端**:
- ⚠️ 硬件信息只在 `/v1/agent/summary` 中获取，缺少独立的 `/hardware` 端点实现
- ⚠️ 网络流量统计仅取第一块网卡，不支持多网卡
- ⚠️ 缺少配置验证和环境变量文档
- ⚠️ 缺少日志配置和运行状态接口

**Panel 端**:
- ⚠️ UI 缺少完善的响应式设计
- ⚠️ 缺少节点分组和标签过滤
- ⚠️ 缺少历史数据展示（即使只是简单的内存缓存）
- ⚠️ 缺少告警阈值配置
- ⚠️ 缺少深色模式支持
- ⚠️ 节点配置无法持久化（刷新丢失）
- ⚠️ 缺少批量操作（全选、批量删除等）
- ⚠️ 详情页信息展示不够丰富

**系统级**:
- ⚠️ 缺少完整的错误处理和边界情况
- ⚠️ 缺少单元测试
- ⚠️ 缺少 Docker 部署配置
- ⚠️ 缺少生产环境配置示例

---

## 三、完整需求清单

### 3.1 Agent 需求

#### 3.1.1 核心功能

**P0 - 必须完成**:

1. **完整的 HTTP API**
   - `GET /health` - 健康检查，返回 `{ status: "ok", staleAfterMs, uptime }`
   - `GET /identity` - Agent 身份信息
   - `GET /hardware` - 硬件元数据（CPU、内存、磁盘、网卡）
   - `GET /region` - 区域信息
   - `GET /metrics` - 实时指标快照
   - `GET /v1/agent/summary` - 汇总信息（包含以上所有）

2. **多网卡支持**
   - 网络流量统计支持聚合所有非回环网卡
   - 每块网卡独立统计，提供总吞吐和分网卡详情
   - 环境变量配置主网卡或聚合模式

3. **配置管理**
   - 支持环境变量配置：
     - `AGENT_PORT` - 监听端口（默认 43110）
     - `AGENT_NAME` - Agent 名称（默认 hostname）
     - `AGENT_REGION_CODE` - 区域代码
     - `AGENT_REGION_NAME` - 区域名称
     - `AGENT_CITY` - 城市
     - `AGENT_COUNTRY` - 国家
     - `STALE_AFTER_MS` - 快照过期时间（默认 15000）
     - `LOG_LEVEL` - 日志级别（默认 info）
     - `NETWORK_MODE` - 网络统计模式（single/aggregated，默认 single）
     - `PRIMARY_INTERFACE` - 主网卡名称（single 模式使用）
   - 提供完整的 `.env.example`

4. **错误处理**
   - systeminformation 调用失败时返回优雅降级值
   - 缺少网卡数据时返回 null 而非崩溃
   - API 错误统一返回 `{ ok: false, error: string, servedAt: string }`

**P1 - 应该完成**:

5. **运行状态接口**
   - `GET /status` - 返回运行时长、启动时间、配置摘要
   - 包含 systeminformation 版本和 Node.js 版本

6. **日志增强**
   - 结构化日志（包含 agentId、timestamp）
   - 请求日志（可选开启）
   - 指标采集耗时日志

#### 3.1.2 非功能需求

- **性能**: 单次 `/v1/agent/summary` 响应时间 < 100ms
- **可靠性**: Agent 进程稳定运行，无内存泄漏
- **安全**: CORS 可配置，默认允许本地开发

---

### 3.2 Panel 需求

#### 3.2.1 核心功能

**P0 - 必须完成**:

1. **节点管理**
   - 添加节点：输入 Agent URL，支持自定义名称
   - 删除节点：单个删除，带确认
   - 节点列表：卡片或表格展示
   - 批量操作：全选、批量删除

2. **节点状态展示**
   - **列表页**:
     - 节点名称、URL、状态指示器（online/offline/stale）
     - CPU/内存/磁盘使用率（进度条）
     - 网络吞吐（上传/下载）
     - 最后更新时间
     - 快速刷新按钮
   - **详情页**:
     - 完整的硬件信息（CPU 型号、核心数、内存大小、磁盘信息）
     - 所有网卡信息（名称、IP、MAC）
     - 区域信息
     - 完整的实时指标
     - 累计流量统计

3. **配置持久化**
   - 节点配置保存到 localStorage
   - 支持导出/导入配置（JSON 文件）
   - 环境变量 `VITE_DEFAULT_AGENTS` 作为初始配置

4. **轮询机制**
   - 可配置轮询间隔（环境变量 `POLL_INTERVAL_MS`，默认 5000）
   - 可配置过期时间（`STALE_AFTER_MS`，默认 15000）
   - 手动刷新按钮
   - 刷新状态指示器

5. **状态判断**
   - **online**: 最近一次轮询成功，且快照年龄 < staleAfterMs
   - **stale**: 最近一次轮询成功，但快照年龄 >= staleAfterMs
   - **offline**: 最近一次轮询失败
   - 使用颜色编码：绿色(online)、黄色(stale)、红色(offline)

**P1 - 应该完成**:

6. **分组和标签**
   - 节点支持添加标签（如：production, staging, us-west）
   - 按标签筛选节点
   - 标签颜色区分

7. **历史数据**
   - 内存中保留最近 60 个快照（约 5 分钟）
   - 详情页展示简单的趋势图（sparkline）
   - 展示最近 1 分钟的 avg/min/max

8. **响应式设计**
   - 支持移动端访问
   - 列表页在小屏幕上简化展示

9. **深色模式**
   - 跟随系统偏好
   - 手动切换开关

#### 3.2.2 非功能需求

- **性能**: 支持 100+ 节点同时监控，UI 不卡顿
- **用户体验**: 
  - 加载状态明确
  - 错误信息友好
  - 操作有反馈
- **可访问性**: 语义化 HTML，键盘可导航

---

### 3.3 Protocol 需求

**P0 - 必须完成**:

1. **完善类型定义**
   - 添加 `AgentStatus` 枚举（online/offline/stale）
   - 添加 `NetworkStatsMode` 类型
   - 添加 `MultiInterfaceTraffic` 类型
   - 添加 `AgentConfig` 类型（配置摘要）
   - 添加 `AgentRuntimeStatus` 类型

2. **类型导出**
   - 所有类型从 `@neverdie/protocol` 导出
   - 类型注释完整

---

### 3.4 Shared 需求

**P0 - 必须完成**:

1. **工具函数**
   - `toApiSuccess(data)` - 包装成功响应
   - `toApiError(message)` - 包装错误响应
   - `clampPercent(value)` - 百分比 clamp 到 [0, 100]
   - `formatBytes(bytes, decimals?)` - 格式化字节
   - `formatThroughput(bytesPerSecond)` - 格式化吞吐
   - `getStatusLevel(status)` - 返回状态颜色/样式
   - `buildAgentRecord(baseUrl, displayName?, tags?)` - 构建节点记录

---

### 3.5 部署需求

**P1 - 应该完成**:

1. **Docker 支持**
   - `apps/agent/Dockerfile`
   - `apps/panel/Dockerfile`（多阶段构建，nginx 部署）
   - `docker-compose.yml`（本地开发 + 生产部署示例）
   - 环境变量文档

2. **生产配置**
   - Agent 生产启动脚本
   - Panel 生产构建脚本
   - nginx 配置示例（反向代理 Panel）

---

### 3.6 文档需求

**P0 - 必须完成**:

1. **README.md**
   - 项目简介
   - 快速开始
   - 配置说明
   - API 文档
   - 架构说明

2. **API 文档**
   - `docs/api.md` - 完整的 API 文档
   - 包含所有端点的请求/响应示例

3. **部署文档**
   - `docs/deployment.md` - Docker 部署指南
   - 环境变量完整列表

---

## 四、技术架构

### 4.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                          Panel (Web UI)                         │
│                     http://localhost:41730                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │  NodeList   │  │ NodeDetail  │  │   Config (localStorage) │ │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘ │
│                              │                                   │
│                    HTTP Poll (every 5s)                         │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐   ┌─────────┐   ┌─────────┐
   │ Agent 1 │   │ Agent 2 │   │ Agent N │
   │ :43110  │   │ :43111  │   │ :4311N  │
   └─────────┘   └─────────┘   └─────────┘
        │              │              │
        └──────────────┴──────────────┘
                       │
              systeminformation
              (OS metrics collection)
```

### 4.2 数据流

```
1. Panel 定时轮询 Agent 的 /v1/agent/summary
2. Agent 收集系统指标（CPU、内存、磁盘、网络）
3. Agent 返回快照数据（带时间戳）
4. Panel 判断状态（online/stale/offline）
5. Panel 更新 UI
```

### 4.3 目录结构

```
neverdie/
├── apps/
│   ├── agent/               # Agent 服务
│   │   ├── src/
│   │   │   └── index.ts     # 主入口
│   │   ├── Dockerfile
│   │   ├── .env.example
│   │   └── package.json
│   └── panel/               # Panel Web UI
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── lib.ts
│       │   ├── useAgentPolling.ts
│       │   ├── components/
│       │   │   ├── Layout.tsx
│       │   │   ├── StatusPill.tsx
│       │   │   ├── MetricCard.tsx
│       │   │   ├── NodeCard.tsx      # 新增
│       │   │   ├── TrendSparkline.tsx # 新增
│       │   │   └── ConfigModal.tsx    # 新增
│       │   └── pages/
│       │       ├── NodeListPage.tsx
│       │       └── NodeDetailPage.tsx
│       ├── Dockerfile
│       ├── .env.example
│       ├── vite.config.ts
│       └── package.json
├── packages/
│   ├── protocol/            # 共享类型
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   └── shared/              # 共享工具
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── docs/
│   ├── api.md
│   ├── architecture.md
│   ├── deployment.md
│   └── protocol.md
├── docker-compose.yml
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── package.json
└── README.md
```

---

## 五、实现细节

### 5.1 Agent 实现要点

#### 5.1.1 多网卡支持

```typescript
// 新增类型
interface NetworkTrafficStats {
  interfaces: {
    name: string;
    uploadBytesPerSecond: number;
    downloadBytesPerSecond: number;
    uploadedBytes: number;
    downloadedBytes: number;
  }[];
  aggregated: {
    uploadBytesPerSecond: number;
    downloadBytesPerSecond: number;
    uploadedBytes: number;
    downloadedBytes: number;
  };
}

// 实现
async function getNetworkStats(): Promise<NetworkTrafficStats> {
  const networkStats = await si.networkStats();
  const interfaces = networkStats
    .filter(n => !n.iface.startsWith('lo')) // 排除回环
    .map(n => ({
      name: n.iface,
      uploadBytesPerSecond: n.tx_sec,
      downloadBytesPerSecond: n.rx_sec,
      uploadedBytes: n.tx_bytes,
      downloadedBytes: n.rx_bytes,
    }));

  const aggregated = interfaces.reduce((acc, n) => ({
    uploadBytesPerSecond: acc.uploadBytesPerSecond + n.uploadBytesPerSecond,
    downloadBytesPerSecond: acc.downloadBytesPerSecond + n.downloadBytesPerSecond,
    uploadedBytes: acc.uploadedBytes + n.uploadedBytes,
    downloadedBytes: acc.downloadedBytes + n.downloadedBytes,
  }), { uploadBytesPerSecond: 0, downloadBytesPerSecond: 0, uploadedBytes: 0, downloadedBytes: 0 });

  return { interfaces, aggregated };
}
```

#### 5.1.2 配置验证

```typescript
interface AgentConfig {
  port: number;
  name: string;
  regionCode: string;
  regionName: string;
  staleAfterMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  networkMode: 'single' | 'aggregated';
  primaryInterface?: string;
}

function loadConfig(): AgentConfig {
  return {
    port: Number(process.env.AGENT_PORT ?? 43110),
    name: process.env.AGENT_NAME ?? os.hostname(),
    // ... 其他配置
  };
}
```

#### 5.1.3 错误处理

```typescript
async function safeGetSnapshot(): Promise<MetricsSnapshot> {
  try {
    const [currentLoad, mem, fsSize, networkStats] = await Promise.all([
      si.currentLoad().catch(() => ({ currentLoad: 0 })),
      si.mem().catch(() => ({ total: 1, used: 0 })),
      si.fsSize().catch(() => []),
      si.networkStats().catch(() => []),
    ]);
    // ... 构建 snapshot
  } catch (error) {
    // 返回最小可用快照
    return {
      timestamp: new Date().toISOString(),
      cpuUsagePercent: 0,
      ramUsagePercent: 0,
      diskUsagePercent: null,
      // ...
    };
  }
}
```

### 5.2 Panel 实现要点

#### 5.2.1 配置持久化

```typescript
// lib.ts
const STORAGE_KEY = 'neverdie-agents';

export function loadAgents(): AgentControlPlaneRecord[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  
  // 回退到环境变量
  return parseDefaultAgents(import.meta.env.VITE_DEFAULT_AGENTS);
}

export function saveAgents(agents: AgentControlPlaneRecord[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(agents));
}

export function exportConfig(agents: AgentControlPlaneRecord[]): string {
  return JSON.stringify(agents, null, 2);
}

export function importConfig(json: string): AgentControlPlaneRecord[] {
  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed)) throw new Error('Invalid config');
  return parsed;
}
```

#### 5.2.2 状态判断

```typescript
// shared/src/index.ts
export type AgentStatus = 'online' | 'stale' | 'offline';

export function getAgentStatus(
  latestStatus?: AgentStatusRecord,
  staleAfterMs: number
): AgentStatus {
  if (!latestStatus) return 'offline';
  if (!latestStatus.agentReachable) return 'offline';
  if (latestStatus.stale) return 'stale';
  return 'online';
}

export function getStatusColor(status: AgentStatus): string {
  switch (status) {
    case 'online': return 'green';
    case 'stale': return 'yellow';
    case 'offline': return 'red';
  }
}
```

#### 5.2.3 历史数据（可选）

```typescript
// useAgentHistory.ts
interface HistoryPoint {
  timestamp: string;
  cpuUsagePercent: number;
  ramUsagePercent: number;
  diskUsagePercent: number | null;
}

const MAX_HISTORY = 60; // ~5 minutes at 5s interval

export function useAgentHistory(baseUrl: string) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  
  useEffect(() => {
    // 监听轮询结果，追加到历史
  }, [baseUrl]);
  
  return history;
}
```

#### 5.2.4 深色模式

```typescript
// useTheme.ts
export function useTheme() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateTheme = () => {
      const isDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      document.documentElement.classList.toggle('dark', isDark);
    };
    updateTheme();
    mediaQuery.addEventListener('change', updateTheme);
    return () => mediaQuery.removeEventListener('change', updateTheme);
  }, [theme]);
  
  return { theme, setTheme };
}
```

### 5.3 Protocol 扩展

```typescript
// 新增类型
export type AgentStatus = 'online' | 'stale' | 'offline';

export interface NetworkInterfaceTraffic {
  name: string;
  uploadBytesPerSecond: number;
  downloadBytesPerSecond: number;
  uploadedBytes: number;
  downloadedBytes: number;
}

export interface NetworkTrafficStats {
  interfaces: NetworkInterfaceTraffic[];
  aggregated: {
    uploadBytesPerSecond: number;
    downloadBytesPerSecond: number;
    uploadedBytes: number;
    downloadedBytes: number;
  };
}

export interface AgentConfig {
  port: number;
  name: string;
  regionCode: string;
  regionName: string;
  staleAfterMs: number;
  logLevel: string;
  networkMode: 'single' | 'aggregated';
}

export interface AgentRuntimeStatus {
  uptime: number;
  startedAt: TimestampIsoString;
  nodeVersion: string;
  platform: string;
  config: AgentConfig;
}
```

---

## 六、验收标准

### 6.1 功能验收

#### Agent

- [ ] 所有 API 端点正常工作
- [ ] 多网卡流量统计正确
- [ ] 配置通过环境变量正确加载
- [ ] 错误情况优雅降级
- [ ] `/v1/agent/summary` 响应时间 < 100ms

#### Panel

- [ ] 节点列表正确显示所有节点
- [ ] 状态判断准确（online/stale/offline）
- [ ] 节点详情页显示完整信息
- [ ] 配置持久化到 localStorage
- [ ] 刷新页面后节点配置保留
- [ ] 支持添加/删除节点
- [ ] 手动刷新功能正常
- [ ] 响应式设计（移动端可用）

#### 系统

- [ ] `pnpm build` 成功
- [ ] `pnpm check` 成功
- [ ] Docker 构建成功
- [ ] 文档完整

### 6.2 测试场景

1. **正常流程**
   - 启动 Agent
   - 启动 Panel
   - 添加 Agent URL
   - 查看节点状态
   - 查看节点详情

2. **异常处理**
   - Agent 未启动时显示 offline
   - Agent 重启后恢复 online
   - 网络延迟导致 stale

3. **边界情况**
   - Panel 刷新后节点保留
   - 添加重复 URL 被拒绝
   - 删除确认防止误操作

---

## 七、实现顺序建议

### Phase 1: 核心完善（必须完成）

1. **Agent 多网卡支持**
2. **Panel 配置持久化**
3. **状态判断逻辑完善**
4. **错误处理增强**

### Phase 2: 用户体验（应该完成）

5. **详情页信息完善**
6. **响应式设计**
7. **批量操作**
8. **深色模式**

### Phase 3: 生产就绪（建议完成）

9. **Docker 配置**
10. **文档完善**
11. **性能优化**

---

## 八、附录

### 8.1 环境变量完整列表

#### Agent

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `AGENT_PORT` | number | 43110 | 监听端口 |
| `AGENT_NAME` | string | hostname | Agent 名称 |
| `AGENT_REGION_CODE` | string | 'local' | 区域代码 |
| `AGENT_REGION_NAME` | string | 'Local' | 区域名称 |
| `AGENT_CITY` | string | - | 城市 |
| `AGENT_COUNTRY` | string | - | 国家 |
| `STALE_AFTER_MS` | number | 15000 | 快照过期时间(ms) |
| `LOG_LEVEL` | string | 'info' | 日志级别 |
| `NETWORK_MODE` | string | 'single' | 网络统计模式 |
| `PRIMARY_INTERFACE` | string | - | 主网卡名称 |

#### Panel

| 变量名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `VITE_DEFAULT_AGENTS` | string | - | 初始 Agent URL 列表（逗号分隔） |
| `POLL_INTERVAL_MS` | number | 5000 | 轮询间隔(ms) |
| `STALE_AFTER_MS` | number | 15000 | 快照过期时间(ms) |
| `PANEL_PORT` | number | 41730 | 开发服务器端口 |

### 8.2 API 文档摘要

#### `GET /health`

健康检查。

**响应**:
```json
{
  "ok": true,
  "data": {
    "status": "ok",
    "staleAfterMs": 15000,
    "uptime": 3600
  },
  "servedAt": "2026-03-29T15:00:00.000Z"
}
```

#### `GET /identity`

获取 Agent 身份信息。

**响应**:
```json
{
  "ok": true,
  "data": {
    "agentId": "vps-001",
    "name": "Production VPS",
    "version": "0.1.0",
    "startedAt": "2026-03-29T14:00:00.000Z"
  },
  "servedAt": "2026-03-29T15:00:00.000Z"
}
```

#### `GET /v1/agent/summary`

获取完整汇总信息。

**响应**:
```json
{
  "ok": true,
  "data": {
    "identity": { "agentId": "vps-001", "name": "Production VPS", "version": "0.1.0", "startedAt": "2026-03-29T14:00:00.000Z" },
    "region": { "provider": "local", "regionCode": "us-west", "regionName": "US West", "city": "San Francisco", "country": "US", "source": "env" },
    "hardware": {
      "hostname": "vps-001",
      "platform": "linux",
      "arch": "x64",
      "cpu": { "model": "Intel Xeon", "cores": 4 },
      "memory": { "totalBytes": 8589934592 },
      "primaryDisk": { "filesystem": "/dev/vda1", "mount": "/", "totalBytes": 107374182400 },
      "networkInterfaces": [{ "name": "eth0", "addresses": ["192.168.1.100"], "mac": "00:11:22:33:44:55" }]
    },
    "snapshot": {
      "timestamp": "2026-03-29T15:00:00.000Z",
      "cpuUsagePercent": 25.5,
      "ramUsagePercent": 68.2,
      "diskUsagePercent": 42.1,
      "uploadThroughput": { "bytesPerSecond": 1024000 },
      "downloadThroughput": { "bytesPerSecond": 5120000 },
      "cumulativeTraffic": { "uploadedBytes": 1073741824, "downloadedBytes": 5368709120 }
    },
    "staleAfterMs": 15000
  },
  "servedAt": "2026-03-29T15:00:00.000Z"
}
```

---

## 九、交付物

完成本需求后，应交付：

1. ✅ 完整的 Agent 代码（支持多网卡、配置化、错误处理）
2. ✅ 完整的 Panel 代码（配置持久化、状态判断、响应式UI）
3. ✅ 更新的 Protocol 类型定义
4. ✅ 更新的 Shared 工具函数
5. ✅ Docker 配置文件
6. ✅ 完整的文档（README, API, 部署）
7. ✅ 验证脚本（pnpm build && pnpm check）

---

**End of Document**
