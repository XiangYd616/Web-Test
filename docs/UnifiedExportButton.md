# 统一导出按钮组件 (UnifiedExportButton)

## 概述

`UnifiedExportButton` 是一个统一的数据导出组件，用于替代项目中分散的导出按钮实现，提供一致的用户体验和功能。

## 特性

- 🎯 **统一接口**：标准化的导出数据格式和配置
- 📊 **多格式支持**：JSON、CSV、HTML、PDF、PNG等格式
- 🎨 **灵活样式**：支持多种尺寸、变体和自定义样式
- 📱 **响应式设计**：适配不同屏幕尺寸
- 🔄 **状态管理**：加载状态、错误处理、进度反馈
- 🎛️ **下拉菜单**：支持单按钮和下拉菜单模式

## 基本用法

```tsx
import UnifiedExportButton from '../components/common/UnifiedExportButton';
import ExportUtils from '../utils/exportUtils';

// 基本使用
<UnifiedExportButton
  data={{
    filename: 'test-data',
    data: { /* 你的数据 */ },
    metadata: {
      title: '测试报告',
      description: '测试数据导出',
      timestamp: new Date().toISOString()
    }
  }}
  formats={['json', 'csv']}
  onExport={(format, data) => {
    ExportUtils.exportStressTestData(data.data, format);
  }}
/>
```

## 属性配置

### 核心属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `data` | `ExportData` | 必需 | 导出的数据和元信息 |
| `formats` | `string[]` | `['json', 'csv']` | 支持的导出格式 |
| `onExport` | `function` | - | 自定义导出处理器 |

### 样式属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 按钮尺寸 |
| `variant` | `'primary' \| 'secondary' \| 'outline'` | `'outline'` | 按钮变体 |
| `className` | `string` | `''` | 自定义CSS类 |

### 行为属性

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `showDropdown` | `boolean` | `true` | 是否显示下拉菜单 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否显示加载状态 |
| `defaultFormat` | `string` | `'json'` | 默认导出格式 |

## 数据格式

### ExportData 接口

```tsx
interface ExportData {
  filename?: string;           // 文件名（不含扩展名）
  data: any;                  // 要导出的数据
  metadata?: {                // 元数据
    title?: string;           // 报告标题
    description?: string;     // 报告描述
    timestamp?: string;       // 时间戳
    version?: string;         // 版本号
  };
}
```

## 支持的格式

| 格式 | 扩展名 | MIME类型 | 描述 |
|------|--------|----------|------|
| JSON | `.json` | `application/json` | 结构化数据格式 |
| CSV | `.csv` | `text/csv` | 表格数据格式 |
| HTML | `.html` | `text/html` | 网页报告格式 |
| PDF | `.pdf` | `application/pdf` | 便携文档格式 |
| PNG | `.png` | `image/png` | 图片格式 |

## 使用示例

### 1. 压力测试数据导出

```tsx
<UnifiedExportButton
  data={{
    filename: `stress-test-${Date.now()}`,
    data: {
      testConfig,
      result,
      metrics,
      realTimeData
    },
    metadata: {
      title: '压力测试报告',
      description: `对 ${testConfig.url} 的压力测试结果`,
      timestamp: new Date().toISOString(),
      version: '2.1.0'
    }
  }}
  formats={['json', 'csv', 'html']}
  onExport={(format, data) => {
    ExportUtils.exportStressTestData(data.data, format);
  }}
  size="sm"
  variant="outline"
/>
```

### 2. 性能测试数据导出

```tsx
<UnifiedExportButton
  data={{
    filename: `performance-test-${results.id}`,
    data: results,
    metadata: {
      title: '性能测试报告',
      description: `对 ${results.url} 的性能测试结果`,
      timestamp: new Date().toISOString()
    }
  }}
  formats={['json', 'csv']}
  onExport={(format, data) => {
    ExportUtils.exportPerformanceTestData(data.data, format);
  }}
  showDropdown={false}
  defaultFormat="json"
/>
```

### 3. 单按钮模式

```tsx
<UnifiedExportButton
  data={exportData}
  formats={['json']}
  showDropdown={false}
  size="lg"
  variant="primary"
/>
```

## ExportUtils 工具类

`ExportUtils` 提供了针对不同测试类型的专用导出方法：

```tsx
// 压力测试数据导出
ExportUtils.exportStressTestData(data, format);

// 性能测试数据导出
ExportUtils.exportPerformanceTestData(data, format);

// API测试数据导出
ExportUtils.exportAPITestData(data, format);

// 通用文件下载
ExportUtils.downloadFile(content, filename, mimeType);

// 生成文件名
ExportUtils.generateFilename(prefix, format, timestamp);
```

## 自定义导出处理器

你可以提供自定义的导出处理器来实现特殊的导出逻辑：

```tsx
const customExportHandler = async (format: string, data: ExportData) => {
  switch (format) {
    case 'custom':
      // 自定义格式处理
      const customData = transformData(data.data);
      ExportUtils.downloadFile(customData, `${data.filename}.custom`);
      break;
    default:
      // 使用默认处理器
      throw new Error(`Unsupported format: ${format}`);
  }
};

<UnifiedExportButton
  data={exportData}
  formats={['json', 'custom']}
  onExport={customExportHandler}
/>
```

## 样式定制

组件支持多种样式变体和尺寸：

```tsx
// 不同尺寸
<UnifiedExportButton size="sm" />   // 小尺寸
<UnifiedExportButton size="md" />   // 中等尺寸（默认）
<UnifiedExportButton size="lg" />   // 大尺寸

// 不同变体
<UnifiedExportButton variant="primary" />    // 主要按钮
<UnifiedExportButton variant="secondary" />  // 次要按钮
<UnifiedExportButton variant="outline" />    // 轮廓按钮（默认）

// 自定义样式
<UnifiedExportButton className="custom-export-btn" />
```

## 最佳实践

1. **数据验证**：导出前验证数据完整性
2. **文件命名**：使用有意义的文件名和时间戳
3. **错误处理**：提供适当的错误反馈
4. **用户体验**：显示导出进度和状态
5. **格式选择**：根据数据类型选择合适的导出格式

## 迁移指南

### 从旧的导出按钮迁移

**旧代码：**
```tsx
<button onClick={() => handleExportReport('json')}>
  <Download className="w-4 h-4" />
  导出JSON
</button>
```

**新代码：**
```tsx
<UnifiedExportButton
  data={exportData}
  formats={['json']}
  onExport={(format, data) => handleExport(format, data)}
/>
```

这样可以确保整个应用中的导出功能保持一致性和可维护性。
