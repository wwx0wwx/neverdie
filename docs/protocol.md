# neverdie 协议说明

## 基础约定

- agent 当前提供 HTTP JSON API
- 所有成功响应都使用 `{ ok: true, data, servedAt }`
- 所有失败响应都使用 `{ ok: false, error, servedAt }`
- 所有时间戳使用 ISO 8601 UTC 字符串
- 当前 agent 已启用 CORS，允许本地 panel 直接从浏览器拉取数据

## Endpoint

### `GET /health`

返回 agent 的基本健康状态。

### `GET /identity`

返回 agent 身份信息：

- `agentId`
- `name`
- `version`
- `startedAt`

### `GET /hardware`

返回硬件元数据：

- `hostname`
- `platform`
- `arch`
- `cpu.model`
- `cpu.cores`
- `memory.totalBytes`
- `primaryDisk`
- `networkInterfaces[]`

### `GET /region`

返回区域信息：

- `provider`：当前固定为 `local`
- `regionCode`
- `regionName`
- `city`
- `country`
- `source`：`env` / `hostname` / `default`

### `GET /metrics`

返回一个最新采样快照：

- `timestamp`
- `cpuUsagePercent`
- `ramUsagePercent`
- `diskUsagePercent`
- `uploadThroughput.bytesPerSecond`
- `downloadThroughput.bytesPerSecond`
- `cumulativeTraffic.uploadedBytes`
- `cumulativeTraffic.downloadedBytes`

### `GET /v1/agent/summary`

返回一次聚合查询结果，包含：

- `identity`
- `region`
- `hardware`
- `snapshot`
- `staleAfterMs`

当前 panel 仍然逐个 endpoint 拉取，以便清晰体现协议边界。

## 快照语义

这里的 `metrics snapshot` 是“某一时刻采样值”，不是持续流或全局一致状态。

必须遵守：

- 每个快照必须带 `timestamp`
- panel 必须显示快照年龄
- panel 可以按自己的时钟判断 stale
- 不同 panel 轮询同一 agent，允许在不同时间看到不同值

## 累计流量字段

`cumulativeTraffic` 表示 agent 进程当前读取到的“自安装以来累计流量”近似值。

在当前实现中，它直接取操作系统网卡统计：

- `uploadedBytes`
- `downloadedBytes`

注意：

- 当前默认取第一块网卡
- 它更接近“当前主网卡累计字节数”，而不是多网卡统一结算值
- 本地 MVP 不做复杂归档或长期校准

## 硬件与区域元数据

### 硬件

硬件信息用于控制台展示和节点识别，不应与实时快照混为一谈。

### 区域

区域信息当前来自本地环境变量配置，属于轻量元数据。未来可以改为更正式的注册或配置来源，但这不影响当前轮询模型。

## Staleness 预期

panel 收到快照后，会基于：

- `snapshot.timestamp`
- 当前接收时间
- 本地 `STALE_AFTER_MS`

计算 `snapshotAgeMs` 并显示 stale 状态。

因此：

- stale 是 panel 的本地判断
- stale 不要求跨 panel 一致
- 即便 agent 在线，不同 panel 的 stale 展示也可能因轮询时机不同而不同

