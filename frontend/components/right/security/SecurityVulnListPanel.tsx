/**
 * 安全测试 — 漏洞列表标签页
 * 只展示真实可利用漏洞：XSS / SQLi / 命令执行 / 目录穿越 / 弱口令 / 未授权 / 敏感泄露 / 上传 / CSRF
 * 以及端口扫描、威胁情报、截图等攻击面信息
 */
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageLightbox } from '@/components/ui/image-lightbox';
import { Statistic } from '@/components/ui/statistic';
import { cn } from '@/lib/utils';

import {
  getSeverityColor,
  normalizeSeverity,
  severityOrder,
  useSecurityData,
  type SeverityKey,
  type VulnerabilityItem,
} from './useSecurityData';

const SecurityVulnListPanel = () => {
  const { vulns, severityCounts, totalVulns, csrfData, portScanData, threatIntel, screenshotData } =
    useSecurityData();

  const hasAny =
    totalVulns > 0 ||
    (csrfData?.vulnerabilities?.length ?? 0) > 0 ||
    (portScanData?.ports?.filter(p => p.state === 'open').length ?? 0) > 0 ||
    (threatIntel?.attackVectors?.length ?? 0) > 0;

  // 漏洞类型映射
  const getVulnType = (v: VulnerabilityItem): string => {
    const raw = String(v.type ?? v.category ?? v.name ?? v.title ?? '').toLowerCase();
    if (raw.includes('xss') || raw.includes('cross-site scripting')) return '跨站脚本 (XSS)';
    if (raw.includes('sql') || raw.includes('injection')) return '注入';
    if (raw.includes('command') || raw.includes('rce') || raw.includes('exec')) return '命令执行';
    if (raw.includes('traversal') || raw.includes('directory') || raw.includes('path'))
      return '目录穿越';
    if (raw.includes('password') || raw.includes('brute') || raw.includes('weak')) return '弱口令';
    if (raw.includes('auth') || raw.includes('unauthorized') || raw.includes('access'))
      return '权限问题';
    if (
      raw.includes('sensitive') ||
      raw.includes('disclosure') ||
      raw.includes('leak') ||
      raw.includes('info')
    )
      return '敏感信息泄露';
    if (raw.includes('upload') || raw.includes('file')) return '上传漏洞';
    if (raw.includes('csrf') || raw.includes('cross-site request')) return 'CSRF';
    return '其他';
  };

  const getSeverityLabel = (sev: SeverityKey): string => {
    switch (sev) {
      case 'critical':
        return '严重';
      case 'high':
        return '高危';
      case 'medium':
        return '中危';
      case 'low':
        return '低危';
      case 'info':
        return '提示';
    }
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <div className='flex items-center justify-between'>
          <CardTitle className='text-base font-medium'>漏洞列表</CardTitle>
          <div className='flex gap-1.5'>
            {severityOrder.map(
              k =>
                severityCounts[k] > 0 && (
                  <Badge key={k} className={cn('uppercase text-[11px]', getSeverityColor(k))}>
                    {k}: {severityCounts[k]}
                  </Badge>
                )
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {!hasAny && (
          <div className='flex items-center justify-center py-16 text-sm text-muted-foreground'>
            未发现可利用漏洞
          </div>
        )}

        {/* 漏洞列表 */}
        {totalVulns > 0 && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              发现漏洞 ({totalVulns})
            </h4>
            <div className='rounded-md border divide-y'>
              {vulns.map((v, i) => {
                const sev = normalizeSeverity(v.severity ?? v.level ?? v.risk);
                const name = String(v.name ?? v.title ?? v.message ?? '未命名漏洞');
                const desc = String(v.description ?? '');
                const url = String(v.url ?? v.path ?? '');
                const param = String(v.parameter ?? '');
                const evidence = String(v.evidence ?? '');
                const remediation = String(v.remediation ?? '');
                const vulnType = getVulnType(v);

                return (
                  <div key={i} className='p-3 space-y-2'>
                    {/* 第一行：等级 + 名称 + 类型 */}
                    <div className='flex items-start gap-2'>
                      <Badge
                        className={cn(
                          'uppercase mt-0.5 shrink-0 min-w-[48px] justify-center',
                          getSeverityColor(sev)
                        )}
                      >
                        {getSeverityLabel(sev)}
                      </Badge>
                      <span className='font-medium text-sm flex-1'>{name}</span>
                      <Badge variant='outline' className='text-[10px] shrink-0'>
                        {vulnType}
                      </Badge>
                    </div>

                    {/* 漏洞地址 */}
                    {(url || param) && (
                      <div className='ml-[56px] text-xs font-mono text-muted-foreground break-all'>
                        {url && <span>{url}</span>}
                        {param && <span className='ml-2 text-amber-600'>?{param}</span>}
                      </div>
                    )}

                    {/* 描述 */}
                    {desc && desc !== 'undefined' && (
                      <p className='ml-[56px] text-xs text-muted-foreground'>{desc}</p>
                    )}

                    {/* 复现证据 */}
                    {evidence && evidence !== 'undefined' && (
                      <div className='ml-[56px] p-2 rounded bg-muted/50 border'>
                        <p className='text-[11px] font-mono text-muted-foreground break-all'>
                          {evidence}
                        </p>
                      </div>
                    )}

                    {/* 修复方案 */}
                    {remediation && remediation !== 'undefined' && (
                      <div className='ml-[56px] p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'>
                        <p className='text-xs text-green-700 dark:text-green-400'>
                          <strong>修复：</strong>
                          {remediation}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CSRF 漏洞 */}
        {csrfData && (csrfData.vulnerabilities?.length ?? 0) > 0 && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              CSRF 漏洞
            </h4>
            <div className='grid grid-cols-3 gap-3 mb-3'>
              <Statistic title='评分' value={csrfData.score ?? '-'} />
              <Statistic title='表单分析' value={csrfData.details?.formsAnalyzed ?? 0} />
              <Statistic title='缺少 Token' value={csrfData.details?.formsWithoutToken ?? 0} />
            </div>
            <div className='rounded-md border divide-y'>
              {(csrfData.vulnerabilities ?? []).map((v, i) => (
                <div key={i} className='p-3 space-y-1'>
                  <div className='flex items-start gap-2'>
                    <Badge
                      className={cn(
                        'uppercase mt-0.5 shrink-0',
                        getSeverityColor(v.severity || 'medium')
                      )}
                    >
                      {v.severity || 'medium'}
                    </Badge>
                    <span className='flex-1 text-sm'>{v.description}</span>
                  </div>
                  {v.evidence && (
                    <p className='text-xs text-muted-foreground ml-16 font-mono break-all'>
                      {v.evidence}
                    </p>
                  )}
                  {v.remediation && (
                    <div className='ml-16 p-2 rounded bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'>
                      <p className='text-xs text-green-700 dark:text-green-400'>
                        <strong>修复：</strong>
                        {v.remediation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 端口扫描 */}
        {portScanData && (portScanData.ports?.length ?? 0) > 0 && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              端口扫描结果
            </h4>
            <div className='grid grid-cols-3 gap-3 mb-3'>
              <Statistic title='扫描端口' value={portScanData.totalScanned ?? 0} />
              <Statistic title='开放端口' value={portScanData.openPorts ?? 0} />
              <Statistic title='端口评分' value={portScanData.score ?? 0} />
            </div>
            <div className='rounded-md border divide-y'>
              {(portScanData.ports || [])
                .filter(p => p.state === 'open')
                .map((port, _index) => {
                  const riskColor =
                    port.risk === 'critical'
                      ? 'bg-red-600 text-white'
                      : port.risk === 'high'
                        ? 'bg-orange-600 text-white'
                        : port.risk === 'medium'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-green-500 text-white';
                  return (
                    <div key={port.port} className='flex items-center gap-3 p-2 text-sm'>
                      <Badge className='font-mono min-w-[60px] justify-center'>{port.port}</Badge>
                      <span className='font-medium w-[100px] shrink-0'>
                        {port.service || 'unknown'}
                      </span>
                      <Badge className={cn('uppercase', riskColor)}>{port.risk || 'none'}</Badge>
                      {port.latency !== undefined && (
                        <span className='text-xs text-muted-foreground ml-auto'>
                          {port.latency}ms
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
            {portScanData.recommendations && portScanData.recommendations.length > 0 && (
              <div className='mt-2 space-y-1'>
                {portScanData.recommendations.slice(0, 5).map((rec, i) => (
                  <p key={i} className='text-xs text-muted-foreground'>
                    • {rec}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 威胁情报 */}
        {threatIntel && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              威胁情报
            </h4>
            <div className='grid grid-cols-2 gap-3 mb-3'>
              <Statistic
                title='威胁等级'
                value={String(threatIntel.threatLevel || '-').toUpperCase()}
              />
              <Statistic title='攻击向量' value={threatIntel.attackVectors?.length ?? 0} />
            </div>
            {(threatIntel.attackVectors?.length ?? 0) > 0 && (
              <div className='rounded-md border divide-y mb-3'>
                {(threatIntel.attackVectors ?? []).map((av, i) => (
                  <div key={i} className='p-2 text-sm'>
                    <div className='flex items-start gap-2'>
                      <Badge
                        className={cn(
                          'uppercase mt-0.5 shrink-0',
                          getSeverityColor(String(av.risk || 'medium').toLowerCase())
                        )}
                      >
                        {av.risk || 'medium'}
                      </Badge>
                      <div className='flex-1'>
                        <span className='font-medium'>{av.type}</span>
                        {av.description && (
                          <p className='text-xs text-muted-foreground mt-0.5'>{av.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(threatIntel.mitigationStrategies?.length ?? 0) > 0 && (
              <div className='mb-3'>
                <div className='font-medium text-sm mb-1.5'>缓解策略</div>
                <div className='space-y-1'>
                  {(threatIntel.mitigationStrategies ?? []).map((s, i) => (
                    <p key={i} className='text-xs text-muted-foreground'>
                      • {s}
                    </p>
                  ))}
                </div>
              </div>
            )}
            {(threatIntel.industryTrends?.length ?? 0) > 0 && (
              <div>
                <div className='font-medium text-sm mb-1.5'>行业趋势</div>
                <div className='space-y-1'>
                  {(threatIntel.industryTrends ?? []).map((t, i) => (
                    <p key={i} className='text-xs text-muted-foreground'>
                      • {t}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 页面截图 */}
        {screenshotData?.data && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              页面截图
            </h4>
            {screenshotData.pageTitle && (
              <p className='text-xs text-muted-foreground mb-2 truncate'>
                {screenshotData.pageTitle}
              </p>
            )}
            <ImageLightbox
              src={`data:image/${screenshotData.format || 'png'};base64,${screenshotData.data}`}
              alt={screenshotData.pageTitle || 'Page screenshot'}
              thumbnailClassName='w-full h-auto rounded-md border'
            />
            <div className='flex gap-4 mt-2 text-xs text-muted-foreground'>
              {screenshotData.width && screenshotData.height && (
                <span>
                  {screenshotData.width}×{screenshotData.height}
                </span>
              )}
              {screenshotData.finalUrl && (
                <span className='truncate'>{screenshotData.finalUrl}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityVulnListPanel;
