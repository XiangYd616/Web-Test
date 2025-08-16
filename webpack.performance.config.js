/**
 * Webpack性能优化配置
 * 集成代码分割、懒加载和缓存优化
 */

const path = require('path');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const CompressionPlugin = require('compression-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  mode: 'production',
  
  // 性能配置
  performance: {
    maxAssetSize: 250000,
    maxEntrypointSize: 250000,
    hints: 'warning'
  },
  
  // 优化配置
  optimization: {
    // 代码分割
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        // Vendor库分割
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          chunks: 'all',
          minSize: 20000,
          maxSize: 244000
        },
        
        // React相关库
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|react-router)[\\/]/,
          name: 'react-vendor',
          priority: 20,
          chunks: 'all'
        },
        
        // UI库
        ui: {
          test: /[\\/]node_modules[\\/](@mui|antd|tailwindcss)[\\/]/,
          name: 'ui-vendor',
          priority: 15,
          chunks: 'all'
        },
        
        // 工具库
        utils: {
          test: /[\\/]node_modules[\\/](lodash|moment|date-fns|axios)[\\/]/,
          name: 'utils-vendor',
          priority: 12,
          chunks: 'all'
        },
        
        // 公共组件
        common: {
          name: 'common',
          minChunks: 2,
          priority: 5,
          chunks: 'all',
          minSize: 10000
        }
      }
    },
    
    // 压缩配置
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          mangle: true,
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ],
    
    // 运行时chunk
    runtimeChunk: {
      name: 'runtime'
    },
    
    // 模块ID优化
    moduleIds: 'deterministic',
    chunkIds: 'deterministic'
  },
  
  // 缓存配置
  cache: {
    type: 'filesystem',
    buildDependencies: {
      config: [__filename]
    }
  },
  
  // 插件配置
  plugins: [
    // Gzip压缩
    new CompressionPlugin({
      algorithm: 'gzip',
      test: /\.(js|css|html|svg)$/,
      threshold: 8192,
      minRatio: 0.8
    }),
    
    // Bundle分析（开发时启用）
    process.env.ANALYZE && new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html'
    })
  ].filter(Boolean),
  
  // 解析配置
  resolve: {
    // 模块解析缓存
    cache: true,
    
    // 别名配置
    alias: {
      '@': path.resolve(__dirname, 'frontend'),
      '@components': path.resolve(__dirname, 'frontend/components'),
      '@utils': path.resolve(__dirname, 'frontend/utils'),
      '@hooks': path.resolve(__dirname, 'frontend/hooks'),
      '@services': path.resolve(__dirname, 'frontend/services')
    }
  },
  
  // 模块配置
  module: {
    rules: [
      // JavaScript/TypeScript
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true,
              cacheCompression: false
            }
          }
        ]
      },
      
      // CSS优化
      {
        test: /\.css$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: {
                auto: true,
                localIdentName: '[name]__[local]--[hash:base64:5]'
              }
            }
          },
          'postcss-loader'
        ]
      },
      
      // 图片优化
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024 // 8KB
          }
        },
        generator: {
          filename: 'images/[name].[hash:8][ext]'
        }
      }
    ]
  }
};