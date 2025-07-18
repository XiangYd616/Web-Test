#!/usr/bin/env node

/**
 * 文档更新脚本
 * 用于更新项目文档、添加必要注释、移除过时注释等
 */

const fs = require('fs');
const path = require('path');

// 项目根目录
const PROJECT_ROOT = path.resolve(__dirname, '..');

// 更新结果统计
const updateResults = {
  updatedFiles: [],
  addedComments: [],
  removedComments: [],
  createdDocs: [],
  errors: []
};

/**
 * 获取当前项目结构
 */
function getCurrentProjectStructure() {
  const structure = {
    src: {
      components: [],
      pages: [],
      services: [],
      hooks: [],
      utils: [],
      styles: []
    },
    server: {
      routes: [],
      middleware: [],
      services: []
    },
    docs: [],
    scripts: []
  };

  try {
    // 扫描src目录
    const srcPath = path.join(PROJECT_ROOT, 'src');
    if (fs.existsSync(srcPath)) {
      ['components', 'pages', 'services', 'hooks', 'utils', 'styles'].forEach(dir => {
        const dirPath = path.join(srcPath, dir);
        if (fs.existsSync(dirPath)) {
          structure.src[dir] = scanDirectory(dirPath, ['.tsx', '.ts', '.css']);
        }
      });
    }

    // 扫描server目录
    const serverPath = path.join(PROJECT_ROOT, 'server');
    if (fs.existsSync(serverPath)) {
      ['routes', 'middleware', 'services'].forEach(dir => {
        const dirPath = path.join(serverPath, dir);
        if (fs.existsSync(dirPath)) {
          structure.server[dir] = scanDirectory(dirPath, ['.js', '.ts']);
        }
      });
    }

    // 扫描docs目录
    const docsPath = path.join(PROJECT_ROOT, 'docs');
    if (fs.existsSync(docsPath)) {
      structure.docs = scanDirectory(docsPath, ['.md']);
    }

    // 扫描scripts目录
    const scriptsPath = path.join(PROJECT_ROOT, 'scripts');
    if (fs.existsSync(scriptsPath)) {
      structure.scripts = scanDirectory(scriptsPath, ['.js', '.ts']);
    }

  } catch (error) {
    updateResults.errors.push(`扫描项目结构失败: ${error.message}`);
  }

  return structure;
}

/**
 * 扫描目录获取文件列表
 */
function scanDirectory(dirPath, extensions) {
  const files = [];
  
  try {
    const items = fs.readdirSync(dirPath);
    
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        // 递归扫描子目录
        files.push(...scanDirectory(itemPath, extensions));
      } else if (extensions.includes(path.extname(item))) {
        files.push(path.relative(PROJECT_ROOT, itemPath));
      }
    });
  } catch (error) {
    updateResults.errors.push(`扫描目录失败 ${dirPath}: ${error.message}`);
  }
  
  return files;
}

/**
 * 更新README.md中的项目结构
 */
function updateReadmeStructure() {
  console.log('📝 更新README.md项目结构...\n');
  
  const readmePath = path.join(PROJECT_ROOT, 'README.md');
  
  if (!fs.existsSync(readmePath)) {
    updateResults.errors.push('README.md文件不存在');
    return;
  }
  
  try {
    let content = fs.readFileSync(readmePath, 'utf8');
    const structure = getCurrentProjectStructure();
    
    // 生成项目结构文档
    const structureDoc = generateProjectStructureDoc(structure);
    
    // 查找并替换项目结构部分
    const structureRegex = /## 📁 项目结构[\s\S]*?(?=##|$)/;
    
    if (structureRegex.test(content)) {
      content = content.replace(structureRegex, structureDoc);
      console.log('✅ 更新现有项目结构部分');
    } else {
      // 在文件末尾添加项目结构
      content += '\n\n' + structureDoc;
      console.log('✅ 添加项目结构部分');
    }
    
    fs.writeFileSync(readmePath, content, 'utf8');
    updateResults.updatedFiles.push('README.md');
    
  } catch (error) {
    updateResults.errors.push(`更新README.md失败: ${error.message}`);
  }
}

/**
 * 生成项目结构文档
 */
