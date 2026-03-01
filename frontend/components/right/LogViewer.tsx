import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import {
  type LogEntry,
  useTestConfig,
  useTestHistory,
  useTestLogs,
  useTestWorkspace,
} from '../../context/TestContext';
import { getTestLogs } from '../../services/testApi';
import { gradeColor as _gradeColor, scoreColor as _scoreColor } from '../../utils/colors';
import { isDesktop as checkIsDesktop } from '../../utils/environment';

/* ─── 常量 ─── */
const LEVEL_OPTIONS = ['info', 'warn', 'error'] as const;
type LevelKey = (typeof LEVEL_OPTIONS)[number];

const LEVEL_META: Record<
  LevelKey,
  { icon: string; label: string; color: string; bg: string; border: string }
> = {
  info: {
    icon: 'ℹ',
    label: 'INFO',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
  },
  warn: {
    icon: '⚠',
    label: 'WARN',
    color: 'text-orange-600 dark:text-orange-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
  },
  error: {
    icon: '✕',
    label: 'ERROR',
    color: 'text-red-600 dark:text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
  },
};

/* ─── 工具函数 ─── */
const fmtTime = (raw?: string) => {
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  const hms = d.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hms}.${ms}`;
};

const shortId = (id?: string) => (id ? id.slice(0, 8) : '');

const isSuccessLog = (log: LogEntry) =>
  log.level === 'info' && /测试完成|completed/i.test(log.message);

const scoreColor = (score: unknown): string => {
  if (typeof score !== 'number') return '';
  return _scoreColor(score);
};

const gradeColor = (grade: unknown): string => {
  if (typeof grade !== 'string') return '';
  return _gradeColor(grade);
};

const errorCountColor = (count: unknown): string => {
  if (typeof count !== 'number') return '';
  return count > 0
    ? 'text-red-600 dark:text-red-400 font-semibold'
    : 'text-green-600 dark:text-green-400';
};

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    /* noop */
  }
};

/* ─── 搜索语法解析 ─── */
interface ParsedSearch {
  levelFilter?: string;
  taskIdFilter?: string;
  freeText: string;
}

const parseSearchQuery = (raw: string): ParsedSearch => {
  let text = raw;
  let levelFilter: string | undefined;
  let taskIdFilter: string | undefined;

  const levelMatch = text.match(/level:(\w+)/i);
  if (levelMatch) {
    levelFilter = levelMatch[1].toLowerCase();
    text = text.replace(levelMatch[0], '');
  }

  const taskMatch = text.match(/taskId:([\w-]+)/i);
  if (taskMatch) {
    taskIdFilter = taskMatch[1].toLowerCase();
    text = text.replace(taskMatch[0], '');
  }

  return { levelFilter, taskIdFilter, freeText: text.trim().toLowerCase() };
};

/* ─── 关键词高亮 ─── */
const HighlightText = ({ text, highlight }: { text: string; highlight: string }) => {
  if (!highlight) return <>{text}</>;
  const parts = text.split(
    new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  );
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={i} className='bg-yellow-300/60 dark:bg-yellow-500/30 rounded-sm px-0.5'>
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

/* ─── 可折叠 JSON 详情（增强指标高亮） ─── */
const contextKeyColor = (k: string, v: unknown): string => {
  if (k === 'score') return scoreColor(v);
  if (k === 'grade') return gradeColor(v);
  if (k === 'errorCount' || k === 'errorTotal') return errorCountColor(v);
  if (k === 'warningCount' || k === 'warningTotal')
    return typeof v === 'number' && v > 0 ? 'text-orange-600 dark:text-orange-400' : '';
  if (k === 'errorMessage' || k === 'failureMessage') return 'text-red-500';
  if (k === 'stack') return 'text-red-400/80 text-[9px]';
  if (k === 'executionTime') return 'text-muted-foreground';
  return '';
};

const ContextDetail = ({
  ctx,
  highlight,
}: {
  ctx: Record<string, unknown>;
  highlight?: string;
}) => {
  const [expanded, setExpanded] = useState(false);
  const entries = Object.entries(ctx).filter(([, v]) => v !== undefined && v !== null && v !== '');
  if (entries.length === 0) return null;

  const preview = entries.slice(0, 3);
  const hasMore = entries.length > 3;

  return (
    <div className='mt-1'>
      <div className='flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] leading-4'>
        {(expanded ? entries : preview).map(([k, v]) => (
          <span key={k}>
            <span className='text-muted-foreground/60'>{k}:</span>{' '}
            <span className={cn('font-medium', contextKeyColor(k, v))}>
              {typeof v === 'object' ? (
                JSON.stringify(v, null, expanded ? 2 : undefined)
              ) : highlight ? (
                <HighlightText text={String(v)} highlight={highlight} />
              ) : (
                String(v)
              )}
            </span>
          </span>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(p => !p)}
          className='text-[10px] text-blue-500 hover:underline mt-0.5'
        >
          {expanded ? '收起' : `展开全部 (${entries.length} 项)`}
        </button>
      )}
      {expanded && (
        <pre className='mt-1 p-2 rounded bg-muted/50 text-[10px] leading-4 overflow-x-auto max-h-40 border'>
          {JSON.stringify(ctx, null, 2)}
        </pre>
      )}
    </div>
  );
};

/* ─── 可复制文本 ─── */
const Copyable = ({
  text,
  display,
  className,
}: {
  text: string;
  display?: string;
  className?: string;
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className={cn('hover:underline cursor-pointer', className)}
            onClick={async () => {
              await copyToClipboard(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {display ?? text}
          </button>
        </TooltipTrigger>
        <TooltipContent side='top' className='text-xs'>
          {copied ? '已复制!' : '点击复制'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/* ─── 单条日志行 ─── */
const LogRow = ({
  log,
  index,
  highlight,
  onFilterByTask,
}: {
  log: LogEntry;
  index: number;
  highlight?: string;
  onFilterByTask?: (taskId: string) => void;
}) => {
  const timeStr = fmtTime(log.timestamp);
  const ctx = log.context;
  const taskId = typeof ctx?.testId === 'string' ? ctx.testId : null;
  const progress = typeof ctx?.progress === 'number' ? ctx.progress : null;
  const meta = LEVEL_META[log.level] ?? LEVEL_META.info;
  const success = isSuccessLog(log);

  return (
    <div
      className={cn(
        'grid grid-cols-[90px_56px_1fr] md:grid-cols-[90px_64px_56px_1fr] gap-1 px-2 py-1.5 text-xs font-mono border-b border-transparent hover:bg-muted/40 transition-colors items-start',
        index % 2 === 1 && 'bg-muted/10',
        log.level === 'error' && 'bg-red-500/5'
      )}
    >
      {/* 时间戳 */}
      <span className='text-muted-foreground tabular-nums shrink-0 leading-5'>
        {timeStr ?? '--:--:--'}
      </span>

      {/* 任务 ID — 小屏隐藏 */}
      <span className='shrink-0 leading-5 hidden md:flex items-center gap-0.5'>
        {taskId ? (
          <>
            <Copyable
              text={taskId}
              display={shortId(taskId)}
              className='text-muted-foreground hover:text-foreground font-mono text-[10px]'
            />
            {onFilterByTask && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className='text-muted-foreground/50 hover:text-blue-500 transition-colors'
                      onClick={() => onFilterByTask(taskId)}
                    >
                      <svg
                        width='10'
                        height='10'
                        viewBox='0 0 16 16'
                        fill='none'
                        stroke='currentColor'
                        strokeWidth='2'
                      >
                        <path d='M1 2h14M3 6h10M5 10h6M7 14h2' />
                      </svg>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='top' className='text-xs'>
                    筛选此任务
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </>
        ) : (
          <span className='text-muted-foreground/40 text-[10px]'>--------</span>
        )}
      </span>

      {/* 级别 */}
      <span className='shrink-0 leading-5'>
        <Badge
          variant='outline'
          className={cn(
            'text-[9px] px-1 py-0 h-[18px] font-semibold border',
            meta.color,
            meta.bg,
            meta.border,
            success && 'text-green-600 dark:text-green-400 bg-green-500/10 border-green-500/20'
          )}
        >
          <span className='mr-0.5'>{success ? '✓' : meta.icon}</span>
          {success ? 'OK' : meta.label}
        </Badge>
      </span>

      {/* 核心事件 + 详情 */}
      <div className='min-w-0'>
        <div className='flex items-center gap-1.5 leading-5'>
          {progress !== null && (
            <span className='text-[10px] text-blue-500 tabular-nums font-semibold shrink-0'>
              {Math.round(progress)}%
            </span>
          )}
          <span
            className={cn(
              'break-all',
              log.level === 'error' && 'text-red-600 dark:text-red-400 font-medium',
              success && 'text-green-700 dark:text-green-400 font-medium'
            )}
          >
            {highlight ? <HighlightText text={log.message} highlight={highlight} /> : log.message}
          </span>
        </div>
        {ctx && <ContextDetail ctx={ctx} highlight={highlight} />}
      </div>
    </div>
  );
};

/* ─── 任务分组视图 ─── */
const GroupedView = ({
  logs,
  highlight,
  onFilterByTask,
}: {
  logs: LogEntry[];
  highlight?: string;
  onFilterByTask?: (taskId: string) => void;
}) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    const map = new Map<string, LogEntry[]>();
    const noId: LogEntry[] = [];
    for (const log of logs) {
      const tid = typeof log.context?.testId === 'string' ? log.context.testId : null;
      if (tid) {
        const arr = map.get(tid) ?? [];
        arr.push(log);
        map.set(tid, arr);
      } else {
        noId.push(log);
      }
    }
    const result: { id: string; label: string; logs: LogEntry[] }[] = [];
    for (const [tid, items] of map) {
      const last = items[items.length - 1];
      const hasError = items.some(l => l.level === 'error');
      const done = items.some(l => isSuccessLog(l));
      const score = typeof last?.context?.score === 'number' ? last.context.score : null;
      let label = shortId(tid);
      if (done && score !== null) label += ` · 得分 ${score}`;
      else if (hasError) label += ' · 有错误';
      else label += ` · ${items.length} 条`;
      result.push({ id: tid, label, logs: items });
    }
    if (noId.length > 0) {
      result.push({ id: '__no_id__', label: `无任务ID · ${noId.length} 条`, logs: noId });
    }
    return result;
  }, [logs]);

  if (groups.length <= 1) {
    return (
      <>
        {logs.map((log, i) => (
          <LogRow
            key={i}
            log={log}
            index={i}
            highlight={highlight}
            onFilterByTask={onFilterByTask}
          />
        ))}
      </>
    );
  }

  return (
    <>
      {groups.map(group => {
        const isCollapsed = collapsed[group.id] ?? false;
        const hasError = group.logs.some(l => l.level === 'error');
        return (
          <div key={group.id} className='border-b'>
            <button
              className={cn(
                'w-full flex items-center gap-2 px-2 py-1.5 text-xs font-mono hover:bg-muted/40 transition-colors',
                hasError && 'bg-red-500/5'
              )}
              onClick={() => setCollapsed(p => ({ ...p, [group.id]: !isCollapsed }))}
            >
              <span className='text-muted-foreground shrink-0'>{isCollapsed ? '▶' : '▼'}</span>
              <Copyable
                text={group.id === '__no_id__' ? '' : group.id}
                display={shortId(group.id === '__no_id__' ? '' : group.id) || '----'}
                className='text-muted-foreground text-[10px]'
              />
              <span className='text-muted-foreground'>·</span>
              <span className={cn('truncate', hasError && 'text-red-500')}>{group.label}</span>
              <Badge variant='secondary' className='ml-auto text-[9px] h-4 px-1'>
                {group.logs.length}
              </Badge>
            </button>
            {!isCollapsed &&
              group.logs.map((log, i) => (
                <LogRow
                  key={i}
                  log={log}
                  index={i}
                  highlight={highlight}
                  onFilterByTask={onFilterByTask}
                />
              ))}
          </div>
        );
      })}
    </>
  );
};

/* ─── 日志摘要区 ─── */
const LogSummary = ({ logs }: { logs: LogEntry[] }) => {
  const [expanded, setExpanded] = useState(true);

  const summary = useMemo(() => {
    if (logs.length === 0) return null;

    const counts: Record<LevelKey, number> = { info: 0, warn: 0, error: 0 };
    for (const log of logs) {
      if (log.level in counts) counts[log.level as LevelKey]++;
    }

    // 耗时：第一条到最后一条的时间差
    const timestamps = logs
      .map(l => (l.timestamp ? new Date(l.timestamp).getTime() : NaN))
      .filter(t => !isNaN(t));
    const duration =
      timestamps.length >= 2
        ? Math.round((Math.max(...timestamps) - Math.min(...timestamps)) / 1000)
        : null;

    // 问题列表：warn + error
    const issues = logs.filter(l => l.level === 'warn' || l.level === 'error');

    // 关键时间线：提取关键节点
    const milestones: { time: string; message: string; level: LevelKey }[] = [];
    const milestonePatterns = [
      /初始化|initialize/i,
      /配置|config/i,
      /开始.*测试|start.*test/i,
      /迭代|iteration/i,
      /资源分析|resource.*analy/i,
      /生成.*报告|generat.*report/i,
      /测试完成|completed|finished/i,
      /失败|failed|error/i,
      /跳过|skip/i,
    ];
    for (const log of logs) {
      if (milestonePatterns.some(p => p.test(log.message))) {
        const time = fmtTime(log.timestamp);
        if (time) {
          // 去重：同一秒内同一 pattern 只保留一条
          const last = milestones[milestones.length - 1];
          if (!last || last.time !== time || last.message !== log.message) {
            milestones.push({ time, message: log.message, level: log.level as LevelKey });
          }
        }
      }
    }

    return { counts, duration, issues, milestones, total: logs.length };
  }, [logs]);

  if (!summary || summary.total === 0) return null;

  const { counts, duration, issues, milestones, total } = summary;
  const errorPct = total > 0 ? Math.round((counts.error / total) * 100) : 0;
  const warnPct = total > 0 ? Math.round((counts.warn / total) * 100) : 0;
  const infoPct = 100 - errorPct - warnPct;

  return (
    <div className='border-b'>
      <button
        className='w-full flex items-center gap-2 px-3 py-1.5 text-[11px] hover:bg-muted/40 transition-colors'
        onClick={() => setExpanded(p => !p)}
      >
        <span className='text-muted-foreground'>{expanded ? '▼' : '▶'}</span>
        <span className='font-medium'>执行摘要</span>
        <span className='text-muted-foreground'>·</span>
        <span className='text-muted-foreground tabular-nums'>{total} 条日志</span>
        {duration !== null && (
          <>
            <span className='text-muted-foreground'>·</span>
            <span className='text-muted-foreground tabular-nums'>{duration}s</span>
          </>
        )}
        {counts.error > 0 && (
          <Badge variant='destructive' className='text-[9px] h-4 px-1 ml-auto'>
            {counts.error} 错误
          </Badge>
        )}
        {counts.warn > 0 && (
          <Badge variant='secondary' className='text-[9px] h-4 px-1 text-orange-600 bg-orange-50'>
            {counts.warn} 警告
          </Badge>
        )}
      </button>

      {expanded && (
        <div className='px-3 pb-2 space-y-2'>
          {/* 级别占比条 */}
          <div className='space-y-1'>
            <div className='flex items-center gap-2 text-[10px] text-muted-foreground'>
              <span>级别分布</span>
              <span className='ml-auto tabular-nums'>
                <span className='text-blue-600'>INFO {counts.info}</span>
                {' · '}
                <span className='text-orange-600'>WARN {counts.warn}</span>
                {' · '}
                <span className='text-red-600'>ERROR {counts.error}</span>
              </span>
            </div>
            <div className='h-1.5 rounded-full overflow-hidden flex bg-muted'>
              {infoPct > 0 && (
                <div className='bg-blue-500 h-full' style={{ width: `${infoPct}%` }} />
              )}
              {warnPct > 0 && (
                <div className='bg-orange-500 h-full' style={{ width: `${warnPct}%` }} />
              )}
              {errorPct > 0 && (
                <div className='bg-red-500 h-full' style={{ width: `${errorPct}%` }} />
              )}
            </div>
          </div>

          {/* 问题置顶 */}
          {issues.length > 0 && (
            <div className='space-y-1'>
              <div className='text-[10px] text-muted-foreground font-medium'>
                问题 ({issues.length})
              </div>
              <div className='max-h-[100px] overflow-y-auto space-y-0.5'>
                {issues.slice(0, 10).map((issue, i) => {
                  const meta = LEVEL_META[issue.level] ?? LEVEL_META.info;
                  return (
                    <div
                      key={i}
                      className={cn(
                        'flex items-start gap-1.5 text-[10px] px-2 py-1 rounded',
                        meta.bg
                      )}
                    >
                      <span className={cn('shrink-0 font-semibold', meta.color)}>{meta.icon}</span>
                      <span className={cn('break-all', meta.color)}>{issue.message}</span>
                      {issue.timestamp && (
                        <span className='ml-auto shrink-0 text-muted-foreground tabular-nums'>
                          {fmtTime(issue.timestamp)}
                        </span>
                      )}
                    </div>
                  );
                })}
                {issues.length > 10 && (
                  <div className='text-[10px] text-muted-foreground px-2'>
                    还有 {issues.length - 10} 条...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 关键时间线 */}
          {milestones.length > 0 && (
            <div className='space-y-1'>
              <div className='text-[10px] text-muted-foreground font-medium'>关键节点</div>
              <div className='relative pl-3'>
                <div className='absolute left-[5px] top-1 bottom-1 w-px bg-border' />
                {milestones.slice(0, 8).map((m, i) => {
                  const meta = LEVEL_META[m.level] ?? LEVEL_META.info;
                  return (
                    <div key={i} className='flex items-start gap-2 text-[10px] py-0.5 relative'>
                      <span
                        className={cn(
                          'absolute left-[-8px] top-[5px] h-2 w-2 rounded-full border-2 bg-background',
                          m.level === 'error'
                            ? 'border-red-500'
                            : m.level === 'warn'
                              ? 'border-orange-500'
                              : 'border-blue-500'
                        )}
                      />
                      <span className='text-muted-foreground tabular-nums shrink-0'>{m.time}</span>
                      <span className={cn('break-all', m.level !== 'info' && meta.color)}>
                        {m.message}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─── 主组件 ─── */
const LogViewer = () => {
  const isDesktop = checkIsDesktop();
  const { id } = useParams();
  const { activeTestId } = useTestConfig();
  const { selectedHistoryId } = useTestHistory();
  const resolvedTestId = id || selectedHistoryId || activeTestId || '';
  const { logs, logStatus, logTestId, updateLogs } = useTestLogs();
  const { workspaceId } = useTestWorkspace();
  const { t } = useTranslation();

  const [enabledLevels, setEnabledLevels] = useState<Set<LevelKey>>(
    new Set(['info', 'warn', 'error'])
  );
  const [searchText, setSearchText] = useState('');
  const [groupByTask, setGroupByTask] = useState(false);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [followLatest, setFollowLatest] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleFilterByTask = useCallback((taskId: string) => {
    setSearchText(`taskId:${taskId.slice(0, 8)}`);
  }, []);

  const toggleLevel = (lvl: LevelKey) => {
    setEnabledLevels(prev => {
      const next = new Set(prev);
      if (next.has(lvl)) next.delete(lvl);
      else next.add(lvl);
      return next;
    });
  };

  const parsedSearch = useMemo(() => parseSearchQuery(searchText), [searchText]);

  const filteredLogs = useMemo(() => {
    let result = logs.filter(log => enabledLevels.has(log.level));

    // 结构化搜索：level:xxx
    if (parsedSearch.levelFilter) {
      result = result.filter(log => log.level === parsedSearch.levelFilter);
    }

    // 结构化搜索：taskId:xxx
    if (parsedSearch.taskIdFilter) {
      const tid = parsedSearch.taskIdFilter;
      result = result.filter(
        log =>
          typeof log.context?.testId === 'string' && log.context.testId.toLowerCase().includes(tid)
      );
    }

    // 自由文本搜索
    if (parsedSearch.freeText) {
      const q = parsedSearch.freeText;
      result = result.filter(
        log =>
          log.message.toLowerCase().includes(q) ||
          (typeof log.context?.testId === 'string' && log.context.testId.toLowerCase().includes(q))
      );
    }

    return result;
  }, [enabledLevels, logs, parsedSearch]);

  const levelCounts = useMemo(() => {
    const counts: Record<LevelKey, number> = { info: 0, warn: 0, error: 0 };
    for (const log of logs) {
      if (log.level in counts) counts[log.level as LevelKey]++;
    }
    return counts;
  }, [logs]);

  const fetchLogs = useCallback(
    async (nextOffset: number) => {
      if (isDesktop || !resolvedTestId) return;
      setLoading(true);
      try {
        const data = await getTestLogs(resolvedTestId, {
          workspaceId: workspaceId || undefined,
          limit: 100,
          offset: nextOffset,
        });
        const logItems = Array.isArray(data.logs) ? data.logs : [];
        updateLogs(
          logItems.map(raw => {
            const log = raw as Record<string, unknown>;
            return {
              level: (log.level as 'info' | 'warn' | 'error') || 'info',
              message: String(log.message || ''),
              timestamp: log.createdAt ? String(log.createdAt) : undefined,
              context:
                log.context && typeof log.context === 'object' && !Array.isArray(log.context)
                  ? (log.context as Record<string, unknown>)
                  : undefined,
            };
          }),
          resolvedTestId
        );
        setOffset(nextOffset);
        setLastRefreshTime(new Date());
      } catch {
        // 测试不存在或无权访问时静默忽略
      } finally {
        setLoading(false);
      }
    },
    [isDesktop, resolvedTestId, updateLogs, workspaceId]
  );

  // 仅在用户手动翻页或手动刷新时使用 fetchLogs
  // 初始加载和实时推送由 TestProvider 统一管理

  useEffect(() => {
    // live 状态下日志由 TestProvider.refreshTest 统一拉取，无需重复轮询
    if (isDesktop || !autoRefresh || logStatus === 'live') return;
    const timer = setInterval(() => {
      void fetchLogs(followLatest ? 0 : offset);
    }, 10000);
    return () => clearInterval(timer);
  }, [autoRefresh, fetchLogs, followLatest, isDesktop, logStatus, offset]);

  const handleExport = useCallback(() => {
    const data = filteredLogs.map(log => ({
      timestamp: log.timestamp ?? '',
      level: log.level,
      message: log.message,
      testId: typeof log.context?.testId === 'string' ? log.context.testId : '',
      context: log.context ?? {},
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${resolvedTestId ? shortId(resolvedTestId) : 'all'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredLogs, resolvedTestId]);

  return (
    <Card className='h-full flex flex-col'>
      {/* ─── 头部 ─── */}
      <CardHeader className='py-2 px-3 border-b space-y-0'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <CardTitle className='text-sm font-medium'>{t('logs.title')}</CardTitle>
            {resolvedTestId && (
              <Copyable
                text={resolvedTestId}
                display={shortId(resolvedTestId)}
                className='text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded'
              />
            )}
            <Badge variant='secondary' className='text-[9px] h-4 px-1 tabular-nums'>
              {filteredLogs.length}/{logs.length}
            </Badge>
          </div>
          <div className='flex items-center gap-3 text-xs'>
            <label className='flex items-center gap-1 cursor-pointer'>
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
                disabled={isDesktop}
                className='scale-75'
              />
              <span className='text-muted-foreground'>{t('logs.autoRefresh')}</span>
            </label>
            <label className='flex items-center gap-1 cursor-pointer'>
              <Switch
                checked={followLatest}
                disabled={isDesktop}
                onCheckedChange={checked => {
                  setFollowLatest(checked);
                  if (checked && !isDesktop) void fetchLogs(0);
                }}
                className='scale-75'
              />
              <span className='text-muted-foreground'>{t('logs.latest')}</span>
            </label>
          </div>
        </div>
      </CardHeader>

      {/* ─── 筛选栏 ─── */}
      <div className='px-3 py-1.5 border-b bg-muted/20 flex items-center gap-2 flex-wrap'>
        {/* 级别复选 */}
        {LEVEL_OPTIONS.map(lvl => {
          const meta = LEVEL_META[lvl];
          const checked = enabledLevels.has(lvl);
          return (
            <label
              key={lvl}
              className={cn(
                'flex items-center gap-1 text-[11px] cursor-pointer select-none rounded px-1.5 py-0.5 border transition-colors',
                checked
                  ? `${meta.bg} ${meta.border} ${meta.color}`
                  : 'border-transparent text-muted-foreground opacity-50'
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => toggleLevel(lvl)}
                className='h-3 w-3'
              />
              <span>{meta.icon}</span>
              <span className='font-medium'>{meta.label}</span>
              <span className='tabular-nums'>({levelCounts[lvl]})</span>
            </label>
          );
        })}

        <div className='w-px h-4 bg-border mx-1' />

        {/* 搜索框 */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className='relative'>
                <Input
                  placeholder={t('logs.search', '搜索日志...')}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className='h-6 text-[11px] w-40 px-2 py-0 pr-6'
                />
                {searchText && (
                  <button
                    className='absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-foreground text-[10px]'
                    onClick={() => setSearchText('')}
                  >
                    ✕
                  </button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side='bottom' className='text-[10px] max-w-[220px]'>
              支持语法: level:error taskId:739f428b 关键词
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* 分组开关 */}
        <label className='flex items-center gap-1 text-[11px] cursor-pointer ml-auto'>
          <Checkbox
            checked={groupByTask}
            onCheckedChange={v => setGroupByTask(v === true)}
            className='h-3 w-3'
          />
          <span className='text-muted-foreground'>按任务分组</span>
        </label>

        {/* 导出 */}
        <Button
          variant='ghost'
          size='sm'
          onClick={handleExport}
          disabled={filteredLogs.length === 0}
          className='h-6 text-[10px] px-2'
        >
          导出
        </Button>
      </div>

      {/* ─── 状态提示条 ─── */}
      {logStatus === 'live' && (
        <div className='px-3 py-0.5 text-[10px] border-b flex items-center gap-1.5 bg-blue-500/5 text-blue-600 dark:text-blue-400'>
          <span className='inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse' />
          测试运行中 · 日志实时更新
          {logTestId && (
            <span className='ml-auto text-muted-foreground tabular-nums font-mono'>
              {shortId(logTestId)}
            </span>
          )}
        </div>
      )}
      {logStatus === 'loading' && (
        <div className='px-3 py-0.5 text-[10px] border-b flex items-center gap-1.5 bg-muted/30 text-muted-foreground'>
          <span className='animate-spin'>⟳</span>
          加载日志中...
        </div>
      )}
      {logStatus === 'done' && logs.length > 0 && (
        <div className='px-3 py-0.5 text-[10px] border-b flex items-center gap-1.5 bg-green-500/5 text-green-600 dark:text-green-400'>
          <span>✓</span>
          测试完成 · 共 {logs.length} 条日志
          {logTestId && (
            <span className='ml-auto text-muted-foreground tabular-nums font-mono'>
              {shortId(logTestId)}
            </span>
          )}
        </div>
      )}
      {autoRefresh && lastRefreshTime && logStatus !== 'live' && (
        <div className='px-3 py-0.5 text-[10px] text-muted-foreground bg-blue-500/5 border-b flex items-center gap-1.5'>
          <span className='inline-block h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse' />
          日志自动刷新中 · 最后更新于{' '}
          <span className='tabular-nums font-medium'>
            {lastRefreshTime.toLocaleTimeString('zh-CN', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </span>
        </div>
      )}

      {/* ─── 执行摘要 ─── */}
      {logs.length > 0 && <LogSummary logs={logs} />}

      {/* ─── 表头 ─── */}
      <div className='grid grid-cols-[90px_56px_1fr] md:grid-cols-[90px_64px_56px_1fr] gap-1 px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b bg-muted/30'>
        <span>时间</span>
        <span className='hidden md:block'>任务ID</span>
        <span>级别</span>
        <span>事件 / 详情</span>
      </div>

      {/* ─── 日志列表 ─── */}
      <div ref={scrollRef} className='flex-1 overflow-auto'>
        {filteredLogs.length === 0 ? (
          <div className='text-center text-muted-foreground py-12 text-sm'>
            {logStatus === 'loading'
              ? '正在加载日志...'
              : logStatus === 'live'
                ? '等待日志输出...'
                : logs.length === 0
                  ? '暂无测试日志'
                  : t('common.noData')}
          </div>
        ) : groupByTask ? (
          <GroupedView
            logs={filteredLogs}
            highlight={parsedSearch.freeText}
            onFilterByTask={handleFilterByTask}
          />
        ) : (
          filteredLogs.map((log, i) => (
            <LogRow
              key={i}
              log={log}
              index={i}
              highlight={parsedSearch.freeText}
              onFilterByTask={handleFilterByTask}
            />
          ))
        )}
      </div>

      {/* ─── 底部分页 ─── */}
      <div className='px-3 py-1.5 border-t flex items-center justify-between gap-2 bg-muted/10'>
        <Button
          variant='outline'
          size='sm'
          onClick={() => void fetchLogs(Math.max(0, offset - 100))}
          disabled={isDesktop || loading || offset === 0 || followLatest}
          className='h-7 text-[11px]'
        >
          {t('logs.prev')}
        </Button>
        <span className='text-[11px] text-muted-foreground tabular-nums'>
          {isDesktop
            ? t('logs.desktopMode')
            : offset > 0
              ? `${offset + 1} - ${offset + 100}`
              : t('logs.latest')}
        </span>
        <div className='flex gap-1.5'>
          <Button
            variant='outline'
            size='sm'
            onClick={() => void fetchLogs(offset + 100)}
            disabled={isDesktop || followLatest}
            className='h-7 text-[11px]'
          >
            {loading ? <span className='animate-spin mr-1'>⟳</span> : null}
            {t('logs.next')}
          </Button>
          <Button
            variant='secondary'
            size='sm'
            onClick={() => void fetchLogs(0)}
            disabled={isDesktop || loading}
            className='h-7 text-[11px]'
          >
            {t('logs.backLatest')}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default LogViewer;
