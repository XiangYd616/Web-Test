/**
 * HTML 报告生成器
 * 生成专业的可打印 HTML 测试报告，支持浏览器 print() 导出为 PDF
 */

type ReportSection = {
  title: string;
  rows: Array<{ label: string; value: string; highlight?: 'good' | 'warn' | 'bad' }>;
};

type ReportConfig = {
  title: string;
  testId: string;
  testType: string;
  url: string;
  score: number | null;
  grade: string;
  generatedAt: string;
  sections: ReportSection[];
  warnings: string[];
  errors: string[];
  recommendations: Array<{ title: string; priority: string; description: string }>;
};

const SCORE_COLOR = (score: number | null) => {
  if (score === null) return '#94a3b8';
  if (score >= 90) return '#16a34a';
  if (score >= 70) return '#2563eb';
  if (score >= 50) return '#f59e0b';
  return '#dc2626';
};

const PRIORITY_COLOR = (p: string) => {
  switch (p.toLowerCase()) {
    case 'high':
    case 'critical':
      return '#dc2626';
    case 'medium':
      return '#f59e0b';
    default:
      return '#3b82f6';
  }
};

const HIGHLIGHT_COLOR = (h?: 'good' | 'warn' | 'bad') => {
  if (h === 'good') return '#16a34a';
  if (h === 'warn') return '#f59e0b';
  if (h === 'bad') return '#dc2626';
  return '#1e293b';
};

const TYPE_LABELS: Record<string, string> = {
  performance: '性能测试',
  security: '安全扫描',
  seo: 'SEO 审计',
  stress: '压力测试',
  accessibility: '可访问性',
  compatibility: '兼容性',
  ux: '用户体验',
  website: '综合测试',
  api: 'API 测试',
};

