import {
  ArrowLeft,
  BookmarkPlus,
  Calendar,
  Download,
  FileText,
  Loader2,
  MoreHorizontal,
  Play,
  RefreshCw,
  Shield,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { isDesktop } from '../../utils/environment';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface HistoryDetailHeaderProps {
  id: string | undefined;
  isQueued: boolean;
  isExportable: boolean;
  exporting: boolean;
  actionLoading: boolean;
  statusValue: string;
  exportFormat: string;
  detail: unknown;
  onExportFormatChange: (value: string) => void;
  onExport: () => void;
  onRerun: () => void;
  onReplay: () => void;
  onCancel: () => void;
  onSaveAsTemplate?: () => void;
  onCreateMonitor?: () => void;
  onCreateSchedule?: () => void;
}

const HistoryDetailHeader = ({
  id,
  isQueued,
  isExportable,
  exporting,
  actionLoading,
  statusValue,
  exportFormat,
  detail,
  onExportFormatChange,
  onExport,
  onRerun,
  onReplay,
  onCancel,
  onSaveAsTemplate,
  onCreateMonitor,
  onCreateSchedule,
}: HistoryDetailHeaderProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className='space-y-3'>
      {/* 第一行：返回 + 标题 + 状态 */}
      <div className='flex items-center gap-3'>
        <Button
          variant='ghost'
          size='icon'
          className='h-8 w-8'
          onClick={() => navigate('/history')}
        >
          <ArrowLeft className='h-4 w-4' />
        </Button>
        <h2 className='text-xl font-bold tracking-tight'>{t('historyDetail.title')}</h2>
        <span className='text-xs text-muted-foreground font-mono'>{id}</span>
        {isQueued && (
          <Badge variant='secondary' className='text-blue-600 bg-blue-50 text-xs'>
            {t('historyDetail.queued')}
          </Badge>
        )}
      </div>
      {/* 第二行：操作按钮 */}
      <div className='flex items-center gap-2 flex-wrap'>
        {isDesktop() && (
          <Button
            size='sm'
            variant='outline'
            onClick={onRerun}
            disabled={actionLoading || isQueued || statusValue === 'running'}
            className='h-8 text-xs'
          >
            {actionLoading ? (
              <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
            ) : (
              <RefreshCw className='mr-1.5 h-3 w-3' />
            )}
            {t('historyDetail.rerun')}
          </Button>
        )}
        {isDesktop() && (
          <Button
            size='sm'
            variant='outline'
            onClick={onReplay}
            disabled={!detail || isQueued || statusValue === 'running'}
            className='h-8 text-xs'
          >
            <Play className='mr-1.5 h-3 w-3' />
            {t('historyDetail.replay')}
          </Button>
        )}
        {(isQueued || statusValue === 'running') && (
          <Button
            size='sm'
            variant='destructive'
            onClick={onCancel}
            disabled={actionLoading}
            className='h-8 text-xs'
          >
            {actionLoading ? (
              <Loader2 className='mr-1.5 h-3 w-3 animate-spin' />
            ) : (
              <XCircle className='mr-1.5 h-3 w-3' />
            )}
            {t('historyDetail.cancel')}
          </Button>
        )}
        {/* 更多操作：导出/报告/联动入口 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size='sm' variant='outline' className='h-8 text-xs'>
              <MoreHorizontal className='h-3.5 w-3.5 mr-1.5' />
              {t('common.more', '更多')}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align='end'>
            <DropdownMenuItem onClick={onExport} disabled={!isExportable || exporting}>
              <Download className='h-4 w-4 mr-2' />
              {t('historyDetail.export')} ({exportFormat.toUpperCase()})
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => navigate(`/reports?testId=${id}`)}
              disabled={!isExportable}
            >
              <FileText className='h-4 w-4 mr-2' />
              {t('historyDetail.viewReports', '查看报告')}
            </DropdownMenuItem>
            {onSaveAsTemplate && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onSaveAsTemplate}>
                  <BookmarkPlus className='h-4 w-4 mr-2' />
                  {t('historyDetail.saveAsTemplate', '保存为模板')}
                </DropdownMenuItem>
              </>
            )}
            {onCreateMonitor && (
              <DropdownMenuItem onClick={onCreateMonitor}>
                <Shield className='h-4 w-4 mr-2' />
                {t('historyDetail.createMonitor', '添加到监控')}
              </DropdownMenuItem>
            )}
            {onCreateSchedule && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCreateSchedule}>
                  <Calendar className='h-4 w-4 mr-2' />
                  {t('historyDetail.createSchedule', '创建定时任务')}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        {/* 导出格式切换 */}
        <Select value={exportFormat} onValueChange={onExportFormatChange}>
          <SelectTrigger className='w-[100px] h-8 text-xs'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='json'>JSON</SelectItem>
            <SelectItem value='csv'>CSV</SelectItem>
            <SelectItem value='markdown'>Markdown</SelectItem>
            <SelectItem value='html'>HTML</SelectItem>
            <SelectItem value='pdf'>PDF</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default HistoryDetailHeader;
