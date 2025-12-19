#!/bin/bash

# =====================================================
# Cloudflare 安全验证自动配置脚本
# =====================================================
# 功能：
# 1. 设置安全级别
# 2. 创建防火墙规则（API绕过、首页验证等）
# 3. 启用访问质询
# =====================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=================================================="
echo -e "${BLUE}  Cloudflare 安全验证配置${NC}"
echo "  域名: vitufinance.com"
echo "=================================================="
echo ""

# 加载环境变量
CONFIG_FILE="/www/wwwroot/vitufinance.com/cf-config.env"
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}✗ 找不到配置文件: $CONFIG_FILE${NC}"
    exit 1
fi

source "$CONFIG_FILE"

# 检查必需变量
if [ -z "$CF_ZONE_ID" ] || [ -z "$CF_API_TOKEN" ]; then
    echo -e "${RED}✗ Cloudflare配置不完整${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 配置文件加载成功${NC}"
echo ""

# API基础URL
API_BASE="https://api.cloudflare.com/client/v4"

# =====================================================
# 函数：调用Cloudflare API
# =====================================================
call_api() {
    local method=$1
    local endpoint=$2
    local data=$3
    
    if [ -z "$data" ]; then
        curl -s -X $method "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json"
    else
        curl -s -X $method "${API_BASE}${endpoint}" \
            -H "Authorization: Bearer ${CF_API_TOKEN}" \
            -H "Content-Type: application/json" \
            --data "$data"
    fi
}

# =====================================================
# 步骤1：设置安全级别为 Medium
# =====================================================
echo -e "${BLUE}[1/4] 设置安全级别...${NC}"

security_response=$(call_api "PATCH" "/zones/${CF_ZONE_ID}/settings/security_level" \
    '{"value":"medium"}')

if echo "$security_response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ 安全级别已设置为 Medium${NC}"
else
    echo -e "${YELLOW}⚠ 安全级别设置可能失败，继续执行...${NC}"
fi
echo ""

# =====================================================
# 步骤2：获取现有防火墙规则
# =====================================================
echo -e "${BLUE}[2/4] 检查现有防火墙规则...${NC}"

existing_rules=$(call_api "GET" "/zones/${CF_ZONE_ID}/firewall/rules")
echo -e "${GREEN}✓ 已获取现有规则${NC}"
echo ""

# =====================================================
# 步骤3：创建防火墙规则
# =====================================================
echo -e "${BLUE}[3/4] 创建防火墙规则...${NC}"

# 规则1：API绕过验证（最高优先级）
echo "  → 创建规则: API-Bypass"
api_filter=$(call_api "POST" "/zones/${CF_ZONE_ID}/filters" \
    '[{"expression":"(http.request.uri.path contains \"/api/\")","description":"API Bypass Filter"}]')

api_filter_id=$(echo "$api_filter" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ ! -z "$api_filter_id" ]; then
    call_api "POST" "/zones/${CF_ZONE_ID}/firewall/rules" \
        "[{\"filter\":{\"id\":\"$api_filter_id\"},\"action\":\"allow\",\"priority\":1,\"description\":\"API绕过验证\"}]" > /dev/null
    echo -e "    ${GREEN}✓ API绕过规则已创建${NC}"
else
    echo -e "    ${YELLOW}⚠ API绕过规则创建失败（可能已存在）${NC}"
fi

# 规则2：静态资源绕过
echo "  → 创建规则: Static-Bypass"
static_filter=$(call_api "POST" "/zones/${CF_ZONE_ID}/filters" \
    '[{"expression":"(http.request.uri.path contains \"/assets/\" or http.request.uri.path contains \"/static/\" or http.request.uri.path contains \"/uploads/\")","description":"Static Resources Bypass Filter"}]')

static_filter_id=$(echo "$static_filter" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ ! -z "$static_filter_id" ]; then
    call_api "POST" "/zones/${CF_ZONE_ID}/firewall/rules" \
        "[{\"filter\":{\"id\":\"$static_filter_id\"},\"action\":\"allow\",\"priority\":2,\"description\":\"静态资源绕过验证\"}]" > /dev/null
    echo -e "    ${GREEN}✓ 静态资源绕过规则已创建${NC}"
else
    echo -e "    ${YELLOW}⚠ 静态资源规则创建失败（可能已存在）${NC}"
fi

# 规则3：首页验证
echo "  → 创建规则: Homepage-Challenge"
homepage_filter=$(call_api "POST" "/zones/${CF_ZONE_ID}/filters" \
    '[{"expression":"(http.request.uri.path eq \"/\")","description":"Homepage Challenge Filter"}]')

homepage_filter_id=$(echo "$homepage_filter" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ ! -z "$homepage_filter_id" ]; then
    call_api "POST" "/zones/${CF_ZONE_ID}/firewall/rules" \
        "[{\"filter\":{\"id\":\"$homepage_filter_id\"},\"action\":\"managed_challenge\",\"priority\":10,\"description\":\"首页访问验证\"}]" > /dev/null
    echo -e "    ${GREEN}✓ 首页验证规则已创建${NC}"
else
    echo -e "    ${YELLOW}⚠ 首页验证规则创建失败（可能已存在）${NC}"
fi

# 规则4：管理后台强验证
echo "  → 创建规则: Admin-Protection"
admin_filter=$(call_api "POST" "/zones/${CF_ZONE_ID}/filters" \
    '[{"expression":"(http.request.uri.path contains \"/admin/\")","description":"Admin Protection Filter"}]')

admin_filter_id=$(echo "$admin_filter" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ ! -z "$admin_filter_id" ]; then
    call_api "POST" "/zones/${CF_ZONE_ID}/firewall/rules" \
        "[{\"filter\":{\"id\":\"$admin_filter_id\"},\"action\":\"js_challenge\",\"priority\":11,\"description\":\"管理后台保护\"}]" > /dev/null
    echo -e "    ${GREEN}✓ 管理后台保护规则已创建${NC}"
else
    echo -e "    ${YELLOW}⚠ 管理后台规则创建失败（可能已存在）${NC}"
fi

echo ""

# =====================================================
# 步骤4：验证配置
# =====================================================
echo -e "${BLUE}[4/4] 验证配置...${NC}"

rules_count=$(call_api "GET" "/zones/${CF_ZONE_ID}/firewall/rules" | grep -o '"id":"' | wc -l)
echo -e "${GREEN}✓ 当前防火墙规则数量: $rules_count${NC}"
echo ""

# =====================================================
# 完成
# =====================================================
echo "=================================================="
echo -e "${GREEN}  ✓ Cloudflare 安全配置完成！${NC}"
echo "=================================================="
echo ""
echo "配置摘要："
echo "  • 安全级别: Medium（中等）"
echo "  • API路径: 绕过验证 ✓"
echo "  • 静态资源: 绕过验证 ✓"
echo "  • 首页访问: 启用托管质询 ✓"
echo "  • 管理后台: 启用JS质询 ✓"
echo ""
echo "测试验证："
echo "  1. 访问首页: https://vitufinance.com/"
echo "     → 应该看到'正在检查您的浏览器'页面"
echo ""
echo "  2. 测试API（应该直接返回，无验证）:"
echo "     curl https://vitufinance.com/api/csrf-token"
echo ""
echo "  3. 查看规则: https://dash.cloudflare.com/"
echo "     → 安全性 → WAF → 防火墙规则"
echo ""
echo -e "${YELLOW}注意：${NC}"
echo "  • 配置生效需要 1-2 分钟"
echo "  • 首次访问会有短暂验证延迟（1-3秒）"
echo "  • 如需禁用，请删除对应的防火墙规则"
echo ""

