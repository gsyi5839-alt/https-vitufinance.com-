#!/bin/bash

# =====================================================
# 查看 Cloudflare 安全配置状态（使用Global Key）
# =====================================================

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "=================================================="
echo -e "${BLUE}  Cloudflare 安全配置状态${NC}"
echo "=================================================="
echo ""

source /www/wwwroot/vitufinance.com/cf-config.env

# API认证头
AUTH_HEADERS="-H \"X-Auth-Email: ${CF_EMAIL}\" -H \"X-Auth-Key: ${CF_GLOBAL_KEY}\""

# 获取安全级别
echo -e "${BLUE}📊 安全级别：${NC}"
security=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/security_level" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json")

security_value=$(echo "$security" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)

case "$security_value" in
    "off")
        echo -e "  ${RED}关闭 (Off)${NC} - 无验证"
        ;;
    "essentially_off")
        echo -e "  ${YELLOW}基本关闭 (Essentially Off)${NC} - 极少验证"
        ;;
    "low")
        echo -e "  ${YELLOW}低 (Low)${NC} - 只对明显威胁验证"
        ;;
    "medium")
        echo -e "  ${GREEN}中等 (Medium)${NC} ⭐ - 对可疑流量验证"
        ;;
    "high")
        echo -e "  ${GREEN}高 (High)${NC} - 对大部分访客验证"
        ;;
    "under_attack")
        echo -e "  ${RED}受攻击模式 (Under Attack!)${NC} - 对所有访客验证"
        ;;
    *)
        echo -e "  ${YELLOW}未知状态${NC}"
        ;;
esac
echo ""

# 获取浏览器检查状态
echo -e "${BLUE}🔍 浏览器完整性检查：${NC}"
browser=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/browser_check" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" | grep -o '"value":"[^"]*"' | cut -d'"' -f4)

if [ "$browser" = "on" ]; then
    echo -e "  ${GREEN}✓ 已启用${NC}"
else
    echo -e "  ${YELLOW}✗ 未启用${NC}"
fi
echo ""

# 获取质询通过时间
echo -e "${BLUE}⏱️  质询通过时间（Cookie有效期）：${NC}"
challenge=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/settings/challenge_ttl" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" | grep -o '"value":[0-9]*' | cut -d':' -f2)

if [ ! -z "$challenge" ]; then
    hours=$((challenge / 3600))
    echo -e "  ${challenge}秒 (${hours}小时)"
else
    echo -e "  ${YELLOW}无法获取${NC}"
fi
echo ""

# 整体状态判断
echo "=================================================="
if [ "$security_value" = "medium" ] || [ "$security_value" = "high" ] || [ "$security_value" = "under_attack" ]; then
    echo -e "${GREEN}✅ 首页访问验证已启用！${NC}"
    echo ""
    echo "当前保护状态："
    echo "  ✓ 可疑流量会被验证"
    echo "  ✓ 机器人访问会被拦截"
    echo "  ✓ DDoS攻击会被缓解"
    echo ""
    echo "用户体验："
    echo "  • 首次访问需要等待1-3秒验证"
    echo "  • 验证通过后Cookie有效期内不重复验证"
    echo "  • 正常用户基本无感知"
elif [ "$security_value" = "low" ]; then
    echo -e "${YELLOW}⚠️  安全验证处于低级别${NC}"
    echo ""
    echo "只对明显的恶意流量进行验证"
    echo ""
    echo "提升安全级别："
    echo "  ./scripts/enable-security-challenge.sh"
else
    echo -e "${RED}❌ 首页验证未启用${NC}"
    echo ""
    echo "运行以下命令启用："
    echo "  ./scripts/enable-security-challenge.sh"
fi
echo "=================================================="
echo ""

# 测试提示
echo -e "${BLUE}💡 测试方法：${NC}"
echo "  1. 清除浏览器缓存"
echo "  2. 访问: https://vitufinance.com/"
echo "  3. 观察是否出现'正在检查您的浏览器'页面"
echo ""

