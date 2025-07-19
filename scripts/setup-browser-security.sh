#!/bin/bash

# 浏览器安全配置脚本
# 用于设置安全的浏览器自动化环境

echo "🔒 配置浏览器安全环境..."

# 检查操作系统
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "📋 检测到 Linux 环境"
    
    # 创建专用测试用户（如果不存在）
    if ! id "testweb" &>/dev/null; then
        echo "👤 创建专用测试用户..."
        sudo useradd -m -s /bin/bash testweb
        sudo usermod -aG audio,video testweb
    fi
    
    # 设置正确的权限
    echo "🔧 配置用户权限..."
    sudo mkdir -p /home/testweb/.config
    sudo chown -R testweb:testweb /home/testweb
    
    # 安装必要的依赖
    echo "📦 安装浏览器依赖..."
    sudo apt-get update
    sudo apt-get install -y \
        libnss3 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libxss1 \
        libasound2
        
elif [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📋 检测到 macOS 环境"
    echo "✅ macOS 通常不需要 --no-sandbox 参数"
    
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    echo "📋 检测到 Windows 环境"
    echo "✅ Windows 通常不需要 --no-sandbox 参数"
fi

echo "✅ 浏览器安全环境配置完成"
