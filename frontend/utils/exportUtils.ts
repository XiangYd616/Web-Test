// 导出工具函数
export interface ExportOptions {
  format: 'json' | 'csv' | 'xml' | 'pdf'
  filename?: string;
  includeHeaders?: boolean;
  encoding?: string;
}

export interface ExportData {
  headers: string[];
  rows: any[][];
  metadata?: Record<string, any>;
}

/**
 * 导出数据为JSON格式
 */
export function exportToJSON(data: ExportData, options: ExportOptions = { format: 'json' }): void {
  const jsonData = {
    headers: data.headers,
    rows: data.rows,
    metadata: data.metadata || {},
    exportTime: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
    type: 'application/json'
  });

  downloadBlob(blob, options.filename || 'export.json');
}

/**
 * 导出数据为CSV格式
 */
export function exportToCSV(data: ExportData, options: ExportOptions = { format: 'csv' }): void {
  let csvContent = ''

  // 添加标题行
  if (options.includeHeaders !== false) {
    csvContent += data.headers.map(header => escapeCSVField(header)).join(',') + '\n'
  }

  // 添加数据行
  for (const row of data.rows) {
    csvContent += row.map(cell => escapeCSVField(String(cell))).join(',') + '\n'
  }

  const blob = new Blob([csvContent], {
    type: 'text/csv;charset=utf-8'
  });

  downloadBlob(blob, options.filename || 'export.csv');
}

/**
 * 导出数据为XML格式
 */
export function exportToXML(data: ExportData, options: ExportOptions = { format: 'xml' }): void {
  let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n'
  xmlContent += '<export>\n'
  xmlContent += '  <metadata>\n'
  xmlContent += `    <exportTime>${new Date().toISOString()}</exportTime>\n`;
  xmlContent += '  </metadata>\n'
  xmlContent += '  <data>\n'

  for (const row of data.rows) {
    xmlContent += '    <row>\n'
    for (let i = 0; i < data.headers.length; i++) {
      const header = data.headers[i];
      const value = row[i] || ''
      xmlContent += `      <${header}>${escapeXML(String(value))}</${header}>\n`;
    }
    xmlContent += '    </row>\n'
  }

  xmlContent += '  </data>\n'
  xmlContent += '</export>'

  const blob = new Blob([xmlContent], {
    type: 'application/xml'
  });

  downloadBlob(blob, options.filename || 'export.xml');
}

/**
 * 转义CSV字段
 */
function escapeCSVField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return '"' + field.replace(/"/g, '""') + '
  }
  return field;
}

/**
 * 转义XML内容
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 下载Blob对象
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 验证导出选项
 */
export function validateExportOptions(options: ExportOptions): boolean {
  const validFormats = ['json', 'csv', 'xml', 'pdf'];
  return validFormats.includes(options.format);
}

export default {
  exportToJSON,
  exportToCSV,
  exportToXML,
  formatFileSize,
  validateExportOptions
};
