#!/usr/bin/env node

/**
 * 修复测试历史API集成问题
 * 解决前后端API路径不统一、数据格式不匹配等问题
 */

const fs = require('fs');
const path = require('path');

class HistoryAPIFixer {
  constructor() {
    this.projectRoot = path.resolve(__dirname, '..');
    this.issues = [];
    this.fixes = [];
  }

  /**
   * 执行修复
   */
  async fix() {
    console.log('🔧 开始修复测试历史API集成问题...\n');

    try {
      // 1. 检查和修复前端服务引用
      await this.fixFrontendServiceReferences();

      // 2. 统一API路径配置
      await this.unifyAPIRoutes();

      // 3. 修复数据格式不匹配
      await this.fixDataFormatMismatch();

      // 4. 验证修复结果
      await this.validateFixes();

      this.generateReport();

    } catch (error) {
      console.error('❌ 修复过程中出现错误:', error);
      process.exit(1);
    }
  }

  /**
   * 修复前端服务引用
   */
  async fixFrontendServiceReferences() {
    console.log('📝 修复前端服务引用...');

    const testHistoryPanelPath = path.join(
      this.projectRoot,
      'frontend/components/testing/TestHistoryPanel.tsx'
    );

    if (fs.existsSync(testHistoryPanelPath)) {
      let content = fs.readFileSync(testHistoryPanelPath, 'utf8');
      
      // 修复historyService引用
      const oldImport = "import { historyService } from '../../services/historyService';";
      const newImport = "import { historyService } from '../../services/historyService';";
      
      if (content.includes(oldImport)) {
        console.log('  ✅ historyService引用已正确');
      } else {
        // 查找错误的引用并修复
        content = content.replace(
          /import\s+{\s*historyService\s*}\s+from\s+['"][^'"]*['"];?/g,
          newImport
        );
        
        fs.writeFileSync(testHistoryPanelPath, content);
        this.fixes.push('修复TestHistoryPanel中的historyService引用');
        console.log('  ✅ 已修复historyService引用');
      }
    }
  }

  /**
   * 统一API路径配置
   */
  async unifyAPIRoutes() {
    console.log('🔗 统一API路径配置...');

    // 更新UnifiedTestService中的API路径
    const unifiedServicePath = path.join(
      this.projectRoot,
      'frontend/services/unifiedTestService.ts'
    );

    if (fs.existsSync(unifiedServicePath)) {
      let content = fs.readFileSync(unifiedServicePath, 'utf8');
      
      // 修复getTestHistory方法的API路径
      const oldPattern = /`\${this\.baseURL}\/tests\/\${testType}\/history`/g;
      const newPattern = '`${this.baseURL}/test/history?type=${testType}`';
      
      if (content.match(oldPattern)) {
        content = content.replace(oldPattern, newPattern);
        fs.writeFileSync(unifiedServicePath, content);
        this.fixes.push('统一UnifiedTestService中的API路径');
        console.log('  ✅ 已统一UnifiedTestService API路径');
      }

      // 修复deleteHistoryItem方法的API路径
      const deletePattern = /`\${this\.baseURL}\/tests\/\${testType}\/history\/\${testId}`/g;
      const newDeletePattern = '`${this.baseURL}/test/history/${testId}`';
      
      if (content.match(deletePattern)) {
        content = content.replace(deletePattern, newDeletePattern);
        fs.writeFileSync(unifiedServicePath, content);
        this.fixes.push('统一删除API路径');
        console.log('  ✅ 已统一删除API路径');
      }
    }
  }

