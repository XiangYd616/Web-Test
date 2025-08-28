/**
 * 🔍 统一测试引擎功能验证脚本
 * 验证统一测试引擎的所有功能是否正常工作
 */

const axios = require('axios');
const WebSocket = require('ws');

const BASE_URL = 'http://localhost:3001';
const WS_URL = 'ws://localhost:3001';

/**
 * 验证脚本主类
 */
class UnifiedEngineVerifier {
  constructor() {
    this.results = {
      api: {},
      websocket: {},
      integration: {}
    };
  }

  /**
   * 运行完整验证
   */
  async runFullVerification() {
    console.log('🚀 开始验证统一测试引擎功能...\n');

    try {
      // 1. 验证API功能
      await this.verifyAPIFunctions();
      
      // 2. 验证WebSocket功能
      await this.verifyWebSocketFunctions();
      
      // 3. 验证集成功能
      await this.verifyIntegrationFunctions();
      
      // 4. 生成验证报告
      this.generateReport();
      
    } catch (error) {
      console.error('❌ 验证过程中发生错误:', error);
    }
  }

  /**
   * 验证API功能
   */
  async verifyAPIFunctions() {
    console.log('📡 验证API功能...');

    // 验证获取测试类型
    try {
      const response = await axios.get(`${BASE_URL}/api/unified-engine/test-types`);
      this.results.api.testTypes = {
        success: response.status === 200,
        data: response.data,
        message: '获取测试类型成功'
      };
      console.log('✅ 获取测试类型: 成功');
    } catch (error) {
      this.results.api.testTypes = {
        success: false,
        error: error.message,
        message: '获取测试类型失败'
      };
      console.log('❌ 获取测试类型: 失败 -', error.message);
    }

    // 验证测试执行
    try {
      const testConfig = {
        testType: 'performance',
        config: {
          url: 'https://example.com',
          device: 'desktop',
          throttling: 'simulated3G'
        },
        options: {
          priority: 'normal',
          tags: ['verification', 'demo']
        }
      };

      const response = await axios.post(`${BASE_URL}/api/unified-engine/execute`, testConfig);
      this.results.api.execute = {
        success: response.status === 200,
        data: response.data,
        message: '测试执行成功'
      };
      console.log('✅ 测试执行: 成功');
      
      // 保存测试ID用于后续验证
      this.testId = response.data?.data?.testId;
      
    } catch (error) {
      this.results.api.execute = {
        success: false,
        error: error.message,
        message: '测试执行失败'
      };
      console.log('❌ 测试执行: 失败 -', error.message);
    }

    // 验证测试状态查询
    if (this.testId) {
      try {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
        
        const response = await axios.get(`${BASE_URL}/api/unified-engine/status/${this.testId}`);
        this.results.api.status = {
          success: response.status === 200,
          data: response.data,
          message: '获取测试状态成功'
        };
        console.log('✅ 获取测试状态: 成功');
      } catch (error) {
        this.results.api.status = {
          success: false,
          error: error.message,
          message: '获取测试状态失败'
        };
        console.log('❌ 获取测试状态: 失败 -', error.message);
      }
    }

    console.log('');
  }

