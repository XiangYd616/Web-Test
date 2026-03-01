/**
 * 安全测试 — 合规检查标签页
 * 安全头(7项) + Cookie(4项) + SSL/TLS(3项) + 其他(CORS/内容安全/HTTP方法)
 * 每条含：名称 / 状态 / 当前值 / 标准要求 / 修复建议
 */
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

import { getSeverityColor, useSecurityData } from './useSecurityData';

// 安全头配置模板
const headerConfigTemplates: Record<
  string,
  { nginx: string; apache: string; description: string; standard: string }
> = {
  'Content-Security-Policy': {
    nginx:
      "add_header Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';\" always;",
    apache:
      "Header always set Content-Security-Policy \"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';\"",
    description: '防止 XSS 攻击和代码注入，限制页面可加载的资源来源',
    standard: "应配置 default-src 'self' 并限制各资源来源",
  },
  'Strict-Transport-Security': {
    nginx:
      'add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;',
    apache:
      'Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"',
    description: '强制 HTTPS 连接，防止 SSL 剥离和中间人攻击',
    standard: 'max-age >= 31536000，建议包含 includeSubDomains 和 preload',
  },
  'X-Frame-Options': {
    nginx: 'add_header X-Frame-Options "DENY" always;',
    apache: 'Header always set X-Frame-Options "DENY"',
    description: '防止页面被嵌入 iframe，阻止点击劫持攻击',
    standard: '应设置为 DENY 或 SAMEORIGIN',
  },
  'X-Content-Type-Options': {
    nginx: 'add_header X-Content-Type-Options "nosniff" always;',
    apache: 'Header always set X-Content-Type-Options "nosniff"',
    description: '防止浏览器 MIME 类型嗅探',
    standard: '应设置为 nosniff',
  },
  'X-XSS-Protection': {
    nginx: 'add_header X-XSS-Protection "1; mode=block" always;',
    apache: 'Header always set X-XSS-Protection "1; mode=block"',
    description: '启用浏览器内置 XSS 过滤器（已被 CSP 取代，但仍建议设置）',
    standard: '应设置为 1; mode=block',
  },
  'Referrer-Policy': {
    nginx: 'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
    apache: 'Header always set Referrer-Policy "strict-origin-when-cross-origin"',
    description: '控制 Referer 头信息泄露，防止敏感 URL 路径暴露',
    standard: '建议 strict-origin-when-cross-origin 或 no-referrer',
  },
  'Permissions-Policy': {
    nginx:
      'add_header Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=()" always;',
    apache:
      'Header always set Permissions-Policy "geolocation=(), camera=(), microphone=(), payment=()"',
    description: '限制浏览器功能权限（地理位置、摄像头、麦克风等）',
    standard: '应禁用不需要的浏览器 API 权限',
  },
};

const headerScoreBg = (score: number) => {
  if (score >= 90) return 'bg-green-500 text-white';
  if (score >= 60) return 'bg-yellow-500 text-white';
  if (score > 0) return 'bg-orange-500 text-white';
  return 'bg-red-500 text-white';
};