  /**
   * 修复数据格式不匹配
   */
  async fixDataFormatMismatch() {
    console.log('🔄 修复数据格式不匹配...');

    // 创建数据转换工具
    const transformerPath = path.join(
      this.projectRoot,
      'frontend/utils/testDataTransformer.ts'
    );

    const transformerContent = `/**
 * 测试数据转换工具
 * 处理前后端数据格式不匹配问题
 */

export interface BackendTestRecord {
  id: string;
  session_id?: string;
  test_name: string;
  test_type: string;
  url: string;
  target_url?: string;
  status: string;
  overall_score?: number;
  score?: number;
  duration?: number;
  created_at: string;
  updated_at: string;
  config: string | object;
  results: string | object;
  total_issues?: number;
  critical_issues?: number;
  major_issues?: number;
  minor_issues?: number;
}

export interface FrontendTestResult {
  testId: string;
  testType: string;
  url: string;
  timestamp: string;
  totalTime: number;
  summary: {
    score: number;
    totalChecks?: number;
    passed?: number;
    failed?: number;
    warnings?: number;
  };
  checks?: Record<string, any>;
  config: any;
}

export class TestDataTransformer {
  /**
   * 转换后端测试记录为前端格式
   */
  static transformBackendToFrontend(backendRecord: BackendTestRecord): FrontendTestResult {
    return {
      testId: backendRecord.id || backendRecord.session_id || '',
      testType: backendRecord.test_type,
      url: backendRecord.url || backendRecord.target_url || '',
      timestamp: backendRecord.created_at,
      totalTime: backendRecord.duration || 0,
      summary: {
        score: backendRecord.overall_score || backendRecord.score || 0,
        totalChecks: backendRecord.total_issues,
        passed: 0, // 需要从results中计算
        failed: (backendRecord.critical_issues || 0) + (backendRecord.major_issues || 0),
        warnings: backendRecord.minor_issues || 0
      },
      checks: this.parseResults(backendRecord.results),
      config: this.parseConfig(backendRecord.config)
    };
  }

  /**
   * 解析结果数据
   */
  private static parseResults(results: string | object): any {
    if (typeof results === 'string') {
      try {
        return JSON.parse(results);
      } catch {
        return {};
      }
    }
    return results || {};
  }

  /**
   * 解析配置数据
   */
  private static parseConfig(config: string | object): any {
    if (typeof config === 'string') {
      try {
        return JSON.parse(config);
      } catch {
        return {};
      }
    }
    return config || {};
  }
}
`;

    fs.writeFileSync(transformerPath, transformerContent);
    this.fixes.push('创建数据转换工具');
    console.log('  ✅ 已创建数据转换工具');
  }

  /**
   * 验证修复结果
   */
  async validateFixes() {
    console.log('✅ 验证修复结果...');

    const validations = [
      {
        name: 'historyService文件存在',
        check: () => fs.existsSync(path.join(this.projectRoot, 'frontend/services/historyService.ts')),
        required: true
      },
      {
        name: 'TestHistoryPanel组件存在',
        check: () => fs.existsSync(path.join(this.projectRoot, 'frontend/components/testing/TestHistoryPanel.tsx')),
        required: true
      },
      {
        name: 'UnifiedTestService存在',
        check: () => fs.existsSync(path.join(this.projectRoot, 'frontend/services/unifiedTestService.ts')),
        required: true
      },
      {
        name: '数据转换工具已创建',
        check: () => fs.existsSync(path.join(this.projectRoot, 'frontend/utils/testDataTransformer.ts')),
        required: false
      }
    ];

    let allPassed = true;
    for (const validation of validations) {
      const passed = validation.check();
      const status = passed ? '✅' : (validation.required ? '❌' : '⚠️');
      console.log(`  ${status} ${validation.name}`);
      
      if (!passed && validation.required) {
        allPassed = false;
        this.issues.push(`必需验证失败: ${validation.name}`);
      }
    }

    if (!allPassed) {
      throw new Error('关键验证失败，请检查修复结果');
    }
  }

  /**
   * 生成修复报告
   */
  generateReport() {
    console.log('\n📋 修复报告');
    console.log('='.repeat(50));
    
    console.log(`\n✅ 成功修复 ${this.fixes.length} 个问题:`);
    this.fixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. ${fix}`);
    });

    if (this.issues.length > 0) {
      console.log(`\n⚠️  发现 ${this.issues.length} 个问题:`);
      this.issues.forEach((issue, index) => {
        console.log(`  ${index + 1}. ${issue}`);
      });
    }

    console.log('\n🎯 后续步骤:');
    console.log('  1. 重启前端开发服务器');
    console.log('  2. 测试历史记录功能');
    console.log('  3. 验证API调用是否正常');
    console.log('  4. 检查数据显示是否正确');

    console.log('\n✅ 修复完成！');
  }
}

// 执行修复
if (require.main === module) {
  const fixer = new HistoryAPIFixer();
  fixer.fix().catch(console.error);
}

module.exports = HistoryAPIFixer;
