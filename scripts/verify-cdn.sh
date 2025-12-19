#!/bin/bash
# ==========================================
# CloudFlare CDN 配置验证脚本
# 检查nginx配置和CloudFlare响应头
# ==========================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

DOMAIN="vitufinance.com"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CloudFlare CDN 配置验证${NC}"
echo -e "${GREEN}========================================${NC}"

# ==========================================
# 1. 检查 Nginx 配置文件
# ==========================================
echo -e "\n${YELLOW}[1/5] 检查 Nginx 配置文件...${NC}"

CONFIG_FILES=(
    "/www/server/panel/vhost/nginx/extension/vitufinance.com/cloudflare.conf"
    "/www/server/panel/vhost/nginx/extension/vitufinance.com/cache_static.conf"
    "/www/server/panel/vhost/nginx/extension/vitufinance.com/admin.conf"
)

for file in "${CONFIG_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $(basename $file) 存在"
    else
        echo -e "${RED}✗${NC} $(basename $file) 不存在"
    fi
done

# ==========================================
# 2. 测试 Nginx 配置语法
# ==========================================
echo -e "\n${YELLOW}[2/5] 测试 Nginx 配置语法...${NC}"
if nginx -t 2>&1 | grep -q "successful"; then
    echo -e "${GREEN}✓ Nginx 配置语法正确${NC}"
else
    echo -e "${RED}✗ Nginx 配置有误${NC}"
    nginx -t
fi

# ==========================================
# 3. 检查网站响应
# ==========================================
echo -e "\n${YELLOW}[3/5] 检查网站响应...${NC}"

# 检查主站
echo -e "\n${BLUE}主站 (https://$DOMAIN):${NC}"
RESPONSE=$(curl -sI "https://$DOMAIN" -w "\n%{http_code}" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ HTTP状态码: $HTTP_CODE${NC}"
    
    # 检查CloudFlare头
    if echo "$RESPONSE" | grep -q "cf-cache-status"; then
        CF_STATUS=$(echo "$RESPONSE" | grep -i "cf-cache-status" | cut -d':' -f2 | tr -d ' \r')
        echo -e "${GREEN}✓ CloudFlare缓存状态: $CF_STATUS${NC}"
    else
        echo -e "${YELLOW}⚠ 未检测到CloudFlare缓存头（可能未启用CDN）${NC}"
    fi
    
    # 检查服务器头
    if echo "$RESPONSE" | grep -q "cf-ray"; then
        CF_RAY=$(echo "$RESPONSE" | grep -i "cf-ray" | cut -d':' -f2 | tr -d ' \r')
        echo -e "${GREEN}✓ CloudFlare Ray ID: $CF_RAY${NC}"
    fi
else
    echo -e "${RED}✗ HTTP状态码: $HTTP_CODE${NC}"
fi

# 检查管理后台
echo -e "\n${BLUE}管理后台 (https://$DOMAIN/admin/):${NC}"
ADMIN_RESPONSE=$(curl -sI "https://$DOMAIN/admin/" -w "\n%{http_code}" 2>/dev/null)
ADMIN_HTTP_CODE=$(echo "$ADMIN_RESPONSE" | tail -1)

if [ "$ADMIN_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ 管理后台HTTP状态码: $ADMIN_HTTP_CODE${NC}"
else
    echo -e "${RED}✗ 管理后台HTTP状态码: $ADMIN_HTTP_CODE${NC}"
fi

# ==========================================
# 4. 检查静态资源缓存
# ==========================================
echo -e "\n${YELLOW}[4/5] 检查静态资源缓存配置...${NC}"

# 测试JavaScript文件缓存头
echo -e "\n${BLUE}测试JS文件缓存:${NC}"
JS_RESPONSE=$(curl -sI "https://$DOMAIN/assets/index.js" 2>/dev/null || echo "文件不存在")
if echo "$JS_RESPONSE" | grep -q "Cache-Control"; then
    CACHE_CONTROL=$(echo "$JS_RESPONSE" | grep -i "cache-control" | cut -d':' -f2- | tr -d '\r')
    echo -e "${GREEN}✓ Cache-Control:$CACHE_CONTROL${NC}"
else
    echo -e "${YELLOW}⚠ JS文件不存在或未设置缓存头${NC}"
fi

# ==========================================
# 5. 检查前端和管理系统构建
# ==========================================
echo -e "\n${YELLOW}[5/5] 检查构建目录...${NC}"

# 检查前端dist目录
if [ -d "/www/wwwroot/vitufinance.com/frontend/dist" ]; then
    FILE_COUNT=$(find /www/wwwroot/vitufinance.com/frontend/dist -type f | wc -l)
    echo -e "${GREEN}✓ 前端dist目录存在 ($FILE_COUNT 个文件)${NC}"
else
    echo -e "${RED}✗ 前端dist目录不存在${NC}"
fi

# 检查管理系统dist目录
if [ -d "/www/wwwroot/vitufinance.com/admin/dist" ]; then
    ADMIN_FILE_COUNT=$(find /www/wwwroot/vitufinance.com/admin/dist -type f | wc -l)
    echo -e "${GREEN}✓ 管理系统dist目录存在 ($ADMIN_FILE_COUNT 个文件)${NC}"
else
    echo -e "${RED}✗ 管理系统dist目录不存在${NC}"
fi

# ==========================================
# 总结
# ==========================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}验证完成${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e ""
echo -e "${YELLOW}下一步操作：${NC}"
echo -e "1. 如果CloudFlare头未显示，请检查域名DNS是否已接入CloudFlare"
echo -e "2. 访问 https://dash.cloudflare.com/ 配置缓存规则"
echo -e "3. 部署新版本后清理CloudFlare缓存"
echo -e "4. 使用 ./scripts/deploy-cdn.sh 进行完整部署"
echo -e ""
echo -e "${BLUE}快速命令：${NC}"
echo -e "部署: ./scripts/deploy-cdn.sh"
echo -e "清理缓存: ./scripts/cloudflare-purge-cache.sh"
echo -e "验证配置: ./scripts/verify-cdn.sh"
echo -e "${GREEN}========================================${NC}"

