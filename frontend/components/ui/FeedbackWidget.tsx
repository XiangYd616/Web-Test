import React, { useState } from 'react';
import { MessageSquare, Star, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { FeedbackSeverity, FeedbackType, PageType, userFeedbackService } from '../../services/user/userFeedbackService';

interface FeedbackWidgetProps {
  page: PageType;
  className?: string;
}

const FeedbackWidget: React.FC<FeedbackWidgetProps> = ({ page, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>(FeedbackType.GENERAL_FEEDBACK);
  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const feedbackTypes = [
    { value: FeedbackType.GENERAL_FEEDBACK, label: '一般反馈', icon: MessageSquare },
    { value: FeedbackType.UI_UX_FEEDBACK, label: '界面体验', icon: Star },
    { value: FeedbackType.BUG_REPORT, label: '错误报告', icon: ThumbsDown },
    { value: FeedbackType.FEATURE_REQUEST, label: '功能建议', icon: ThumbsUp },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !description.trim()) {
      alert('请填写标题和描述');
      return;
    }

    setIsSubmitting(true);

    try {
      // 根据评分确定严重程度
      let severity = FeedbackSeverity.MEDIUM;
      if (rating <= 2) severity = FeedbackSeverity.HIGH;
      else if (rating >= 4) severity = FeedbackSeverity.LOW;

      await userFeedbackService.submitFeedback({
        type: feedbackType,
        severity,
        page,
        title: title.trim(),
        description: description.trim(),
        additionalData: {
          rating,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      });

      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setIsSubmitted(false);
        resetForm();
      }, 2000);

    } catch (error) {
      console.error('Failed to submit feedback:', error);
      alert('提交反馈失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFeedbackType(FeedbackType.GENERAL_FEEDBACK);
    setRating(0);
    setTitle('');
    setDescription('');
  };

  const handleQuickFeedback = (type: 'positive' | 'negative') => {
    const feedbackType = type === 'positive' ? FeedbackType.UI_UX_FEEDBACK : FeedbackType.BUG_REPORT;
    const message = type === 'positive' ? '页面设计很棒，使用体验良好！' : '页面存在一些问题，需要改进。';
    const severity = type === 'positive' ? FeedbackSeverity.LOW : FeedbackSeverity.MEDIUM;

    userFeedbackService.submitFeedback({
      type: feedbackType,
      severity,
      page,
      title: `快速反馈 - ${type === 'positive' ? '正面' : '负面'}`,
      description: message
    });

    // 显示感谢消息
    setIsSubmitted(true);
    setTimeout(() => setIsSubmitted(false), 2000);
  };

  if (isSubmitted) {
    
        return (
      <div className={`fixed bottom-4 right-4 z-50 ${className
      }`}>
        <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-2">
          <ThumbsUp className="w-5 h-5" />
          <span>感谢您的反馈！</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {!isOpen ? (
        <div className="flex flex-col space-y-2">
          {/* 快速反馈按钮 */}
          <div className="flex space-x-2">
            <button
              onClick={() => handleQuickFeedback('positive')}
              className="bg-green-600 hover:bg-green-700 text-white p-2 rounded-full shadow-lg transition-colors"
              title="页面很棒"
            >
              <ThumbsUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleQuickFeedback('negative')}
              className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full shadow-lg transition-colors"
              title="有问题"
            >
              <ThumbsDown className="w-4 h-4" />
            </button>
          </div>

          {/* 详细反馈按钮 */}
          <button
            onClick={() => setIsOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg transition-colors flex items-center space-x-2"
          >
            <MessageSquare className="w-4 h-4" />
            <span>反馈</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-96 overflow-hidden">
          {/* 头部 */}
          <div className="bg-blue-600 text-white px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold">页面反馈</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 表单内容 */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* 反馈类型 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                反馈类型
              </label>
              <div className="grid grid-cols-2 gap-2">
                {feedbackTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setFeedbackType(type.value)}
                      className={`p-2 rounded-lg border text-xs flex items-center space-x-1 transition-colors ${
                        feedbackType === type.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <IconComponent className="w-3 h-3" />
                      <span>{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 评分 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                整体评分
              </label>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`transition-colors ${
                      star <= rating ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* 标题 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="简要描述您的反馈..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* 描述 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                详细描述
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="请详细描述您的反馈或建议..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                required
              />
            </div>

            {/* 提交按钮 */}
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? '提交中...' : '提交'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FeedbackWidget;
