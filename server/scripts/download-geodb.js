#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { createGunzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

/**
 * MaxMind GeoLite2 数据库下载脚本
 * 
 * 使用方法：
 * 1. 注册 MaxMind 账户：https://www.maxmind.com/en/geolite2/signup
 * 2. 获取许可证密钥
 * 3. 设置环境变量：MAXMIND_LICENSE_KEY=your_license_key
 * 4. 运行脚本：node download-geodb.js
 */

class GeoDBDownloader {
  constructor() {
    this.licenseKey = process.env.MAXMIND_LICENSE_KEY;
    this.dataDir = path.join(__dirname, '../data');
    this.baseUrl = 'https://download.maxmind.com/app/geoip_download';
    
    // 确保数据目录存在
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 下载并解压数据库文件
   */
  async downloadDatabase(edition, filename) {
    if (!this.licenseKey) {
      console.error('❌ 请设置 MAXMIND_LICENSE_KEY 环境变量');
      console.log('💡 获取许可证密钥：https://www.maxmind.com/en/accounts/current/license-key');
      return false;
    }

    const url = `${this.baseUrl}?edition_id=${edition}&license_key=${this.licenseKey}&suffix=tar.gz`;
    const outputPath = path.join(this.dataDir, filename);
    
    console.log(`📥 下载 ${edition}...`);
    
    try {
      // 下载压缩文件
      const tempFile = path.join(this.dataDir, `${edition}.tar.gz`);
      await this.downloadFile(url, tempFile);
      
      // 解压文件
      console.log(`📦 解压 ${edition}...`);
      await this.extractDatabase(tempFile, outputPath, edition);
      
      // 删除临时文件
      fs.unlinkSync(tempFile);
      
      console.log(`✅ ${edition} 下载完成: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`❌ ${edition} 下载失败:`, error.message);
      return false;
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(url, outputPath) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;
      
      const request = client.get(url, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // 处理重定向
          return this.downloadFile(response.headers.location, outputPath)
            .then(resolve)
            .catch(reject);
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }
        
        const fileStream = fs.createWriteStream(outputPath);
        response.pipe(fileStream);
        
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
        
        fileStream.on('error', reject);
      });
      
      request.on('error', reject);
      request.setTimeout(30000, () => {
        request.destroy();
        reject(new Error('下载超时'));
      });
    });
  }

  /**
   * 解压数据库文件
   */
  async extractDatabase(tarFile, outputPath, edition) {
    const tar = require('tar');
    
    return new Promise((resolve, reject) => {
      // 解压到临时目录
      const tempDir = path.join(this.dataDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }
      
      tar.extract({
        file: tarFile,
        cwd: tempDir
      }).then(() => {
        // 查找 .mmdb 文件
        const extractedDir = fs.readdirSync(tempDir).find(dir => dir.startsWith(edition));
        if (!extractedDir) {
          reject(new Error('未找到解压的数据库目录'));
          return;
        }
        
        const mmdbFile = fs.readdirSync(path.join(tempDir, extractedDir))
          .find(file => file.endsWith('.mmdb'));
        
        if (!mmdbFile) {
          reject(new Error('未找到 .mmdb 数据库文件'));
          return;
        }
        
        // 移动文件到目标位置
        const sourcePath = path.join(tempDir, extractedDir, mmdbFile);
        fs.renameSync(sourcePath, outputPath);
        
        // 清理临时目录
        fs.rmSync(tempDir, { recursive: true, force: true });
        
        resolve();
      }).catch(reject);
    });
  }

  /**
   * 下载所有数据库
   */
  async downloadAll() {
    console.log('🌍 开始下载 MaxMind GeoLite2 数据库...');
    
    const databases = [
      { edition: 'GeoLite2-City', filename: 'GeoLite2-City.mmdb' },
      { edition: 'GeoLite2-Country', filename: 'GeoLite2-Country.mmdb' }
    ];
    
    let successCount = 0;
    
    for (const db of databases) {
      const success = await this.downloadDatabase(db.edition, db.filename);
      if (success) {
        successCount++;
      }
    }
    
    console.log(`\n📊 下载完成: ${successCount}/${databases.length} 个数据库`);
    
    if (successCount > 0) {
      console.log('\n✅ 地理位置数据库已准备就绪！');
      console.log('🚀 重启服务器以使用本地数据库查询');
    } else {
      console.log('\n❌ 所有数据库下载失败');
      console.log('💡 请检查许可证密钥和网络连接');
    }
    
    return successCount > 0;
  }

  /**
   * 检查数据库状态
   */
  checkStatus() {
    const databases = [
      { name: 'GeoLite2-City', file: 'GeoLite2-City.mmdb' },
      { name: 'GeoLite2-Country', file: 'GeoLite2-Country.mmdb' }
    ];
    
    console.log('📋 数据库状态检查:');
    
    for (const db of databases) {
      const filePath = path.join(this.dataDir, db.file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const size = (stats.size / 1024 / 1024).toFixed(2);
        const modified = stats.mtime.toLocaleDateString();
        console.log(`✅ ${db.name}: ${size}MB (更新: ${modified})`);
      } else {
        console.log(`❌ ${db.name}: 未找到`);
      }
    }
  }
}

// 命令行使用
if (require.main === module) {
  const downloader = new GeoDBDownloader();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'download':
      downloader.downloadAll();
      break;
    case 'status':
      downloader.checkStatus();
      break;
    default:
      console.log('MaxMind GeoLite2 数据库管理工具');
      console.log('');
      console.log('使用方法:');
      console.log('  node download-geodb.js download  # 下载数据库');
      console.log('  node download-geodb.js status    # 检查状态');
      console.log('');
      console.log('环境变量:');
      console.log('  MAXMIND_LICENSE_KEY  # MaxMind 许可证密钥');
      console.log('');
      console.log('获取许可证密钥: https://www.maxmind.com/en/geolite2/signup');
  }
}

module.exports = GeoDBDownloader;
