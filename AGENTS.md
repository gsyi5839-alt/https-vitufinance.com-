# VituFinance - AGENTS.md

本文档供 AI 编程助手阅读，用于快速了解项目架构和开发规范。

## 项目概述

VituFinance 是一个加密货币金融平台，提供 AI 交易机器人、质押、跟单交易和推荐奖励系统。项目采用单体仓库（monorepo）结构，包含三个主要应用。

## 架构概览

```
/www/wwwroot/vitufinance.com/
├── backend/          # Node.js + Express API 服务器 (ES 模块)
├── frontend/         # Vue 3 + Vite 用户端应用
├── admin/            # Vue 3 + Vite 后台管理系统
├── scripts/          # 维护和部署脚本
├── docs/             # 技术文档
├── backups/          # 数据库备份
└── AGENTS.md         # 本文件
```

## 技术栈

### 后端 (backend/)

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Express | 4.18.2+ | Web 框架 |
| MySQL2 | 3.6.5+ | 数据库驱动 |
| Ethers.js | 6.16.0+ | 区块链交互 |
| JWT | 9.0.2+ | 身份认证 |
| Helmet | 8.1.0+ | 安全头 |
| express-rate-limit | 8.2.1+ | 速率限制 |
| Multer | 2.0.2+ | 文件上传 |
| Decimal.js | 10.6.0+ | 精确计算 |

### 前端 (frontend/)

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.5.24+ | 框架 |
| Vite | 7.2.4+ | 构建工具 |
| TypeScript | 5.9.3+ | 类型系统 |
| Element Plus | 2.12.0+ | UI 组件库 |
| Pinia | 3.0.4+ | 状态管理 |
| Vue Router | 4.6.3+ | 路由 |
| Vue I18n | 9.14.5+ | 国际化 |
| Three.js | 0.182.0+ | 3D 效果 |

### 后台管理 (admin/)

| 技术 | 版本 | 用途 |
|------|------|------|
| Vue | 3.4.0+ | 框架 |
| Vite | 5.0.10+ | 构建工具 |
| Element Plus | 2.4.4+ | UI 组件库 |
| ECharts | 5.4.3+ | 数据可视化 |
| Three.js | 0.182.0+ | 3D 效果 |

## 目录结构详解

### 后端目录 (backend/)

```
backend/
├── server.js                  # 入口文件 (~230KB，包含核心路由和中间件)
├── db.js                      # MySQL 连接池配置
├── env.example                # 环境变量示例
├── .env                       # 环境变量（生产环境）
├── uploads/                   # 上传文件目录
├── migrations/                # 数据库迁移文件
├── sql/                       # SQL 脚本
├── src/
│   ├── adminRoutes.js         # 管理后台 API (~345KB)
│   ├── config/                # 配置文件
│   │   ├── cache.js           # 缓存配置
│   │   ├── dbIndexes.sql      # 数据库索引
│   │   ├── dbOptimized.js     # 数据库优化
│   │   └── robotConfig.js     # 机器人配置
│   ├── cron/                  # 定时任务
│   │   ├── robotExpiryCron.js     # 机器人过期处理
│   │   ├── teamDividendCron.js    # 团队分红
│   │   ├── depositMonitorCron.js  # BSC 充值监控
│   │   ├── ethDepositMonitorCron.js # ETH 充值监控
│   │   ├── simulatedGrowthCron.js # 模拟金额增长
│   │   └── brokerLevelCron.js     # 经纪人等级
│   ├── middleware/            # 中间件
│   │   ├── csrf.js            # CSRF 防护
│   │   └── security.js        # 安全中间件
│   ├── routes/                # 路由模块
│   │   ├── admin/             # 管理后台路由
│   │   ├── authRoutes.js      # 钱包认证
│   │   ├── robotRoutes.js     # 机器人管理
│   │   ├── luckyWheelRoutes.js # 抽奖系统
│   │   └── proxyRoutes.js     # 代理服务
│   ├── security/              # 安全模块
│   │   ├── index.js           # 输入验证和清理
│   │   ├── sqlInjectionProtection.js
│   │   ├── enhancedProtection.js
│   │   └── securityMiddleware.js
│   └── utils/                 # 工具函数
│       ├── precisionMath.js       # 精确计算
│       ├── referralMath.js        # 推荐奖励计算
│       ├── teamMath.js            # 团队规则
│       ├── bscTransferService.js  # BSC 转账
│       ├── auditLogger.js         # 审计日志
│       ├── errorLogger.js         # 错误日志
│       └── platformWallet.js      # 平台钱包
```

### 前端目录 (frontend/)

