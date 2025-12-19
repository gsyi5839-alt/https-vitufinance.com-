#!/bin/bash
# ==========================================
# CloudFlare 缓存清理脚本
# 使用 CloudFlare API 清理缓存
# ==========================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# CloudFlare 配置（需要在宝塔CloudFlare插件中获取）
# 或者手动设置环境变量
CF_ZONE_ID="${CF_ZONE_ID:-}"
CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_EMAIL="${CF_EMAIL:-}"
CF_API_KEY="${CF_API_KEY:-}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CloudFlare 缓存清理脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查配置方式
if [ -z "$CF_ZONE_ID" ]; then
    echo -e "${RED}错误: 未设置 CF_ZONE_ID${NC}"
    echo -e "${YELLOW}请在宝塔CloudFlare插件中查看Zone ID${NC}"
    echo -e "${YELLOW}或设置环境变量: export CF_ZONE_ID='your-zone-id'${NC}"
    exit 1
fi

# 检查认证方式（API Token 或 Email + API Key）
if [ -z "$CF_API_TOKEN" ] && [ -z "$CF_EMAIL" ]; then
    echo -e "${RED}错误: 未设置认证信息${NC}"
    echo -e "${YELLOW}请选择以下方式之一：${NC}"
    echo -e "1. API Token (推荐): export CF_API_TOKEN='your-api-token'"
    echo -e "2. Email + API Key: export CF_EMAIL='your-email' && export CF_API_KEY='your-api-key'"
    exit 1
fi

# 构建请求头
if [ -n "$CF_API_TOKEN" ]; then
    # 使用 API Token
    AUTH_HEADER="Authorization: Bearer $CF_API_TOKEN"
else
    # 使用 Email + API Key
    AUTH_HEADER="X-Auth-Email: $CF_EMAIL"
    AUTH_KEY_HEADER="X-Auth-Key: $CF_API_KEY"
fi

# 清理所有缓存
echo -e "\n${YELLOW}正在清理所有缓存...${NC}"

if [ -n "$CF_API_TOKEN" ]; then
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
        -H "$AUTH_HEADER" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}')
else
    RESPONSE=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$CF_ZONE_ID/purge_cache" \
        -H "$AUTH_HEADER" \
        -H "$AUTH_KEY_HEADER" \
        -H "Content-Type: application/json" \
        --data '{"purge_everything":true}')
fi

# 检查响应
if echo "$RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ 缓存清理成功！${NC}"
    echo -e "${GREEN}所有 CloudFlare 缓存已清空${NC}"
else
    echo -e "${RED}✗ 缓存清理失败${NC}"
    echo -e "${RED}API 响应: $RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}缓存清理完成${NC}"
echo -e "${GREEN}========================================${NC}"

