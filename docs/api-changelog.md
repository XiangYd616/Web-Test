# API 变更日志

本文档记录了Test-Web平台API和数据模型的重要变更历史。

## 版本说明

- **主版本号**：包含破坏性变更
- **次版本号**：新增功能，向后兼容
- **修订版本号**：错误修复，向后兼容

## [2.1.0] - 2025-08-08

### 🎯 数据层优化完成
- **数据模型不一致性修复**：完成前后端数据模型一致性分析和修复
- **API端点验证**：验证所有API端点返回数据与TypeScript类型的匹配性
- **版本控制流程**：建立完整的数据模型版本控制流程和文档

### ✨ 新增功能
- 数据模型不一致性分析报告 (`docs/data-model-inconsistency-analysis.md`)
- API端点数据匹配性验证报告 (`docs/api-endpoint-validation-report.md`)
- 数据模型版本控制流程文档 (`docs/data-model-version-control.md`)
- API响应格式统一修复脚本 (`scripts/fix-api-response-format.cjs`)

### 🔧 修复和改进
- 修复前端API服务中的重复ApiResponse定义
- 统一所有API响应格式，移除旧的ApiResponse工具使用
- 完善测试相关类型定义，解决接口定义过多问题
- 修复角色和状态枚举不统一的问题

### 📚 文档更新
- 完善API变更日志格式和内容
- 建立数据模型变更的版本控制流程
- 创建迁移指南和最佳实践文档

---

## [2.0.0] - 2024-08-08

### 🎯 重大改进
- **数据模型统一化**：建立了完整的前后端数据模型统一系统
- **API响应格式标准化**：统一了所有API端点的响应格式
- **类型安全增强**：完善了TypeScript类型定义和验证机制

### ✨ 新增功能

#### 数据模型
- 新增 `src/types/unified/models.ts` 统一数据模型定义文件
- 新增 `TestType` 和 `TestStatus` 枚举类型
- 新增测试相关接口：`TestResult`、`TestHistory`、`TestConfig`
- 新增数据库字段映射接口和转换函数

#### API响应格式
- 统一API响应格式：`ApiSuccessResponse`、`ApiErrorResponse`
- 新增分页响应格式：`PaginatedResponse`
- 新增创建响应格式：`CreatedResponse`
- 完善错误响应结构，包含错误码、详情和建议

#### 版本控制
- 新增 `src/types/unified/version.ts` 版本控制系统
- 建立数据模型变更追踪机制
- 新增版本兼容性检查函数
- 新增迁移指南生成功能

### 🔄 变更内容

#### 后端模型
- `server/models/Test.js`：添加 `TestType` 和 `TestStatus` 枚举
- `server/models/User.js`：完善数据转换方法
- 统一使用枚举值替代硬编码字符串

#### 类型定义重构
- `src/services/types/user.ts`：重构为重新导出统一类型
- 移除重复的类型定义，统一导入路径
- 完善类型注释和文档

#### API响应格式化
- 标记 `server/utils/ApiResponse.js` 中间件为废弃
- 推荐使用 `server/api/middleware/responseFormatter.js`
- 统一响应格式，包含请求ID和性能监控

### 🔧 修复内容
- 修复前后端数据模型不一致问题
- 修复API响应格式不统一问题
- 修复类型定义重复和冲突问题

### 📋 迁移指南

#### 从 1.x 升级到 2.0

1. **更新类型导入**：
   ```typescript
   // 旧的导入方式
   import { User } from '../services/types/user';
   
   // 新的导入方式
   import { User } from '../types/unified/models';
   ```

2. **使用统一响应格式**：
   ```javascript
   // 旧的方式
   res.json({ success: true, data: result });
   
   // 新的方式
   res.success(result, '操作成功');
   ```

3. **使用枚举值**：
   ```javascript
   // 旧的方式
   test.status = 'completed';
   
   // 新的方式
   test.status = TestStatus.COMPLETED;
   ```

### ⚠️ 注意事项
- 本版本不包含破坏性变更，完全向后兼容
- 建议逐步迁移到新的统一类型定义
- 废弃的API将在下一个主版本中移除

---

## [1.0.0] - 2024-08-01

### 🎉 初始版本
- 建立基础的API结构
- 实现用户认证系统
- 实现测试引擎集成
- 建立基础的数据模型

### ✨ 核心功能
- 用户注册、登录、权限管理
- 7种测试引擎支持（性能、安全、SEO等）
- 测试历史记录和结果分析
- 基础的API响应格式

### 📊 API端点
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `GET /api/tests` - 获取测试列表
- `POST /api/tests/{type}/start` - 启动测试
- `GET /api/users/profile` - 获取用户信息

---

## 版本兼容性

### 当前支持的版本
- **当前版本**：2.0.0
- **最低兼容版本**：1.0.0
- **API版本**：1.0.0

### 版本检查
```typescript
import { isVersionCompatible } from '../types/unified/version';

// 检查版本兼容性
if (!isVersionCompatible('1.0.0')) {
  console.warn('版本不兼容，请升级客户端');
}
```

### 获取版本信息
```typescript
import { getVersionInfo } from '../types/unified/version';

const versionInfo = getVersionInfo();
console.log('当前数据模型版本:', versionInfo.current);
```

## 贡献指南

### 添加新的API变更
1. 更新 `src/types/unified/version.ts` 中的版本历史
2. 在本文档中记录变更内容
3. 如果是破坏性变更，提供迁移指南
4. 运行 `npm run validate:api-types` 验证类型一致性

### 版本号规则
- 破坏性变更：增加主版本号
- 新增功能：增加次版本号
- 错误修复：增加修订版本号

### 文档更新
- 所有API变更都必须在此文档中记录
- 提供清晰的迁移指南和示例代码
- 标明变更的影响范围和重要程度
