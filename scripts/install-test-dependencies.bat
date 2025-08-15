@echo off
REM 测试工具依赖安装脚本

echo 🚀 安装测试工具依赖...

REM 核心依赖
npm install axios joi playwright @playwright/test dns net lighthouse chrome-launcher puppeteer helmet ssl-checker cheerio robots-parser http https cluster axe-core

REM 开发依赖
npm install --save-dev @types/node

echo ✅ 依赖安装完成！
pause
