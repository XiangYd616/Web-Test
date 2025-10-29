# Chrome/Puppeteer 配置指南

## 📋 概述

本指南帮助你配置 Chrome 浏览器，以启用性能测试功能（Lighthouse、截图对比等）。

---

## 🚀 快速配置

### 方式一：自动安装 Chromium（推荐）

Puppeteer 会自动下载适配的 Chromium 浏览器。

```bash
# 进入后端目录
cd backend

# Puppeteer 已在依赖中，执行 npm install 时会自动下载
npm install

# 国内用户可能需要设置镜像
$env:PUPPETEER_DOWNLOAD_HOST="https://npmmirror.com/mirrors"
npm install puppeteer --force
```

**优点**: 版本兼容，无需手动配置  
**缺点**: 下载较慢（~170MB）

---

### 方式二：使用系统已安装的 Chrome（快速）

如果你已经安装了 Google Chrome，可以直接使用。

#### Windows:

1. **查找 Chrome 路径**:
   ```powershell
   # Chrome 通常安装在这些位置之一
   $chromePaths = @(
       "C:\Program Files\Google\Chrome\Application\chrome.exe",
       "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
       "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
   )
   
   foreach ($path in $chromePaths) {
       if (Test-Path $path) {
           Write-Host "✓ 找到 Chrome: $path" -ForegroundColor Green
       }
   }
   ```

2. **配置环境变量**:
   
   在 `backend/.env` 文件中添加：
   ```bash
   # 跳过 Chromium 下载
   PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
   
   # 指定 Chrome 路径 (根据实际路径修改)
   PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
   ```

3. **如果 Chrome 未安装，下载安装**:
   - 官方网站: https://www.google.com/chrome/
   - 或使用 Winget: `winget install Google.Chrome`

#### Linux:

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install chromium-browser

# 或安装 Google Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo dpkg -i google-chrome-stable_current_amd64.deb

# 配置环境变量
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> backend/.env
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser" >> backend/.env
# 或
echo "PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome" >> backend/.env
```

#### macOS:

```bash
# 使用 Homebrew 安装
brew install --cask google-chrome

# 配置环境变量
echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" >> backend/.env
echo 'PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' >> backend/.env
```

---

### 方式三：Docker 环境（推荐生产环境）

Docker 环境已预装 Chromium，无需额外配置。

```bash
# 使用开发环境 Docker（已包含 Chromium）
docker compose -f docker-compose.dev.yml up -d
```

---

## ✅ 验证配置

### 1. 检查 Puppeteer 是否可用

创建测试脚本 `backend/scripts/test-chrome.js`:

```javascript
const puppeteer = require('puppeteer');

async function testChrome() {
  console.log('🔍 测试 Chrome/Puppeteer 配置...\n');
  
  try {
    // 启动浏览器
    console.log('启动浏览器...');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    // 获取版本
    const version = await browser.version();
    console.log(`✅ Chrome 版本: ${version}`);
    
    // 打开页面测试
    console.log('测试页面加载...');
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    console.log(`✅ 页面标题: ${title}`);
    
    // 关闭浏览器
    await browser.close();
    
    console.log('\n✅ Chrome/Puppeteer 配置成功！');
    console.log('性能测试功能现已可用。');
    
  } catch (error) {
    console.error('\n❌ Chrome/Puppeteer 配置失败:');
    console.error(error.message);
    console.log('\n💡 解决方案:');
    console.log('1. 安装 Chrome: https://www.google.com/chrome/');
    console.log('2. 或让 Puppeteer 自动下载: npm install puppeteer --force');
    console.log('3. 检查环境变量配置是否正确');
    process.exit(1);
  }
}

testChrome();
```

运行测试:
```bash
node backend/scripts/test-chrome.js
```

### 2. 使用依赖检测器

```bash
# 运行完整依赖检测
npm run --prefix backend check:deps
```

期望输出:
```
🔧 检查重要依赖...
✓ Chrome/Chromium 120.0.6099.109
```

---

## 🎯 启用的功能

配置完成后，以下功能将可用:

### ✅ 性能测试
- **Lighthouse 分析**: 性能、可访问性、SEO、最佳实践评分
- **Core Web Vitals**: LCP、FID、CLS 指标
- **资源加载分析**: JavaScript、CSS、图片等资源优化建议

### ✅ 截图对比
- **视觉回归测试**: 页面截图对比
- **响应式设计测试**: 不同设备尺寸测试

### ✅ 浏览器自动化
- **页面渲染测试**: JavaScript 执行后的完整页面
- **交互测试**: 模拟用户点击、输入等操作

---

## 🐛 常见问题

### Q1: Puppeteer 下载 Chromium 失败

**症状**: `ERROR: Failed to download Chromium`

**解决**:
```powershell
# Windows - 使用国内镜像
$env:PUPPETEER_DOWNLOAD_HOST="https://npmmirror.com/mirrors"
$env:PUPPETEER_DOWNLOAD_BASE_URL="https://npmmirror.com/mirrors/chromium-browser-snapshots"
npm install puppeteer --force

# 或直接使用系统 Chrome
$env:PUPPETEER_SKIP_CHROMIUM_DOWNLOAD="true"
npm install puppeteer
```

### Q2: 启动浏览器报错 `Could not find Chrome`

**解决**:
1. 确认 Chrome 已安装
2. 检查 `backend/.env` 中的路径配置
3. 使用绝对路径，确保路径正确

### Q3: Linux 服务器无法启动 Chrome

**症状**: `Failed to launch chrome! No usable sandbox!`

**解决**:
```bash
# 方案1: 安装依赖
sudo apt-get install -y \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libc6 \
  libcairo2 \
  libcups2 \
  libdbus-1-3 \
  libexpat1 \
  libfontconfig1 \
  libgbm1 \
  libgcc1 \
  libglib2.0-0 \
  libgtk-3-0 \
  libnspr4 \
  libnss3 \
  libpango-1.0-0 \
  libpangocairo-1.0-0 \
  libstdc++6 \
  libx11-6 \
  libx11-xcb1 \
  libxcb1 \
  libxcomposite1 \
  libxcursor1 \
  libxdamage1 \
  libxext6 \
  libxfixes3 \
  libxi6 \
  libxrandr2 \
  libxrender1 \
  libxss1 \
  libxtst6 \
  lsb-release \
  wget \
  xdg-utils

# 方案2: 使用 Docker
docker compose -f docker-compose.dev.yml up -d
```

### Q4: Windows Defender 阻止 Chromium

**解决**:
1. 添加 Puppeteer 安装目录到白名单
2. 或使用系统 Chrome 代替

---

## 📊 性能测试使用示例

### 通过 API 测试

```bash
# 启动后端
npm run --prefix backend dev

# 调用性能测试 API
curl -X POST http://localhost:3001/tests/performance \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "device": "desktop"
  }'
```

### 查看 Lighthouse 报告

```bash
# 测试完成后，报告会保存在
backend/reports/performance-{testId}.html
```

---

## 🔗 相关资源

- [Puppeteer 官方文档](https://pptr.dev/)
- [Lighthouse 文档](https://developer.chrome.com/docs/lighthouse/)
- [Chrome DevTools Protocol](https://chromedevtools.github.io/devtools-protocol/)

---

**配置完成后，记得运行 `npm run --prefix backend check:deps` 验证！** ✅

