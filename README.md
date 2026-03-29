# neverdie

`neverdie` 是一个高可用方向的 VPS 监控探针系统，本地 MVP 版本聚焦于 **panel 主动拉取 agent 快照** 的最小可运行实现。

## 这个初始版本包含什么

- `apps/agent`：本地可运行的 HTTP agent，暴露身份、硬件、区域和实时快照接口。
- `apps/panel`：本地控制面板，可配置多个 agent、定时轮询、查看节点列表与节点详情。
- `packages/protocol`：共享协议类型，显式区分控制面数据与实时快照数据。
- `packages/shared`：共享工具函数，包括 API 响应包装、快照年龄计算和展示格式化。

## 可用性模型

这个 MVP 明确遵循下面的模型：

- panel 主动从 agent 拉取数据；agent 不向 panel 主动推送遥测。
- 多个 panel 可以同时轮询同一个 agent。
- panel 看到的是 **采样快照**，不是全局一致的实时真相。
- 每条快照都带有显式时间戳，UI 会显示最后更新时间和是否 stale。
- 不同 panel 在不同时间轮询同一 agent，允许看到略有差异的实时值。

## 为什么先做 panel-pulls-agent

这个方向更适合当前本地 MVP：

- 本地调试更直接，一个开发者即可在单机上启动 panel 和 agent。
- agent 只需要暴露简单 HTTP 接口，不需要额外的上报通道或消息系统。
- 多 panel 并发轮询天然成立，且不会误导为“全局实时一致”。
- 它为未来多区域 panel / master 的演进保留空间，同时不提前引入复杂分布式一致性问题。

## 现在故意没有实现的内容

- 延迟、丢包探测
- 告警系统
- 历史时序分析
- 全局实时复制
- 分布式一致性/选主
- 生产级高可用部署
- Cloudflare 统一域名路由

## 本地运行

### 前置条件

- Node.js 20+
- `pnpm` 10+

### 安装依赖

```bash
pnpm install
```

### 首次构建共享包

首次运行前需先编译 protocol 和 shared 包：

```bash
pnpm build:deps
```

### 启动 agent

```bash
pnpm dev:agent
```

默认监听：`http://127.0.0.1:43110`

可选环境变量参考：`apps/agent/.env.example`

支持多网卡模式（`NETWORK_MODE=aggregated`）和可配置 CORS（`CORS_ORIGIN`）。

### 启动 panel

另开一个终端：

```bash
pnpm dev:panel
```

Panel 包含两个进程：
- **前端**（Vite）默认：`http://127.0.0.1:41730`
- **后端**（Fastify）默认：`http://127.0.0.1:41731`

可选环境变量参考：`apps/panel/.env.example`

节点配置持久化到本地 SQLite（`apps/panel/data/neverdie.db`），刷新页面后保留。

### 多 Panel 高可用配置

在每台 panel 机器的 `.env` 中配置其他 panel 的后端地址：

```bash
PANEL_PEERS=https://panel-b.example.com:41731,https://panel-c.example.com:41731
```

- 任意 panel 添加/删除节点时，变更自动广播给所有 peers
- Panel 启动时从第一个可达的 peer 拉取全量配置
- 只有所有 panel 实例同时离线，控制面板才不可用

### 一次性启动全部开发服务

```bash
pnpm dev
```

### 本地检查

```bash
pnpm build
pnpm check
```

## 关于指标实现的诚实说明

agent 尽量读取本机真实数据：

- CPU、内存、文件系统、网卡信息来自 `systeminformation`
- 实时上传/下载吞吐与累计流量来自网卡统计
- 磁盘使用率默认取当前系统返回的第一个文件系统

限制：

- 默认取第一块非回环网卡；设置 `NETWORK_MODE=aggregated` 可聚合所有非回环网卡
- 设置 `PRIMARY_INTERFACE=eth0` 可在 single 模式下指定主网卡
- 不同平台上文件系统和网络接口枚举结果可能略有差异
- panel 展示的是最近一次拉取到的快照，而不是持续流式采样

更多说明见 `docs/architecture.md`、`docs/protocol.md`、`docs/next-steps.md`。

