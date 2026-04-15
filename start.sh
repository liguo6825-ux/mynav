#!/bin/bash

# MyNav 个人版 - 快速启动脚本 (Node.js 版本)
# 使用方法: ./start.sh

echo "================================"
echo "  MyNav 个人版 - 启动中..."
echo "================================"

# 进入 Node.js 版本目录
cd "$(dirname "$0")/nodejs-version"

# 检查 Node.js 是否安装
if ! command -v node &> /dev/null; then
    echo "错误: 未找到 Node.js，请先安装 Node.js"
    exit 1
fi

# 检查依赖是否安装
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install --registry=https://registry.npmmirror.com
fi

# 创建必要的目录
mkdir -p data
mkdir -p backups

# 获取本机 IP
IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')

echo ""
echo "访问地址:"
echo "  本机: http://localhost:3000"
if [ -n "$IP" ]; then
    echo "  局域网: http://$IP:3000"
fi
echo ""
echo "默认账号: admin"
echo "默认密码: admin123"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "================================"
echo ""

# 启动 Node.js 服务器
node server.js
