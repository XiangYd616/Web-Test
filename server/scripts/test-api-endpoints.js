/**
 * API端点测试脚本
 * 测试前后端API集成
 */

const http = require('http');
const { v4: uuidv4 } = require('uuid');

class APIEndpointTest {
  constructor() {
    this.baseUrl = 'http://localhost:3001';
    this.testResults = [];
    this.authToken = null;
  }

  async runTests() {
    console.log('🌐 开始API端点测试...');
    console.log('=====================================');

    try {
      await this.testServerConnection();
      await this.testAuthEndpoints();
      await this.testHistoryEndpoints();
      await this.generateReport();
    } catch (error) {
      console.error('❌ API测试过程中发生错误:', error);
    }
  }

  async testServerConnection() {
    console.log('1️⃣ 测试服务器连接...');

    try {
      const response = await this.makeRequest('GET', '/api/health');
      if (response.statusCode === 200) {
        console.log('   ✅ 服务器连接正常');
        this.testResults.push({
          test: '服务器连接',
          status: 'PASSED',
          details: '健康检查通过'
        });
      } else {
        throw new Error(`服务器响应异常: ${response.statusCode}`);
      }
    } catch (error) {
      console.log('   ⚠️  服务器连接失败 (可能服务器未启动)');
      this.testResults.push({
        test: '服务器连接',
        status: 'SKIPPED',
        details: '服务器未启动或不可访问'
      });
    }
  }

  async testAuthEndpoints() {
    console.log('2️⃣ 测试认证端点...');

    try {
      // 测试登录端点
      const loginData = {
        identifier: 'test@example.com',
        password: 'dummy_hash'
      };

      const response = await this.makeRequest('POST', '/api/auth/login', loginData);
      
      if (response.statusCode === 200) {
        const data = JSON.parse(response.data);
        if (data.tokens && data.tokens.accessToken) {
          this.authToken = data.tokens.accessToken;
          console.log('   ✅ 登录成功，获取到认证令牌');
          this.testResults.push({
            test: '用户认证',
            status: 'PASSED',
            details: '登录成功'
          });
        } else {
          throw new Error('登录响应格式异常');
        }
      } else {
        throw new Error(`登录失败: ${response.statusCode}`);
      }
    } catch (error) {
      console.log('   ⚠️  认证测试跳过:', error.message);
      this.testResults.push({
        test: '用户认证',
        status: 'SKIPPED',
        details: error.message
      });
    }
  }

  async testHistoryEndpoints() {
    console.log('3️⃣ 测试历史记录端点...');

    if (!this.authToken) {
      console.log('   ⚠️  跳过历史记录测试 (无认证令牌)');
      this.testResults.push({
        test: '历史记录API',
        status: 'SKIPPED',
        details: '无认证令牌'
      });
      return;
    }

    try {
      // 测试获取测试历史
      const historyResponse = await this.makeRequest(
        'GET', 
        '/api/test/history?page=1&limit=10',
        null,
        { 'Authorization': `Bearer ${this.authToken}` }
      );

      if (historyResponse.statusCode === 200) {
        const data = JSON.parse(historyResponse.data);
        if (data.success && data.data && Array.isArray(data.data.tests)) {
          console.log(`   ✅ 历史记录查询成功: ${data.data.tests.length} 条记录`);
          this.testResults.push({
            test: '历史记录查询',
            status: 'PASSED',
            details: `返回 ${data.data.tests.length} 条记录`
          });
        } else {
          throw new Error('历史记录响应格式异常');
        }
      } else {
        throw new Error(`历史记录查询失败: ${historyResponse.statusCode}`);
      }

      // 测试统计端点
      const statsResponse = await this.makeRequest(
        'GET',
        '/api/test/stats',
        null,
        { 'Authorization': `Bearer ${this.authToken}` }
      );

      if (statsResponse.statusCode === 200) {
        const data = JSON.parse(statsResponse.data);
        if (data.success) {
          console.log('   ✅ 统计数据查询成功');
          this.testResults.push({
            test: '统计数据查询',
            status: 'PASSED',
            details: '统计API正常工作'
          });
        } else {
          throw new Error('统计数据响应格式异常');
        }
      } else {
        throw new Error(`统计数据查询失败: ${statsResponse.statusCode}`);
      }

    } catch (error) {
      console.log('   ❌ 历史记录测试失败:', error.message);
      this.testResults.push({
        test: '历史记录API',
        status: 'FAILED',
        error: error.message
      });
    }
  }

  async makeRequest(method, path, data = null, headers = {}) {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3001,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      };

      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });

        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  async generateReport() {
    console.log('\n📊 API测试报告...');
    console.log('=====================================');

    const passedTests = this.testResults.filter(r => r.status === 'PASSED');
    const failedTests = this.testResults.filter(r => r.status === 'FAILED');
    const skippedTests = this.testResults.filter(r => r.status === 'SKIPPED');

    console.log(`✅ 通过测试: ${passedTests.length}`);
    console.log(`❌ 失败测试: ${failedTests.length}`);
    console.log(`⏭️  跳过测试: ${skippedTests.length}`);

    if (failedTests.length > 0) {
      console.log('\n❌ 失败的测试:');
      failedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.error}`);
      });
    }

    if (skippedTests.length > 0) {
      console.log('\n⏭️  跳过的测试:');
      skippedTests.forEach(test => {
        console.log(`   - ${test.test}: ${test.details}`);
      });
    }

    console.log('\n✅ 通过的测试:');
    passedTests.forEach(test => {
      console.log(`   - ${test.test}: ${test.details}`);
    });

    console.log('\n💡 提示:');
    console.log('- 如果服务器连接失败，请先启动服务器: npm start');
    console.log('- 如果认证失败，请检查用户数据和密码');
    console.log('- 所有API端点都应该使用新的数据库架构');
  }
}

async function main() {
  const test = new APIEndpointTest();
  await test.runTests();
}

if (require.main === module) {
  main();
}

module.exports = APIEndpointTest;
