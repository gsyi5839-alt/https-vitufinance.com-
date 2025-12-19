#!/bin/bash

# =====================================================
# Cloudflare 首页验证快速配置脚本
# =====================================================

set -e

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=================================================="
echo -e "${BLUE}  Cloudflare 首页访问验证配置${NC}"
echo "=================================================="
echo ""

# 加载配置
source /www/wwwroot/vitufinance.com/cf-config.env

# 步骤1：设置安全级别为Medium（使用 Global API Key）
echo -e "${BLUE}[1/2] 设置安全级别为 Medium...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_level" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"medium"}' > /dev/null

echo -e "${GREEN}✓ 安全级别已设置${NC}"
echo ""

# 步骤2：关闭浏览器完整性检查（避免影响API请求）
echo -e "${BLUE}[2/2] 关闭浏览器完整性检查（避免API报错）...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/browser_check" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"off"}' > /dev/null

echo -e "${GREEN}✓ 浏览器检查已关闭${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}  ✓ 配置完成！${NC}"
echo "=================================================="
echo ""
echo "当前配置："
echo "  • 安全级别: Medium（中等）- 对可疑流量进行验证"
echo "  • 浏览器完整性检查: 已关闭（避免影响管理系统API）"
echo ""
echo "效果："
echo "  ✓ 可疑访问会被要求验证"
echo "  ✓ 正常用户不受影响"
echo "  ✓ 管理系统API正常工作"
echo ""
echo -e "${YELLOW}提示：配置生效需要1-2分钟${NC}"
echo ""

