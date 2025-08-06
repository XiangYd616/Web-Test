# CSV导出中文乱码修复文档

## 问题描述

在导出CSV文件时，中文字符在Excel等软件中显示为乱码，如：
- 测试基本信息 → 娴嬭瘯鍩烘湰淇℃伅
- 核心性能指标 → 鏍稿績鎬ц兘鎸囨爣

## 问题原因

CSV文件缺少UTF-8 BOM（Byte Order Mark）头，导致Excel等软件无法正确识别文件编码。

## 修复方案

### 1. 前端修复

在所有CSV导出方法中添加UTF-8 BOM头：

#### 修复的文件和方法：

**src/utils/exportUtils.ts**
- `exportStressTestData()` - 压力测试数据导出
- `exportPerformanceTestData()` - 性能测试数据导出  
- `exportAPITestData()` - API测试数据导出
- `exportDataTable()` - 数据表格导出

**修复代码示例：**
```typescript
// 🔧 修复中文乱码：添加UTF-8 BOM头
const BOM = '\uFEFF';
const csvWithBOM = BOM + csvContent;
this.downloadFile(csvWithBOM, filename, 'text/csv;charset=utf-8');
```

**src/pages/admin/DataStorage.tsx**
- 数据存储页面的CSV导出功能已经包含BOM头

**src/services/reportGeneratorService.ts**
- 报告生成服务的CSV导出方法

### 2. 服务端修复

**server/services/dataManagement/dataExportService.js**
- `exportToCSV()` - 数据管理服务的CSV导出

**server/services/realDataImportExportEngine.js**
- `exportToCSV()` - 实时数据导入导出引擎的CSV导出

**修复代码示例：**
```javascript
// 🔧 修复中文乱码：添加UTF-8 BOM头
const BOM = '\uFEFF';
const csvWithBOM = BOM + csvContent;
await fs.writeFile(filepath, csvWithBOM, 'utf8');
```

## 测试验证

### 1. 单元测试

创建了 `src/utils/__tests__/exportUtils.test.ts` 测试文件，验证：
- 所有CSV导出方法都包含UTF-8 BOM头
- MIME类型正确设置为 `text/csv;charset=utf-8`
- 中文内容正确包含在导出文件中

### 2. 功能测试页面

创建了 `src/pages/CSVExportTest.tsx` 测试页面，提供：
- 数据表格导出测试
- 压力测试导出测试
- API测试导出测试
- 性能测试导出测试

**访问地址：** `http://localhost:5175/csv-export-test`

### 3. 测试步骤

1. 访问CSV导出测试页面
2. 点击任意导出按钮下载CSV文件
3. 使用Excel打开下载的CSV文件
4. 验证中文字符正确显示，无乱码

## 技术细节

### UTF-8 BOM头

- **BOM字符：** `\uFEFF` (Unicode字符U+FEFF)
- **作用：** 告诉软件文件使用UTF-8编码
- **兼容性：** Excel、WPS等主流软件都支持

### MIME类型

- **修复前：** `text/csv`
- **修复后：** `text/csv;charset=utf-8`

### 影响范围

修复涵盖了所有CSV导出功能：
- ✅ 前端导出工具类
- ✅ 数据管理页面导出
- ✅ 服务端数据导出服务
- ✅ 实时数据导入导出引擎
- ✅ 报告生成服务

## 验证结果

所有单元测试通过，确保：
1. UTF-8 BOM头正确添加
2. MIME类型正确设置
3. 中文内容完整保留
4. 导出功能正常工作

## 注意事项

1. **向后兼容：** 修复不影响现有功能
2. **性能影响：** BOM头只增加3字节，影响微乎其微
3. **软件兼容：** 主流表格软件都支持UTF-8 BOM
4. **编码一致：** 确保整个导出流程使用UTF-8编码

## 相关文件

### 修改的文件
- `src/utils/exportUtils.ts`
- `src/services/reportGeneratorService.ts`
- `server/services/dataManagement/dataExportService.js`
- `server/services/realDataImportExportEngine.js`

### 新增的文件
- `src/utils/__tests__/exportUtils.test.ts` - 单元测试
- `src/pages/CSVExportTest.tsx` - 功能测试页面
- `docs/csv-export-fix.md` - 本文档

### 路由配置
- `src/components/routing/AppRoutes.tsx` - 添加测试页面路由
