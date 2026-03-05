# Puppeteer 可视化浏览器模式使用指南

## 📖 什么是 Headed 模式？

Headed 模式（可视化模式）会在测试时弹出真实的 Chromium 浏览器窗口，让你实时看到 Puppeteer 正在操作的页面。这对于调试测试脚本、观察页面行为非常有用。

**对比：**
- **Headless 模式**（默认）：后台运行，不显示窗口，速度快
- **Headed 模式**：显示浏览器窗口，可以看到实时操作，便于调试

## 🚀 如何启用 Headed 模式

### 方法 1：通过前端界面（推荐）

1. 打开桌面端应用
2. 在测试编辑器中，点击「高级配置」标签
3. 找到「显示浏览器窗口」开关
4. 启用该开关
5. 运行测试

**支持的测试类型：**
- ✅ SEO 测试
- ✅ 性能测试
- ✅ 兼容性测试
- ✅ 可访问性测试
- ✅ 网站测试
- ✅ UX 测试

### 方法 2：通过 API 配置

```typescript
const testConfig = {
  url: 'https://example.com',
  testType: 'seo',
  showBrowser: true,  // 启用 headed 模式
  engineMode: 'balanced'  // 可选：引擎性能模式
};
```

## ⚙️ 前置要求

### 1. Chromium 安装

Headed 模式需要 Chromium 浏览器。系统会按以下顺序查找：

1. **环境变量**（最高优先级）
   ```bash
   # Windows
   set PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe

   # macOS/Linux
   export PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
   ```

2. **Electron 内置 Chromium**（桌面端自动使用）

3. **系统安装的 Chrome**
   - Windows: `C:\Program Files\Google\Chrome\Application\chrome.exe`
   - macOS: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
   - Linux: `/usr/bin/google-chrome`

### 2. 安装 Chrome（如果没有）

**Windows:**
- 下载：https://www.google.com/chrome/

**macOS:**
```bash
brew install --cask google-chrome
```

**Linux:**
```bash
sudo apt install google-chrome-stable
```

## 🔧 故障排查

### 问题 1：浏览器启动失败

**错误信息：**
```
可视化浏览器启动失败: Failed to launch the browser process
```

**解决方案：**

1. **检查 Chromium 是否已安装**
   ```bash
   # Windows
   where chrome.exe

   # macOS
   ls "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

   # Linux
   which google-chrome
   ```

2. **设置环境变量**
   ```bash
   export PUPPETEER_EXECUTABLE_PATH="/path/to/chrome"
   ```

3. **查看详细日志**
   - 打开桌面端控制台（Console 面板）
   - 查看 `[PuppeteerPool]` 开头的日志
   - 检查 Chromium 路径是否正确

### 问题 2：浏览器窗口一闪而过

**原因：** 测试执行太快，浏览器立即关闭

**解决方案：**
- 这是正常行为
- 如需保持窗口打开，可以在测试配置中增加等待时间

### 问题 3：并发限制

**错误信息：**
```
headed 浏览器已达上限 (3)，回退为 headless 模式
```

**原因：** 为防止内存爆炸，系统限制最多同时运行 3 个可视化浏览器

**解决方案：**
- 等待其他测试完成
- 或使用 headless 模式

### 问题 4：DEPLOY_MODE=cloud 冲突

**错误信息：**
```
浏览器引擎不可用
```

**原因：** 云端模式禁用了 Puppeteer

**解决方案：**
```bash
# 设置为完整模式
export DEPLOY_MODE=full
```

## 📊 性能影响

| 模式 | 内存占用 | CPU 占用 | 速度 | 适用场景 |
|------|---------|---------|------|---------|
| Headless | ~150MB | 低 | 快 | 批量测试、CI/CD |
| Headed | ~300MB | 中 | 中 | 调试、演示 |

**建议：**
- 日常测试：使用 headless 模式
- 调试问题：使用 headed 模式
- 批量测试：使用 headless 模式

## 🎯 最佳实践

1. **仅在需要时启用**
   - Headed 模式消耗更多资源
   - 仅在调试或演示时使用

2. **配合引擎性能模式**
   - 节能模式：1 浏览器 × 3 页面
   - 平衡模式：2 浏览器 × 5 页面（推荐）
   - 性能模式：3 浏览器 × 8 页面

3. **注意并发限制**
   - 最多同时 3 个 headed 浏览器
   - 超过限制会自动回退 headless

4. **及时关闭**
   - 测试完成后浏览器会自动关闭
   - 如果卡住，10 分钟后会自动超时关闭

## 🔍 诊断工具

使用内置诊断工具检查 Puppeteer 状态：

```typescript
import { diagnoseSEOEngine } from '@/backend/modules/engines/seo/diagnostics';

const diagnosis = await diagnoseSEOEngine();
console.log(diagnosis);
```

输出示例：
```json
{
  "available": true,
  "issues": [],
  "suggestions": [],
  "details": {
    "deployMode": "full",
    "puppeteerAvailable": true,
    "stats": {
      "chromiumPath": "/Applications/Google Chrome.app/...",
      "version": "120.0.6099.109"
    }
  }
}
```

## 📞 获取帮助

如果问题仍未解决：

1. 查看控制台日志（Console 面板）
2. 运行诊断工具
3. 提交 Issue：https://github.com/XiangYd616/Web-Test/issues

---

**提示：** Headed 模式是调试利器，但不要在生产环境或 CI/CD 中使用。
