#!/bin/bash

# =====================================================
# 关闭 Cloudflare 首页验证
# =====================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=================================================="
echo -e "${BLUE}  关闭 Cloudflare 首页验证${NC}"
echo "=================================================="
echo ""

source /www/wwwroot/vitufinance.com/cf-config.env

# 设置安全级别为Low
echo -e "${BLUE}关闭安全验证...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_level" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"value":"essentially_off"}' > /dev/null

echo -e "${GREEN}✓ 安全验证已关闭${NC}"
echo ""
echo "当前状态："
echo "  • 安全级别: Essentially Off（基本关闭）"
echo "  • 访问首页不再需要验证"
echo ""

