/**
 * Scratch Pad 数据迁移提示横幅
 * 登录后（workspace 模式），如果检测到本地有 scratchpad 数据，
 * 显示一条提示让用户选择迁移或忽略。
 */

import { ArrowRight, Database, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';

import { useAppMode } from '../context/AppModeContext';
import { isDesktop } from '../utils/environment';

const ScratchpadMigrationBanner = () => {
  const { mode, hasScratchpadData, markScratchpadMigrated } = useAppMode();
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  // Scratch Pad 仅桌面端有效，Web 端不显示迁移提示
  if (!isDesktop()) return null;
  // 仅在 workspace 模式 + 有待迁移数据 + 未关闭时显示
  if (mode !== 'workspace' || !hasScratchpadData || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleMigrateLater = () => {
    setDismissed(true);
  };

  const handleDontMigrate = () => {
    markScratchpadMigrated();
  };

  return (
    <div className='relative bg-blue-50 dark:bg-blue-950/30 border-b border-blue-200 dark:border-blue-800 px-4 py-2.5 flex items-center gap-3 text-sm'>
      <Database className='h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0' />
      <span className='text-blue-800 dark:text-blue-300 flex-1'>
        检测到本地 Scratch Pad 数据。您可以将离线数据导出后导入到当前工作空间，或选择忽略。
      </span>
      <div className='flex items-center gap-2 shrink-0'>
        <Button variant='outline' size='sm' className='h-7 text-xs' onClick={handleMigrateLater}>
          稍后处理
        </Button>
        <Button
          variant='ghost'
          size='sm'
          className='h-7 text-xs text-muted-foreground'
          onClick={handleDontMigrate}
        >
          不再提示
        </Button>
        <Button
          variant='default'
          size='sm'
          className='h-7 text-xs'
          onClick={() => {
            // 打开设置页面的数据备份 tab
            navigate('/settings?tab=backup');
            handleDismiss();
          }}
        >
          <ArrowRight className='h-3 w-3 mr-1' />
          前往迁移
        </Button>
      </div>
      <button
        type='button'
        className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-blue-400 hover:text-blue-600'
        onClick={handleDismiss}
      >
        <X className='h-3.5 w-3.5' />
      </button>
    </div>
  );
};

export default ScratchpadMigrationBanner;