```
frontend/
├── index.html                 # HTML 模板
├── vite.config.ts             # Vite 配置
├── tsconfig.json              # TypeScript 配置
├── src/
│   ├── main.js                # 入口文件
│   ├── App.vue                # 根组件
│   ├── api/                   # API 接口
│   │   └── secureApi.js       # 带 CSRF 的 axios
│   ├── assets/                # 静态资源
│   ├── components/            # 组件
│   │   ├── robot/             # 机器人相关
│   │   ├── follow/            # 跟单相关
│   │   └── *.vue              # 其他组件
│   ├── composables/           # 组合式函数
│   │   └── useAssetsData.js
│   ├── locales/               # 国际化
│   │   ├── index.js           # i18n 配置
│   │   └── *.json             # 15 种语言文件
│   ├── router/                # 路由配置
│   ├── stores/                # Pinia 状态
│   │   ├── wallet.js          # 钱包状态
│   │   ├── csrf.js            # CSRF 令牌
│   │   └── user.js            # 用户信息
│   ├── styles/                # 样式文件
│   ├── types/                 # TypeScript 类型
│   ├── utils/                 # 工具函数
│   │   ├── signatureAuth.js   # 签名认证
│   │   ├── tracker.js         # 推荐追踪
│   │   ├── performance.js     # 性能监控
│   │   └── errorLogger.js     # 错误日志
│   └── views/                 # 页面视图
│       ├── Home.vue
│       ├── Index.vue
│       ├── Robot.vue
│       ├── Assets.vue
│       ├── Follow.vue
│       ├── Invite.vue
│       └── ...
```

### 后台管理目录 (admin/)

```
admin/
├── index.html                 # HTML 模板
├── vite.config.js             # Vite 配置
├── src/
│   ├── main.js                # 入口文件
│   ├── App.vue                # 根组件
│   ├── api/                   # API 接口
│   ├── components/            # 组件
│   ├── composables/           # 组合式函数
│   ├── router/                # 路由配置
│   ├── stores/                # Pinia 状态
│   │   └── theme.js           # 主题管理
│   ├── styles/                # 样式文件
│   ├── utils/                 # 工具函数
│   │   ├── deviceDetect.js    # 设备检测
│   │   └── errorLogger.js     # 错误日志
│   └── views/                 # 页面视图
│       ├── Dashboard.vue
│       ├── Users.vue
│       ├── Deposits.vue
│       ├── Withdrawals.vue
│       ├── Robots.vue
│       ├── Settings.vue
│       ├── ErrorLogs.vue
│       └── IPBlacklist.vue
```

## 构建和运行命令

### 后端

```bash
cd backend
npm install
npm run dev          # 开发模式（nodemon 热重载）
npm start            # 生产模式
```

### 前端

```bash
cd frontend
npm install
npm run dev          # 开发服务器 (http://localhost:5173)
npm run build        # 生产构建 (输出到 dist/)
npm run preview      # 预览生产构建
```

### 后台管理

```bash
cd admin
npm install
npm run dev          # 开发服务器 (http://localhost:3001)
npm run build        # 生产构建 (输出到 dist/)
npm run preview      # 预览生产构建
```

### 代码行数检查

单个代码文件超过 300 行时需要纳入拆分计划，超过 500 行时检查失败，必须拆分后再继续合并或部署新增代码。

```bash
# 分应用检查
cd backend && npm run check:lines
cd frontend && npm run check:lines
cd admin && npm run check:lines

# 检查通过后再构建（前端/后台）
cd frontend && npm run build:checked
cd admin && npm run build:checked

# 从项目根目录检查全部应用
node scripts/check-line-counts.mjs --all
```

## 环境配置

后端需要 `.env` 文件（参考 `backend/env.example`）：

```bash
# 数据库配置
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_database_name
DB_POOL_SIZE=10

# 服务器配置
PORT=3000
NODE_ENV=production

# 安全配置（必须设置！）
JWT_SECRET=your_super_secret_jwt_key
ADMIN_KEY=your_admin_api_key

# 平台配置
PLATFORM_WALLET_ADDRESS=0x0290df8A512Eff68d0B0a3ECe1E3F6aAB49d79D4

# 可选配置
LOG_LEVEL=info
RATE_LIMIT_MAX=100
LOGIN_RATE_LIMIT_MAX=5
```

**注意**：JWT_SECRET 和 ADMIN_KEY 必须通过加密方式生成：

