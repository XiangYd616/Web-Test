// 用户反馈收集系统

interface UserAction {
  type: string;
  details?: Record<string, any>;
  timestamp?: Date;
}

interface UserFeedback {
  ratings: {
    usability: number;
    design: number;
    performance: number;
    functionality: number;
    overall: number;
  };
  issues: string[];
  comments?: string;
  timestamp: Date;
  completed?: boolean;
}

interface TestSession {
  id: string;
  userId: string;
  testType: string;
  startTime: Date;
  actions: UserAction[];
  feedback: UserFeedback | null;
  completed: boolean;
}

interface FeedbackReport {
  timestamp: string;
  totalSessions: number;
  completedSessions: number;
  completionRate: number;
  averageRatings: {
    usability: string;
    design: string;
    performance: string;
    functionality: string;
    overall: string;
  };
  commonIssues: Array<{
    issue: string;
    count: number;
    percentage: string;
  }>;
  userJourneyAnalysis: {
    averageSessionDuration: number;
    commonPaths: Record<string, number>;
    dropOffPoints: Record<string, number>;
    successfulCompletions: number;
    completionRate: string;
  };
  recommendations: Array<{
    type: 'rating' | 'issue';
    priority: 'high' | 'medium' | 'low';
    category?: string;
    issue?: string;
    message: string;
  }>;
}

interface ExportData {
  sessions: TestSession[];
  feedbacks: TestSession[];
  report: FeedbackReport;
}

class FeedbackCollector {
  private feedbacks: TestSession[] = [];
  private testSessions: Map<string, TestSession> = new Map();

  // 开始用户测试会话
  startTestSession(userId: string, testType: string): string {
    const sessionId = `session_${Date.now()}_${userId}`;
    const session: TestSession = {
      id: sessionId,
      userId,
      testType,
      startTime: new Date(),
      actions: [],
      feedback: null,
      completed: false,
    };

    this.testSessions.set(sessionId, session);
    return sessionId;
  }

  // 记录用户操作
  recordAction(sessionId: string, action: UserAction): void {
    const session = this.testSessions.get(sessionId);
    if (session) {
      session.actions.push({
        ...action,
        timestamp: new Date(),
      });
    }
  }

  // 收集用户反馈
  collectFeedback(sessionId: string, feedback: Omit<UserFeedback, 'timestamp'>): void {
    const session = this.testSessions.get(sessionId);
    if (session) {
      session.feedback = {
        ...feedback,
        timestamp: new Date(),
      };
      session.completed = true;

      this.feedbacks.push({
        sessionId,
        ...session,
      });
    }
  }

