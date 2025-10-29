# Playwright 配置指南

## 📋 概述

Playwright 支持跨浏览器测试（Chromium、Firefox、WebKit），用于兼容性测试和端到端测试。

---

## 🚀 快速安装

### 方式一：安装所有浏览器（推荐）

```bash
# 进入后端目录
cd backend

# Playwright 已在 package.json 中，安装依赖时会自动安装
npm install

# 安装浏览器（首次使用需要运行）
npx playwright install

# 或指定安装特定浏览器
npx playwright install chromium firefox webkit
```

**下载大小**:
- Chromium: ~170MB
- Firefox: ~80MB
- WebKit: ~60MB

---

### 方式二：仅安装 Chromium（快速）

如果只需要 Chromium 支持：

```bash
npx playwright install chromium
```

---

### 方式三：使用系统依赖

Linux 系统可能需要安装额外依赖：

```bash
# Ubuntu/Debian
npx playwright install-deps

# 或手动安装
sudo apt-get install -y \
    libwoff1 \
    libopus0 \
    libwebp7 \
    libwebpdemux2 \
    libenchant-2-2 \
    libgudev-1.0-0 \
    libsecret-1-0 \
    libhyphen0 \
    libgdk-pixbuf2.0-0 \
    libegl1 \
    libnotify4 \
    libxslt1.1 \
    libevent-2.1-7 \
    libgles2 \
    libvpx7 \
    libxcomposite1 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libepoxy0 \
    libgtk-3-0 \
    libharfbuzz-icu0
```

---

## ✅ 验证安装

### 1. 检查浏览器是否安装

```bash
# 查看已安装的浏览器
npx playwright --version

# 列出浏览器路径
node -e "const pw = require('playwright'); console.log(pw.chromium.executablePath());"
```

### 2. 运行测试脚本

创建 `backend/scripts/test-playwright.js`:

```javascript
const { chromium, firefox, webkit } = require('playwright');

async function testPlaywright() {
  console.log('\n🔍 测试 Playwright 配置...\n');
  
  const browsers = [
    { name: 'Chromium', launcher: chromium },
    { name: 'Firefox', launcher: firefox },
    { name: 'WebKit', launcher: webkit }
  ];
  
  const results = [];
  
  for (const { name, launcher } of browsers) {
    try {
      console.log(`📍 测试 ${name}...`);
      
      const browser = await launcher.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto('https://example.com');
      const title = await page.title();
      
      await browser.close();
      
      console.log(`✅ ${name}: ${title}`);
      results.push({ browser: name, status: 'success' });
      
    } catch (error) {
      console.log(`⚠️ ${name}: ${error.message}`);
      results.push({ browser: name, status: 'failed', error: error.message });
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Playwright 测试结果');
  console.log('='.repeat(60));
  
  const successful = results.filter(r => r.status === 'success');
  console.log(`\n✅ 可用浏览器: ${successful.map(r => r.browser).join(', ')}`);
  console.log(`总计: ${successful.length}/${browsers.length}\n`);
  
  if (successful.length > 0) {
    console.log('🎯 以下功能现已可用:');
    console.log('  • 跨浏览器兼容性测试');
    console.log('  • 浏览器特性检测');
    console.log('  • 视觉回归测试');
    console.log('');
  }
}

testPlaywright();
```

运行测试:
```bash
node backend/scripts/test-playwright.js
```

---

## 🎯 启用的功能

配置完成后可用的功能：

### ✅ 跨浏览器兼容性测试
- **Chromium**: Chrome、Edge 等基于 Chromium 的浏览器
- **Firefox**: Mozilla Firefox
- **WebKit**: Safari（macOS/iOS）

### ✅ 自动化测试
- 页面截图对比
- 交互测试
- 表单提交测试
- API 调用测试

### ✅ 浏览器特性检测
- CSS 特性支持
- JavaScript API 支持
- HTML5 特性支持

---

## 📊 使用示例

### 1. 通过 API 测试跨浏览器兼容性

```bash
# 启动后端
npm run --prefix backend dev

# 调用兼容性测试 API
curl -X POST http://localhost:3001/tests/compatibility \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com",
    "browsers": ["chromium", "firefox", "webkit"],
    "features": ["flexbox", "grid", "css-variables"]
  }'
```

### 2. 在代码中使用 Playwright

```javascript
const { chromium } = require('playwright');

async function runTest() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://example.com');
  await page.screenshot({ path: 'screenshot.png' });
  
  await browser.close();
}
```

---

## 🐛 常见问题

### Q1: 浏览器下载失败

**症状**: `Failed to download browsers`

**解决**:
```bash
# 使用国内镜像
$env:PLAYWRIGHT_DOWNLOAD_HOST="https://npmmirror.com/mirrors/playwright"
npx playwright install

# 或使用代理
$env:HTTPS_PROXY="http://proxy.example.com:8080"
npx playwright install
```

### Q2: Linux 缺少系统依赖

**症状**: `Error: libXXX.so: cannot open shared object file`

**解决**:
```bash
# 自动安装所有依赖
npx playwright install-deps

# 或查看缺少的依赖
npx playwright install --dry-run
```

### Q3: WebKit 在 Windows 上不可用

**说明**: WebKit (Safari) 的完整功能仅在 macOS 上可用。Windows 上的 WebKit 是有限的跨平台实现。

**建议**: 主要测试 Chromium 和 Firefox，macOS 环境测试 WebKit。

### Q4: 磁盘空间不足

**解决**:
```bash
# 仅安装需要的浏览器
npx playwright install chromium

# 清理旧版本
npx playwright uninstall --all
```

---

## 🔧 配置选项

### 环境变量

在 `backend/.env` 中添加：

```bash
# Playwright 浏览器路径（可选）
PLAYWRIGHT_BROWSERS_PATH=/path/to/browsers

# 跳过浏览器下载（如果已安装）
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# 下载镜像
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
```

### 自定义浏览器配置

```javascript
// 在测试引擎中使用
const browser = await chromium.launch({
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
  timeout: 30000
});
```

---

## 🆚 Playwright vs Puppeteer

| 特性 | Playwright | Puppeteer |
|------|-----------|-----------|
| **浏览器支持** | Chrome, Firefox, Safari | Chrome only |
| **跨平台** | Windows, Linux, macOS | Windows, Linux, macOS |
| **API 设计** | 现代化，更简洁 | 成熟，广泛使用 |
| **性能** | 更快 | 快 |
| **推荐用途** | 跨浏览器测试 | Chrome 性能测试 |

**建议**: 
- 性能测试用 Puppeteer (Lighthouse)
- 兼容性测试用 Playwright

---

## 📚 相关资源

- [Playwright 官方文档](https://playwright.dev/)
- [Playwright API 参考](https://playwright.dev/docs/api/class-playwright)
- [示例代码](https://github.com/microsoft/playwright/tree/main/examples)

---

## 🎉 下一步

1. ✅ 运行测试脚本验证安装
2. ✅ 配置环境变量（可选）
3. ✅ 通过 API 测试兼容性功能
4. ✅ 查看测试报告

**配置完成后，记得运行 `npm run --prefix backend check:deps` 验证！** ✅

