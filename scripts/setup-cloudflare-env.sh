#!/bin/bash
# ==========================================
# CloudFlare 环境变量配置脚本
# 用于设置API凭证（用于缓存清理脚本）
# ==========================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CloudFlare API 凭证配置${NC}"
echo -e "${GREEN}========================================${NC}"

# 配置文件路径
ENV_FILE="/www/wwwroot/vitufinance.com/.env.cloudflare"

echo -e "\n${YELLOW}请输入以下信息（输入将被隐藏）：${NC}\n"

# 获取Zone ID
echo -ne "${YELLOW}Zone ID: ${NC}"
read -r ZONE_ID

# 获取配置方式
echo -e "\n${YELLOW}选择认证方式：${NC}"
echo "1. API Token（推荐，更安全）"
echo "2. Global API Key"
echo -ne "${YELLOW}请选择 [1/2]: ${NC}"
read -r AUTH_TYPE

if [ "$AUTH_TYPE" = "1" ]; then
    # API Token
    echo -ne "${YELLOW}API Token: ${NC}"
    read -rs API_TOKEN
    echo ""
    
    # 写入配置文件
    cat > "$ENV_FILE" << EOF
# CloudFlare API 配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# 认证方式: API Token

export CF_ZONE_ID="$ZONE_ID"
export CF_API_TOKEN="$API_TOKEN"
EOF

else
    # Global API Key
    echo -ne "${YELLOW}E-Mail: ${NC}"
    read -r EMAIL
    echo -ne "${YELLOW}Global API Key: ${NC}"
    read -rs API_KEY
    echo ""
    
    # 写入配置文件
    cat > "$ENV_FILE" << EOF
# CloudFlare API 配置
# 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
# 认证方式: Global API Key

export CF_ZONE_ID="$ZONE_ID"
export CF_EMAIL="$EMAIL"
export CF_API_KEY="$API_KEY"
EOF

fi

# 设置文件权限（仅root可读写）
chmod 600 "$ENV_FILE"

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 配置已保存到: $ENV_FILE${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}使用方法：${NC}"
echo -e "1. 加载环境变量："
echo -e "   ${GREEN}source $ENV_FILE${NC}"
echo -e ""
echo -e "2. 清理CloudFlare缓存："
echo -e "   ${GREEN}source $ENV_FILE && /www/wwwroot/vitufinance.com/scripts/cloudflare-purge-cache.sh${NC}"
echo -e ""
echo -e "3. 或者直接使用快捷脚本："
echo -e "   ${GREEN}/www/wwwroot/vitufinance.com/scripts/cdn-clear-cache.sh${NC}"

echo -e "\n${RED}⚠️  安全提醒：${NC}"
echo -e "- 此文件包含敏感信息，权限已设置为仅root可读"
echo -e "- 不要将此文件提交到Git仓库"
echo -e "- 定期更换API凭证以保证安全"

echo -e "\n${GREEN}========================================${NC}"

