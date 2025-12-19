#!/bin/bash
# ==========================================
# CloudFlare 缓存清理快捷脚本
# 自动加载环境变量并清理缓存
# ==========================================

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENV_FILE="/www/wwwroot/vitufinance.com/cloudflare-config.env"
SCRIPT_DIR="/www/wwwroot/vitufinance.com/scripts"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CloudFlare 缓存清理${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查环境变量配置文件是否存在
if [ ! -f "$ENV_FILE" ]; then
    echo -e "${RED}错误: 未找到CloudFlare API配置文件${NC}"
    echo -e "${YELLOW}请先运行配置脚本：${NC}"
    echo -e "${GREEN}$SCRIPT_DIR/setup-cloudflare-env.sh${NC}"
    exit 1
fi

# 加载环境变量
echo -e "${YELLOW}加载API配置...${NC}"
source "$ENV_FILE"

# 检查是否成功加载
if [ -z "$CF_ZONE_ID" ]; then
    echo -e "${RED}错误: 配置文件损坏，Zone ID未找到${NC}"
    exit 1
fi

# 执行缓存清理脚本
echo -e "${YELLOW}执行缓存清理...${NC}\n"
"$SCRIPT_DIR/cloudflare-purge-cache.sh"

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ 缓存清理成功完成${NC}"
    echo -e "${GREEN}========================================${NC}"
else
    echo -e "\n${RED}========================================${NC}"
    echo -e "${RED}✗ 缓存清理失败${NC}"
    echo -e "${RED}========================================${NC}"
    exit $EXIT_CODE
fi

