# CloudFlare CDN 脚本工具集

本目录包含用于管理CloudFlare CDN配置和部署的脚本工具。

## 📁 脚本列表

### 1. deploy-cdn.sh - 部署脚本
**功能：** 自动构建和部署前端及管理系统

**使用方法：**
```bash
cd /www/wwwroot/vitufinance.com
./scripts/deploy-cdn.sh
```

**执行步骤：**
- ✅ 构建前端（Frontend）
- ✅ 构建管理系统（Admin）
- ✅ 测试Nginx配置
- ✅ 重载Nginx服务
- ✅ 显示部署信息和缓存清理提示

---

### 2. cloudflare-purge-cache.sh - 缓存清理脚本
**功能：** 通过CloudFlare API清理所有缓存

**配置方法：**
```bash
# 方式1：使用API Token（推荐）
export CF_ZONE_ID="your-zone-id"
export CF_API_TOKEN="your-api-token"

# 方式2：使用Email + API Key
export CF_ZONE_ID="your-zone-id"
export CF_EMAIL="your-email@example.com"
export CF_API_KEY="your-api-key"
```

**使用方法：**
```bash
./scripts/cloudflare-purge-cache.sh
```

**如何获取CloudFlare凭证：**
1. 登录 https://dash.cloudflare.com/
2. Zone ID: 域名概述页面右侧可见
3. API Token: 我的个人资料 > API令牌 > 创建令牌
4. API Key: 我的个人资料 > API密钥 > 全局API密钥

---

### 3. verify-cdn.sh - 配置验证脚本
**功能：** 验证CloudFlare CDN配置是否正确

**使用方法：**
```bash
./scripts/verify-cdn.sh
```

**检查项目：**
- ✅ Nginx配置文件存在性
- ✅ Nginx配置语法正确性
- ✅ 网站响应状态（主站和管理后台）
- ✅ CloudFlare响应头（CF-Cache-Status, CF-Ray）
- ✅ 静态资源缓存配置
- ✅ 构建目录完整性

---

## 🚀 快速开始

### 首次配置流程

1. **配置CloudFlare（在宝塔面板中）**
   ```bash
   # 打开宝塔面板
   # 软件商店 > CloudFlare免费CDN > 添加站点
   # 输入域名和API凭证
   ```

2. **验证配置**
   ```bash
   ./scripts/verify-cdn.sh
   ```

3. **构建和部署**
   ```bash
   ./scripts/deploy-cdn.sh
   ```

4. **清理缓存**
   ```bash
   # 在宝塔CloudFlare插件中点击清理缓存
   # 或使用脚本（需配置API）
   ./scripts/cloudflare-purge-cache.sh
   ```

---

## 📊 日常维护

### 每次更新前端/管理系统后

```bash
# 1. 构建和部署
./scripts/deploy-cdn.sh

# 2. 清理CloudFlare缓存（二选一）
# 方式A：使用宝塔插件（推荐，简单）
# 方式B：使用脚本
./scripts/cloudflare-purge-cache.sh

# 3. 验证配置
./scripts/verify-cdn.sh
```

### 排查问题

```bash
# 检查Nginx错误日志
tail -f /www/wwwlogs/vitufinance.com.error.log

# 检查Nginx访问日志
tail -f /www/wwwlogs/vitufinance.com.log

# 检查后端日志
tail -f /root/.pm2/logs/vitu-backend-error.log

# 测试Nginx配置
nginx -t

# 重载Nginx
systemctl reload nginx

# 查看Nginx状态
systemctl status nginx
```

---

## 🔧 高级配置

### 自定义缓存规则

编辑Nginx配置文件：
```bash
# CloudFlare配置
nano /www/server/panel/vhost/nginx/extension/vitufinance.com/cloudflare.conf

# 静态资源缓存配置
nano /www/server/panel/vhost/nginx/extension/vitufinance.com/cache_static.conf

# 管理后台配置
nano /www/server/panel/vhost/nginx/extension/vitufinance.com/admin.conf
```

修改后测试并重载：
```bash
nginx -t && systemctl reload nginx
```

### 优化构建配置

前端配置：
```bash
nano /www/wwwroot/vitufinance.com/frontend/vite.config.ts
```

管理系统配置：
```bash
nano /www/wwwroot/vitufinance.com/admin/vite.config.js
```

---

## 📈 性能监控

### 查看CloudFlare统计

1. 访问 https://dash.cloudflare.com/
2. 选择域名 `vitufinance.com`
3. 查看分析面板：
   - 请求数量
   - 缓存命中率（建议 >80%）
   - 带宽节省
   - 威胁分析

### 网站性能测试

```bash
# 测试主站
curl -o /dev/null -s -w "时间：%{time_total}s\n状态码：%{http_code}\n" https://vitufinance.com

# 测试管理后台
curl -o /dev/null -s -w "时间：%{time_total}s\n状态码：%{http_code}\n" https://vitufinance.com/admin/

# 查看详细响应头
curl -I https://vitufinance.com
```

在线测试工具：
- Google PageSpeed: https://pagespeed.web.dev/
- WebPageTest: https://www.webpagetest.org/
- GTmetrix: https://gtmetrix.com/

---

## ⚠️ 注意事项

1. **部署前备份**
   - 建议在宝塔面板创建网站备份
   - 或手动备份dist目录

2. **缓存清理**
   - 每次部署后必须清理CloudFlare缓存
   - 否则用户看到的可能是旧版本

3. **构建时间**
   - 前端构建约需要1-3分钟
   - 管理系统构建约需要30秒-1分钟

4. **权限问题**
   - 确保脚本有执行权限：`chmod +x scripts/*.sh`
   - 确保dist目录有正确权限

5. **CloudFlare配置**
   - SSL/TLS模式应设置为"完全（严格）"
   - 确保DNS记录为"已代理"状态（橙色云朵）

---

## 📚 相关文档

- [CloudFlare CDN配置说明](../cloudflare-cdn-配置说明.md)
- [Nginx官方文档](https://nginx.org/en/docs/)
- [CloudFlare官方文档](https://developers.cloudflare.com/)
- [Vite构建文档](https://vitejs.dev/guide/build.html)

---

## 🆘 常见问题

**Q: 部署脚本报错怎么办？**
A: 查看错误信息，通常是npm依赖问题或权限问题。尝试手动执行各步骤排查。

**Q: CloudFlare缓存头未显示？**
A: 检查域名DNS是否接入CloudFlare，在CloudFlare面板确认代理状态为橙色云朵。

**Q: 管理后台访问404？**
A: 检查admin/dist目录是否存在，以及nginx配置是否正确。

**Q: 前端显示空白？**
A: 检查浏览器控制台错误，可能是路径配置问题或构建失败。

---

## 📞 技术支持

遇到问题请检查：
1. `/www/wwwlogs/` 下的日志文件
2. 浏览器开发者工具控制台
3. CloudFlare面板的防火墙事件日志

---

**最后更新：** 2025-12-17
**维护者：** VituFinance 技术团队

