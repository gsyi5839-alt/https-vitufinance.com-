# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VituFinance is a cryptocurrency finance platform with AI trading robots, staking, copy trading, and referral systems. Built as a monorepo with three main applications.

## Architecture

```
/
├── backend/         # Node.js + Express API server (ES modules)
├── frontend/        # Vue 3 + Vite user-facing app
├── admin/           # Vue 3 + Vite admin dashboard
├── scripts/         # Maintenance and deployment scripts
└── backups/         # Database backups
```

### Backend (Node.js/Express)
- **Entry point**: `backend/server.js` (~230KB monolithic file containing core routes and middleware)
- **Database**: MySQL via `mysql2/promise` with connection pooling (`backend/db.js`); pool size via `DB_POOL_SIZE` env (default 10); **all queries hardcode timezone to UTC+8 (`'+08:00'`)** — critical for financial timestamps
- **Admin routes**: `backend/src/adminRoutes.js` (~345KB) — all admin API endpoints with JWT validation and audit logging per endpoint; avatar uploads via multer; config stored in `backend/src/data/admin_config.json`
- **Key route modules** in `backend/src/routes/`:
  - `robotRoutes.js` — AI trading robot management
  - `authRoutes.js` — Wallet signature authentication: nonce generated via SHA256(timestamp+random), 5-min expiry, stored in memory Map (not persistent — will break in clustered deployments)
  - `luckyWheelRoutes.js` — Lucky wheel/lottery system
  - `proxyRoutes.js` — Proxy services
- **Cron jobs** in `backend/src/cron/` (initialized in server.js with explicit DB query passing):
  - `robotExpiryCron.js`, `teamDividendCron.js`, `depositMonitorCron.js`, `ethDepositMonitorCron.js`, `simulatedGrowthCron.js`, `brokerLevelCron.js`
- **Financial math utils** in `backend/src/utils/` — do not modify without thorough testing:
  - `precisionMath.js` — Decimal.js wrapper for all floating-point operations
  - `referralMath.js` / `referralAdvancedMath.js` — 8-level CEX referral reward calculations
  - `teamMath.js` — Team broker rules, level calculations
  - `bscTransferService.js` — BSC blockchain transfers via ethers.js
  - `auditLogger.js` / `errorLogger.js` — audit trail and structured error logging

### Security Middleware Stack (backend)
Layered in this order in `server.js`:
1. Helmet (CSP, X-Frame-Options, etc.) + `trust proxy` for Nginx
2. CORS — production allows only `vitufinance.com`; dev adds `localhost:5173`
3. Rate limiters: `generalLimiter`, `sensitiveLimiter` (auth/withdrawals), `quantifyLimiter`
4. IP blacklist enforcement
5. Path traversal protection
6. Global input sanitizer (`globalInputSanitizer`)
7. SQL injection detection middleware
8. CSRF — `csrfTokenMiddleware` for forms, `apiCsrfProtection` for API routes
9. Enhanced protection (`backend/src/security/enhancedProtection.js`) — attack recording and brute force prevention

### Frontend (Vue 3)
- **Tech stack**: Vue 3, Vite, Element Plus, Pinia, Vue Router, vue-i18n
- **Dev port**: 5173 | **Build output**: `frontend/dist/` | **Path alias**: `@` → `src/`
- **Key views**: Home, Robot, Pledge, Follow, Invite, Assets (wallet)
- **Pinia stores**: `wallet.js` (wallet state with localStorage persistence, balance management, TokenPocket/MetaMask detection), `csrf.js`, `user.js`
- **API layer**: `src/api/secureApi.js` — axios with CSRF interceptor; auto-adds `X-CSRF-Token` header and rotates token from response `x-csrf-token` header
- **Composables**: `useAssetsData.js`; utils: `signatureAuth.js`, `tracker.js` (referral tracking), `performance.js`, `errorLogger.js`
- **Global error handler**: `createVueErrorHandler()` in main.js — filters browser extension errors, syncs pending errors when back online
- **i18n**: language auto-detected by geolocation on first visit

### Admin (Vue 3)
- **Tech stack**: Vue 3, Vite, Element Plus, Pinia, ECharts, Three.js
- **Dev port**: 3001 | **Base path**: `/admin/` | **Build output**: `admin/dist/`
- **Auth**: JWT in `localStorage.admin_token`; `router.beforeEach` guard; login redirects if already authenticated
- **API proxy** (dev only): `/api` → `http://localhost:3000`
- **Key views**: Dashboard, Users, Deposits, Withdrawals, Robots, Settings, ErrorLogs, IPBlacklist

## Common Commands

### Backend
```bash
cd backend
npm run dev          # Start with nodemon (hot reload)
npm start            # Production start
```

### Frontend
```bash
cd frontend
npm run dev          # Dev server on :5173
npm run build        # Production build
```

### Admin
```bash
cd admin
npm run dev          # Dev server on :3001
npm run build        # Production build
```

### Production Services
```bash
pm2 restart vitu-backend     # Restart backend service
pm2 logs vitu-backend        # View backend logs
nginx -t && systemctl reload nginx  # Reload nginx config
```

### Deployment
```bash
./scripts/production_deploy.sh   # Blue-green deployment with safety checks
./scripts/backup-database.sh     # Manual backup (auto runs daily at 3am, 7-day retention)
```

### Logs
```bash
tail -f /www/wwwlogs/vitufinance.com.error.log   # Nginx errors
tail -f /root/.pm2/logs/vitu-backend-error.log   # Backend errors
```

## Environment Configuration

Backend requires `.env` file (see `backend/env.example`):
- Database: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`
- Security: `JWT_SECRET`, `ADMIN_KEY`
- Platform: `PLATFORM_WALLET_ADDRESS` (BSC)
- Server: `PORT` (default 3000), `NODE_ENV`

## Key Technical Details

- Backend uses ES modules (`"type": "module"`)
- **No test suite** — `npm test` scripts are stubs; test manually via `scripts/test-all-admin-apis.sh`
- Wallet auth flow: client requests nonce → signs with wallet → posts signature to `/api/auth/verify`; nonce lives in memory Map (single-instance only)
- Admin uses JWT auth (not CSRF-based like frontend); both systems coexist on the same backend
- Frontend build: `drop_console: false` (intentional for debugging); admin build: `drop_console: true`
- Blockchain: BSC (primary) + Ethereum; RPC endpoints managed via `scripts/fetch-publicnode-endpoints.mjs`
