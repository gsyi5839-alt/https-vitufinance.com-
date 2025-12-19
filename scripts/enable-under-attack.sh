#!/bin/bash

# =====================================================
# 启用"我正在受到攻击"模式 - 最强验证
# =====================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo -e "${RED}  启用"我正在受到攻击"模式${NC}"
echo "=================================================="
echo ""
echo -e "${YELLOW}⚠️  警告：此模式会对所有访客进行验证${NC}"
echo -e "${YELLOW}⚠️  用户体验会受到一定影响${NC}"
echo ""
read -p "确认启用？(y/n): " confirm

if [ "$confirm" != "y" ]; then
    echo "已取消"
    exit 0
fi

echo ""
source /www/wwwroot/vitufinance.com/cf-config.env

echo -e "${BLUE}设置为"受攻击"模式...${NC}"
curl -s -X PATCH "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_level" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '{"value":"under_attack"}' > /dev/null

echo -e "${GREEN}✓ "受攻击"模式已启用${NC}"
echo ""

echo "=================================================="
echo -e "${RED}  ⚠️  最强验证模式已启用！${NC}"
echo "=================================================="
echo ""
echo "当前配置："
echo "  • 安全级别: Under Attack（受攻击）"
echo "  • 验证强度: 最高"
echo "  • 适用范围: 所有访客"
echo ""
echo "效果："
echo "  ✓ 100%访客都需要通过验证"
echo "  ✓ 验证页面停留5秒左右"
echo "  ✓ 最强的DDoS防护"
echo ""
echo -e "${YELLOW}建议：攻击结束后，请恢复到High或Medium级别${NC}"
echo ""
echo "恢复命令："
echo "  ./scripts/enable-strong-challenge.sh    (High级别)"
echo "  ./scripts/enable-security-challenge.sh  (Medium级别)"
echo ""