const SecurityCompliancePanel = () => {
  const {
    headerChecks,
    headerStats,
    sslData,
    cookieData,
    corsData,
    contentSecurityData,
    recommendations,
    recommendationsTotal,
    copyText,
  } = useSecurityData();

  // 只取前 7 个安全头（用户要求的 7 项）
  const mainHeaders = headerChecks.slice(0, 7);

  // Cookie 合规项
  const cookieComplianceItems = (() => {
    if (!cookieData) return [];
    const total = cookieData.totalCookies ?? 0;
    if (total === 0) return [];
    const d = cookieData.details;
    return [
      {
        name: 'Secure 标志',
        status:
          (d?.secureCookies ?? 0) >= total
            ? 'pass'
            : (d?.secureCookies ?? 0) > 0
              ? 'partial'
              : 'fail',
        current: `${d?.secureCookies ?? 0}/${total} 个 Cookie 已设置`,
        standard: '所有 Cookie 应设置 Secure 标志，仅通过 HTTPS 传输',
        fix: 'Set-Cookie: name=value; Secure',
      },
      {
        name: 'HttpOnly 标志',
        status:
          (d?.httpOnlyCookies ?? 0) >= total
            ? 'pass'
            : (d?.httpOnlyCookies ?? 0) > 0
              ? 'partial'
              : 'fail',
        current: `${d?.httpOnlyCookies ?? 0}/${total} 个 Cookie 已设置`,
        standard: '敏感 Cookie 应设置 HttpOnly，防止 JS 读取',
        fix: 'Set-Cookie: name=value; HttpOnly',
      },
      {
        name: 'SameSite 属性',
        status:
          (d?.sameSiteCookies ?? 0) >= total
            ? 'pass'
            : (d?.sameSiteCookies ?? 0) > 0
              ? 'partial'
              : 'fail',
        current: `${d?.sameSiteCookies ?? 0}/${total} 个 Cookie 已设置`,
        standard: '应设置 SameSite=Lax 或 Strict，防止 CSRF',
        fix: 'Set-Cookie: name=value; SameSite=Lax',
      },
      {
        name: '过期策略',
        status:
          (d?.sessionCookies ?? 0) > 0 && (d?.persistentCookies ?? 0) > 0
            ? 'partial'
            : (d?.persistentCookies ?? 0) === 0
              ? 'pass'
              : 'fail',
        current: `会话: ${d?.sessionCookies ?? 0}, 持久: ${d?.persistentCookies ?? 0}`,
        standard: '敏感 Cookie 应为会话 Cookie 或设置合理过期时间',
        fix: 'Set-Cookie: name=value; Max-Age=3600',
      },
    ];
  })();

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pass':
        return <Badge className='bg-green-500 text-white text-[11px]'>合格</Badge>;
      case 'partial':
        return <Badge className='bg-yellow-500 text-white text-[11px]'>不规范</Badge>;
      case 'fail':
        return <Badge className='bg-red-500 text-white text-[11px]'>不合格</Badge>;
      default:
        return <Badge className='bg-gray-500 text-white text-[11px]'>未知</Badge>;
    }
  };

  // 修复建议 markdown 构建
  const buildRecommendationMarkdown = (
    groupName: string,
    items: Array<{ priority?: unknown; issue?: unknown; action?: unknown; timeframe?: unknown }>
  ) => {
    if (!items.length) return '';
    const lines = [`## ${groupName}`];
    items.forEach(item => {
      const priority = String(item.priority ?? '').toUpperCase();
      const issue = String(item.issue ?? '').trim();
      const action = String(item.action ?? '').trim();
      const timeframe = String(item.timeframe ?? '').trim();
      lines.push(`- ${[priority, issue].filter(Boolean).join(' ')}`);
      if (action) lines.push(`  - action: ${action}`);
      if (timeframe) lines.push(`  - timeframe: ${timeframe}`);
    });
    return lines.join('\n');
  };

  const copyAllRecommendations = async () => {
    if (!recommendations || recommendationsTotal === 0) return;
    const parts = [
      buildRecommendationMarkdown('Immediate（立刻处理）', recommendations.immediate),
      buildRecommendationMarkdown('Short Term（短期）', recommendations.shortTerm),
      buildRecommendationMarkdown('Long Term（长期）', recommendations.longTerm),
      buildRecommendationMarkdown('Preventive（预防性）', recommendations.preventive),
    ].filter(Boolean);
    await copyText(parts.join('\n\n'), '已复制全部修复建议');
  };

  return (
    <Card className='h-full flex flex-col'>
      <CardHeader className='py-3 px-4 border-b'>
        <CardTitle className='text-base font-medium'>合规检查</CardTitle>
      </CardHeader>
      <CardContent className='flex-1 overflow-auto p-4 space-y-6'>
        {/* ═══ 1. 安全响应头 (7项) ═══ */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
              安全响应头
            </h4>
            <div className='flex items-center gap-2 text-xs text-muted-foreground'>
              <span className='font-medium'>
                {headerStats.present}/{headerStats.total} 已配置
              </span>
            </div>
          </div>
          <div className='rounded-md border divide-y'>
            {mainHeaders.map(item => {
              const template = headerConfigTemplates[item.label];
              return (
                <div key={item.key} className='p-3 space-y-2'>
                  {/* 名称 + 状态 */}
                  <div className='flex items-center gap-2'>
                    {statusBadge(item.exists ? 'pass' : 'fail')}
                    <span className='font-medium text-sm flex-1'>{item.label}</span>
                    <Badge
                      className={cn(
                        'text-[11px] min-w-[36px] justify-center',
                        headerScoreBg(item.score)
                      )}
                    >
                      {item.score}
                    </Badge>
                  </div>

                  {/* 当前值 */}
                  <div className='ml-[60px] space-y-1'>
                    <div className='text-xs'>
                      <span className='text-muted-foreground'>当前值：</span>
                      <span className='font-mono break-all'>
                        {item.exists
                          ? item.value.length > 120
                            ? item.value.slice(0, 120) + '...'
                            : item.value || '已设置'
                          : '未配置'}
                      </span>
                    </div>

                    {/* 标准要求 */}
                    {template && (
                      <div className='text-xs'>
                        <span className='text-muted-foreground'>标准要求：</span>
                        <span>{template.standard}</span>
                      </div>
                    )}

                    {/* 问题 */}
                    {item.issues.length > 0 && (
                      <div>
                        {item.issues.map((issue, i) => (
                          <p key={i} className='text-xs text-amber-600 dark:text-amber-400'>
                            ⚠ {issue}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* 修复建议（仅缺失时显示） */}
                    {!item.exists && template && (
                      <div className='mt-1 p-2 rounded bg-muted/50 border'>
                        <p className='text-xs text-muted-foreground mb-1.5'>
                          {template.description}
                        </p>
                        <div className='flex gap-1.5'>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              void copyText(template.nginx, `已复制 ${item.shortLabel} Nginx 配置`)
                            }
                            className='h-6 text-[11px] px-2'
                          >
                            复制 Nginx
                          </Button>
                          <Button
                            size='sm'
                            variant='outline'
                            onClick={() =>
                              void copyText(
                                template.apache,
                                `已复制 ${item.shortLabel} Apache 配置`
                              )
                            }
                            className='h-6 text-[11px] px-2'
                          >
                            复制 Apache
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {headerStats.missing > 0 && (
            <div className='mt-2'>
              <Button
                size='sm'
                variant='outline'
                onClick={() => {
                  const allConfigs = headerChecks
                    .filter(h => !h.exists && headerConfigTemplates[h.label])
                    .map(h => `# ${h.label}\n${headerConfigTemplates[h.label].nginx}`)
                    .join('\n\n');
                  void copyText(allConfigs, `已复制 ${headerStats.missing} 个缺失头的 Nginx 配置`);
                }}
                className='h-7 text-xs w-full'
              >
                一键复制全部缺失头 Nginx 配置
              </Button>
            </div>
          )}
        </div>

        {/* ═══ 2. Cookie 安全配置 (4项) ═══ */}
        {cookieComplianceItems.length > 0 && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              Cookie 安全配置
            </h4>
            <div className='rounded-md border divide-y'>
              {cookieComplianceItems.map((item, i) => (
                <div key={i} className='p-3 space-y-1'>
                  <div className='flex items-center gap-2'>
                    {statusBadge(item.status)}
                    <span className='font-medium text-sm flex-1'>{item.name}</span>
                  </div>
                  <div className='ml-[60px] space-y-1'>
                    <div className='text-xs'>
                      <span className='text-muted-foreground'>检查结果：</span>
                      <span>{item.current}</span>
                    </div>
                    <div className='text-xs'>
                      <span className='text-muted-foreground'>标准要求：</span>
                      <span>{item.standard}</span>
                    </div>
                    {item.status !== 'pass' && (
                      <div className='mt-1 p-2 rounded bg-muted/50 border'>
                        <div className='flex items-center gap-1.5'>
                          <code className='text-[11px] font-mono'>{item.fix}</code>
                          <Button
                            size='sm'
                            variant='ghost'
                            onClick={() => void copyText(item.fix, '已复制配置')}
                            className='h-5 text-[10px] px-1.5'
                          >
                            复制
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ 3. SSL/TLS 合规 (3项) ═══ */}
        {sslData && sslData.enabled && (
          <div>
            <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
              SSL/TLS 合规
            </h4>
            <div className='rounded-md border divide-y'>
              {/* 协议版本 */}
              <div className='p-3 space-y-1'>
                <div className='flex items-center gap-2'>
                  {statusBadge(
                    sslData.version &&
                      (sslData.version.includes('1.2') || sslData.version.includes('1.3'))
                      ? 'pass'
                      : 'fail'
                  )}
                  <span className='font-medium text-sm flex-1'>协议版本</span>
                </div>
                <div className='ml-[60px] space-y-1'>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>当前值：</span>
                    <span className='font-mono'>{sslData.version || '未知'}</span>
                  </div>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>标准要求：</span>
                    <span>TLS 1.2 或更高版本</span>
                  </div>
                </div>
              </div>

              {/* 证书有效期 */}
              <div className='p-3 space-y-1'>
                <div className='flex items-center gap-2'>
                  {statusBadge(sslData.certificate?.valid ? 'pass' : 'fail')}
                  <span className='font-medium text-sm flex-1'>证书有效期</span>
                </div>
                <div className='ml-[60px] space-y-1'>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>当前值：</span>
                    <span>
                      {sslData.certificate?.valid ? '有效' : '无效'}
                      {sslData.certificate?.expires &&
                        ` (到期: ${new Date(sslData.certificate.expires).toLocaleDateString()})`}
                    </span>
                  </div>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>颁发者：</span>
                    <span>{sslData.certificate?.issuer || '未知'}</span>
                  </div>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>标准要求：</span>
                    <span>证书应有效且未过期，建议剩余有效期 &gt; 30 天</span>
                  </div>
                </div>
              </div>

              {/* 加密套件安全性 */}
              <div className='p-3 space-y-1'>
                <div className='flex items-center gap-2'>
                  {statusBadge(
                    (sslData.score ?? 0) >= 80
                      ? 'pass'
                      : (sslData.score ?? 0) >= 60
                        ? 'partial'
                        : 'fail'
                  )}
                  <span className='font-medium text-sm flex-1'>加密套件安全性</span>
                </div>
                <div className='ml-[60px] space-y-1'>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>评分：</span>
                    <span>{sslData.score ?? '-'}/100</span>
                  </div>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>标准要求：</span>
                    <span>禁用弱加密套件（RC4/DES/3DES），优先使用 AEAD 套件</span>
                  </div>
                  {(sslData.issues?.length ?? 0) > 0 && (
                    <div>
                      {(sslData.issues ?? []).map((issue, i) => (
                        <p key={i} className='text-xs text-amber-600 dark:text-amber-400'>
                          ⚠ {issue}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══ 4. 其他合规 ═══ */}
        <div>
          <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3'>
            其他合规
          </h4>
          <div className='rounded-md border divide-y'>
            {/* CORS 配置 */}
            {corsData && (
              <div className='p-3 space-y-2'>
                <div className='flex items-center gap-2'>
                  {statusBadge(
                    (corsData.issues?.length ?? 0) === 0
                      ? 'pass'
                      : (corsData.score ?? 0) >= 80
                        ? 'partial'
                        : 'fail'
                  )}
                  <span className='font-medium text-sm flex-1'>CORS 跨域策略</span>
                  <Badge className={cn('text-[11px]', headerScoreBg(corsData.score ?? 0))}>
                    {corsData.score ?? '-'}
                  </Badge>
                </div>
                <div className='ml-[60px] space-y-1'>
                  {corsData.details && (
                    <div className='flex flex-wrap gap-1.5 mb-1'>
                      <Badge
                        className={cn(
                          'text-[10px]',
                          corsData.details.wildcardOrigin
                            ? 'bg-red-500 text-white'
                            : 'bg-green-500 text-white'
                        )}
                      >
                        通配符: {corsData.details.wildcardOrigin ? 'YES ⚠' : 'NO'}
                      </Badge>
                      <Badge
                        className={cn(
                          'text-[10px]',
                          corsData.details.reflectsOrigin
                            ? 'bg-red-500 text-white'
                            : 'bg-green-500 text-white'
                        )}
                      >
                        反射: {corsData.details.reflectsOrigin ? 'YES ⚠' : 'NO'}
                      </Badge>
                    </div>
                  )}
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>标准要求：</span>
                    <span>不应使用通配符 Origin，不应反射任意 Origin</span>
                  </div>
                  {(corsData.issues?.length ?? 0) > 0 &&
                    (corsData.issues ?? []).slice(0, 3).map((issue, i) => (
                      <p key={i} className='text-xs text-amber-600 dark:text-amber-400'>
                        ⚠ {issue.description}
                      </p>
                    ))}
                </div>
              </div>
            )}

            {/* 服务器版本隐藏 — 从内容安全 HTTP 方法检测推断 */}
            {contentSecurityData?.httpMethods && (
              <div className='p-3 space-y-1'>
                <div className='flex items-center gap-2'>
                  {statusBadge(
                    (contentSecurityData.httpMethods.dangerousMethods?.length ?? 0) === 0
                      ? 'pass'
                      : 'fail'
                  )}
                  <span className='font-medium text-sm flex-1'>HTTP 方法安全</span>
                </div>
                <div className='ml-[60px] space-y-1'>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>当前值：</span>
                    <span>
                      {(contentSecurityData.httpMethods.dangerousMethods?.length ?? 0) === 0
                        ? '无危险方法'
                        : `危险方法: ${(contentSecurityData.httpMethods.dangerousMethods ?? []).join(', ')}`}
                    </span>
                  </div>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>标准要求：</span>
                    <span>应禁用 TRACE/PUT/DELETE 等危险 HTTP 方法</span>
                  </div>
                </div>
              </div>
            )}

            {/* 混合内容 */}
            {contentSecurityData?.mixedContent && contentSecurityData.mixedContent.isHttps && (
              <div className='p-3 space-y-1'>
                <div className='flex items-center gap-2'>
                  {statusBadge(
                    (contentSecurityData.mixedContent.totalMixedContent ?? 0) === 0
                      ? 'pass'
                      : 'fail'
                  )}
                  <span className='font-medium text-sm flex-1'>混合内容检测</span>
                </div>
                <div className='ml-[60px] space-y-1'>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>当前值：</span>
                    <span>
                      {(contentSecurityData.mixedContent.totalMixedContent ?? 0) === 0
                        ? '无混合内容'
                        : `活跃: ${contentSecurityData.mixedContent.activeMixedContent ?? 0}, 被动: ${contentSecurityData.mixedContent.passiveMixedContent ?? 0}`}
                    </span>
                  </div>
                  <div className='text-xs'>
                    <span className='text-muted-foreground'>标准要求：</span>
                    <span>HTTPS 页面不应加载 HTTP 资源</span>
                  </div>
                </div>
              </div>
            )}

            {/* SRI */}
            {contentSecurityData?.sri &&
              (contentSecurityData.sri.totalExternalResources ?? 0) > 0 && (
                <div className='p-3 space-y-1'>
                  <div className='flex items-center gap-2'>
                    {statusBadge(
                      (contentSecurityData.sri.resourcesWithoutSri ?? 0) === 0 ? 'pass' : 'fail'
                    )}
                    <span className='font-medium text-sm flex-1'>子资源完整性 (SRI)</span>
                  </div>
                  <div className='ml-[60px] space-y-1'>
                    <div className='text-xs'>
                      <span className='text-muted-foreground'>当前值：</span>
                      <span>
                        {contentSecurityData.sri.resourcesWithSri ?? 0}/
                        {contentSecurityData.sri.totalExternalResources ?? 0} 个外部资源已配置 SRI
                      </span>
                    </div>
                    <div className='text-xs'>
                      <span className='text-muted-foreground'>标准要求：</span>
                      <span>所有外部 JS/CSS 资源应配置 integrity 属性</span>
                    </div>
                  </div>
                </div>
              )}
          </div>
        </div>

        {/* ═══ 修复建议 ═══ */}
        {recommendations && recommendationsTotal > 0 && (
          <div>
            <div className='flex items-center justify-between mb-3'>
              <h4 className='text-sm font-semibold text-muted-foreground uppercase tracking-wider'>
                修复建议
              </h4>
              <Button
                size='sm'
                variant='outline'
                onClick={() => void copyAllRecommendations()}
                className='h-7 text-xs'
              >
                复制全部
              </Button>
            </div>
            <div className='space-y-4'>
              {(
                [
                  {
                    key: 'immediate',
                    title: 'Immediate（立刻处理）',
                    items: recommendations.immediate,
                  },
                  {
                    key: 'shortTerm',
                    title: 'Short Term（短期）',
                    items: recommendations.shortTerm,
                  },
                  { key: 'longTerm', title: 'Long Term（长期）', items: recommendations.longTerm },
                  {
                    key: 'preventive',
                    title: 'Preventive（预防性）',
                    items: recommendations.preventive,
                  },
                ] as Array<{ key: string; title: string; items: typeof recommendations.immediate }>
              ).map(group =>
                group.items.length ? (
                  <div key={group.key}>
                    <div className='font-medium text-sm mb-2'>{group.title}</div>
                    <div className='rounded-md border divide-y'>
                      {group.items.map((item, idx) => {
                        const priority = String(item.priority ?? '').toLowerCase();
                        const issue = String(item.issue ?? '安全修复建议');
                        const action = String(item.action ?? '');
                        const timeframe = String(item.timeframe ?? '');
                        const md = buildRecommendationMarkdown(group.title, [item]);

                        // 安全头配置模板匹配
                        const headerMatch = issue.match(/缺少安全头部[:：]\s*(.+)/);
                        const matchedHeaderName = headerMatch?.[1]?.trim();
                        const matchedTemplate = matchedHeaderName
                          ? Object.entries(headerConfigTemplates).find(
                              ([k]) =>
                                k.toLowerCase() === matchedHeaderName.toLowerCase() ||
                                matchedHeaderName.includes(k)
                            )?.[1]
                          : undefined;

                        return (
                          <div key={idx} className='p-3'>
                            <div className='flex items-start gap-3 mb-2'>
                              <Badge
                                className={cn(
                                  'uppercase mt-0.5',
                                  priority === 'critical'
                                    ? 'bg-red-600 text-white'
                                    : priority === 'high'
                                      ? 'bg-red-500 text-white'
                                      : priority === 'medium'
                                        ? 'bg-orange-500 text-white'
                                        : priority === 'low'
                                          ? 'bg-yellow-500 text-white'
                                          : getSeverityColor(priority)
                                )}
                              >
                                {priority || 'unknown'}
                              </Badge>
                              <span className='font-medium flex-1 text-sm'>{issue}</span>
                              <Button
                                size='sm'
                                variant='ghost'
                                onClick={() => void copyText(md, '已复制修复建议')}
                                className='h-6 w-10 text-xs p-0'
                              >
                                复制
                              </Button>
                            </div>
                            {action && (
                              <p className='text-sm text-muted-foreground mb-1'>{action}</p>
                            )}
                            {matchedTemplate && (
                              <div className='mt-2 p-2 rounded bg-muted/50 border'>
                                <p className='text-xs text-muted-foreground mb-1.5'>
                                  {matchedTemplate.description}
                                </p>
                                <div className='flex gap-1.5'>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() =>
                                      void copyText(matchedTemplate.nginx, '已复制 Nginx 配置')
                                    }
                                    className='h-6 text-[11px] px-2'
                                  >
                                    复制 Nginx 配置
                                  </Button>
                                  <Button
                                    size='sm'
                                    variant='outline'
                                    onClick={() =>
                                      void copyText(matchedTemplate.apache, '已复制 Apache 配置')
                                    }
                                    className='h-6 text-[11px] px-2'
                                  >
                                    复制 Apache 配置
                                  </Button>
                                </div>
                              </div>
                            )}
                            {timeframe && (
                              <div className='text-xs text-muted-foreground italic mt-1'>
                                建议时限：{timeframe}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SecurityCompliancePanel;
