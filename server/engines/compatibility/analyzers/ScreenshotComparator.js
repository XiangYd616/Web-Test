/**
 * 截图对比分析器
 * 本地化程度：100%
 * 实现浏览器间的视觉差异检测和分析
 */

const sharp = require('sharp');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');

class ScreenshotComparator {
  constructor(options = {}) {
    this.options = {
      threshold: 0.1, // 像素差异阈值
      includeAA: false, // 是否包含抗锯齿差异
      alpha: 0.1, // 透明度阈值
      aaColor: [255, 255, 0], // 抗锯齿差异颜色
      diffColor: [255, 0, 0], // 差异颜色
      diffColorAlt: [0, 255, 0], // 替代差异颜色
      ...options
    };
    
    // 差异类型定义
    this.differenceTypes = {
      LAYOUT: 'layout',
      COLOR: 'color',
      FONT: 'font',
      IMAGE: 'image',
      ELEMENT_MISSING: 'element_missing',
      ELEMENT_POSITION: 'element_position',
      SIZE: 'size'
    };
  }

  /**
   * 比较两个截图
   */
  async compareScreenshots(screenshot1, screenshot2, options = {}) {
    try {
      console.log('🔍 开始截图对比分析...');
      
      const compareOptions = { ...this.options, ...options };
      
      // 预处理截图
      const processedImages = await this.preprocessImages(screenshot1, screenshot2);
      
      // 执行像素级对比
      const pixelComparison = await this.performPixelComparison(
        processedImages.image1,
        processedImages.image2,
        compareOptions
      );
      
      // 分析差异区域
      const regionAnalysis = await this.analyzeRegions(
        processedImages.image1,
        processedImages.image2,
        pixelComparison.diffImage,
        compareOptions
      );
      
      // 生成差异报告
      const report = this.generateComparisonReport(
        pixelComparison,
        regionAnalysis,
        processedImages
      );
      
      console.log(`✅ 截图对比完成，发现 ${report.differences.length} 个差异`);
      
      return report;
      
    } catch (error) {
      console.error('❌ 截图对比失败:', error);
      throw error;
    }
  }

  /**
   * 预处理图片
   */
  async preprocessImages(image1, image2) {
    try {
      // 获取图片信息
      const info1 = await sharp(image1).metadata();
      const info2 = await sharp(image2).metadata();
      
      // 确定目标尺寸（取较小的尺寸）
      const targetWidth = Math.min(info1.width, info2.width);
      const targetHeight = Math.min(info1.height, info2.height);
      
      // 调整图片尺寸
      const processedImage1 = await sharp(image1)
        .resize(targetWidth, targetHeight, { fit: 'cover' })
        .png()
        .toBuffer();
      
      const processedImage2 = await sharp(image2)
        .resize(targetWidth, targetHeight, { fit: 'cover' })
        .png()
        .toBuffer();
      
      return {
        image1: processedImage1,
        image2: processedImage2,
        width: targetWidth,
        height: targetHeight,
        originalInfo1: info1,
        originalInfo2: info2
      };
      
    } catch (error) {
      console.error('图片预处理失败:', error);
      throw error;
    }
  }

  /**
   * 执行像素级对比
   */
  async performPixelComparison(image1, image2, options) {
    try {
      // 解析PNG图片
      const png1 = PNG.sync.read(image1);
      const png2 = PNG.sync.read(image2);
      
      // 创建差异图片
      const diffPng = new PNG({ width: png1.width, height: png1.height });
      
      // 执行像素匹配
      const diffPixels = pixelmatch(
        png1.data,
        png2.data,
        diffPng.data,
        png1.width,
        png1.height,
        {
          threshold: options.threshold,
          includeAA: options.includeAA,
          alpha: options.alpha,
          aaColor: options.aaColor,
          diffColor: options.diffColor,
          diffColorAlt: options.diffColorAlt
        }
      );
      
      // 计算差异百分比
      const totalPixels = png1.width * png1.height;
      const diffPercentage = (diffPixels / totalPixels) * 100;
      
      // 生成差异图片缓冲区
      const diffBuffer = PNG.sync.write(diffPng);
      
      return {
        diffPixels,
        totalPixels,
        diffPercentage,
        diffImage: diffBuffer,
        width: png1.width,
        height: png1.height,
        identical: diffPixels === 0
      };
      
    } catch (error) {
      console.error('像素对比失败:', error);
      throw error;
    }
  }