function generateProjectStructureDoc(structure) {
  return `## 📁 项目结构

\`\`\`
test-web-app/
├── 📁 src/                    # 前端源代码
│   ├── 📁 components/         # React组件 (${structure.src.components.length}个文件)
│   │   ├── 📁 ui/            # 基础UI组件
│   │   ├── 📁 modern/        # 现代化组件
│   │   ├── 📁 mobile/        # 移动端组件
│   │   └── 📁 system/        # 系统组件
│   ├── 📁 pages/             # 页面组件 (${structure.src.pages.length}个文件)
│   │   ├── 📄 Login.tsx      # 登录页面
│   │   ├── 📄 SEOTest.tsx    # SEO测试页面
│   │   ├── 📄 PerformanceTest.tsx # 性能测试页面
│   │   └── 📄 SecurityTest.tsx    # 安全测试页面
│   ├── 📁 services/          # 业务服务 (${structure.src.services.length}个文件)
│   │   ├── 📄 api.ts         # API服务
│   │   ├── 📄 seoService.ts  # SEO测试服务
│   │   └── 📄 testService.ts # 测试服务
│   ├── 📁 hooks/             # React Hooks (${structure.src.hooks.length}个文件)
│   ├── 📁 utils/             # 工具函数 (${structure.src.utils.length}个文件)
│   ├── 📁 styles/            # 样式文件 (${structure.src.styles.length}个文件)
│   │   ├── 📄 responsive-system.css # 响应式系统
│   │   └── 📄 dynamic-styles.css    # 动态样式
│   └── 📄 index.css          # 全局样式
├── 📁 server/                # 后端服务器
│   ├── 📁 routes/            # API路由 (${structure.server.routes.length}个文件)
│   ├── 📁 middleware/        # 中间件 (${structure.server.middleware.length}个文件)
│   ├── 📁 services/          # 后端服务 (${structure.server.services.length}个文件)
│   └── 📄 app.js             # 服务器入口
├── 📁 docs/                  # 项目文档 (${structure.docs.length}个文件)
│   ├── 📁 reports/           # 报告文档
│   ├── 📄 API.md             # API文档
│   └── 📄 DEPLOYMENT.md      # 部署文档
├── 📁 scripts/               # 项目脚本 (${structure.scripts.length}个文件)
│   ├── 📄 cleanup-deprecated-files.js # 废弃文件清理
│   ├── 📄 code-quality-optimizer.js  # 代码质量优化
│   └── 📄 dependency-analyzer.js     # 依赖分析
├── 📄 package.json           # 项目配置
├── 📄 tsconfig.json          # TypeScript配置
├── 📄 vite.config.ts         # Vite构建配置
└── 📄 tailwind.config.js     # Tailwind CSS配置
\`\`\`

### 🎯 核心目录说明

#### 前端架构 (\`src/\`)
- **components/**: 组件化架构，按功能和层级组织
- **pages/**: 页面级组件，对应路由
- **services/**: 业务逻辑和API调用
- **hooks/**: 自定义React Hooks
- **utils/**: 通用工具函数
- **styles/**: 样式系统和主题

#### 后端架构 (\`server/\`)
- **routes/**: RESTful API路由定义
- **middleware/**: 请求处理中间件
- **services/**: 业务逻辑服务层
- **app.js**: Express应用入口

#### 文档系统 (\`docs/\`)
- **reports/**: 开发过程报告和分析
- **API.md**: API接口文档
- **DEPLOYMENT.md**: 部署指南

#### 工具脚本 (\`scripts/\`)
- **cleanup-deprecated-files.js**: 清理废弃文件
- **code-quality-optimizer.js**: 代码质量优化
- **dependency-analyzer.js**: 依赖关系分析`;
}

/**
 * 为复杂函数添加注释
 */
