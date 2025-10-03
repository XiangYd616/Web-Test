# 编码问题修复映射表

基于文件上下文和语义分析，推断出的正确中文内容：

## MFAWizard.tsx 修复映射

### Line 61
```typescript
// 错误: intro: { title: '欢迎使用多因素认�?, description: '提升账户安全性的重要一�? }
// 正确: 
intro: { title: '欢迎使用多因素认证', description: '提升账户安全性的重要一步' }
```

### Line 62
```typescript
// 错误: benefits: { title: '了解MFA的优�?, description: '为什么需要双因素认证' }
// 正确:
benefits: { title: '了解MFA的优势', description: '为什么需要双因素认证' }
```

### Line 63
```typescript
// 错误: setup: { title: '设置身份验证�?, description: '配置您的验证应用' }
// 正确:
setup: { title: '设置身份验证器', description: '配置您的验证应用' }
```

### Line 64
```typescript
// 错误: verify: { title: '验证设置', description: '确认一切工作正�? }
// 正确:
verify: { title: '验证设置', description: '确认一切工作正常' }
```

## LoginPrompt.tsx 修复映射

### Line 23
```typescript
// 错误: _feature = "此功�?,
// 正确:
feature = "此功能"
```

需要修复的其他位置：
- Line 59: "需要登�?" → "需要登录"
- Line 68: "登录后您可以�?" → "登录后您可以："
- Line 77: "保存和查看测试历史记�?" → "保存和查看测试历史记录"
- Line 81: "个性化设置和偏好配�?" → "个性化设置和偏好配置"
- Line 85: "高级数据管理和分�?" → "高级数据管理和分析"

## BackupCodes.tsx 修复映射

### Toast 消息
```typescript
// Line 74: '已生成新的备份代�? → '已生成新的备份代码'
// Line 89: '代码已复制到剪贴�? → '代码已复制到剪贴板'
// Line 127: '备份代码已下�? → '备份代码已下载'
```

### UI 文本
```typescript
// Line 262: '•••�?•••�?•••�? → '•••••••••'
// Line 303: '�?每个备份代码只能使用一�? → '注：每个备份代码只能使用一次'
```

## ReportManagement.tsx 修复映射

这个文件有大量乱码，主要在UI文本中：

### 常见模式
- "已完�?" → "已完成"
- "生成�?" → "生成中"
- "总大�?" → "总大小"
- "筛�?" → "筛选"
- "状�?" → "状态"
- "失败" 是正确的
- "查看帮�?" → "查看帮助"
- "重新设�?" → "重新设置"

## 修复策略

### 方法1: 模式匹配替换（推荐）

创建PowerShell脚本进行批量替换：

```powershell
# 替换已知的乱码模式
$replacements = @{
    "多因素认�?" = "多因素认证"
    "重要一�?" = "重要一步"
    "的优�?" = "的优势"
    "验证�?" = "验证器"
    "工作正�?" = "工作正常"
    "此功�?" = "此功能"
    "需要登�?" = "需要登录"
    "您可以�?" = "您可以："
    "历史记�?" = "历史记录"
    "偏好配�?" = "偏好配置"
    "管理和分�?" = "管理和分析"
    "备份代�?" = "备份代码"
    "剪贴�?" = "剪贴板"
    "已下�?" = "已下载"
    "使用一�?" = "使用一次"
    "已完�?" = "已完成"
    "生成�?" = "生成中"
    "总大�?" = "总大小"
    "筛�?" = "筛选"
    "状�?" = "状态"
    "帮�?" = "帮助"
    "设�?" = "设置"
}
```

### 方法2: 手动编辑（最准确）

在VS Code或其他编辑器中：
1. 打开文件
2. 搜索 `�` 字符
3. 根据上下文手动修复
4. 保存为 UTF-8 无BOM

### 方法3: 从其他类似组件推断

参考项目中其他正常的认证/测试组件的文本，推断正确的中文内容。

## 预防措施

1. **设置编辑器默认编码为 UTF-8**
2. **Git 配置**:
   ```bash
   git config --global core.quotepath false
   git config --global i18n.commitencoding utf-8
   ```
3. **添加 .gitattributes**:
   ```
   * text=auto eol=lf
   *.tsx text eol=lf encoding=utf-8
   *.ts text eol=lf encoding=utf-8
   ```

## 验证修复

修复后运行：
```bash
npm run type-check
npm run lint
npm run build
```