```bash
# 生成 JWT_SECRET
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 生成 ADMIN_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 安全架构

后端采用多层安全中间件栈（按顺序加载）：

1. **Helmet** - CSP、X-Frame-Options 等安全头
2. **Trust Proxy** - Nginx 反向代理配置
3. **CORS** - 跨域控制（生产环境只允许 vitufinance.com）
4. **Rate Limiters** - 通用限制、敏感操作限制、量化限制
5. **IP Blacklist** - IP 黑名单检查
6. **Path Traversal Protection** - 目录遍历防护
7. **Global Input Sanitizer** - 全局输入清理
8. **SQL Injection Detection** - SQL 注入检测
9. **CSRF Protection** - 跨站请求伪造防护
10. **Enhanced Protection** - 攻击记录和暴力破解防护

### 认证方式

- **前端用户**：钱包签名认证（TokenPocket/MetaMask）+ CSRF 令牌
- **后台管理**：JWT Token 认证（存储在 localStorage.admin_token）

### 钱包签名认证流程

1. 客户端请求 nonce：`GET /api/auth/nonce?wallet=0x...`
2. 后端生成 nonce（SHA256 时间戳+随机数），5 分钟有效期
3. 用户使用钱包私钥签名消息
4. 客户端提交签名：`POST /api/auth/verify`
5. 后端验证签名，返回认证结果

**注意**：nonce 存储在内存 Map 中，单实例部署有效，集群部署需改用 Redis。

## 数据库架构

### 时区处理

**所有查询强制使用 UTC+8（北京/香港/台北时间）**：

```javascript
// backend/db.js
export async function query(sql, params = []) {
  const connection = await pool.getConnection();
  try {
    await connection.query("SET time_zone = '+08:00'");
    const [rows] = await connection.query(sql, params);
    return rows;
  } finally {
    connection.release();
  }
}
```

### 核心表结构

| 表名 | 说明 |
|------|------|
| users | 用户基础信息 |
| user_balances | 用户余额（USDT/WLD） |
| balance_logs | 余额变动日志 |
| robots | AI 交易机器人 |
| robot_orders | 机器人订单记录 |
| deposits | 充值记录 |
| withdrawals | 提现记录 |
| referrals | 推荐关系 |
| team_rewards | 团队奖励 |
| announcements | 公告 |
| error_logs | 错误日志 |
| ip_blacklist | IP 黑名单 |

## 关键业务逻辑

### 推荐奖励系统

- **CEX 推荐**：8 级奖励比例 [0.30, 0.10, 0.05, 0.01, ...]
- **团队经纪人**：
  - LV1：购买 ≥20 USDT 机器人
  - LV2-5：购买 ≥100 USDT 机器人

代码位置：`backend/src/utils/referralMath.js`、`backend/src/utils/teamMath.js`

### 定时任务

| 任务 | 文件 | 说明 |
|------|------|------|
| 机器人过期处理 | robotExpiryCron.js | 检查并处理过期机器人 |
| 团队分红 | teamDividendCron.js | 计算并发放团队奖励 |
| BSC 充值监控 | depositMonitorCron.js | 监听链上充值 |
| ETH 充值监控 | ethDepositMonitorCron.js | 监听 ETH 链充值 |
| 模拟金额增长 | simulatedGrowthCron.js | 模拟交易收益 |
| 经纪人等级 | brokerLevelCron.js | 计算经纪人等级 |

### 区块链交互

- **BSC 主网**：主要链，支持 USDT、平台币
- **ETH 主网**：次要链
- RPC 节点管理：`scripts/fetch-publicnode-endpoints.mjs`

## 部署流程

### 生产部署（蓝绿部署）

```bash
./scripts/production_deploy.sh
```

功能：
- 在新端口部署优化版本
- 不影响现有生产环境
- 提供测试和验证步骤
- 支持一键回滚

### 数据库备份

```bash
# 手动备份
./scripts/backup-database.sh

# 自动备份（每天 3AM，保留 7 天）
./scripts/setup-backup-cron.sh
```

### PM2 服务管理

```bash
pm2 restart vitu-backend     # 重启后端
pm2 logs vitu-backend        # 查看日志
pm2 status                   # 查看状态
```

### Nginx 配置重载

```bash
nginx -t && systemctl reload nginx
```

## 日志查看

```bash
# Nginx 错误日志
tail -f /www/wwwlogs/vitufinance.com.error.log

# 后端错误日志
tail -f /root/.pm2/logs/vitu-backend-error.log

