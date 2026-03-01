#!/usr/bin/env node

import fs from 'fs';
import http from 'http';
import https from 'https';
import path from 'path';
import tar from 'tar';

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
  licenseKey: string | undefined;
  dataDir: string;
  baseUrl: string;

  constructor() {
    this.licenseKey = process.env.MAXMIND_LICENSE_KEY;
    this.dataDir = path.join(__dirname, '../data');
    this.baseUrl = 'https://download.maxmind.com/app/geoip_download';

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * 下载并解压数据库文件
   */
  async downloadDatabase(edition: string, filename: string) {
    if (!this.licenseKey) {
      console.error('❌ 请设置 MAXMIND_LICENSE_KEY 环境变量');
      return false;
    }

    const url = `${this.baseUrl}?edition_id=${edition}&license_key=${this.licenseKey}&suffix=tar.gz`;
    const outputPath = path.join(this.dataDir, filename);

    try {
      const tempFile = path.join(this.dataDir, `${edition}.tar.gz`);
      await this.downloadFile(url, tempFile);

      await this.extractDatabase(tempFile, outputPath, edition);

      fs.unlinkSync(tempFile);

      console.log(`✅ ${edition} 下载完成: ${outputPath}`);
      return true;
    } catch (error) {
      console.error(`❌ ${edition} 下载失败:`, (error as Error).message);
      return false;
    }
  }

  /**
   * 下载文件（带重试机制）
   */
  async downloadFile(url: string, outputPath: string, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.downloadFileOnce(url, outputPath);
        console.log(`✅ 下载成功: ${outputPath}`);
        return;
      } catch (error) {
        console.log(`❌ 下载失败 (尝试 ${attempt}/${retries}): ${(error as Error).message}`);

        if (attempt === retries) {
          throw error;
        }

        const delay = attempt * 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * 单次下载文件
   */
  async downloadFileOnce(url: string, outputPath: string) {
    return new Promise<void>((resolve, reject) => {
      const client = url.startsWith('https:') ? https : http;

      const request = client.get(url, response => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          const location = response.headers.location;
          const nextUrl = Array.isArray(location) ? location[0] : location;
          if (!nextUrl) {
            reject(new Error('缺少重定向地址'));
            return;
          }
          this.downloadFileOnce(nextUrl, outputPath).then(resolve).catch(reject);
          return;
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        const contentLength = response.headers['content-length'];
        const totalSize = parseInt(
          Array.isArray(contentLength) ? contentLength[0] : contentLength || '0'
        );
        let downloadedSize = 0;

        const fileStream = fs.createWriteStream(outputPath);

        response.on('data', (chunk?: Buffer) => {
          if (!chunk) return;
          downloadedSize += chunk.length;
          if (totalSize > 0) {
            const progress = Math.round((downloadedSize / totalSize) * 100);
            process.stdout.write(
              `/r📊 下载进度: ${progress}% (${Math.round(downloadedSize / 1024 / 1024)}MB/${Math.round(totalSize / 1024 / 1024)}MB)`
            );
          }
        });

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', reject);
      });

      request.on('error', reject);
      request.setTimeout(180000, () => {
        request.destroy();
        reject(new Error('下载超时 (3分钟)'));
      });
    });
  }

  /**
   * 解压数据库文件
   */
  async extractDatabase(tarFile: string, outputPath: string, edition: string) {
    return new Promise<void>((resolve, reject) => {
      const tempDir = path.join(this.dataDir, 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir);
      }

      tar
        .extract({
          file: tarFile,
          cwd: tempDir,
        })
        .then(() => {
          try {
            const extractedDirs = fs.readdirSync(tempDir);

            const extractedDir = extractedDirs.find((dir: string) => dir.startsWith(edition));
            if (!extractedDir) {
              reject(new Error(`未找到解压的数据库目录，可用目录: ${extractedDirs.join(', ')}`));
              return;
            }

            const extractedDirPath = path.join(tempDir, extractedDir);
            const files = fs.readdirSync(extractedDirPath);

            const mmdbFile = files.find((file: string) => file.endsWith('.mmdb'));

            if (!mmdbFile) {
              reject(new Error(`未找到 .mmdb 数据库文件，可用文件: ${files.join(', ')}`));
              return;
            }

            const sourcePath = path.join(extractedDirPath, mmdbFile);

            if (fs.existsSync(outputPath)) {
              fs.unlinkSync(outputPath);
            }

            fs.renameSync(sourcePath, outputPath);
            console.log(`✅ ${edition} 解压成功`);

            fs.rmSync(tempDir, { recursive: true, force: true });

            resolve();
          } catch (error) {
            console.error(`❌ 解压后处理失败: ${(error as Error).message}`);
            reject(error);
          }
        })
        .catch((error: Error) => {
          console.error(`❌ tar解压失败: ${error.message}`);
          reject(error);
        });
    });
  }

  /**
   * 下载所有数据库
   */
  async downloadAll() {
    const databases = [
      { edition: 'GeoLite2-City', filename: 'GeoLite2-City.mmdb' },
      { edition: 'GeoLite2-Country', filename: 'GeoLite2-Country.mmdb' },
    ];

    let successCount = 0;

    for (const db of databases) {
      const success = await this.downloadDatabase(db.edition, db.filename);
      if (success) {
        successCount++;
      }
    }

    if (successCount > 0) {
      console.log('🚀 重启服务器以使用本地数据库查询');
    }

    return successCount > 0;
  }

  /**
   * 检查数据库状态
   */
  checkStatus() {
    const databases = [
      { name: 'GeoLite2-City', file: 'GeoLite2-City.mmdb' },
      { name: 'GeoLite2-Country', file: 'GeoLite2-Country.mmdb' },
    ];

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
  }
}

export default GeoDBDownloader;