  // 生成反馈报告
  generateFeedbackReport(): FeedbackReport {
    const report: FeedbackReport = {
      timestamp: new Date().toISOString(),
      totalSessions: this.testSessions.size,
      completedSessions: this.feedbacks.length,
      completionRate: (this.feedbacks.length / this.testSessions.size) * 100,
      averageRatings: this.calculateAverageRatings(),
      commonIssues: this.identifyCommonIssues(),
      userJourneyAnalysis: this.analyzeUserJourneys(),
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  private calculateAverageRatings(): FeedbackReport['averageRatings'] {
    const ratings = {
      usability: 0,
      design: 0,
      performance: 0,
      functionality: 0,
      overall: 0,
    };

    if (this.feedbacks.length === 0) return ratings;

    this.feedbacks.forEach(feedback => {
      if (feedback.feedback && feedback.feedback.ratings) {
        Object.keys(ratings).forEach(key => {
          const ratingKey = key as keyof typeof ratings;
          if (feedback.feedback.ratings[ratingKey]) {
            ratings[ratingKey] += feedback.feedback.ratings[ratingKey];
          }
        });
      }
    });

    Object.keys(ratings).forEach(key => {
      const ratingKey = key as keyof typeof ratings;
      ratings[ratingKey] = (ratings[ratingKey] / this.feedbacks.length).toFixed(2);
    });

    return ratings;
  }

  private identifyCommonIssues(): FeedbackReport['commonIssues'] {
    const issues: Record<string, number> = {};

    this.feedbacks.forEach(feedback => {
      if (feedback.feedback && feedback.feedback.issues) {
        feedback.feedback.issues.forEach(issue => {
          if (issues[issue]) {
            issues[issue]++;
          } else {
            issues[issue] = 1;
          }
        });
      }
    });

    // 按频率排序
    return Object.entries(issues)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([issue, count]) => ({
        issue,
        count,
        percentage: ((count / this.feedbacks.length) * 100).toFixed(1),
      }));
  }

  private analyzeUserJourneys(): FeedbackReport['userJourneyAnalysis'] {
    const journeyAnalysis = {
      averageSessionDuration: 0,
      commonPaths: {} as Record<string, number>,
      dropOffPoints: {} as Record<string, number>,
      successfulCompletions: 0,
    };

    let totalDuration = 0;

    this.feedbacks.forEach(feedback => {
      // 计算会话时长
      if (feedback.startTime && feedback.feedback.timestamp) {
        const duration =
          new Date(feedback.feedback.timestamp).getTime() - new Date(feedback.startTime).getTime();
        totalDuration += duration;
      }

      // 分析用户路径
      const path = feedback.actions.map(action => action.type).join(' -> ');
      if (journeyAnalysis.commonPaths[path]) {
        journeyAnalysis.commonPaths[path]++;
      } else {
        journeyAnalysis.commonPaths[path] = 1;
      }

      // 检查是否成功完成
      if (feedback.feedback && feedback.feedback.completed) {
        journeyAnalysis.successfulCompletions++;
      }

      // 分析放弃点
      if (!feedback.completed) {
        const lastAction = feedback.actions[feedback.actions.length - 1];
        if (lastAction) {
          const dropPoint = lastAction.type;
          if (journeyAnalysis.dropOffPoints[dropPoint]) {
            journeyAnalysis.dropOffPoints[dropPoint]++;
          } else {
            journeyAnalysis.dropOffPoints[dropPoint] = 1;
          }
        }
      }
    });

    journeyAnalysis.averageSessionDuration = totalDuration / this.feedbacks.length;
    journeyAnalysis.completionRate = (
      (journeyAnalysis.successfulCompletions / this.feedbacks.length) *
      100
    ).toFixed(1);

    return journeyAnalysis;
  }

  private generateRecommendations(): FeedbackReport['recommendations'] {
    const recommendations: FeedbackReport['recommendations'] = [];
    const averageRatings = this.calculateAverageRatings();
    const commonIssues = this.identifyCommonIssues();

    // 基于评分的建议
    Object.entries(averageRatings).forEach(([category, rating]) => {
      const ratingValue = parseFloat(rating);
      if (ratingValue < 3.5) {
        recommendations.push({
          type: 'rating',
          priority: ratingValue < 2.5 ? 'high' : 'medium',
          category,
          message: `${category}评分较低(${rating}/5)，需要重点改进`,
        });
      }
    });

    // 基于常见问题的建议
    commonIssues.slice(0, 3).forEach(issue => {
      if (issue.count > this.feedbacks.length * 0.3) {
        // 超过30%用户反馈的问题
        recommendations.push({
          type: 'issue',
          priority: 'high',
          issue: issue.issue,
          message: `${issue.percentage}%的用户反馈了"${issue.issue}"问题，需要优先解决`,
        });
      }
    });

    return recommendations;
  }

  // 导出反馈数据
  exportFeedbackData(format: 'json' | 'csv' = 'json'): string | ExportData {
    const data: ExportData = {
      sessions: Array.from(this.testSessions.values()),
      feedbacks: this.feedbacks,
      report: this.generateFeedbackReport(),
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else if (format === 'csv') {
      return this.convertToCSV(data.feedbacks);
    }

    return data;
  }

  private convertToCSV(feedbacks: TestSession[]): string {
    if (feedbacks.length === 0) return '';

    const headers = [
      'Session ID',
      'User ID',
      'Test Type',
      'Start Time',
      'Duration (minutes)',
      'Usability Rating',
      'Design Rating',
      'Performance Rating',
      'Functionality Rating',
      'Overall Rating',
      'Completed',
      'Issues',
      'Comments',
    ];

    const rows = feedbacks.map(feedback => {
      const duration =
        feedback.feedback && feedback.feedback.timestamp
          ? (new Date(feedback.feedback.timestamp).getTime() -
              new Date(feedback.startTime).getTime()) /
            (1000 * 60)
          : 0;

      return [
        feedback.id,
        feedback.userId,
        feedback.testType,
        feedback.startTime.toISOString(),
        duration.toFixed(2),
        feedback.feedback?.ratings?.usability || '',
        feedback.feedback?.ratings?.design || '',
        feedback.feedback?.ratings?.performance || '',
        feedback.feedback?.ratings?.functionality || '',
        feedback.feedback?.ratings?.overall || '',
        feedback.completed ? 'Yes' : 'No',
        feedback.feedback?.issues?.join('; ') || '',
        feedback.feedback?.comments || '',
      ];
    });

    return [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  }
}

// 反馈收集表单模板
const feedbackFormTemplate = `
<div id="feedback-form" class="feedback-form">
  <h3>用户体验反馈</h3>

  <div class="rating-section">
    <h4>请为以下方面评分 (1-5分)</h4>

    <div class="rating-item">
      <label>易用性:</label>
      <div class="rating-stars" data-rating="usability">
        <span data-value="1">★</span>
        <span data-value="2">★</span>
        <span data-value="3">★</span>
        <span data-value="4">★</span>
        <span data-value="5">★</span>
      </div>
    </div>

    <div class="rating-item">
      <label>界面设计:</label>
      <div class="rating-stars" data-rating="design">
        <span data-value="1">★</span>
        <span data-value="2">★</span>
        <span data-value="3">★</span>
        <span data-value="4">★</span>
        <span data-value="5">★</span>
      </div>
    </div>

    <div class="rating-item">
      <label>性能表现:</label>
      <div class="rating-stars" data-rating="performance">
        <span data-value="1">★</span>
        <span data-value="2">★</span>
        <span data-value="3">★</span>
        <span data-value="4">★</span>
        <span data-value="5">★</span>
      </div>
    </div>

    <div class="rating-item">
      <label>功能完整性:</label>
      <div class="rating-stars" data-rating="functionality">
        <span data-value="1">★</span>
        <span data-value="2">★</span>
        <span data-value="3">★</span>
        <span data-value="4">★</span>
        <span data-value="5">★</span>
      </div>
    </div>

    <div class="rating-item">
      <label>整体满意度:</label>
      <div class="rating-stars" data-rating="overall">
        <span data-value="1">★</span>
        <span data-value="2">★</span>
        <span data-value="3">★</span>
        <span data-value="4">★</span>
        <span data-value="5">★</span>
      </div>
    </div>
  </div>

  <div class="issues-section">
    <h4>遇到的问题 (可多选)</h4>
    <label><input type="checkbox" value="页面加载慢"> 页面加载慢</label>
    <label><input type="checkbox" value="界面不够直观"> 界面不够直观</label>
    <label><input type="checkbox" value="功能难以找到"> 功能难以找到</label>
    <label><input type="checkbox" value="操作流程复杂"> 操作流程复杂</label>
    <label><input type="checkbox" value="错误提示不清楚"> 错误提示不清楚</label>
    <label><input type="checkbox" value="移动端体验差"> 移动端体验差</label>
    <label><input type="checkbox" value="其他"> 其他</label>
  </div>

  <div class="comments-section">
    <h4>其他建议</h4>
    <textarea id="feedback-comments" placeholder="请分享您的使用体验和改进建议..."></textarea>
  </div>

  <div class="completion-section">
    <label>
      <input type="checkbox" id="task-completed"> 我成功完成了测试任务
    </label>
  </div>

  <button id="submit-feedback" class="submit-btn">提交反馈</button>
</div>

<style>
.feedback-form {
  max-width: 600px;
  margin: 20px auto;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  font-family: Arial, sans-serif;
}

.rating-item {
  margin: 15px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.rating-stars {
  display: flex;
  gap: 5px;
}

.rating-stars span {
  cursor: pointer;
  font-size: 24px;
  color: #ddd;
  transition: color 0.2s;
}

.rating-stars span:hover,
.rating-stars span.active {
  color: #ffd700;
}

.issues-section label {
  display: block;
  margin: 10px 0;
}

.comments-section textarea {
  width: 100%;
  height: 100px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
}

.submit-btn {
  background: #007bff;
  color: white;
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 20px;
}

.submit-btn:hover {
  background: #0056b3;
}
</style>
`;

// 导出
export { FeedbackCollector, feedbackFormTemplate };
export type { ExportData, FeedbackReport, TestSession, UserAction, UserFeedback };
