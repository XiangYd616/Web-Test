/**
 * FileUploadSEO.tsx - React组件
 * 
 * 文件路径: frontend\components\seo\FileUploadSEO.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { useState, useCallback, useRef } from 'react';
import {Upload, File, X, CheckCircle, AlertTriangle, Eye, Tag, Globe} from 'lucide-react';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
  seoData: {
    title: string;
    description: string;
    altText: string;
    keywords: string[];
    optimized: boolean;
    compressionRatio?: number;
    dimensions?: {
      width: number;
      height: number;
    };
  };
}

interface SEOAnalysis {
  score: number;
  issues: string[];
  suggestions: string[];
  optimizations: {
    fileSize: boolean;
    naming: boolean;
    altText: boolean;
    description: boolean;
  };
}

const FileUploadSEO = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<UploadedFile | null>(null);
  const [seoAnalysis, setSeoAnalysis] = useState<SEOAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDragActive(false);

    if (e?.dataTransfer.files && e?.dataTransfer.files[0]) {
      handleFiles(Array.from(e?.dataTransfer.files));
    }
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e?.preventDefault();
    if (e?.target.files && e?.target.files[0]) {
      handleFiles(Array.from(e?.target.files));
    }
  }, []);

  const handleFiles = async (fileList: File[]) => {
    setUploading(true);

    try {
      for (const file of fileList) {
        // Simulate file upload and SEO analysis
        await new Promise(resolve => setTimeout(resolve, 1000));

        const _seoOptimizedName = optimizeFileName(file.name);
        const dimensions = await getImageDimensions(file);
        
        const uploadedFile: UploadedFile = {
          id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file.name,
          size: file.size,
          type: file.type,
          url: URL.createObjectURL(file),
          uploadedAt: new Date().toISOString(),
          seoData: {
            title: generateSEOTitle(file.name),
            description: generateSEODescription(file.name, file.type),
            altText: generateAltText(file.name),
            keywords: extractKeywords(file.name),
            optimized: false,
            compressionRatio: calculateCompressionRatio(file.size),
            dimensions
          }
        };

        setFiles(prev => [...prev, uploadedFile]);
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  const optimizeFileName = (fileName: string): string => {
    return fileName
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const getImageDimensions = (file: File): Promise<{ width: number; height: number } | undefined> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(undefined);
        return;
      }

      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => resolve(undefined);
      img.src = URL.createObjectURL(file);
    });
  };

  const generateSEOTitle = (fileName: string): string => {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    return nameWithoutExt
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  const generateSEODescription = (fileName: string, fileType: string): string => {
    const title = generateSEOTitle(fileName);
    const type = fileType.startsWith('image/') ? 'image' : 'file';
    return `High-quality ${type} of ${title}. Optimized for web performance and SEO.`;
  };

  const generateAltText = (fileName: string): string => {
    const title = generateSEOTitle(fileName);
    return `${title} - descriptive image for accessibility and SEO`;
  };

  const extractKeywords = (fileName: string): string[] => {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    return nameWithoutExt
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter(word => word.length > 2)
      .slice(0, 5);
  };

  const calculateCompressionRatio = (fileSize: number): number => {
    // Simulate compression analysis
    return Math.random() * 0.3 + 0.7; // 70-100% of original size
  };

  const analyzeSEO = (file: UploadedFile): SEOAnalysis => {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // File size analysis
    const maxSize = file.type.startsWith('image/') ? 500000 : 2000000; // 500KB for images, 2MB for others
    if (file.size > maxSize) {
      issues.push('File size is too large for optimal web performance');
      suggestions.push('Consider compressing the file to reduce load times');
      score -= 20;
    }

    // File naming analysis
    if (!/^[a-z0-9-]+\.[a-z]+$/.test(file.name.toLowerCase())) {
      issues.push('File name is not SEO-friendly');
      suggestions.push('Use lowercase letters, numbers, and hyphens only');
      score -= 15;
    }

    // Alt text analysis
    if (!file.seoData.altText || file.seoData.altText.length < 10) {
      issues.push('Alt text is missing or too short');
      suggestions.push('Add descriptive alt text (10-125 characters)');
      score -= 15;
    }

    // Description analysis
    if (!file.seoData.description || file.seoData.description.length < 20) {
      issues.push('Description is missing or too short');
      suggestions.push('Add a detailed description for better SEO');
      score -= 10;
    }

    // Keywords analysis
    if (file.seoData.keywords.length < 3) {
      issues.push('Not enough relevant keywords');
      suggestions.push('Add more descriptive keywords');
      score -= 10;
    }

    return {
      score: Math.max(0, score),
      issues,
      suggestions,
      optimizations: {
        fileSize: file.size <= maxSize,
        naming: /^[a-z0-9-]+\.[a-z]+$/.test(file.name.toLowerCase()),
        altText: file.seoData.altText.length >= 10,
        description: file.seoData.description.length >= 20
      }
    };
  };

  const updateFileSEO = (fileId: string, seoData: Partial<UploadedFile['seoData']>) => {
    setFiles(prev => prev.map(file => 
      file.id === fileId 
        ? { ...file, seoData: { ...file.seoData, ...seoData } }
        : file
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(file => file.id !== fileId));
    if (selectedFile.id === fileId) {
      setSelectedFile(null);
      setSeoAnalysis(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleFileSelect = (file: UploadedFile) => {
    setSelectedFile(file);
    setSeoAnalysis(analyzeSEO(file));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">SEO File Upload</h2>
        <div className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-blue-500" />
          <span className="text-sm text-gray-600">Optimize files for search engines</span>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleChange}
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="space-y-4">
          <Upload className="w-12 h-12 text-gray-400 mx-auto" />
          <div>
            <p className="text-lg font-medium text-gray-900">
              {uploading ? 'Uploading files...' : 'Drop files here or click to upload'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Supports images, videos, audio, PDFs, and documents
            </p>
          </div>
          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
          )}
        </div>
      </div>

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Uploaded Files ({files.length})</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-6 hover:bg-gray-50 cursor-pointer"
                onClick={() => handleFileSelect(file)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {file.type.startsWith('image/') ? (
                        <img
                          src={file.url}
                          alt={file.seoData.altText}
                          className="w-12 h-12 object-cover rounded"
                        />
                      ) : (
                        <File className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{file.name}</h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                        <span className="text-xs text-gray-500">{file.type}</span>
                        {file.seoData.dimensions && (
                          <span className="text-xs text-gray-500">
                            {file.seoData.dimensions?.width} × {file.seoData.dimensions?.height}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        {file.seoData.optimized ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                        <span className="text-xs text-gray-600">
                          {file.seoData.optimized ? 'SEO Optimized' : 'Needs Optimization'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e?.stopPropagation();
                        window.open(file.url, '_blank');
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e?.stopPropagation();
                        removeFile(file.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEO Analysis Panel */}
      {selectedFile && seoAnalysis && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">SEO Analysis</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">SEO Score:</span>
                <span className={`text-lg font-bold ${
                  seoAnalysis.score >= 80 ? 'text-green-600' :
                  seoAnalysis.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {seoAnalysis.score}/100
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* SEO Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  SEO Title
                </label>
                <input
                  type="text"
                  value={selectedFile?.seoData.title}
                  onChange={(e) => updateFileSEO(selectedFile?.id, { title: e?.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter SEO-friendly title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Alt Text
                </label>
                <input
                  type="text"
                  value={selectedFile?.seoData.altText}
                  onChange={(e) => updateFileSEO(selectedFile?.id, { altText: e?.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe the image for accessibility"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={selectedFile?.seoData.description}
                  onChange={(e) => updateFileSEO(selectedFile?.id, { description: e?.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter detailed description for SEO"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {selectedFile?.seoData.keywords.map((keyword, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {keyword}
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add keywords separated by commas"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      /**
                       * if功能函数
                       * @param {Object} params - 参数对象
                       * @returns {Promise<Object>} 返回结果
                       */
                      const value = (e?.target as HTMLInputElement).value.trim();
                      if (value) {
                        const newKeywords = value.split(',').map(k => k.trim()).filter(k => k);
                        updateFileSEO(selectedFile?.id, { 
                          keywords: [...selectedFile?.seoData.keywords, ...newKeywords] 
                        });
                        (e?.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>

            {/* Issues and Suggestions */}
            {seoAnalysis.issues.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">Issues Found</h4>
                <ul className="space-y-1">
                  {seoAnalysis.issues.map((issue, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-red-700">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {seoAnalysis.suggestions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-700 mb-2">Suggestions</h4>
                <ul className="space-y-1">
                  {seoAnalysis.suggestions.map((suggestion, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-blue-700">{suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadSEO;
