# neverdie 本地 MVP 架构

## 总览

当前实现是一个本地优先、单开发者即可运行的 monorepo：

- `apps/agent`：运行在被监控机器上的 HTTP 服务
- `apps/panel`：本地控制面板，管理 agent 列表并主动轮询
- `packages/protocol`：共享契约与数据模型
- `packages/shared`：共享的通用逻辑

这个 MVP **没有实现多 panel 协同写入、全局快照复制或统一入口**。它只实现本地最小闭环，并且刻意保持 honest。

## 控制面与实时数据分离

当前模型把两类数据显式分开：

### 控制面（control-plane）

控制面数据由 panel 本地维护，代表“如何管理一个 agent”：

- agent base URL
- 是否启用
- 展示名
- 备注/标签（协议已预留）

这类数据面向管理，不代表实时状态。

### 实时数据（realtime snapshot）

实时数据由 panel 轮询 agent 获取，代表“某个时刻的采样结果”：

- CPU 使用率
- RAM 使用率
- 磁盘使用率
- 实时上传/下载吞吐
- 自安装以来累计流量
- 快照时间戳

这类数据带有时间语义，明确不是全局一致状态。

## 轮询如何工作

1. panel 维护一个本地 agent 列表。
2. panel 按固定间隔并发请求每个 agent 的接口：
   - `/identity`
   - `/hardware`
   - `/region`
   - `/metrics`
3. panel 收到 `/metrics` 结果后，用 `snapshot.timestamp` 与本地接收时间计算 `snapshotAgeMs`。
4. 如果年龄超过 `STALE_AFTER_MS`，UI 显示该快照可能过期。
5. 若请求失败，则节点保持最后一个已知快照（如果有），同时标记为不可达。
6. 当前 agent 已启用 CORS，因此本地 Vite panel 可以直接从浏览器访问 agent HTTP 接口。

## 为什么这个模型适合未来演进

它为未来多 panel / 多区域部署保留了清晰边界：

- 多个 panel 可以同时轮询同一个 agent，而不要求共享完整实时状态。
- 后续如果需要 coordinator / leader，也应只负责配置写入、审批和全局任务，不应成为唯一访问入口。
- 后续 panel 之间可以共享控制面配置，但不应尝试做“全局强一致实时遥测复制”。
- 统一域名、Cloudflare 路由和跨区域调度属于未来部署层问题，不在本地 MVP 内实现。

## 当前本地 MVP 的边界

已经实现：

- agent 本机信息采集
- panel 多 agent 列表管理
- 定时轮询与手动刷新
- 节点列表和节点详情
- 快照年龄 / stale 展示
- `PANEL_PORT` 驱动的本地前端端口配置

尚未实现：

- agent 注册审批流程
- 持久化数据库
- 历史趋势图
- 告警系统
- 多 panel 之间的配置同步