# 后端输出日志
tail -f /root/.pm2/logs/vitu-backend-out.log
```

## 开发规范

### 代码风格

- 使用 ES 模块（`"type": "module"`）
- 异步操作使用 async/await
- 数据库查询使用参数化防止 SQL 注入
- 金额计算使用 Decimal.js 避免浮点误差

### 单文件代码管理

新代码必须按模块边界拆分，单个业务文件目标控制在 **300-500 行**：

- 后端路由按业务域放入 `backend/src/routes/`，例如市场行情、机器人、钱包、充值提现、推荐、质押、日志等。
- 后台管理 API 按业务域放入 `backend/src/routes/admin/`，不要继续向 `backend/src/adminRoutes.js` 追加新接口。
- Vue 页面超过 500 行时，必须拆分为 `components/` 子组件、`composables/` 组合式函数和 `utils/` 纯函数。
- 共享计算逻辑必须放入 `utils/`，不要在页面组件或路由处理器中重复写金额、推荐、团队等级算法。
- 现有超大文件采用渐进迁移策略：修改某个业务域时，同步把该业务域从大文件迁出，并保持构建或语法检查通过。

当前重点迁移对象：

| 文件 | 问题 | 迁移方向 |
|------|------|----------|
| `backend/server.js` | 主入口包含大量用户端业务接口 | 拆到 `backend/src/routes/*Routes.js` |
| `backend/src/adminRoutes.js` | 后台 API 单文件过大 | 迁移到 `backend/src/routes/admin/*.js` 并逐步改挂载 |
| `frontend/src/views/Assets.vue` | 页面承担过多资产、充值、提现逻辑 | 拆分资产卡片、充值提现弹窗、数据 composable |
| `admin/src/views/Layout.vue` | 布局、菜单、通知、主题混在一起 | 拆分 Sidebar、Navbar、通知逻辑 |

### 错误处理

```javascript
// 后端错误处理模式
try {
  const result = await dbQuery('SELECT * FROM users WHERE id = ?', [id]);
  res.json({ success: true, data: result });
} catch (error) {
  console.error('操作失败:', error.message);
  res.status(500).json({ 
    success: false, 
    message: '操作失败',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
}
```

### 前端组件规范

```javascript
// Vue 3 组合式 API 示例
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useWalletStore } from '@/stores/wallet'

const walletStore = useWalletStore()
const loading = ref(false)

const formattedBalance = computed(() => {
  return walletStore.usdtBalance?.toFixed(2) || '0.00'
})

onMounted(() => {
  // 组件挂载逻辑
})
</script>
```

### API 调用规范

```javascript
// 使用封装的 secureApi
import secureApi from '@/api/secureApi'

// GET 请求
const { data } = await secureApi.get('/api/user/balance', {
  params: { wallet_address: address }
})

// POST 请求（自动携带 CSRF 令牌）
const result = await secureApi.post('/api/robot/purchase', {
  robot_id: id,
  amount: amount
})
```

## 测试策略

**注意**：项目目前没有自动化测试套件，`npm test` 是占位脚本。

### 手动测试

```bash
# 测试所有管理后台 API
./scripts/test-all-admin-apis.sh
```

### API 测试示例

```bash
# 健康检查
curl http://localhost:3000/api/health

# 数据库状态
curl http://localhost:3000/api/db/health

# 获取 CSRF 令牌
curl -c cookies.txt http://localhost:3000/api/csrf/token
```

## 国际化

前端支持 15 种语言：

- 英语 (en)
- 简体中文 (zh) - 默认
- 繁体中文 (zh-tw)
- 阿拉伯语 (ar)
- 德语 (de)
- 西班牙语 (es)
- 法语 (fr)
- 印尼语 (id)
- 意大利语 (it)
- 马来语 (ms)
- 葡萄牙语 (pt)
- 土耳其语 (tr)
- 乌克兰语 (uk)
- 越南语 (vi)
- 祖鲁语 (zu)

语言文件位置：`frontend/src/locales/*.json`

语言自动检测：根据用户地理位置自动设置（`detectAndSetLanguageByLocation`）

## 重要注意事项

1. **时区一致性**：所有数据库查询强制使用 UTC+8，金融系统时间准确性至关重要

2. **金额精度**：所有金额计算必须使用 `precisionMath.js` 中的 Decimal.js 包装器，避免 JavaScript 浮点误差

3. **CSRF 令牌**：前端 API 调用必须携带 `X-CSRF-Token` 头，由 `secureApi.js` 自动处理

4. **单实例限制**：钱包认证 nonce 存储在内存 Map 中，不适用于集群部署

5. **Console 日志**：前端生产构建保留 console（用于调试），后台管理构建会移除

6. **RPC 节点**：区块链交互应配置多节点故障转移，避免单点故障

## 相关文档

- `CLAUDE.md` - Claude Code 专用指南
- `API.MD` - NodeReal API 文档
- `RPC.md` - 免费 RPC 节点列表
- `docs/README_ETH_RPC.md` - 以太坊 RPC 使用指南
- `docs/ETH_RPC_QUICK_REFERENCE.md` - ETH RPC 快速参考
- `scripts/README.md` - 脚本使用说明

## 常用脚本

| 脚本 | 用途 |
|------|------|
| `production_deploy.sh` | 蓝绿部署 |
| `backup-database.sh` | 数据库备份 |
| `fetch-publicnode-endpoints.mjs` | 获取 RPC 节点列表 |
| `broadcast-eth-transaction.js` | 广播 ETH 交易 |
| `test-all-admin-apis.sh` | 测试管理 API |
| `setup-backup-cron.sh` | 配置自动备份 |
| `security-backup.sh` | 安全备份 |

## 联系方式

- 项目：VituFinance
- 团队：VituFinance Team
- 许可证：MIT
