#!/usr/bin/env node

/**
 * 端口配置管理工具
 * 检查和管理项目中的端口配置
 */

const fs = require('fs');
const path = require('path');

class PortConfigManager {
  constructor() {
    this.defaultPorts = {
      frontend: 5174,
      backend: 3001,
      electron: 5174,
      preview: 5174
    };
    
    this.issues = [];
    this.suggestions = [];
  }

  /**
   * 检查端口配置
   */
  checkPortConfig() {
    console.log('🔍 检查端口配置...');
    console.log('=' .repeat(50));

    // 检查环境变量文件
    this.checkEnvFiles();
    
    // 检查 package.json 脚本
    this.checkPackageScripts();
    
    // 检查 vite.config.ts
    this.checkViteConfig();
    
    // 检查端口冲突
    this.checkPortConflicts();
    
    // 生成报告
    this.generateReport();
  }

  /**
   * 检查环境变量文件
   */
  checkEnvFiles() {
    console.log('📁 检查环境变量文件中的端口配置...');
    
    const envFiles = [
      { path: '.env', name: '根目录配置' },
      { path: 'server/.env', name: '后端配置' }
    ];

    envFiles.forEach(({ path: filePath, name }) => {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        const ports = this.extractPorts(content);
        
        if (ports.length > 0) {
          console.log(`✅ ${name} (${filePath}):`);
          ports.forEach(({ key, value }) => {
            console.log(`   ${key}=${value}`);
          });
        } else {
          console.log(`⚠️  ${name} (${filePath}): 无端口配置`);
        }
      }
    });
  }

  /**
   * 检查 package.json 脚本
   */
  checkPackageScripts() {
    console.log('\n📦 检查 package.json 脚本中的端口配置...');
    
    const packageFiles = [
      { path: 'package.json', name: '根目录' },
      { path: 'server/package.json', name: '后端' }
    ];

    packageFiles.forEach(({ path: filePath, name }) => {
      if (fs.existsSync(filePath)) {
        const packageJson = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const scripts = packageJson.scripts || {};
        
        console.log(`📋 ${name} (${filePath}):`);
        
        Object.entries(scripts).forEach(([scriptName, command]) => {
          if (this.containsPortConfig(command)) {
            console.log(`   ${scriptName}: ${command}`);
          }
        });
      }
    });
  }

  /**
   * 检查 vite.config.ts
   */
  checkViteConfig() {
    console.log('\n⚡ 检查 Vite 配置...');
    
    const viteConfigPath = 'vite.config.ts';
    if (fs.existsSync(viteConfigPath)) {
      const content = fs.readFileSync(viteConfigPath, 'utf8');
      
      // 提取端口配置
      const serverPortMatch = content.match(/port:\s*parseInt\([^)]+\)/);
      const previewPortMatch = content.match(/preview:\s*{[^}]*port:\s*parseInt\([^)]+\)/);
      const proxyMatch = content.match(/target:\s*`[^`]*:(\d+)[^`]*`/);
      
      if (serverPortMatch) {
        console.log(`✅ 开发服务器端口: ${serverPortMatch[0]}`);
      }
      
      if (previewPortMatch) {
        console.log(`✅ 预览服务器端口: ${previewPortMatch[0]}`);
      }
      
      if (proxyMatch) {
        console.log(`✅ API代理端口: ${proxyMatch[1]}`);
      }
    }
  }

  /**
   * 检查端口冲突
   */
  checkPortConflicts() {
    console.log('\n🔍 检查端口冲突...');
    
    const allPorts = new Map();
    
    // 收集所有端口配置
    this.collectPortsFromEnv('.env', allPorts);
    this.collectPortsFromEnv('server/.env', allPorts);
    this.collectPortsFromVite(allPorts);
    
    // 检查冲突
    const portValues = Array.from(allPorts.values());
    const duplicates = portValues.filter((port, index) => 
      portValues.indexOf(port) !== index
    );
    
    if (duplicates.length > 0) {
      this.issues.push(`❌ 发现端口冲突: ${[...new Set(duplicates)].join(', ')}`);
    } else {
      console.log('✅ 无端口冲突');
    }
  }

  /**
   * 从环境变量文件收集端口
   */
  collectPortsFromEnv(filePath, portMap) {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const ports = this.extractPorts(content);
    
    ports.forEach(({ key, value }) => {
      const port = parseInt(value);
      if (!isNaN(port)) {
        portMap.set(`${filePath}:${key}`, port);
      }
    });
  }

  /**
   * 从 Vite 配置收集端口
   */
  collectPortsFromVite(portMap) {
    const viteConfigPath = 'vite.config.ts';
    if (!fs.existsSync(viteConfigPath)) return;
    
    const content = fs.readFileSync(viteConfigPath, 'utf8');
    
    // 提取默认端口
    const serverPortMatch = content.match(/parseInt\([^)]*'(\d+)'\)/);
    if (serverPortMatch) {
      portMap.set('vite.config.ts:server', parseInt(serverPortMatch[1]));
    }
  }

  /**
   * 提取端口配置
   */
  extractPorts(content) {
    const ports = [];
    const portRegex = /^(.*PORT.*?)\s*=\s*(\d+)/gm;
    let match;
    
    while ((match = portRegex.exec(content)) !== null) {
      ports.push({
        key: match[1].trim(),
        value: match[2]
      });
    }
    
    return ports;
  }

  /**
   * 检查命令是否包含端口配置
   */
  containsPortConfig(command) {
    return /PORT|port|:\d{4}/.test(command);
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📋 端口配置报告');
    console.log('=' .repeat(50));
    
    if (this.issues.length === 0) {
      console.log('✅ 端口配置正常！');
    } else {
      console.log('\n❌ 发现的问题:');
      this.issues.forEach(issue => console.log(`   ${issue}`));
    }
    
    if (this.suggestions.length > 0) {
      console.log('\n💡 建议:');
      this.suggestions.forEach(suggestion => console.log(`   ${suggestion}`));
    }
    
    console.log('\n📋 推荐的端口配置:');
    console.log('   前端开发服务器: 5174');
    console.log('   后端API服务器: 3001');
    console.log('   Electron应用: 5174 (与前端共享)');
    console.log('   预览服务器: 5174');
    
    console.log('\n🔧 配置方式:');
    console.log('   • 环境变量: VITE_DEV_PORT=5174, PORT=3001');
    console.log('   • package.json: 使用 cross-env 设置环境变量');
    console.log('   • vite.config.ts: 使用 process.env.VITE_DEV_PORT');
  }
}

// 运行检查
if (require.main === module) {
  const manager = new PortConfigManager();
  manager.checkPortConfig();
}

module.exports = PortConfigManager;