  /**
   * 验证WebSocket功能
   */
  async verifyWebSocketFunctions() {
    console.log('🔌 验证WebSocket功能...');

    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(`${WS_URL}/unified-engine`);
        let messageCount = 0;
        const timeout = setTimeout(() => {
          ws.close();
          this.results.websocket.connection = {
            success: false,
            message: 'WebSocket连接超时'
          };
          console.log('❌ WebSocket连接: 超时');
          resolve();
        }, 10000);

        ws.on('open', () => {
          console.log('✅ WebSocket连接: 成功');
          this.results.websocket.connection = {
            success: true,
            message: 'WebSocket连接成功'
          };

          // 发送测试消息
          ws.send(JSON.stringify({
            type: 'getEngineStatus'
          }));

          // 如果有测试ID，订阅测试更新
          if (this.testId) {
            ws.send(JSON.stringify({
              type: 'subscribeTest',
              testId: this.testId
            }));
          }
        });

        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            messageCount++;
            
            console.log(`✅ 收到WebSocket消息 (${messageCount}):`, message.type);
            
            this.results.websocket.messages = {
              success: true,
              count: messageCount,
              lastMessage: message,
              message: `收到${messageCount}条消息`
            };

            // 收到足够消息后关闭连接
            if (messageCount >= 2) {
              clearTimeout(timeout);
              ws.close();
              resolve();
            }
          } catch (error) {
            console.log('❌ WebSocket消息解析失败:', error.message);
          }
        });

        ws.on('error', (error) => {
          console.log('❌ WebSocket错误:', error.message);
          this.results.websocket.connection = {
            success: false,
            error: error.message,
            message: 'WebSocket连接失败'
          };
          clearTimeout(timeout);
          resolve();
        });

        ws.on('close', () => {
          console.log('🔌 WebSocket连接已关闭');
          clearTimeout(timeout);
          resolve();
        });

      } catch (error) {
        console.log('❌ WebSocket初始化失败:', error.message);
        this.results.websocket.connection = {
          success: false,
          error: error.message,
          message: 'WebSocket初始化失败'
        };
        resolve();
      }
    });
  }

  /**
   * 验证集成功能
   */
  async verifyIntegrationFunctions() {
    console.log('🔗 验证集成功能...');

    // 验证健康检查
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      this.results.integration.health = {
        success: response.status === 200,
        data: response.data,
        message: '健康检查成功'
      };
      console.log('✅ 健康检查: 成功');
    } catch (error) {
      this.results.integration.health = {
        success: false,
        error: error.message,
        message: '健康检查失败'
      };
      console.log('❌ 健康检查: 失败 -', error.message);
    }

    // 验证API文档
    try {
      const response = await axios.get(`${BASE_URL}/api-docs.json`);
      this.results.integration.apiDocs = {
        success: response.status === 200,
        data: response.data,
        message: 'API文档获取成功'
      };
      console.log('✅ API文档: 成功');
    } catch (error) {
      this.results.integration.apiDocs = {
        success: false,
        error: error.message,
        message: 'API文档获取失败'
      };
      console.log('❌ API文档: 失败 -', error.message);
    }

    console.log('');
  }

  /**
   * 生成验证报告
   */
  generateReport() {
    console.log('📊 统一测试引擎验证报告');
    console.log('='.repeat(50));

    // API功能报告
    console.log('\n📡 API功能验证:');
    Object.entries(this.results.api).forEach(([key, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.message}`);
    });

    // WebSocket功能报告
    console.log('\n🔌 WebSocket功能验证:');
    Object.entries(this.results.websocket).forEach(([key, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.message}`);
    });

    // 集成功能报告
    console.log('\n🔗 集成功能验证:');
    Object.entries(this.results.integration).forEach(([key, result]) => {
      const status = result.success ? '✅' : '❌';
      console.log(`  ${status} ${key}: ${result.message}`);
    });

    // 总体评估
    const totalTests = this.getTotalTestCount();
    const successfulTests = this.getSuccessfulTestCount();
    const successRate = (successfulTests / totalTests * 100).toFixed(1);

    console.log('\n📈 总体评估:');
    console.log(`  总测试数: ${totalTests}`);
    console.log(`  成功数: ${successfulTests}`);
    console.log(`  成功率: ${successRate}%`);

    if (successRate >= 80) {
      console.log('\n🎉 统一测试引擎验证通过！功能正常。');
    } else if (successRate >= 60) {
      console.log('\n⚠️ 统一测试引擎部分功能正常，需要优化。');
    } else {
      console.log('\n❌ 统一测试引擎存在严重问题，需要修复。');
    }

    console.log('\n🔗 访问链接:');
    console.log(`  前端界面: http://localhost:5175`);
    console.log(`  后端API: http://localhost:3001/api`);
    console.log(`  API文档: http://localhost:3001/api-docs`);
    console.log(`  健康检查: http://localhost:3001/health`);
  }

  /**
   * 获取总测试数
   */
  getTotalTestCount() {
    let count = 0;
    Object.values(this.results).forEach(category => {
      count += Object.keys(category).length;
    });
    return count;
  }

  /**
   * 获取成功测试数
   */
  getSuccessfulTestCount() {
    let count = 0;
    Object.values(this.results).forEach(category => {
      Object.values(category).forEach(result => {
        if (result.success) count++;
      });
    });
    return count;
  }
}

/**
 * 主执行函数
 */
async function main() {
  const verifier = new UnifiedEngineVerifier();
  await verifier.runFullVerification();
}

// 如果直接运行此脚本
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { UnifiedEngineVerifier };