  /**
   * 分析差异区域
   */
  async analyzeRegions(image1, image2, diffImage, options) {
    try {
      // 解析差异图片
      const diffPng = PNG.sync.read(diffImage);
      
      // 查找连续的差异区域
      const regions = this.findDifferenceRegions(diffPng);
      
      // 分析每个区域的特征
      const analyzedRegions = await Promise.all(
        regions.map(region => this.analyzeRegion(region, image1, image2, diffPng))
      );
      
      // 按重要性排序
      analyzedRegions.sort((a, b) => b.importance - a.importance);
      
      return {
        regions: analyzedRegions,
        totalRegions: analyzedRegions.length,
        significantRegions: analyzedRegions.filter(r => r.importance > 0.5).length
      };
      
    } catch (error) {
      console.error('区域分析失败:', error);
      throw error;
    }
  }

  /**
   * 查找差异区域
   */
  findDifferenceRegions(diffPng) {
    const regions = [];
    const visited = new Set();
    const { width, height, data } = diffPng;
    
    // 遍历所有像素
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        const key = `${x},${y}`;
        
        // 跳过已访问的像素和无差异的像素
        if (visited.has(key) || data[idx] === 0) {
          continue;
        }
        
        // 使用洪水填充算法查找连续区域
        const region = this.floodFill(diffPng, x, y, visited);
        
        if (region.pixels.length > 10) { // 过滤太小的区域
          regions.push(region);
        }
      }
    }
    
    return regions;
  }

  /**
   * 洪水填充算法
   */
  floodFill(diffPng, startX, startY, visited) {
    const { width, height, data } = diffPng;
    const stack = [{ x: startX, y: startY }];
    const pixels = [];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    
    while (stack.length > 0) {
      const { x, y } = stack.pop();
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) {
        continue;
      }
      
      const idx = (width * y + x) << 2;
      if (data[idx] === 0) { // 无差异像素
        continue;
      }
      
      visited.add(key);
      pixels.push({ x, y });
      
      // 更新边界
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
      
      // 添加相邻像素
      stack.push(
        { x: x + 1, y },
        { x: x - 1, y },
        { x, y: y + 1 },
        { x, y: y - 1 }
      );
    }
    
    return {
      pixels,
      bounds: {
        x: minX,
        y: minY,
        width: maxX - minX + 1,
        height: maxY - minY + 1
      },
      area: pixels.length
    };
  }

  /**
   * 分析单个区域
   */
  async analyzeRegion(region, image1, image2, diffPng) {
    try {
      const { bounds, area } = region;
      
      // 提取区域图片
      const regionImage1 = await sharp(image1)
        .extract(bounds)
        .toBuffer();
      
      const regionImage2 = await sharp(image2)
        .extract(bounds)
        .toBuffer();
      
      // 分析颜色差异
      const colorAnalysis = await this.analyzeColorDifference(regionImage1, regionImage2);
      
      // 分析结构差异
      const structureAnalysis = await this.analyzeStructureDifference(regionImage1, regionImage2);
      
      // 计算重要性分数
      const importance = this.calculateRegionImportance(region, colorAnalysis, structureAnalysis);
      
      // 推断差异类型
      const differenceType = this.inferDifferenceType(colorAnalysis, structureAnalysis, bounds);
      
      return {
        bounds,
        area,
        importance,
        type: differenceType,
        colorAnalysis,
        structureAnalysis,
        description: this.generateRegionDescription(differenceType, colorAnalysis, structureAnalysis)
      };
      
    } catch (error) {
      console.error('区域分析失败:', error);
      return {
        bounds: region.bounds,
        area: region.area,
        importance: 0.1,
        type: this.differenceTypes.COLOR,
        error: error.message
      };
    }
  }

  /**
   * 分析颜色差异
   */
  async analyzeColorDifference(image1, image2) {
    try {
      // 获取图片统计信息
      const stats1 = await sharp(image1).stats();
      const stats2 = await sharp(image2).stats();
      
      // 计算平均颜色差异
      const colorDiff = {
        r: Math.abs(stats1.channels[0].mean - stats2.channels[0].mean),
        g: Math.abs(stats1.channels[1].mean - stats2.channels[1].mean),
        b: Math.abs(stats1.channels[2].mean - stats2.channels[2].mean)
      };
      
      const avgColorDiff = (colorDiff.r + colorDiff.g + colorDiff.b) / 3;
      
      return {
        averageDifference: avgColorDiff,
        maxDifference: Math.max(colorDiff.r, colorDiff.g, colorDiff.b),
        colorDiff,
        significant: avgColorDiff > 20 // 阈值可调整
      };
      
    } catch (error) {
      console.error('颜色分析失败:', error);
      return { averageDifference: 0, significant: false, error: error.message };
    }
  }

  /**
   * 分析结构差异
   */
  async analyzeStructureDifference(image1, image2) {
    try {
      // 转换为灰度图并提取边缘
      const edges1 = await sharp(image1)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .toBuffer();
      
      const edges2 = await sharp(image2)
        .greyscale()
        .convolve({
          width: 3,
          height: 3,
          kernel: [-1, -1, -1, -1, 8, -1, -1, -1, -1]
        })
        .toBuffer();
      
      // 比较边缘差异
      const edgeComparison = await this.performPixelComparison(edges1, edges2, { threshold: 0.2 });
      
      return {
        edgeDifference: edgeComparison.diffPercentage,
        structuralChange: edgeComparison.diffPercentage > 10,
        edgePixels: edgeComparison.diffPixels
      };
      
    } catch (error) {
      console.error('结构分析失败:', error);
      return { edgeDifference: 0, structuralChange: false, error: error.message };
    }
  }

  /**
   * 计算区域重要性
   */
  calculateRegionImportance(region, colorAnalysis, structureAnalysis) {
    let importance = 0;
    
    // 基于面积的重要性
    const areaScore = Math.min(region.area / 10000, 1); // 标准化到0-1
    importance += areaScore * 0.3;
    
    // 基于颜色差异的重要性
    if (colorAnalysis.significant) {
      importance += (colorAnalysis.averageDifference / 255) * 0.4;
    }
    
    // 基于结构差异的重要性
    if (structureAnalysis.structuralChange) {
      importance += (structureAnalysis.edgeDifference / 100) * 0.3;
    }
    
    return Math.min(importance, 1);
  }

  /**
   * 推断差异类型
   */
  inferDifferenceType(colorAnalysis, structureAnalysis, bounds) {
    // 如果有显著的结构变化
    if (structureAnalysis.structuralChange) {
      // 根据位置和大小判断
      if (bounds.width > 200 || bounds.height > 200) {
        return this.differenceTypes.LAYOUT;
      } else {
        return this.differenceTypes.ELEMENT_POSITION;
      }
    }
    
    // 如果主要是颜色差异
    if (colorAnalysis.significant) {
      if (colorAnalysis.averageDifference > 50) {
        return this.differenceTypes.COLOR;
      } else {
        return this.differenceTypes.FONT;
      }
    }
    
    // 默认为颜色差异
    return this.differenceTypes.COLOR;
  }

  /**
   * 生成区域描述
   */
  generateRegionDescription(type, colorAnalysis, structureAnalysis) {
    switch (type) {
      case this.differenceTypes.LAYOUT:
        return '检测到布局差异，可能是元素位置或大小发生变化';
      case this.differenceTypes.COLOR:
        return `检测到颜色差异，平均差异值: ${Math.round(colorAnalysis.averageDifference)}`;
      case this.differenceTypes.FONT:
        return '检测到字体渲染差异，可能是字体、大小或抗锯齿设置不同';
      case this.differenceTypes.ELEMENT_POSITION:
        return '检测到元素位置差异';
      case this.differenceTypes.ELEMENT_MISSING:
        return '检测到元素缺失或新增';
      default:
        return '检测到未知类型的视觉差异';
    }
  }

  /**
   * 生成对比报告
   */
  generateComparisonReport(pixelComparison, regionAnalysis, processedImages) {
    const report = {
      summary: {
        identical: pixelComparison.identical,
        diffPercentage: Math.round(pixelComparison.diffPercentage * 100) / 100,
        diffPixels: pixelComparison.diffPixels,
        totalPixels: pixelComparison.totalPixels,
        significantDifferences: regionAnalysis.significantRegions
      },
      differences: regionAnalysis.regions.map(region => ({
        type: region.type,
        bounds: region.bounds,
        area: region.area,
        importance: Math.round(region.importance * 100) / 100,
        description: region.description,
        colorAnalysis: region.colorAnalysis,
        structureAnalysis: region.structureAnalysis
      })),
      images: {
        width: processedImages.width,
        height: processedImages.height,
        diffImage: pixelComparison.diffImage.toString('base64')
      },
      metadata: {
        comparedAt: new Date().toISOString(),
        threshold: this.options.threshold,
        totalRegions: regionAnalysis.totalRegions
      }
    };
    
    return report;
  }

  /**
   * 批量对比截图
   */
  async batchCompare(screenshots, options = {}) {
    const results = [];
    const baseScreenshot = screenshots[0];
    
    for (let i = 1; i < screenshots.length; i++) {
      const comparison = await this.compareScreenshots(
        baseScreenshot.data,
        screenshots[i].data,
        options
      );
      
      results.push({
        baseInfo: baseScreenshot.info,
        compareInfo: screenshots[i].info,
        comparison
      });
    }
    
    return results;
  }
}

module.exports = ScreenshotComparator;
