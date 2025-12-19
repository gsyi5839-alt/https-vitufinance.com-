#!/bin/bash

# =====================================================
# 查看 Cloudflare 安全配置状态
# =====================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo -e "${BLUE}  Cloudflare 安全配置状态${NC}"
echo "=================================================="
echo ""

source /www/wwwroot/vitufinance.com/cf-config.env

# 获取安全级别
echo -e "${BLUE}安全级别：${NC}"
security=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_level" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)
echo "  $security"
echo ""

# 获取浏览器检查状态
echo -e "${BLUE}浏览器完整性检查：${NC}"
browser=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/browser_check" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)
echo "  $browser"
echo ""

# 获取质询通过时间
echo -e "${BLUE}质询通过时间：${NC}"
challenge=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/challenge_ttl" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" | grep -o '"value":[0-9]*' | cut -d':' -f2)
echo "  ${challenge}秒"
echo ""

# 状态说明
echo "=================================================="
if [ "$security" = "medium" ] || [ "$security" = "high" ]; then
    echo -e "${GREEN}✓ 首页验证已启用${NC}"
    echo ""
    echo "访问 https://vitufinance.com/ 会看到验证页面"
else
    echo -e "${YELLOW}⚠ 首页验证未启用${NC}"
    echo ""
    echo "运行以下命令启用："
    echo "  ./scripts/enable-security-challenge.sh"
fi
echo "=================================================="
echo ""

