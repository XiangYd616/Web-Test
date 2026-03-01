/**
 * 后端服务器打包脚本
 *
 * 将 backend/server.ts → tools/electron/resources/backend/server.js
 * 供 Electron 桌面端内嵌后端服务使用
 *
 * 用法：node tools/electron/buildBackend.mjs
 */
import { build } from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendEntry = path.resolve(__dirname, '../../backend/server.ts');
const outFile = path.resolve(__dirname, 'resources/backend/server.js');

// Node 内置模块 + 原生 / 重型依赖 → external（由 resources/backend/node_modules 提供）
const externalDeps = [
  // Node builtins
  'crypto', 'events', 'fs', 'fs/promises', 'http', 'https', 'net', 'os',
  'path', 'perf_hooks', 'tls', 'url', 'vm', 'child_process', 'stream',
  'util', 'zlib', 'worker_threads', 'cluster', 'dns', 'dgram', 'readline',
  'string_decoder', 'buffer', 'querystring', 'assert', 'constants',
  // 原生模块（需要 node-gyp 编译，不能 bundle）
  'better-sqlite3',
  'bcrypt',
  // 重型 / 有动态 require 的依赖
  'express',
  'compression',
  'cors',
  'helmet',
  'morgan',
  'socket.io',
  'axios',
  'cheerio',
  'dotenv',
  'joi',
  'jsonwebtoken',
  'nodemailer',
  'node-cron',
  'cron-parser',
  'swagger-jsdoc',
  'swagger-ui-express',
  'uuid',
  'winston',
  'winston-daily-rotate-file',
  'express-rate-limit',
  'express-validator',
  'csv-parser',
  'csv-writer',
  'fast-xml-parser',
  'multer',
  'node-fetch',
  'pdf-lib',
  'date-fns',
  'zod',
  'tar',
  // Electron（桌面端 require）
  'electron',
  // 不应被打包的服务端专有依赖
  'puppeteer',
  'puppeteer-core',
  'playwright',
  'playwright-core',
  'lighthouse',
  'chrome-launcher',
  'sharp',
  'pg',
  'pg-hstore',
  'ioredis',
  'bullmq',
  'sequelize',
  '@supabase/supabase-js',
  'archiver',
];

console.log('📦 打包后端服务器...');
console.log(`   入口: ${backendEntry}`);
console.log(`   输出: ${outFile}`);

const startTime = Date.now();

await build({
  entryPoints: [backendEntry],
  outfile: outFile,
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: false,
  minify: false,
  treeShaking: true,
  external: externalDeps,
  banner: {
    js: '// Auto-generated backend server bundle for Electron desktop app\n',
  },
  logLevel: 'warning',
  // 处理 __dirname / __filename（CJS 模式下 esbuild 默认会保留）
  define: {
    'import.meta.url': 'undefined',
  },
});

const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
console.log(`✅ 后端打包完成 (${elapsed}s) → ${outFile}`);
