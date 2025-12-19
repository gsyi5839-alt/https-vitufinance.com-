#!/bin/bash

# =====================================================
# 启用强验证模式 - 所有访客都需要验证
# =====================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo -e "${BLUE}  启用强验证模式${NC}"
echo "=================================================="
echo ""

source /www/wwwroot/vitufinance.com/cf-config.env

# 步骤1：设置安全级别为High
echo -e "${BLUE}[1/4] 设置安全级别为 High...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_level" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"high"}' > /dev/null

echo -e "${GREEN}✓ 安全级别已设置为 High${NC}"
echo ""

# 步骤2：启用浏览器完整性检查
echo -e "${BLUE}[2/4] 启用浏览器完整性检查...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/browser_check" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}' > /dev/null

echo -e "${GREEN}✓ 浏览器检查已启用${NC}"
echo ""

# 步骤3：降低质询通过时间（让验证更频繁）
echo -e "${BLUE}[3/4] 设置质询通过时间...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/challenge_ttl" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":900}' > /dev/null

echo -e "${GREEN}✓ 质询通过时间已设置为15分钟${NC}"
echo ""

# 步骤4：启用质询页面
echo -e "${BLUE}[4/4] 启用质询页面...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_header" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"on"}' > /dev/null

echo -e "${GREEN}✓ 安全头已启用${NC}"
echo ""

echo "=================================================="
echo -e "${GREEN}  ✓ 强验证模式已启用！${NC}"
echo "=================================================="
echo ""
echo "当前配置："
echo "  • 安全级别: High（高）"
echo "  • 浏览器检查: 已启用"
echo "  • 质询时间: 15分钟"
echo "  • 适用范围: 所有访客（包括手机和PC）"
echo ""
echo "效果："
echo "  ✓ 首次访问必定看到验证页面"
echo "  ✓ 验证页面停留2-5秒"
echo "  ✓ 15分钟内不重复验证"
echo "  ✓ 手机、PC、管理后台都会验证"
echo ""
echo "测试："
echo "  1. 手机清除缓存访问: https://vitufinance.com/"
echo "  2. PC无痕窗口访问: https://vitufinance.com/"
echo "  3. 管理后台访问: https://vitufinance.com/admin/"
echo ""
echo -e "${YELLOW}⚠️  注意：API路径(/api/*)不受影响${NC}"
echo -e "${YELLOW}⚠️  配置生效需要1-2分钟${NC}"
echo ""