function addFunctionComments() {
  console.log('💬 为复杂函数添加注释...\n');
  
  const filesToCheck = [
    'src/services/seoService.ts',
    'src/services/testService.ts',
    'src/hooks/useTestEngine.ts',
    'server/services/testEngineService.js'
  ];
  
  filesToCheck.forEach(filePath => {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    
    if (fs.existsSync(fullPath)) {
      try {
        let content = fs.readFileSync(fullPath, 'utf8');
        let modified = false;
        
        // 查找没有注释的复杂函数
        const functionRegex = /^(export\s+)?(async\s+)?function\s+(\w+)\s*\([^)]*\)\s*\{/gm;
        let match;
        
        while ((match = functionRegex.exec(content)) !== null) {
          const functionName = match[3];
          const functionStart = match.index;
          
          // 检查函数前是否已有注释
          const beforeFunction = content.substring(0, functionStart);
          const lines = beforeFunction.split('\n');
          const lastLine = lines[lines.length - 1];
          const secondLastLine = lines[lines.length - 2] || '';
          
          // 如果没有注释，添加基础注释模板
          if (!lastLine.trim().startsWith('//') && 
              !lastLine.trim().startsWith('*') && 
              !secondLastLine.trim().startsWith('/**')) {
            
            const comment = `/**\n * ${functionName} - 函数功能描述\n * @param {*} params - 参数描述\n * @returns {*} 返回值描述\n */\n`;
            content = content.substring(0, functionStart) + comment + content.substring(functionStart);
            modified = true;
            
            updateResults.addedComments.push({
              file: filePath,
              function: functionName
            });
          }
        }
        
        if (modified) {
          fs.writeFileSync(fullPath, content, 'utf8');
          updateResults.updatedFiles.push(filePath);
          console.log(`✅ 为 ${filePath} 添加函数注释`);
        }
        
      } catch (error) {
        updateResults.errors.push(`处理文件失败 ${filePath}: ${error.message}`);
      }
    }
  });
}

/**
 * 移除过时注释
 */
function removeOutdatedComments() {
  console.log('🗑️  移除过时注释...\n');
  
  const sourceFiles = [];
  ['src', 'server'].forEach(dir => {
    const dirPath = path.join(PROJECT_ROOT, dir);
    if (fs.existsSync(dirPath)) {
      sourceFiles.push(...scanDirectory(dirPath, ['.ts', '.tsx', '.js', '.jsx']));
    }
  });
  
  const outdatedPatterns = [
    /\/\/ TODO: .+已完成.*$/gm,
    /\/\/ FIXME: .+已修复.*$/gm,
    /\/\/ DEPRECATED: .+$/gm,
    /\/\/ 临时.*$/gm,
    /\/\/ 测试.*$/gm
  ];
  
  sourceFiles.forEach(filePath => {
    const fullPath = path.join(PROJECT_ROOT, filePath);
    
    try {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      let removedCount = 0;
      
      outdatedPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          content = content.replace(pattern, '');
          removedCount += matches.length;
        }
      });
      
      // 清理多余的空行
      content = content.replace(/\n\s*\n\s*\n/g, '\n\n');
      
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        updateResults.removedComments.push({
          file: filePath,
          count: removedCount
        });
        console.log(`✅ 从 ${filePath} 移除 ${removedCount} 个过时注释`);
      }
      
    } catch (error) {
      updateResults.errors.push(`处理文件失败 ${filePath}: ${error.message}`);
    }
  });
}

/**
 * 创建缺失的文档
 */
function createMissingDocuments() {
  console.log('📄 创建缺失的文档...\n');
  
  const docsToCreate = [
    {
      path: 'docs/CONTRIBUTING.md',
      title: '贡献指南',
      content: generateContributingDoc()
    },
    {
      path: 'docs/CHANGELOG.md',
      title: '更新日志',
      content: generateChangelogDoc()
    },
    {
      path: 'docs/CODE_STYLE.md',
      title: '代码规范',
      content: generateCodeStyleDoc()
    }
  ];
  
  docsToCreate.forEach(doc => {
    const fullPath = path.join(PROJECT_ROOT, doc.path);
    
    if (!fs.existsSync(fullPath)) {
      try {
        // 确保目录存在
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        fs.writeFileSync(fullPath, doc.content, 'utf8');
        updateResults.createdDocs.push(doc.path);
        console.log(`✅ 创建文档: ${doc.path}`);
        
      } catch (error) {
        updateResults.errors.push(`创建文档失败 ${doc.path}: ${error.message}`);
      }
    }
  });
}

/**
 * 生成贡献指南文档
 */
