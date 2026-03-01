import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { AddSitePayload, MonitoringSite } from '../../services/monitoringApi';

type SiteFormData = {
  name: string;
  url: string;
  monitoringType: string;
  checkInterval: number;
  timeout: number;
};

const defaultForm: SiteFormData = {
  name: '',
  url: '',
  monitoringType: 'uptime',
  checkInterval: 300,
  timeout: 30,
};

const AddSiteDialog = ({
  open,
  onOpenChange,
  onSubmit,
  editSite,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (data: AddSitePayload) => Promise<void>;
  editSite?: MonitoringSite | null;
}) => {
  const { t } = useTranslation();
  const [form, setForm] = useState<SiteFormData>(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (editSite) {
        setForm({
          name: editSite.name || '',
          url: editSite.url || '',
          monitoringType: editSite.monitoring_type || 'uptime',
          checkInterval: editSite.check_interval || 300,
          timeout: editSite.timeout || 30,
        });
      } else {
        setForm(defaultForm);
      }
    }
  }, [open, editSite]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.url.trim()) {
      toast.error(t('monitoring.siteFormRequired', '请填写站点名称和 URL'));
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name.trim(),
        url: form.url.trim(),
        monitoringType: form.monitoringType,
        checkInterval: form.checkInterval,
        timeout: form.timeout,
      });
      onOpenChange(false);
    } catch {
      toast.error(t('monitoring.operationFailed', '操作失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md'>
        <DialogHeader>
          <DialogTitle>
            {editSite
              ? t('monitoring.editSiteTitle', '编辑监控站点')
              : t('monitoring.addSiteTitle', '添加监控站点')}
          </DialogTitle>
          <DialogDescription>
            {editSite
              ? t('monitoring.editSiteDesc', '修改监控站点配置')
              : t('monitoring.addSiteDesc', '添加一个新的网站进行持续监控')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-4 py-2'>
          <div className='space-y-2'>
            <Label htmlFor='site-name'>{t('monitoring.siteName', '站点名称')}</Label>
            <Input
              id='site-name'
              placeholder={t('monitoring.siteNamePlaceholder', '例如：生产环境主站')}
              value={form.name}
              onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>

          <div className='space-y-2'>
            <Label htmlFor='site-url'>URL</Label>
            <Input
              id='site-url'
              placeholder='https://example.com'
              value={form.url}
              onChange={e => setForm(prev => ({ ...prev, url: e.target.value }))}
              disabled={Boolean(editSite)}
            />
          </div>

          <div className='grid grid-cols-2 gap-4'>
            <div className='space-y-2'>
              <Label>{t('monitoring.monitorType', '监控类型')}</Label>
              <Select
                value={form.monitoringType}
                onValueChange={v => setForm(prev => ({ ...prev, monitoringType: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='uptime'>
                    {t('monitoring.typeUptimeMonitor', '可用性监控')}
                  </SelectItem>
                  <SelectItem value='performance'>
                    {t('monitoring.typePerfMonitor', '性能监控')}
                  </SelectItem>
                  <SelectItem value='security'>
                    {t('monitoring.typeSecMonitor', '安全监控')}
                  </SelectItem>
                  <SelectItem value='seo'>{t('monitoring.typeSeoMonitor', 'SEO 监控')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label>{t('monitoring.checkInterval', '检查间隔')}</Label>
              <Select
                value={String(form.checkInterval)}
                onValueChange={v => setForm(prev => ({ ...prev, checkInterval: Number(v) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='60'>{t('monitoring.interval1m', '1 分钟')}</SelectItem>
                  <SelectItem value='300'>{t('monitoring.interval5m', '5 分钟')}</SelectItem>
                  <SelectItem value='600'>{t('monitoring.interval10m', '10 分钟')}</SelectItem>
                  <SelectItem value='1800'>{t('monitoring.interval30m', '30 分钟')}</SelectItem>
                  <SelectItem value='3600'>{t('monitoring.interval1h', '1 小时')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='space-y-2'>
            <Label>{t('monitoring.timeoutLabel', '超时时间 (秒)')}</Label>
            <Input
              type='number'
              min={5}
              max={120}
              value={form.timeout}
              onChange={e => setForm(prev => ({ ...prev, timeout: Number(e.target.value) }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={submitting}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? t('monitoring.submitting', '提交中...')
              : editSite
                ? t('common.save')
                : t('monitoring.addBtn', '添加')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddSiteDialog;
