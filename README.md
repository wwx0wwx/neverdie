# neverdie

`neverdie` 是一个高可用 VPS 监控探针系统。只要不是所有 panel 实例同时离线，控制面板就不会停机。

## 架构概览

```
Cloudflare DNS (多 A 记录)
    ├── Panel A  (Fastify + React, SQLite)
    ├── Panel B  (同上，自动 P2P 同步配置)
    └── Panel C  ...
              ↓ 轮询
    Agent 1 / Agent 2 / Agent N
```

- **Panel**：Fastify 后端 (port 41731) + React/Vite 前端 (port 41730)，SQLite 持久化，P2P 广播同步节点配置
- **Agent**：轻量 HTTP 探针，暴露 CPU / 内存 / 磁盘 / 网络实时快照
- **高可用**：多 Panel 实例各自独立拉取指标，任意实例存活即可访问控制面板

## 主要功能

### Phase 1
- 多 Agent 节点管理（添加 / 删除 / 轮询）
- 节点列表 + 节点详情页，实时 CPU / 内存 / 磁盘 / 网络展示
- 多 Panel P2P 配置同步（LWW 冲突解决）
- SQLite 持久化，重启不丢配置

### Phase 2
- **管理员认证**：首次访问跳转 `/setup` 初始化账户，之后 `/login` 登录，JWT cookie session
- **管理面板** (`/admin`)：
  - 添加 Panel peer：生成密钥 + 一键安装命令，粘贴到新机器自动加入集群
  - 添加 Agent key：生成身份密钥 + 一键安装命令，粘贴到被控机器
- **同步认证**：P2P sync 端点使用 `PANEL_SECRET` header 保护
- **一键安装脚本** `install.sh`：Ubuntu/Debian，自动安装 Node.js 24、pnpm、nginx，交互式配置域名，写入 systemd 服务 + nginx 反代

## 一键安装（生产）

```bash
bash <(curl -fsSL https://your-panel-domain/install.sh)
```

脚本会交互式询问域名，自动完成 nginx 反代配置和 systemd 服务注册。

## 本地开发

### 前置条件

- Node.js 20+
- pnpm 10+

### 安装依赖

```bash
pnpm install
```

### 首次构建共享包

```bash
pnpm build:deps
```

### 启动开发服务

```bash
# 同时启动 agent + panel
pnpm dev

# 或分开启动
pnpm dev:agent   # http://127.0.0.1:43110
pnpm dev:panel   # 前端 :41730  后端 :41731
```

### 环境变量

复制并编辑：

```bash
cp apps/panel/.env.example apps/panel/.env
cp apps/agent/.env.example apps/agent/.env
```

Panel 关键变量：

| 变量 | 说明 |
|------|------|
| `JWT_SECRET` | JWT 签名密钥（生产必填） |
| `PANEL_SECRET` | P2P sync 认证密钥（生产必填） |
| `PANEL_DOMAIN` | 本 Panel 公开域名（用于生成安装命令） |
| `PANEL_PEERS` | 逗号分隔的其他 Panel 后端地址 |
| `DB_PATH` | SQLite 文件路径（默认 `apps/panel/data/neverdie.db`） |

### 构建 & 类型检查

```bash
pnpm build
pnpm check
```

## 多 Panel 高可用配置

在每台 panel 机器的 `.env` 中配置其他 panel 的后端地址：

```bash
PANEL_PEERS=https://panel-b.example.com:41731,https://panel-c.example.com:41731
PANEL_SECRET=same-secret-on-all-panels
```

- 任意 panel 添加/删除节点时，变更自动广播给所有 peers
- Panel 启动时从第一个可达的 peer 拉取全量配置
- 只有所有 panel 实例同时离线，控制面板才不可用

## 项目结构

```
.
├── apps/
│   ├── agent/          # HTTP 探针
│   └── panel/
│       ├── server/     # Fastify 后端
│       │   └── routes/ # agents / auth / admin / sync
│       └── src/        # React 前端
│           └── pages/  # NodeList / NodeDetail / Login / Setup / Admin
├── packages/
│   ├── protocol/       # 共享 TypeScript 类型
│   └── shared/         # 工具函数
├── install.sh          # 一键安装脚本
└── docs/               # 架构 / 协议 / 路线图
```

更多说明见 [docs/architecture.md](docs/architecture.md)、[docs/protocol.md](docs/protocol.md)、[docs/next-steps.md](docs/next-steps.md)。
