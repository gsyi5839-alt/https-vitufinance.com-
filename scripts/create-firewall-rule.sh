#!/bin/bash

# =====================================================
# 创建防火墙规则 - 对首页强制JS验证
# =====================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================================="
echo -e "${BLUE}  创建首页强制验证规则${NC}"
echo "=================================================="
echo ""

source /www/wwwroot/vitufinance.com/cf-config.env

# 步骤1：创建过滤器
echo -e "${BLUE}[1/2] 创建过滤器...${NC}"

filter_response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/filters" \
  -H "X-Auth-Email: ${CF_EMAIL}" \
  -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
  -H "Content-Type: application/json" \
  --data '[{
    "expression": "(http.request.uri.path eq \"/\")",
    "description": "Homepage Challenge Filter"
  }]')

filter_id=$(echo "$filter_response" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ ! -z "$filter_id" ]; then
    echo -e "${GREEN}✓ 过滤器创建成功: $filter_id${NC}"
    echo ""
    
    # 步骤2：创建防火墙规则
    echo -e "${BLUE}[2/2] 创建防火墙规则...${NC}"
    
    rule_response=$(curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/firewall/rules" \
      -H "X-Auth-Email: ${CF_EMAIL}" \
      -H "X-Auth-Key: ${CF_GLOBAL_KEY}" \
      -H "Content-Type: application/json" \
      --data "[{
        \"filter\": {\"id\": \"$filter_id\"},
        \"action\": \"js_challenge\",
        \"priority\": 1,
        \"description\": \"首页JS验证（强制所有访客）\"
      }]")
    
    if echo "$rule_response" | grep -q '"success":true'; then
        echo -e "${GREEN}✓ 防火墙规则创建成功${NC}"
        echo ""
        echo "=================================================="
        echo -e "${GREEN}  ✓ 规则创建完成！${NC}"
        echo "=================================================="
        echo ""
        echo "规则详情："
        echo "  • 过滤器ID: $filter_id"
        echo "  • 作用路径: /"
        echo "  • 验证类型: JS Challenge"
        echo "  • 优先级: 1（最高）"
        echo ""
        echo "效果："
        echo "  ✓ 所有访问首页的请求都会被JS验证"
        echo "  ✓ 包括TokenPocket、MetaMask等钱包浏览器"
        echo "  ✓ 验证时间约3-5秒"
        echo ""
    else
        echo -e "${YELLOW}⚠ 规则创建失败，可能已存在${NC}"
        echo "响应: $rule_response"
    fi
else
    echo -e "${YELLOW}⚠ 过滤器创建失败，可能已存在类似规则${NC}"
    echo ""
    echo "您可以在Cloudflare面板手动创建："
    echo "1. 访问: https://dash.cloudflare.com/"
    echo "2. 选择: vitufinance.com"
    echo "3. 安全性 → WAF → 防火墙规则"
    echo "4. 创建规则："
    echo "   表达式: (http.request.uri.path eq \"/\")"
    echo "   动作: JS Challenge"
fi

echo ""

