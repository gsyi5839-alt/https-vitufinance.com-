#!/bin/bash
# ==========================================
# CloudFlare CDN 部署脚本
# 功能：构建前端和管理系统，部署到生产环境
# ==========================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="/www/wwwroot/vitufinance.com"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}CloudFlare CDN 部署脚本${NC}"
echo -e "${GREEN}========================================${NC}"

# 检查是否在项目根目录
cd "$PROJECT_ROOT"

# ==========================================
# 1. 构建前端（Frontend）
# ==========================================
echo -e "\n${YELLOW}[1/5] 构建前端...${NC}"
cd "$PROJECT_ROOT/frontend"

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    npm install
fi

# 构建
echo -e "${YELLOW}执行前端构建...${NC}"
npm run build

# 检查构建输出
if [ ! -d "dist_build" ]; then
    echo -e "${RED}错误: 前端构建失败，dist_build 目录不存在${NC}"
    exit 1
fi

# 清理旧的dist目录并部署新版本
echo -e "${YELLOW}部署前端到生产目录...${NC}"
rm -rf dist
mv dist_build dist

echo -e "${GREEN}✓ 前端构建完成${NC}"

# ==========================================
# 2. 构建管理系统（Admin）
# ==========================================
echo -e "\n${YELLOW}[2/5] 构建管理系统...${NC}"
cd "$PROJECT_ROOT/admin"

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装管理系统依赖...${NC}"
    npm install
fi

# 构建
echo -e "${YELLOW}执行管理系统构建...${NC}"
npm run build

# 检查构建输出
if [ ! -d "dist" ]; then
    echo -e "${RED}错误: 管理系统构建失败，dist 目录不存在${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 管理系统构建完成${NC}"

# ==========================================
# 3. 测试 Nginx 配置
# ==========================================
echo -e "\n${YELLOW}[3/5] 测试 Nginx 配置...${NC}"
if nginx -t; then
    echo -e "${GREEN}✓ Nginx 配置测试通过${NC}"
else
    echo -e "${RED}错误: Nginx 配置有误，请检查配置文件${NC}"
    exit 1
fi

# ==========================================
# 4. 重载 Nginx
# ==========================================
echo -e "\n${YELLOW}[4/5] 重载 Nginx...${NC}"
if systemctl reload nginx; then
    echo -e "${GREEN}✓ Nginx 重载成功${NC}"
else
    echo -e "${RED}错误: Nginx 重载失败${NC}"
    exit 1
fi

# ==========================================
# 5. 清理 CloudFlare 缓存提示
# ==========================================
echo -e "\n${YELLOW}[5/5] CloudFlare 缓存清理提示${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}部署完成！${NC}"
echo -e ""
echo -e "${YELLOW}重要提示：${NC}"
echo -e "请登录 CloudFlare 控制面板清理缓存："
echo -e "1. 访问: https://dash.cloudflare.com/"
echo -e "2. 选择域名: vitufinance.com"
echo -e "3. 进入 '缓存' > '清除缓存'"
echo -e "4. 选择 '清除所有内容' 或 '自定义清除'"
echo -e ""
echo -e "也可以使用宝塔面板的 CloudFlare 插件清理缓存"
echo -e "${YELLOW}========================================${NC}"

# ==========================================
# 部署信息统计
# ==========================================
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}部署信息${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "前端路径: $PROJECT_ROOT/frontend/dist"
echo -e "管理系统路径: $PROJECT_ROOT/admin/dist"
echo -e "部署时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}部署成功完成！${NC}"
echo -e "${GREEN}========================================${NC}"

