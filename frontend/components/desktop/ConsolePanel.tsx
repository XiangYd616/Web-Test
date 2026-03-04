/**
 * Postman 风格底部 Console 面板
 *
 * 独立的底部面板，标题栏始终可见，面板体可拖拽调整高度
 * 参考 Postman Console：All Logs 筛选 · Clear · 关闭(×)
 */

import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Info,
  Search,
  Terminal,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  type ConsoleEntry,
  type LogLevel,
  consoleClear,
  getConsoleEntries,
  subscribeConsole,
} from '../../utils/consoleStore';

const useConsoleLogs = () => {
  const [entries, setEntries] = useState<ConsoleEntry[]>(getConsoleEntries);
  useEffect(() => subscribeConsole(() => setEntries([...getConsoleEntries()])), []);
  return entries;
};

const LEVEL_CONFIG: Record<LogLevel, { icon: typeof Info; cls: string }> = {
  info: { icon: Info, cls: 'tw-console-level--info' },
  warn: { icon: AlertTriangle, cls: 'tw-console-level--warn' },
  error: { icon: XCircle, cls: 'tw-console-level--error' },
  success: { icon: CheckCircle, cls: 'tw-console-level--success' },
};

const formatTime = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;

const MIN_PANEL_HEIGHT = 120;
const MAX_PANEL_HEIGHT = 600;
const DEFAULT_PANEL_HEIGHT = 280;

type Props = {
  open: boolean;
  onClose: () => void;
};

