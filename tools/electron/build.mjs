/**
 * Electron 桌面应用主进程打包脚本
 *
 * 打包内容：
 *   dist/main.js                       ← main.ts + electron 模块（单文件 bundle）
 *   dist/preload.js                    ← preload.ts（单文件 bundle）
 *   dist/modules/engineBundle.js       ← 后端测试引擎（独立 bundle，服务端依赖已 stub）
 *   dist/modules/localStressTest.js    ← 纯 JS Worker 主线程（直接复制）
 *   dist/modules/stressTestWorker.js   ← Worker 子线程（直接复制）
 *
 * node_modules 中的包全部 external，由 electron-builder 打包时自动收集
 */
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const distDir = path.join(__dirname, 'dist');

// 清理输出目录
rmSync(distDir, { recursive: true, force: true });
mkdirSync(distDir, { recursive: true });
mkdirSync(path.join(distDir, 'modules'), { recursive: true });

// ─── 插件：主进程 bundle 中，backend/shared 引用标记为 external ───
// main.js 通过 require('./modules/engineBundle') 加载引擎，不直接依赖 backend
const externalBackendPlugin = {
  name: 'external-backend',
  setup(build) {
    // backend 引用标记为 external（不会被 bundle 进 main.js）
    // engineFactory 通过 require(path.join(__dirname,...)) 运行时加载，esbuild 无法静态分析
    build.onResolve({ filter: /\.\.\/\.\.\/\.\.\/(\.\.\/)?backend\// }, (args) => ({
      path: args.path,
      external: true,
    }));
    // 注意：shared/ 不标记为 external，让 esbuild 把 shared/types（纯枚举+接口）bundle 进来
    // 这样 main.ts 和 localTestService.ts 中对 TestEngineType 等类型的引用能正常工作
  },
};

// ─── 插件：引擎 bundle 中，服务端依赖替换为桌面端 stub ───
const stubDir = path.resolve(__dirname, 'modules/engines/stubs');
const engineStubPlugin = {
  name: 'engine-stubs',
  setup(build) {
    // database → stub（SEOTestEngine / ScoreCalculator / ReportGenerator 引用）
    build.onResolve({ filter: /\/config\/database/ }, () => ({
      path: path.join(stubDir, 'database.ts'),
    }));
    // TestEngineRegistry → stub（CoreTestEngine / registerEngines 引用）
    build.onResolve({ filter: /\/core\/TestEngineRegistry/ }, () => ({
      path: path.join(stubDir, 'registry.ts'),
    }));
    // TestQueueService → stub
    build.onResolve({ filter: /\/TestQueueService/ }, () => ({
      path: path.join(stubDir, 'registry.ts'),
    }));
    // testEngineHandler (websocket) → stub
    build.onResolve({ filter: /\/testEngineHandler/ }, () => ({
      path: path.join(stubDir, 'registry.ts'),
    }));
  },
};

const commonOptions = {
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  sourcemap: false,
  minify: false,
  treeShaking: true,
  packages: 'external',
  external: ['electron', 'electron-updater'],
};

// 1. Bundle main.ts → dist/main.js
await build({
  ...commonOptions,
  entryPoints: [path.join(__dirname, 'main.ts')],
  outfile: path.join(distDir, 'main.js'),
  plugins: [externalBackendPlugin],
});
console.log('✓ dist/main.js');

// 2. Bundle preload.ts → dist/preload.js
await build({
  ...commonOptions,
  entryPoints: [path.join(__dirname, 'preload.ts')],
  outfile: path.join(distDir, 'preload.js'),
  plugins: [externalBackendPlugin],
});
console.log('✓ dist/preload.js');

// 3. Bundle 引擎工厂 → dist/modules/engineBundle.js
//    入口：modules/engines/engineFactory.ts
//    服务端依赖由 engineStubPlugin 替换为 stub
//    puppeteer / playwright / lighthouse 等重型包标记为 external
await build({
  ...commonOptions,
  entryPoints: [path.join(__dirname, 'modules/engines/engineFactory.ts')],
  outfile: path.join(distDir, 'modules/engineBundle.js'),
  external: [
    'electron',
    'puppeteer',
    'puppeteer-core',
    'playwright',
    'playwright-core',
    'lighthouse',
    'chrome-launcher',
    'sharp',
    'better-sqlite3',
    'pg',
    'pg-hstore',
    'ioredis',
    'bullmq',
    'nodemailer',
    'socket.io',
    'express',
  ],
  plugins: [engineStubPlugin],
});
console.log('✓ dist/modules/engineBundle.js');

// 4. 复制 Worker 线程 JS 文件（不能 bundle，需要独立文件给 worker_threads 加载）
copyFileSync(path.join(__dirname, 'modules/localStressTest.js'), path.join(distDir, 'modules/localStressTest.js'));
copyFileSync(path.join(__dirname, 'modules/stressTestWorker.js'), path.join(distDir, 'modules/stressTestWorker.js'));
console.log('✓ dist/modules/localStressTest.js');
console.log('✓ dist/modules/stressTestWorker.js');

console.log('\n构建完成。打包内容：');
console.log('  dist/main.js                    - 主进程（bundle）');
console.log('  dist/preload.js                 - 预加载脚本（bundle）');
console.log('  dist/modules/engineBundle.js    - 测试引擎（bundle，服务端依赖已 stub）');
console.log('  dist/modules/*.js               - Worker 线程');
console.log('  assets/*                        - 图标');
console.log('  node_modules/                   - 原生模块（electron-builder 处理）');
console.log('  resources/frontend/             - 前端产物（extraResources）');
