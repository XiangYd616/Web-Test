import React from 'react';
import type { FC } from 'react';
import { AlertTriangle, Download, Monitor, Globe } from 'lucide-react';

interface EnvironmentPromptProps {
  feature: string;
  limitation: string;
  desktopBenefit: string;
  onDismiss?: () => void;
  showDownloadLink?: boolean;
}

const EnvironmentPrompt: React.FC<EnvironmentPromptProps> = ({
  feature,
  limitation,
  desktopBenefit,
  onDismiss,
  showDownloadLink = true
}) => {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-start space-x-3">
        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800 mb-2">
            浏览器环境限制
          </h4>
          <div className="text-sm text-amber-700 space-y-2">
            <p>
              <strong>当前功能:</strong> {feature}
            </p>
            <p>
              <strong>浏览器限制:</strong> {limitation}
            </p>
            <p>
              <strong>桌面版优势:</strong> {desktopBenefit}
            </p>
          </div>

          {showDownloadLink && (
            <div className="mt-4 flex items-center space-x-4">
              <a
                href="/download-desktop"
                className="inline-flex items-center px-3 py-2 border border-amber-300 rounded-md text-sm font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                下载桌面版
              </a>

              <div className="flex items-center text-xs text-amber-600">
                <Monitor className="w-4 h-4 mr-1" />
                <span>获得完整功能体验</span>
              </div>
            </div>
          )}

          <div className="mt-3 pt-3 border-t border-amber-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs text-amber-600">
                <Globe className="w-4 h-4 mr-1" />
                <span>当前运行在浏览器环境</span>
              </div>

              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-xs text-amber-600 hover:text-amber-800 underline"
                 type="button">
                  知道了
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentPrompt;
