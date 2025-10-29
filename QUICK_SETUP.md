# 🚀 功能配置快速指南

**3分钟启用所有高级功能！**

---

## 📋 功能配置清单

| 功能 | 状态 | 配置时间 | 优先级 |
|------|------|---------|-------|
| [性能测试](#1-性能测试-chromepuppeteer) | ⏳ 待配置 | 2分钟 | 🟡 推荐 |
| [跨浏览器测试](#2-跨浏览器测试-playwright) | ⏳ 待配置 | 5分钟 | 🟢 可选 |
| [邮件通知](#3-邮件通知-smtp) | ⏳ 待配置 | 3分钟 | 🟢 可选 |

---

## 1️⃣ 性能测试 (Chrome/Puppeteer)

### 🎯 启用功能
- Lighthouse 性能分析
- Core Web Vitals 测试
- 页面截图对比

### ⚡ 最快方法（30秒）

**使用系统Chrome**:

```powershell
# Windows - 查找Chrome路径
$chromePaths = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
)

foreach ($path in $chromePaths) {
    if (Test-Path $path) {
        Write-Host "找到Chrome: $path" -ForegroundColor Green
        # 复制路径，添加到 backend/.env
    }
}
```

在 `backend/.env` 添加:
```bash
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

### ✅ 验证

```bash
node backend/scripts/test-chrome.js
```

### 📚 详细文档
[docs/SETUP_CHROME.md](./docs/SETUP_CHROME.md)

---

## 2️⃣ 跨浏览器测试 (Playwright)

### 🎯 启用功能
- Chromium/Firefox/WebKit 测试
- 跨浏览器兼容性检测
- 视觉回归测试

### ⚡ 快速安装（5分钟）

```bash
# 进入后端目录
cd backend

# 安装所有浏览器
npx playwright install

# 或仅安装Chromium（最快）
npx playwright install chromium
```

### ✅ 验证

```bash
node backend/scripts/test-playwright.js
```

### 📚 详细文档
[docs/SETUP_PLAYWRIGHT.md](./docs/SETUP_PLAYWRIGHT.md)

---

## 3️⃣ 邮件通知 (SMTP)

### 🎯 启用功能
- 注册验证邮件
- 密码重置邮件
- 测试报告通知

### ⚡ 推荐配置（3分钟）

#### 方案A: Gmail（推荐）

1. **开启应用专用密码**:
   - 访问: https://myaccount.google.com/
   - 安全性 → 两步验证 → 应用专用密码
   - 生成密码

2. **配置环境变量** (`backend/.env`):
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_16_digit_app_password
   
   EMAIL_FROM=your_email@gmail.com
   EMAIL_FROM_NAME=Test-Web Platform
   ```

#### 方案B: QQ邮箱（国内）

1. **开启SMTP服务**:
   - 登录QQ邮箱 → 设置 → 账户
   - 开启POP3/SMTP服务
   - 生成授权码

2. **配置环境变量**:
   ```bash
   SMTP_HOST=smtp.qq.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your_qq_number@qq.com
   SMTP_PASS=your_authorization_code
   
   EMAIL_FROM=your_qq_number@qq.com
   EMAIL_FROM_NAME=Test-Web平台
   ```

#### 方案C: 开发测试（无需真实邮箱）

```bash
# 使用MailHog（Docker）
docker run -d -p 1025:1025 -p 8025:8025 mailhog/mailhog

# 配置
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=

# 查看邮件: http://localhost:8025
```

### ✅ 验证

```bash
node backend/scripts/test-smtp.js
```

### 📚 详细文档
[docs/SETUP_SMTP.md](./docs/SETUP_SMTP.md)

---

## 🎯 一键配置所有功能

### Windows PowerShell

```powershell
# 1. 配置Chrome（如果已安装）
"PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true" | Out-File -Append backend\.env
"PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe" | Out-File -Append backend\.env

# 2. 安装Playwright浏览器
cd backend
npx playwright install chromium
cd ..

# 3. 运行所有测试
node backend/scripts/test-chrome.js
node backend/scripts/test-playwright.js

# 4. 配置SMTP（需手动编辑backend/.env）
notepad backend\.env
```

### Linux/macOS

```bash
# 1. 自动安装Chromium
cd backend
npm install

# 2. 安装Playwright
npx playwright install

# 3. 运行测试
node scripts/test-chrome.js
node scripts/test-playwright.js

# 4. 配置SMTP
vim .env
```

---

## ✅ 完整验证

运行依赖检测器查看所有配置状态:

```bash
npm run --prefix backend check:deps
```

期望输出:
```
🔧 检查重要依赖...
✓ Redis 7.2.3
✓ Chrome/Chromium 120.0.6099.109

🌟 检查可选依赖...
ℹ Playwright 浏览器: Chromium, Firefox
ℹ SMTP 已配置: smtp.gmail.com

📍 系统状态:
   🚀 所有功能完整可用
```

---

## 📊 配置效果对比

| 配置状态 | 可用功能 | 推荐场景 |
|---------|---------|---------|
| **无配置** | 基础API测试、SEO测试 | 快速验证 |
| **仅Chrome** | +性能测试、截图对比 | 日常开发 |
| **Chrome+Playwright** | +跨浏览器测试 | 完整测试 |
| **完整配置** | +邮件通知 | 生产环境 |

---

## 🎉 配置完成后

### 测试功能

```bash
# 启动后端
npm run --prefix backend dev

# 测试性能分析
curl -X POST http://localhost:3001/tests/performance \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'

# 测试跨浏览器兼容性
curl -X POST http://localhost:3001/tests/compatibility \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "browsers": ["chromium", "firefox"]}'
```

### 下一步

1. ✅ 阅读 [API文档](http://localhost:3001/api/docs)
2. ✅ 配置生产环境变量
3. ✅ 设置监控告警
4. ✅ 准备上线！

---

## 🆘 遇到问题？

### 快速故障排除

| 问题 | 解决方案 |
|------|---------|
| Chrome找不到 | 检查路径或让Puppeteer自动下载 |
| Playwright下载慢 | 使用国内镜像或仅安装Chromium |
| SMTP认证失败 | 使用应用专用密码/授权码，不是主密码 |
| 端口被占用 | 修改.env中的端口配置 |

### 获取帮助

- 📚 [完整依赖文档](./DEPENDENCIES.md)
- 🐳 [Docker部署指南](./deploy/README.md)
- 💬 [提交Issue](https://github.com/XiangYd616/Web-Test/issues)

---

**配置时间总计**: 5-10分钟  
**收益**: 解锁100%功能 🚀

---

**最后更新**: 2025-10-16  
**维护者**: Test-Web Team

