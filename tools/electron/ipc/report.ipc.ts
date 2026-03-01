import { app, BrowserWindow, ipcMain, shell } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

function ensureReportDir(): string {
  const reportDir = path.join(app.getPath('userData'), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  return reportDir;
}

function buildReportHtml(data: unknown): string {
  const report = data as Record<string, unknown> | null;
  const title = String(report?.testType || report?.type || '测试') + '报告';
  const score = typeof report?.score === 'number' ? report.score : null;
  const summary = report?.summary as Record<string, unknown> | undefined;
  const grade =
    summary?.grade ||
    (score !== null ? (score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D') : '-');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>${title}</title>
<style>
body{font-family:system-ui,-apple-system,sans-serif;max-width:900px;margin:0 auto;padding:20px;color:#333}
h1{border-bottom:2px solid #4f46e5;padding-bottom:8px}
.score{font-size:48px;font-weight:bold;color:${score !== null && score >= 60 ? '#16a34a' : '#dc2626'}}
.meta{color:#666;font-size:14px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th,td{border:1px solid #ddd;padding:8px;text-align:left}
th{background:#f5f5f5}
pre{background:#f8f8f8;padding:12px;border-radius:6px;overflow-x:auto;font-size:13px}
</style></head>
<body>
<h1>${title}</h1>
<p class="meta">生成时间: ${new Date().toLocaleString('zh-CN')}</p>
${score !== null ? `<div><span class="score">${score}</span><span style="font-size:24px;margin-left:8px">/ 100 (${grade})</span></div>` : ''}
${
  summary
    ? `<h2>概要</h2><table>${Object.entries(summary)
        .filter(([k]) => !['score', 'grade'].includes(k))
        .map(
          ([k, v]) =>
            `<tr><th>${k}</th><td>${typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')}</td></tr>`
        )
        .join('')}</table>`
    : ''
}
<h2>完整数据</h2>
<pre>${JSON.stringify(data, null, 2)}</pre>
</body></html>`;
}

/**
 * 报告生成 IPC handlers
 */
export function registerReportIpc(): void {
  ipcMain.handle('report-generate-pdf', async (_event, data: unknown, _template?: string) => {
    const reportDir = ensureReportDir();
    const htmlContent = buildReportHtml(data);
    const filePath = path.join(reportDir, `report-${Date.now()}.pdf`);
    try {
      const win = new BrowserWindow({ show: false, width: 900, height: 1200 });
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      const pdfBuffer = await win.webContents.printToPDF({ printBackground: true, pageSize: 'A4' });
      fs.writeFileSync(filePath, pdfBuffer);
      win.destroy();
    } catch {
      // PDF 生成失败时回退为 HTML
      const fallbackPath = filePath.replace('.pdf', '.html');
      fs.writeFileSync(fallbackPath, htmlContent, 'utf-8');
      return fallbackPath;
    }
    return filePath;
  });

  ipcMain.handle('report-generate-excel', async (_event, data: unknown) => {
    const reportDir = ensureReportDir();
    const report = data as Record<string, unknown> | null;
    const filePath = path.join(reportDir, `report-${Date.now()}.csv`);
    const rows: string[][] = [];
    const summary = report?.summary as Record<string, unknown> | undefined;
    if (summary) {
      rows.push(['字段', '值']);
      for (const [k, v] of Object.entries(summary)) {
        rows.push([k, typeof v === 'object' ? JSON.stringify(v) : String(v ?? '')]);
      }
    } else {
      rows.push(['数据']);
      rows.push([JSON.stringify(data, null, 2)]);
    }
    const csvContent = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    fs.writeFileSync(filePath, '\uFEFF' + csvContent, 'utf-8');
    return filePath;
  });

  ipcMain.handle('report-generate-word', async (_event, data: unknown, _template?: string) => {
    const reportDir = ensureReportDir();
    const htmlContent = buildReportHtml(data);
    const filePath = path.join(reportDir, `report-${Date.now()}.doc`);
    fs.writeFileSync(filePath, htmlContent, 'utf-8');
    return filePath;
  });

  ipcMain.handle('report-open', async (_event, filePath: string) => {
    await shell.openPath(filePath);
  });
}
