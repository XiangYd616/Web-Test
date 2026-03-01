/**
 * 安全测试 — 概览标签页
 * 只展示：总分、风险统计、合规统计摘要、扫描警告
 */
import { ArcElement, Chart as ChartJS, Legend, Tooltip } from 'chart.js';
import { useMemo } from 'react';
import { Pie } from 'react-chartjs-2';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import { getSeverityColor, severityOrder, useSecurityData } from './useSecurityData';

ChartJS.register(ArcElement, Tooltip, Legend);

const SecurityOverviewPanel = () => {
  const {
    overallScore,
    riskLevel,
    scanConfidence,
    severityCounts,
    totalVulns,
    headerStats,
    complianceData,
    sslData,
    cookieData,
    recommendations,
    recommendationsTotal,
  } = useSecurityData();

  const pieSeries = useMemo(() => {
    const labels = severityOrder.filter(k => severityCounts[k] > 0);
    if (labels.length === 0) return null;
    const colors: Record<string, string> = {
      critical: 'rgba(239, 68, 68, 0.75)',
      high: 'rgba(249, 115, 22, 0.75)',
      medium: 'rgba(234, 179, 8, 0.75)',
      low: 'rgba(59, 130, 246, 0.75)',
      info: 'rgba(107, 114, 128, 0.75)',
    };
    return {
      labels: labels.map(l => l.toUpperCase()),
      values: labels.map(l => severityCounts[l]),
      colors: labels.map(l => colors[l]),
    };
  }, [severityCounts]);

  const riskBadgeVariant =
    riskLevel.includes('critical') || riskLevel.includes('high')
      ? 'destructive'
      : riskLevel.includes('medium')
        ? 'default'
        : 'secondary';

  const hasAny =
    totalVulns > 0 || headerStats.total > 0 || recommendationsTotal > 0 || scanConfidence !== null;

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>安全测试概览</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {/* 扫描不完整警告横幅 */}
        {scanConfidence && scanConfidence.level !== 'full' && (
          <div
            className={cn(
              'rounded-lg border p-3',
              scanConfidence.level === 'minimal'
                ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
            )}
          >
            <div className='flex items-start gap-2'>
              <span className='text-lg leading-none mt-0.5'>⚠</span>
              <div className='flex-1 min-w-0'>
                <div
                  className={cn(
                    'font-semibold text-sm',
                    scanConfidence.level === 'minimal'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  )}
                >
                  扫描不完整 — 评分仅供参考
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  以下核心扫描被跳过：<strong>{scanConfidence.skippedScans.join('、')}</strong>。
                  评分已被限制上限，实际安全状况可能更差。
                </p>
                {scanConfidence.warnings.length > 0 && (
                  <div className='mt-2 space-y-0.5'>
                    {scanConfidence.warnings.slice(0, 5).map((w, i) => (
                      <p key={i} className='text-xs text-muted-foreground'>
                        • {w}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 高危漏洞强提醒 */}
        {(severityCounts.critical > 0 || severityCounts.high > 0) && (
          <div className='rounded-lg border bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800 p-3'>
            <div className='flex items-center gap-2'>
              <span className='text-lg leading-none'>🚨</span>
              <span className='font-semibold text-sm text-red-700 dark:text-red-400'>
                发现 {severityCounts.critical > 0 ? `${severityCounts.critical} 个严重` : ''}
                {severityCounts.critical > 0 && severityCounts.high > 0 ? '、' : ''}
                {severityCounts.high > 0 ? `${severityCounts.high} 个高危` : ''} 漏洞，请立即处理！
              </span>
            </div>
          </div>
        )}

        {/* 核心 KPI */}
        <div className='grid grid-cols-3 gap-4'>
          {overallScore !== null && (
            <div className='relative'>
              <Statistic title='安全评分' value={overallScore} suffix='/100' />
              {scanConfidence && scanConfidence.level !== 'full' && (
                <span className='absolute top-0 right-0 text-[10px] text-amber-600 dark:text-amber-400 font-medium'>
                  *不完整
                </span>
              )}
            </div>
          )}
          <Statistic title='风险等级' value={riskLevel || '-'} />
          <Statistic title='漏洞总数' value={totalVulns} />
        </div>

        {/* 风险等级 + 严重性分布 */}
        <div className='flex flex-wrap gap-2'>
          <Badge variant={riskBadgeVariant} className='uppercase'>
            {riskLevel || 'unknown'}
          </Badge>
          {severityOrder.map(
            k =>
              severityCounts[k] > 0 && (
                <Badge key={k} className={cn('uppercase', getSeverityColor(k))}>
                  {k}: {severityCounts[k]}
                </Badge>
              )
          )}
        </div>

        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            运行安全测试后，检测结果将在此展示
          </div>
        )}

        {hasAny && (
          <div className='space-y-6'>
            {/* 漏洞分级饼图 */}
            {pieSeries && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
                  漏洞分级分布
                </h4>
                <div className='h-[220px] flex justify-center'>
                  <Pie
                    data={{
                      labels: pieSeries.labels,
                      datasets: [
                        {
                          data: pieSeries.values,
                          backgroundColor: pieSeries.colors,
                          borderWidth: 1,
                        },
                      ],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                  />
                </div>
              </div>
            )}

            {/* 安全头合规摘要 */}
            <div>
              <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                安全头合规
              </h4>
              <div className='grid grid-cols-3 gap-3'>
                <Statistic title='已配置' value={`${headerStats.present}/${headerStats.total}`} />
                <Statistic title='缺失' value={headerStats.missing} />
                <Statistic title='均分' value={headerStats.avgScore} />
              </div>
            </div>

            {/* SSL 摘要 */}
            {sslData && sslData.enabled && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                  SSL/TLS
                </h4>
                <div className='grid grid-cols-3 gap-3'>
                  <Statistic title='评分' value={sslData.score ?? '-'} />
                  <Statistic title='协议' value={sslData.version || '-'} />
                  <Statistic
                    title='证书'
                    value={sslData.certificate?.valid ? '✓ 有效' : '✗ 无效'}
                  />
                </div>
              </div>
            )}

            {/* Cookie 摘要 */}
            {cookieData && (cookieData.totalCookies ?? 0) > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                  Cookie 安全
                </h4>
                <div className='grid grid-cols-3 gap-3'>
                  <Statistic title='评分' value={cookieData.score ?? '-'} />
                  <Statistic title='总数' value={cookieData.totalCookies ?? 0} />
                  <Statistic title='问题' value={cookieData.issues?.length ?? 0} />
                </div>
              </div>
            )}

            {/* 合规标准摘要 */}
            {complianceData && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                  合规标准
                </h4>
                <div className='flex flex-wrap gap-2'>
                  {(['owasp', 'gdpr', 'pci'] as const).map(standard => {
                    const data = complianceData[standard];
                    if (!data) return null;
                    const statusColor =
                      data.status === 'compliant'
                        ? 'bg-green-500 text-white'
                        : data.status === 'partial'
                          ? 'bg-yellow-500 text-white'
                          : data.status === 'non-compliant'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-500 text-white';
                    const statusLabel =
                      data.status === 'compliant'
                        ? '合规'
                        : data.status === 'partial'
                          ? '部分合规'
                          : data.status === 'non-compliant'
                            ? '不合规'
                            : '未知';
                    const issueCount = data.issues?.length ?? 0;
                    return (
                      <Badge key={standard} className={cn('text-xs', statusColor)}>
                        {standard.toUpperCase()} {statusLabel}
                        {issueCount > 0 ? ` (${issueCount}项)` : ''}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 修复建议摘要 */}
            {recommendations && recommendationsTotal > 0 && (
              <div>
                <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2'>
                  修复建议
                </h4>
                <div className='grid grid-cols-4 gap-3'>
                  <Statistic title='立即' value={recommendations.immediate.length} />
                  <Statistic title='短期' value={recommendations.shortTerm.length} />
                  <Statistic title='长期' value={recommendations.longTerm.length} />
                  <Statistic title='预防' value={recommendations.preventive.length} />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityOverviewPanel;