const ConsolePanel = ({ open, onClose }: Props) => {
  const { t } = useTranslation();
  const entries = useConsoleLogs();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const dragging = useRef(false);

  const filtered = entries.filter(e => {
    if (filter !== 'all' && e.level !== filter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        e.message.toLowerCase().includes(term) ||
        e.detail?.toLowerCase().includes(term) ||
        e.metadata?.testId?.toLowerCase().includes(term) ||
        e.metadata?.url?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 自动滚到底部
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered.length, open]);

  // 拖拽调整高度
  const onDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      document.body.style.cursor = 'row-resize';
      document.body.style.userSelect = 'none';
      const startY = e.clientY;
      const startH = panelHeight;
      const onMove = (ev: MouseEvent) => {
        if (!dragging.current) return;
        const delta = startY - ev.clientY;
        setPanelHeight(Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, startH + delta)));
      };
      const onUp = () => {
        dragging.current = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    },
    [panelHeight]
  );

  // 复制所有日志
  const handleCopyAll = useCallback(() => {
    const text = filtered
      .map(
        e =>
          `[${formatTime(e.timestamp)}] [${e.level.toUpperCase()}] ${e.message}${e.detail ? ' — ' + e.detail : ''}`
      )
      .join('\n');
    void navigator.clipboard.writeText(text);
  }, [filtered]);

  if (!open) return null;

  return (
    <div className='tw-console' style={{ height: panelHeight }}>
      {/* 拖拽手柄 */}
      <div
        className='tw-console-resizer'
        role='separator'
        aria-orientation='horizontal'
        tabIndex={0}
        onMouseDown={onDragStart}
        onKeyDown={e => {
          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setPanelHeight(h => Math.min(MAX_PANEL_HEIGHT, h + 20));
          }
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setPanelHeight(h => Math.max(MIN_PANEL_HEIGHT, h - 20));
          }
        }}
      >
        <div className='tw-console-resizer-handle' />
      </div>

      {/* 标题栏 — 参考 Postman: [icon] Console · Not connected... | All Logs v | Clear | ... | × */}
      <div className='tw-console-header'>
        <div className='tw-console-header-left'>
          <Terminal className='w-3.5 h-3.5' />
          <span className='tw-console-title'>{t('console.title', 'Console')}</span>
          <span className='tw-console-count'>({filtered.length})</span>
        </div>
        <div className='tw-console-header-right'>
          {/* 搜索框 */}
          <div className='tw-console-search'>
            <Search className='w-3 h-3' />
            <input
              type='text'
              placeholder={t('console.search', 'Search...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className='tw-console-search-input'
            />
          </div>

          {/* 级别筛选下拉 */}
          <select
            className='tw-console-log-select'
            value={filter}
            onChange={e => setFilter(e.target.value as LogLevel | 'all')}
          >
            <option value='all'>{t('console.allLogs', 'All Logs')}</option>
            <option value='info'>Info</option>
            <option value='success'>Success</option>
            <option value='warn'>Warning</option>
            <option value='error'>Error</option>
          </select>

          <button
            type='button'
            className='tw-console-action'
            onClick={() => consoleClear()}
            title={t('console.clear', 'Clear')}
          >
            <span>{t('console.clear', 'Clear')}</span>
          </button>

          <button
            type='button'
            className='tw-console-action'
            onClick={handleCopyAll}
            title={t('console.copy', 'Copy All')}
          >
            <Copy className='w-3 h-3' />
          </button>

          <button
            type='button'
            className='tw-console-close'
            onClick={onClose}
            title={t('console.close', 'Close')}
          >
            <X className='w-3.5 h-3.5' />
          </button>
        </div>
      </div>

      {/* 日志列表 */}
      <div className='tw-console-body' ref={scrollRef}>
        {filtered.length === 0 ? (
          <div className='tw-console-empty'>
            <h3 className='tw-console-empty-title'>{t('console.noLogs', 'No logs yet')}</h3>
            <p className='tw-console-empty-desc'>
              {t('console.noLogsHint', 'Run a test to view its details in the console.')}
            </p>
          </div>
        ) : (
          filtered.map(entry => {
            const cfg = LEVEL_CONFIG[entry.level];
            const Icon = cfg.icon;
            const isExpanded = expandedIds.has(entry.id);
            const hasDetails = !!(entry.metadata || entry.request || entry.response || entry.stack);

            return (
              <div key={entry.id} className={`tw-console-entry ${cfg.cls}`}>
                <div className='tw-console-entry-main'>
                  {hasDetails && (
                    <button
                      type='button'
                      className='tw-console-expand-btn'
                      onClick={() => toggleExpand(entry.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className='w-3 h-3' />
                      ) : (
                        <ChevronRight className='w-3 h-3' />
                      )}
                    </button>
                  )}
                  <span className='tw-console-time'>{formatTime(entry.timestamp)}</span>
                  <Icon className='w-3 h-3 tw-console-icon' />
                  <span className='tw-console-msg'>{entry.message}</span>
                  {entry.detail && <span className='tw-console-detail'>{entry.detail}</span>}
                  {entry.metadata?.testId && (
                    <span className='tw-console-badge'>
                      ID: {entry.metadata.testId.slice(0, 8)}
                    </span>
                  )}
                  {entry.metadata?.duration && (
                    <span className='tw-console-badge'>{entry.metadata.duration}ms</span>
                  )}
                </div>

                {isExpanded && hasDetails && (
                  <div className='tw-console-entry-details'>
                    {entry.metadata && (
                      <div className='tw-console-detail-section'>
                        <div className='tw-console-detail-title'>Metadata</div>
                        <pre className='tw-console-detail-content'>
                          {JSON.stringify(entry.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.request && (
                      <div className='tw-console-detail-section'>
                        <div className='tw-console-detail-title'>Request</div>
                        <pre className='tw-console-detail-content'>
                          {JSON.stringify(entry.request, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.response && (
                      <div className='tw-console-detail-section'>
                        <div className='tw-console-detail-title'>Response</div>
                        <pre className='tw-console-detail-content'>
                          {JSON.stringify(entry.response, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.stack && (
                      <div className='tw-console-detail-section'>
                        <div className='tw-console-detail-title'>Stack Trace</div>
                        <pre className='tw-console-detail-content'>{entry.stack}</pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ConsolePanel;