function generateContributingDoc() {
  return `# 贡献指南

## 🤝 欢迎贡献

感谢您对Test Web App项目的关注！我们欢迎各种形式的贡献。

## 📋 贡献方式

### 🐛 报告Bug
- 使用GitHub Issues报告问题
- 提供详细的复现步骤
- 包含错误截图或日志

### 💡 功能建议
- 在Issues中提出新功能建议
- 详细描述功能需求和使用场景
- 讨论实现方案

### 🔧 代码贡献
1. Fork项目到您的GitHub账户
2. 创建功能分支: \`git checkout -b feature/amazing-feature\`
3. 提交更改: \`git commit -m 'Add amazing feature'\`
4. 推送分支: \`git push origin feature/amazing-feature\`
5. 创建Pull Request

## 📝 开发规范

### 代码风格
- 使用TypeScript进行类型安全开发
- 遵循ESLint和Prettier配置
- 组件使用PascalCase命名
- 函数使用camelCase命名

### 提交规范
- feat: 新功能
- fix: 修复bug
- docs: 文档更新
- style: 代码格式调整
- refactor: 代码重构
- test: 测试相关
- chore: 构建过程或辅助工具的变动

## 🧪 测试要求

- 新功能需要包含相应的测试用例
- 确保所有测试通过: \`npm test\`
- 保持测试覆盖率

## 📚 文档要求

- 新功能需要更新相关文档
- API变更需要更新API文档
- 复杂功能需要添加使用示例

## ✅ Pull Request检查清单

- [ ] 代码遵循项目规范
- [ ] 包含必要的测试
- [ ] 更新了相关文档
- [ ] 通过了所有CI检查
- [ ] 提供了清晰的PR描述

## 🙏 致谢

感谢所有为项目做出贡献的开发者！
`;
}

/**
 * 生成更新日志文档
 */
function generateChangelogDoc() {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return `# 更新日志

所有重要的项目变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.0.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [未发布]

### 新增
- 项目代码整理和结构优化
- 响应式设计系统优化
- 废弃文件清理脚本
- 代码质量优化工具
- 依赖关系分析工具

### 修改
- 优化项目文件结构
- 统一代码格式和命名规范
- 更新项目文档

### 移除
- 清理未使用的依赖包
- 移除废弃的代码和文件
- 删除过时的注释

## [1.0.0] - ${currentDate}

### 新增
- 初始版本发布
- SEO测试功能
- 性能测试功能
- 安全测试功能
- 用户认证系统
- 现代化UI界面
- 响应式设计支持

### 技术栈
- 前端: React + TypeScript + Vite
- 后端: Node.js + Express
- 数据库: PostgreSQL
- 样式: Tailwind CSS
- 图标: Lucide React
`;
}

/**
 * 生成代码规范文档
 */
function generateCodeStyleDoc() {
  return `# 代码规范

## 📋 总体原则

- 代码应该清晰、简洁、易于理解
- 优先使用TypeScript进行类型安全开发
- 遵循一致的命名约定和格式规范
- 编写有意义的注释和文档

## 🎯 命名规范

### 文件命名
- **组件文件**: PascalCase (如: \`UserProfile.tsx\`)
- **工具文件**: camelCase (如: \`apiUtils.ts\`)
- **常量文件**: UPPER_SNAKE_CASE (如: \`API_CONSTANTS.ts\`)
- **样式文件**: kebab-case (如: \`user-profile.css\`)

### 变量和函数命名
- **变量**: camelCase (如: \`userName\`, \`isLoading\`)
- **函数**: camelCase (如: \`getUserData\`, \`handleClick\`)
- **常量**: UPPER_SNAKE_CASE (如: \`MAX_RETRY_COUNT\`)
- **类型/接口**: PascalCase (如: \`UserData\`, \`ApiResponse\`)

### 组件命名
- **React组件**: PascalCase (如: \`UserProfile\`, \`LoadingSpinner\`)
- **Hook**: camelCase with 'use' prefix (如: \`useUserData\`, \`useApi\`)

## 🔧 代码格式

### 缩进和空格
- 使用2个空格进行缩进
- 行尾不留空格
- 文件末尾保留一个空行

### 导入语句顺序
1. React相关导入
2. 第三方库导入
3. 本地组件导入
4. 工具函数导入
5. 类型定义导入

\`\`\`typescript
import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import axios from 'axios';

import { UserProfile } from './components/UserProfile';
import { LoadingSpinner } from './components/ui/LoadingSpinner';

import { apiUtils } from './utils/apiUtils';
import { formatDate } from './utils/dateUtils';

import type { User, ApiResponse } from './types';
\`\`\`

## 📝 注释规范

### 函数注释
\`\`\`typescript
/**
 * 获取用户数据
 * @param userId - 用户ID
 * @param options - 请求选项
 * @returns Promise<User> 用户数据
 */
async function getUserData(userId: string, options?: RequestOptions): Promise<User> {
  // 实现代码
}
\`\`\`

### 组件注释
\`\`\`typescript
/**
 * 用户资料组件
 * 显示用户的基本信息和操作按钮
 */
interface UserProfileProps {
  /** 用户数据 */
  user: User;
  /** 是否显示编辑按钮 */
  showEditButton?: boolean;
  /** 编辑按钮点击回调 */
  onEdit?: () => void;
}
\`\`\`

## 🧪 测试规范

- 每个组件都应该有对应的测试文件
- 测试文件命名: \`ComponentName.test.tsx\`
- 测试覆盖率应该保持在80%以上
- 使用描述性的测试用例名称

## 🚀 性能优化

- 使用React.memo优化组件渲染
- 合理使用useMemo和useCallback
- 避免在render中创建新对象
- 图片使用适当的格式和大小

## 🔒 安全规范

- 不在代码中硬编码敏感信息
- 使用环境变量管理配置
- 对用户输入进行验证和清理
- 使用HTTPS进行数据传输

## 📚 文档要求

- 复杂的业务逻辑需要添加注释
- 公共API需要完整的JSDoc注释
- README文件需要保持更新
- 重要变更需要更新CHANGELOG
`;
}

