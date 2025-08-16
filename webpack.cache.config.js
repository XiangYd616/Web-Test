/**
 * Webpack缓存配置
 * 优化构建和运行时缓存
 */

module.exports = {
  // 文件系统缓存
  cache: {
    type: 'filesystem',
    version: '1.0',
    cacheDirectory: path.resolve(__dirname, '.webpack-cache'),
    store: 'pack',
    buildDependencies: {
      defaultWebpack: ['webpack/lib/'],
      config: [__filename],
      tsconfig: [path.resolve(__dirname, 'tsconfig.json')]
    },
    managedPaths: [path.resolve(__dirname, 'node_modules')],
    profile: false,
    maxAge: 5184000000, // 60 days
    maxMemoryGenerations: 1,
    memoryCacheUnaffected: true
  },

  // 输出配置
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
    assetModuleFilename: 'assets/[name].[hash:8][ext]',
    clean: true,
    pathinfo: false
  },

  // 实验性功能
  experiments: {
    cacheUnaffected: true,
    buildHttp: false,
    lazyCompilation: {
      imports: true,
      entries: false
    }
  }
};