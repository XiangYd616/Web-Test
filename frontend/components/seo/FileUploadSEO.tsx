import { useRef, useState } from 'react';
import type { FC } from 'react';
import { AlertCircle, CheckCircle, Loader, Upload, X } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface FileUploadSEOProps {
  onAnalysisComplete: (results: any) => void;
  isAnalyzing: boolean;
  onFileUpload: (files: File[], options: any) => void;
}

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  preview?: string;
}

const FileUploadSEO: React.FC<FileUploadSEOProps> = ({
  onAnalysisComplete,
  isAnalyzing,
  onFileUpload
}) => {
  const { actualTheme } = useTheme();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [analysisOptions, setAnalysisOptions] = useState({
    checkTechnicalSEO: true,
    checkContentQuality: true,
    checkAccessibility: true,
    checkPerformance: true,
    keywords: ''
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supportedFormats = ['.html', '.htm', '.xml', '.txt', '.css', '.js'];
  const maxFileSize = 10 * 1024 * 1024; // 10MB
  const maxFiles = 20;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    const validFiles: UploadedFile[] = [];
    const errors: string[] = [];

    files.forEach(file => {
      // 检查文件数量限制
      if (uploadedFiles.length + validFiles.length >= maxFiles) {
        errors.push(`最多只能上传 ${maxFiles} 个文件`);
        return;
      }

      // 检查文件大小
      if (file.size > maxFileSize) {
        errors.push(`文件 ${file.name} 超过 10MB 限制`);
        return;
      }

      // 检查文件格式
      const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!supportedFormats.includes(fileExt)) {
        errors.push(`不支持的文件格式: ${file.name}`);
        return;
      }

      // 检查重复文件
      if (uploadedFiles.some(f => f.file.name === file.name)) {
        errors.push(`文件 ${file.name} 已存在`);
        return;
      }

      validFiles.push({
        file,
        id: Math.random().toString(36).substr(2, 9),
        status: 'pending'
      });
    });

    if (errors.length > 0) {
      alert(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      const newFiles = [...uploadedFiles, ...validFiles];
      setUploadedFiles(newFiles);
      // 通知父组件文件已上传（但不自动开始分析）
      notifyFileUpload(newFiles);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  // 当文件上传时通知父组件（仅传递文件信息，不触发分析）
  const notifyFileUpload = (files: UploadedFile[]) => {
    if (files.length > 0) {
      const fileList = files.map(f => f.file);
      onFileUpload(fileList, analysisOptions);
    }
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'html':
      case 'htm':
        return '🌐';
      case 'xml':
        return '📄';
      case 'txt':
        return '📝';
      case 'css':
        return '🎨';
      case 'js':
        return '⚡';
      default:
        return '📄';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-6 ${actualTheme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
      {/* 文件上传区域 */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">本地文件SEO分析</h3>
          <div className="text-sm text-gray-500">
            支持格式: {supportedFormats.join(', ')}
          </div>
        </div>

        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${dragActive
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }
            ${actualTheme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'}
          `}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={supportedFormats.join(',')}
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label="选择HTML文件进行SEO分析"
            title="选择HTML文件进行SEO分析"
          />

          <div className="space-y-4">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div>
              <p className="text-lg font-medium">
                拖拽文件到此处或点击上传
              </p>
              <p className="text-sm text-gray-500 mt-2">
                最多 {maxFiles} 个文件，每个文件最大 10MB
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 已上传文件列表 */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">已上传文件 ({uploadedFiles.length})</h4>
            <button
              onClick={clearAllFiles}
              className="text-sm text-red-600 hover:text-red-700"
              disabled={isAnalyzing}
            >
              清空所有
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {uploadedFiles.map(file => (
              <div
                key={file.id}
                className={`
                  flex items-center justify-between p-3 rounded-lg border
                  ${actualTheme === 'dark'
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                  }
                `}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{getFileIcon(file.file.name)}</span>
                  <div>
                    <p className="font-medium text-sm">{file.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(file.file.size)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {file.status === 'pending' && (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  )}
                  {file.status === 'analyzing' && (
                    <Loader className="h-4 w-4 text-blue-500 animate-spin" />
                  )}
                  {file.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}

                  <button
                    onClick={() => removeFile(file.id)}
                    disabled={isAnalyzing}
                    className="p-1 text-gray-400 hover:text-red-500"
                    aria-label={`删除文件 ${file.file.name}`}
                    title={`删除文件 ${file.file.name}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 分析选项 */}
      <div className="space-y-4">
        <h4 className="font-medium">分析选项</h4>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={analysisOptions.checkTechnicalSEO}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                checkTechnicalSEO: e.target.checked
              }))}
              className="rounded"
            />
            <span>技术SEO检查</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={analysisOptions.checkContentQuality}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                checkContentQuality: e.target.checked
              }))}
              className="rounded"
            />
            <span>内容质量分析</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={analysisOptions.checkAccessibility}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                checkAccessibility: e.target.checked
              }))}
              className="rounded"
            />
            <span>可访问性检查</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={analysisOptions.checkPerformance}
              onChange={(e) => setAnalysisOptions(prev => ({
                ...prev,
                checkPerformance: e.target.checked
              }))}
              className="rounded"
            />
            <span>性能分析</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            关键词（可选）
          </label>
          <input
            type="text"
            value={analysisOptions.keywords}
            onChange={(e) => setAnalysisOptions(prev => ({
              ...prev,
              keywords: e.target.value
            }))}
            placeholder="输入关键词，用逗号分隔"
            className={`
              w-full px-3 py-2 border rounded-lg
              ${actualTheme === 'dark'
                ? 'bg-gray-800 border-gray-600 text-white'
                : 'bg-white border-gray-300 text-gray-900'
              }
            `}
          />
        </div>
      </div>

      {/* 文件上传完成提示 */}
      {uploadedFiles.length > 0 && (
        <div className="text-center">
          <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg ${actualTheme === 'dark'
            ? 'bg-green-900/20 text-green-300 border border-green-500/30'
            : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm">文件已准备就绪，请点击下方"开始分析"按钮</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUploadSEO;