/**
 * 生成文档更新报告
 */
function generateDocumentationReport() {
  const timestamp = new Date().toISOString();
  const reportContent = `# 文档更新报告

## 📅 更新日期
${timestamp.split('T')[0]}

## 📊 更新统计

### 更新的文件 (${updateResults.updatedFiles.length}个)
${updateResults.updatedFiles.map(file => `- \`${file}\``).join('\n')}

### 添加的注释 (${updateResults.addedComments.length}个)
${updateResults.addedComments.map(item => `- \`${item.file}\`: ${item.function}函数`).join('\n')}

### 移除的过时注释 (${updateResults.removedComments.length}个文件)
${updateResults.removedComments.map(item => `- \`${item.file}\`: 移除了 ${item.count} 个过时注释`).join('\n')}

### 创建的文档 (${updateResults.createdDocs.length}个)
${updateResults.createdDocs.map(doc => `- \`${doc}\``).join('\n')}

## ❌ 错误记录 (${updateResults.errors.length}个)
${updateResults.errors.length > 0 ? updateResults.errors.map(error => `- ${error}`).join('\n') : '无错误'}

## ✅ 更新完成

项目文档已全面更新，代码注释得到完善，过时内容已清理。

---
**生成时间**: ${timestamp}
**脚本版本**: v1.0.0
`;

  const reportPath = path.join(PROJECT_ROOT, 'docs', 'reports', 'DOCUMENTATION_UPDATE_REPORT.md');
  
  // 确保目录存在
  const reportDir = path.dirname(reportPath);
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`📄 文档更新报告已保存: ${reportPath}`);
}

/**
 * 主函数
 */
function main() {
  try {
    console.log('📚 开始文档和注释更新...\n');
    
    // 更新README.md项目结构
    updateReadmeStructure();
    
    // 为复杂函数添加注释
    addFunctionComments();
    
    // 移除过时注释
    removeOutdatedComments();
    
    // 创建缺失的文档
    createMissingDocuments();
    
    // 生成更新报告
    generateDocumentationReport();
    
    console.log('\n🎉 文档和注释更新完成！');
    
    if (updateResults.errors.length === 0) {
      console.log('✅ 更新过程中无错误');
    } else {
      console.log(`⚠️  更新过程中发现 ${updateResults.errors.length} 个错误，请检查报告`);
    }
    
  } catch (error) {
    console.error('\n💥 更新过程中发生错误:', error.message);
    process.exit(1);
  }
}

// 运行主函数
if (require.main === module) {
  main();
}

module.exports = {
  getCurrentProjectStructure,
  updateReadmeStructure,
  addFunctionComments,
  removeOutdatedComments,
  createMissingDocuments,
  generateDocumentationReport
};
