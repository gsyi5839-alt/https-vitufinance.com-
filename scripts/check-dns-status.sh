#!/bin/bash
# ==========================================
# DNS状态检查脚本
# 自动检查DNS是否已切换到CloudFlare
# ==========================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="vitufinance.com"
ENV_FILE="/www/wwwroot/vitufinance.com/cloudflare-config.env"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}DNS状态检查 - $DOMAIN${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查配置文件
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: CloudFlare配置文件不存在${NC}"
    exit 1
fi

# 加载配置
source "$ENV_FILE"

echo -e "\n${YELLOW}[1/5] 检查DNS服务器...${NC}"
DNS_SERVERS=$(dig $DOMAIN NS +short 2>/dev/null)

if echo "$DNS_SERVERS" | grep -q "cloudflare.com"; then
    echo -e "${GREEN}✓ DNS已切换到CloudFlare${NC}"
    echo "$DNS_SERVERS" | while read line; do echo -e "  ${GREEN}→${NC} $line"; done
    DNS_OK=true
else
    echo -e "${RED}✗ DNS尚未切换到CloudFlare${NC}"
    echo -e "${YELLOW}当前DNS服务器：${NC}"
    echo "$DNS_SERVERS" | while read line; do echo -e "  ${YELLOW}→${NC} $line"; done
    echo -e "\n${YELLOW}应该是：${NC}"
    echo -e "  ${YELLOW}→${NC} jaziel.ns.cloudflare.com"
    echo -e "  ${YELLOW}→${NC} rita.ns.cloudflare.com"
    DNS_OK=false
fi

echo -e "\n${YELLOW}[2/5] 检查域名解析...${NC}"
IP_ADDRESS=$(dig $DOMAIN A +short 2>/dev/null | head -1)
if [ -n "$IP_ADDRESS" ]; then
    echo -e "${GREEN}✓ 域名解析正常${NC}"
    echo -e "  ${GREEN}→${NC} IP地址: $IP_ADDRESS"
else
    echo -e "${RED}✗ 域名解析失败${NC}"
fi

echo -e "\n${YELLOW}[3/5] 检查CloudFlare响应头...${NC}"
CF_HEADERS=$(curl -sI "https://$DOMAIN" 2>/dev/null | grep -i "cf-")

if [ -n "$CF_HEADERS" ]; then
    echo -e "${GREEN}✓ 检测到CloudFlare响应头${NC}"
    echo "$CF_HEADERS" | while read line; do echo -e "  ${GREEN}→${NC} $line"; done
    CF_OK=true
else
    echo -e "${YELLOW}⚠ 未检测到CloudFlare响应头（可能DNS未完全生效）${NC}"
    CF_OK=false
fi

echo -e "\n${YELLOW}[4/5] 检查网站可访问性...${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" 2>/dev/null)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 网站可正常访问 (HTTP $HTTP_CODE)${NC}"
elif [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo -e "${GREEN}✓ 网站重定向 (HTTP $HTTP_CODE)${NC}"
else
    echo -e "${RED}✗ 网站访问异常 (HTTP $HTTP_CODE)${NC}"
fi

echo -e "\n${YELLOW}[5/5] 查询CloudFlare API状态...${NC}"
API_RESPONSE=$(curl -s -X GET "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json")

if echo "$API_RESPONSE" | grep -q '"success":true'; then
    STATUS=$(echo "$API_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result']['status'])" 2>/dev/null)
    ACTIVATED=$(echo "$API_RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d['result']['activated_on'] or '未激活')" 2>/dev/null)
    
    if [ "$STATUS" = "active" ]; then
        echo -e "${GREEN}✓ CloudFlare状态: $STATUS${NC}"
        echo -e "${GREEN}✓ 激活时间: $ACTIVATED${NC}"
    elif [ "$STATUS" = "pending" ]; then
        echo -e "${YELLOW}⏳ CloudFlare状态: $STATUS (等待DNS生效)${NC}"
        echo -e "${YELLOW}⏳ 激活时间: $ACTIVATED${NC}"
    else
        echo -e "${RED}✗ CloudFlare状态: $STATUS${NC}"
    fi
else
    echo -e "${RED}✗ API查询失败${NC}"
fi

# 总结
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}检查结果总结${NC}"
echo -e "${GREEN}========================================${NC}"

if [ "$DNS_OK" = true ] && [ "$CF_OK" = true ]; then
    echo -e "${GREEN}✓✓✓ CloudFlare CDN已完全激活！${NC}"
    echo -e ""
    echo -e "${YELLOW}下一步操作：${NC}"
    echo -e "1. 运行部署脚本："
    echo -e "   ${GREEN}cd /www/wwwroot/vitufinance.com && ./scripts/deploy-cdn.sh${NC}"
    echo -e ""
    echo -e "2. 清理CloudFlare缓存："
    echo -e "   ${GREEN}./scripts/cdn-clear-cache.sh${NC}"
    echo -e ""
    echo -e "3. 验证配置："
    echo -e "   ${GREEN}./scripts/verify-cdn.sh${NC}"
elif [ "$DNS_OK" = true ] && [ "$CF_OK" = false ]; then
    echo -e "${YELLOW}⏳ DNS已切换，但CloudFlare尚未完全生效${NC}"
    echo -e "${YELLOW}请等待5-30分钟，然后重新运行此脚本${NC}"
    echo -e ""
    echo -e "${BLUE}重新检查命令：${NC}"
    echo -e "${GREEN}./scripts/check-dns-status.sh${NC}"
else
    echo -e "${RED}❌ DNS尚未切换到CloudFlare${NC}"
    echo -e ""
    echo -e "${YELLOW}请按照以下步骤操作：${NC}"
    echo -e "1. 登录域名注册商（July DNS）"
    echo -e "2. 修改DNS服务器为："
    echo -e "   ${GREEN}jaziel.ns.cloudflare.com${NC}"
    echo -e "   ${GREEN}rita.ns.cloudflare.com${NC}"
    echo -e "3. 等待DNS生效（5分钟-24小时）"
    echo -e "4. 重新运行此脚本检查"
    echo -e ""
    echo -e "${BLUE}详细指南：${NC}"
    echo -e "${GREEN}cat /www/wwwroot/vitufinance.com/CloudFlare-DNS配置指南.md${NC}"
fi

echo -e "${GREEN}========================================${NC}"
echo -e "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}========================================${NC}"