export function generateHtmlReport(config: ReportConfig): string {
  const scoreColor = SCORE_COLOR(config.score);
  const typeLabel = TYPE_LABELS[config.testType] || config.testType;

  const sectionsHtml = config.sections
    .map(
      section => `
    <div class="section">
      <h2>${escapeHtml(section.title)}</h2>
      <table>
        <tbody>
          ${section.rows
            .map(
              row => `
            <tr>
              <td class="label">${escapeHtml(row.label)}</td>
              <td class="value" style="color:${HIGHLIGHT_COLOR(row.highlight)}">${escapeHtml(row.value)}</td>
            </tr>`
            )
            .join('')}
        </tbody>
      </table>
    </div>`
    )
    .join('');

  const warningsHtml =
    config.warnings.length > 0
      ? `
    <div class="section">
      <h2>⚠ 警告 (${config.warnings.length})</h2>
      <ul class="warn-list">
        ${config.warnings.map(w => `<li>${escapeHtml(w)}</li>`).join('')}
      </ul>
    </div>`
      : '';

  const errorsHtml =
    config.errors.length > 0
      ? `
    <div class="section">
      <h2>✕ 错误 (${config.errors.length})</h2>
      <ul class="error-list">
        ${config.errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
      </ul>
    </div>`
      : '';

  const recommendationsHtml =
    config.recommendations.length > 0
      ? `
    <div class="section">
      <h2>💡 优化建议 (${config.recommendations.length})</h2>
      <div class="recommendations">
        ${config.recommendations
          .map(
            r => `
          <div class="rec-item">
            <div class="rec-header">
              <span class="rec-priority" style="background:${PRIORITY_COLOR(r.priority)}">${escapeHtml(r.priority.toUpperCase())}</span>
              <span class="rec-title">${escapeHtml(r.title)}</span>
            </div>
            <p class="rec-desc">${escapeHtml(r.description)}</p>
          </div>`
          )
          .join('')}
      </div>
    </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(config.title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 48px 32px;
      color: #1e293b;
      background: #fff;
      font-size: 14px;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .header-left h1 {
      font-size: 1.5rem;
      color: #0f172a;
      margin-bottom: 8px;
    }
    .header-left .meta {
      font-size: 12px;
      color: #64748b;
      line-height: 1.8;
    }
    .header-left .meta span {
      display: inline-block;
      margin-right: 16px;
    }
    .score-badge {
      text-align: center;
      min-width: 90px;
    }
    .score-badge .score-value {
      font-size: 2.5rem;
      font-weight: 800;
      line-height: 1;
    }
    .score-badge .score-grade {
      font-size: 14px;
      font-weight: 600;
      margin-top: 4px;
      color: #64748b;
    }
    .section {
      margin-bottom: 28px;
    }
    .section h2 {
      font-size: 1rem;
      color: #334155;
      padding: 8px 14px;
      background: #f1f5f9;
      border-radius: 6px;
      border-left: 3px solid #3b82f6;
      margin-bottom: 12px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    table td {
      padding: 8px 14px;
      border-bottom: 1px solid #f1f5f9;
      font-size: 13px;
    }
    table td.label {
      color: #64748b;
      width: 40%;
      font-weight: 500;
    }
    table td.value {
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    table tr:last-child td {
      border-bottom: none;
    }
    .warn-list, .error-list {
      list-style: none;
      padding: 0;
    }
    .warn-list li, .error-list li {
      padding: 8px 14px;
      margin-bottom: 4px;
      border-radius: 4px;
      font-size: 13px;
    }
    .warn-list li {
      background: #fef3c7;
      color: #92400e;
      border-left: 3px solid #f59e0b;
    }
    .error-list li {
      background: #fee2e2;
      color: #991b1b;
      border-left: 3px solid #dc2626;
    }
    .recommendations {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .rec-item {
      padding: 12px 14px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #fafafa;
    }
    .rec-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }
    .rec-priority {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      letter-spacing: 0.5px;
    }
    .rec-title {
      font-weight: 600;
      font-size: 13px;
      color: #1e293b;
    }
    .rec-desc {
      font-size: 12px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .section { break-inside: avoid; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>${escapeHtml(config.title)}</h1>
      <div class="meta">
        <span>类型: ${escapeHtml(typeLabel)}</span>
        <span>URL: ${escapeHtml(config.url)}</span>
        <br />
        <span>ID: ${escapeHtml(config.testId.slice(0, 8))}</span>
        <span>生成时间: ${escapeHtml(config.generatedAt)}</span>
      </div>
    </div>
    ${
      config.score !== null
        ? `
    <div class="score-badge">
      <div class="score-value" style="color:${scoreColor}">${config.score}</div>
      <div class="score-grade">${escapeHtml(config.grade)}</div>
    </div>`
        : ''
    }
  </div>

  ${sectionsHtml}
  ${warningsHtml}
  ${errorsHtml}
  ${recommendationsHtml}

  <div class="footer">
    Generated by Test-Web · ${escapeHtml(config.generatedAt)}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/** 在新窗口中打开 HTML 报告并触发打印 */
export function printHtmlReport(html: string): void {
  const preview = window.open('', '_blank');
  if (preview) {
    preview.document.write(html);
    preview.document.close();
    preview.focus();
    setTimeout(() => preview.print(), 300);
  }
}

/** 下载 HTML 报告为文件 */
export function downloadHtmlReport(html: string, filename: string): void {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 从测试结果 payload 构建报告配置
 */
export function buildReportConfig(
  testId: string,
  testType: string,
  url: string,
  payload: Record<string, unknown>
): ReportConfig {
  const getRecord = (v: unknown): Record<string, unknown> | null =>
    v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;

  const getString = (v: unknown): string =>
    v === undefined || v === null ? '-' : typeof v === 'object' ? JSON.stringify(v) : String(v);

  const getNumber = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  // 解析 payload 结构
  const details = getRecord(payload.details) || getRecord(payload);
  const results = getRecord(details?.results) || details;
  const engineResult =
    getRecord(results?.[testType]) || getRecord(results?.performance) || results;
  const engineDetails = getRecord(engineResult?.details) || engineResult;

  const summary = getRecord(engineDetails?.summary) || getRecord(payload.summary) || {};
  const score = getNumber(summary.score) ?? getNumber(payload.score);
  const grade = getString(summary.grade || payload.grade || (score !== null && score >= 90 ? 'A' : score !== null && score >= 70 ? 'B' : score !== null && score >= 50 ? 'C' : 'D'));

  // 构建 sections
  const sections: ReportSection[] = [];

  // 概要
  const summaryRows: ReportSection['rows'] = [];
  if (summary.score !== undefined) summaryRows.push({ label: '评分', value: `${summary.score}/100`, highlight: (getNumber(summary.score) ?? 0) >= 70 ? 'good' : (getNumber(summary.score) ?? 0) >= 50 ? 'warn' : 'bad' });
  if (summary.grade) summaryRows.push({ label: '等级', value: getString(summary.grade) });
  if (summary.averageLoadTime) summaryRows.push({ label: '平均加载时间', value: getString(summary.averageLoadTime) });
  if (summary.fastestLoadTime) summaryRows.push({ label: '最快加载时间', value: getString(summary.fastestLoadTime) });
  if (summary.slowestLoadTime) summaryRows.push({ label: '最慢加载时间', value: getString(summary.slowestLoadTime) });
  if (summaryRows.length > 0) {
    sections.push({ title: '测试概要', rows: summaryRows });
  }

  // Web Vitals
  const webVitals = getRecord(engineDetails?.webVitals);
  if (webVitals) {
    const vitalRows: ReportSection['rows'] = [];
    for (const [key, val] of Object.entries(webVitals)) {
      const vital = getRecord(val);
      if (!vital) continue;
      const value = getNumber(vital.value);
      const rating = getString(vital.rating);
      if (value !== null) {
        const highlight: 'good' | 'warn' | 'bad' = rating === 'good' ? 'good' : rating === 'needs-improvement' ? 'warn' : 'bad';
        vitalRows.push({
          label: key.toUpperCase(),
          value: key === 'cls' ? value.toFixed(3) : `${Math.round(value)} ms`,
          highlight,
        });
      }
    }
    if (vitalRows.length > 0) {
      sections.push({ title: 'Core Web Vitals', rows: vitalRows });
    }
  }

  // 指标
  const metrics = getRecord(engineDetails?.metrics);
  if (metrics) {
    const metricRows: ReportSection['rows'] = [];
    for (const [key, val] of Object.entries(metrics)) {
      const metric = getRecord(val);
      if (metric) {
        metricRows.push({ label: key, value: `avg: ${getString(metric.average)}, min: ${getString(metric.min)}, max: ${getString(metric.max)}` });
      }
    }
    if (metricRows.length > 0) {
      sections.push({ title: '性能指标', rows: metricRows });
    }
  }

  // HTTP 信息
  const httpInfo = getRecord(engineDetails?.httpInfo);
  if (httpInfo) {
    const httpRows: ReportSection['rows'] = [];
    if (httpInfo.statusCode) httpRows.push({ label: '状态码', value: getString(httpInfo.statusCode) });
    if (httpInfo.httpVersion) httpRows.push({ label: 'HTTP 版本', value: getString(httpInfo.httpVersion) });
    if (httpInfo.compression) httpRows.push({ label: '压缩', value: getString(httpInfo.compression) });
    if (httpInfo.server) httpRows.push({ label: '服务器', value: getString(httpInfo.server) });
    if (httpInfo.contentType) httpRows.push({ label: '内容类型', value: getString(httpInfo.contentType) });
    if (httpRows.length > 0) {
      sections.push({ title: 'HTTP 信息', rows: httpRows });
    }
  }

  // 警告和错误
  const warnings = Array.isArray(payload.warnings)
    ? payload.warnings.map(getString)
    : Array.isArray(engineResult?.warnings)
      ? (engineResult.warnings as unknown[]).map(getString)
      : [];
  const errors = Array.isArray(payload.errors)
    ? payload.errors.map(getString)
    : Array.isArray(engineResult?.errors)
      ? (engineResult.errors as unknown[]).map(getString)
      : [];

  // 建议
  const rawRecs = Array.isArray(engineDetails?.recommendations)
    ? (engineDetails.recommendations as unknown[])
    : [];
  const recommendations = rawRecs
    .map(r => {
      const rec = getRecord(r);
      if (!rec) return null;
      return {
        title: getString(rec.title || rec.type),
        priority: getString(rec.priority || 'medium'),
        description: getString(rec.description || rec.impact),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return {
    title: `测试报告 - ${TYPE_LABELS[testType] || testType}`,
    testId,
    testType,
    url,
    score,
    grade,
    generatedAt: new Date().toLocaleString('zh-CN'),
    sections,
    warnings,
    errors,
    recommendations,
  };
}
