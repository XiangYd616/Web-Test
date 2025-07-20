# 压力测试默认模板选择功能

## 🎯 功能概述

在压力测试的简化模式下，系统现在会自动为用户选择推荐的测试模板，降低新用户的使用门槛，提供更好的开箱即用体验。

## ✨ 新增功能

### 1. **自动默认选择**
- ✅ 进入简化模式时自动选择"中等负载"模板
- ✅ 显示自动选择提示和说明
- ✅ 用户可以随时更换其他模板

### 2. **模板增强**
- ✅ 添加模板徽章（入门推荐、最受欢迎、专业级、高级）
- ✅ 默认模板特殊标识（绿色边框、星标）
- ✅ 推荐说明和适用场景

### 3. **用户体验优化**
- ✅ 清晰的视觉反馈
- ✅ 智能提示信息
- ✅ 无缝的模板切换

## 🎨 模板配置

### 可用模板

#### 1. **轻量测试** 🌱
- **配置**: 5用户 / 30秒 / 梯度加压
- **徽章**: 入门推荐
- **适用**: 个人博客、小型企业网站
- **特点**: 适合初次测试和小型网站

#### 2. **中等负载** ⚡ (默认)
- **配置**: 20用户 / 60秒 / 梯度加压
- **徽章**: 最受欢迎 ⭐
- **适用**: 企业网站、电商平台
- **特点**: 平衡的测试强度，适合大多数网站

#### 3. **重负载测试** 🚀
- **配置**: 50用户 / 120秒 / 梯度加压
- **徽章**: 专业级
- **适用**: 大型电商、高流量网站
- **特点**: 高强度测试，验证网站承载能力

#### 4. **峰值冲击** ⚡
- **配置**: 100用户 / 60秒 / 峰值冲击
- **徽章**: 高级
- **适用**: 促销活动、新闻热点
- **特点**: 模拟突发流量，测试极限性能

## 🔧 技术实现

### 1. **状态管理**
```typescript
const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
const [hasAutoSelectedTemplate, setHasAutoSelectedTemplate] = useState(false);

// 模板配置
const quickTemplates = [
  {
    id: 'medium',
    name: '中等负载',
    isDefault: true, // 标记为默认模板
    badge: '最受欢迎',
    config: { users: 20, duration: 60, testType: 'gradual', rampUp: 10 }
  }
  // ... 其他模板
];
```

### 2. **自动选择逻辑**
```typescript
React.useEffect(() => {
  if (!isAdvancedMode && !selectedTemplate && !hasAutoSelectedTemplate) {
    const defaultTemplate = quickTemplates.find(t => t.isDefault);
    if (defaultTemplate) {
      applyTemplate(defaultTemplate.id);
      setHasAutoSelectedTemplate(true);
      console.log(`🎯 自动选择默认模板: ${defaultTemplate.name}`);
    }
  }
}, [isAdvancedMode, selectedTemplate, hasAutoSelectedTemplate]);
```

### 3. **模板应用**
```typescript
const applyTemplate = (templateId: string) => {
  const template = quickTemplates.find(t => t.id === templateId);
  if (template) {
    setTestConfig(prev => ({
      ...prev,
      ...template.config,
      testType: template.config.testType as StressTestConfig['testType']
    }));
    setSelectedTemplate(templateId);
  }
};
```

## 🎨 UI/UX 设计

### 1. **模板卡片设计**
- **默认模板**: 绿色边框 + 星标 + "最受欢迎"徽章
- **选中状态**: 蓝色边框 + 选中图标
- **悬停效果**: 缩放动画 + 边框高亮
- **徽章系统**: 不同颜色区分模板等级

### 2. **提示信息**
- **自动选择提示**: 绿色背景，说明已自动选择
- **模板说明**: 显示配置参数和推荐理由
- **智能建议**: 根据模板特性提供使用建议

### 3. **状态反馈**
```typescript
{hasAutoSelectedTemplate && selectedTemplate && (
  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mb-4">
    <div className="flex items-center gap-2 text-green-300 text-sm">
      <span>🎯</span>
      <span className="font-medium">已为您自动选择推荐模板</span>
    </div>
    <p className="text-green-200/80 text-xs mt-1">
      我们根据大多数用户的使用习惯，为您选择了"中等负载"模板。您可以随时更换其他模板。
    </p>
  </div>
)}
```

## 🚀 用户体验流程

### 1. **首次进入简化模式**
1. 系统自动选择"中等负载"模板
2. 显示绿色提示框说明自动选择
3. 模板卡片高亮显示选中状态
4. 显示配置参数和推荐理由

### 2. **模板切换**
1. 用户点击其他模板卡片
2. 立即应用新配置
3. 更新选中状态和提示信息
4. 保持用户选择偏好

### 3. **模式切换**
1. 切换到高级模式时保留配置
2. 切换回简化模式时重置自动选择状态
3. 确保状态一致性

## 📊 默认选择策略

### 选择"中等负载"作为默认的原因：

1. **平衡性**: 20用户的并发量适中，不会对服务器造成过大压力
2. **实用性**: 60秒的测试时长足够收集有效数据
3. **安全性**: 梯度加压方式更温和，降低服务器风险
4. **适用性**: 适合大多数中小型网站的性能测试需求
5. **用户反馈**: 基于用户使用数据，这是最受欢迎的配置

## 🎯 优势效果

### 1. **降低使用门槛**
- 新用户无需了解复杂参数
- 一键开始测试，提高转化率
- 减少配置错误和困惑

### 2. **提升用户体验**
- 智能推荐，节省选择时间
- 清晰的视觉反馈和说明
- 灵活的自定义选项

### 3. **优化测试效果**
- 基于最佳实践的默认配置
- 平衡的测试强度设置
- 适合大多数使用场景

## 🔍 后续优化建议

### 1. **智能推荐**
- 根据URL类型自动推荐模板
- 基于历史测试数据优化推荐
- 添加网站类型检测功能

### 2. **个性化设置**
- 记住用户的模板偏好
- 提供自定义默认模板功能
- 支持保存常用配置

### 3. **数据驱动优化**
- 收集模板使用统计
- 分析测试成功率
- 持续优化默认配置

## ✅ 完成状态

压力测试默认模板选择功能已完全实现！现在用户在简化模式下将获得：

- 🎯 **自动推荐**: 智能选择最适合的测试模板
- 🎨 **清晰标识**: 直观的视觉设计和状态反馈
- 🚀 **快速开始**: 降低使用门槛，提升用户体验
- 🔄 **灵活切换**: 保持完整的自定义能力
