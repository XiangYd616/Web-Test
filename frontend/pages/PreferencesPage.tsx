import { Monitor, Moon, Save, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

import { setAppLanguage } from '../i18n';
import { updateProfile } from '../services/userApi';
import { isDesktop } from '../utils/environment';

const STORAGE_KEY = 'user_preferences';

type UserPreferences = {
  theme: 'light' | 'dark' | 'system';
  language: string;
  defaultTimeout: number;
  defaultConcurrency: number;
  defaultIterations: number;
  followRedirects: boolean;
  retryOnFail: boolean;
  proxyUrl: string;
  customUserAgent: string;
  historyRetention: number;
  autoSaveHistory: boolean;
};

const DEFAULT_PREFS: UserPreferences = {
  theme: 'light',
  language: 'zh-CN',
  defaultTimeout: 30000,
  defaultConcurrency: 10,
  defaultIterations: 3,
  followRedirects: true,
  retryOnFail: true,
  proxyUrl: '',
  customUserAgent: '',
  historyRetention: 30,
  autoSaveHistory: true,
};

const loadPreferences = (): UserPreferences => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_PREFS };
};

const savePreferences = (prefs: UserPreferences) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
};

const applyTheme = (theme: 'light' | 'dark' | 'system') => {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else if (theme === 'light') {
    root.classList.remove('dark');
  } else {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  }
};

const PreferencesPage = () => {
  const { t } = useTranslation();
  const _isDesktop = isDesktop();
  const [prefs, setPrefs] = useState<UserPreferences>(loadPreferences);

  useEffect(() => {
    applyTheme(prefs.theme);
  }, [prefs.theme]);

  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPrefs(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    savePreferences(prefs);
    setAppLanguage(prefs.language);
    applyTheme(prefs.theme);
    // 同步语言到后端 profile（静默失败）
    void updateProfile({ language: prefs.language }).catch(() => {});
    toast.success(t('preferences.saved'));
  };

  const themeOptions = [
    { value: 'light', label: t('preferences.themeLight'), icon: Sun },
    { value: 'dark', label: t('preferences.themeDark'), icon: Moon },
    { value: 'system', label: t('preferences.themeSystem'), icon: Monitor },
  ] as const;

  return (
    <div className='container max-w-3xl py-6 space-y-6'>
      <div>
        <h1 className='text-2xl font-bold'>{t('preferences.title')}</h1>
        <p className='text-sm text-muted-foreground mt-1'>{t('preferences.subtitle')}</p>
      </div>

      {/* 外观 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>{t('preferences.sectionAppearance')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-5'>
          <div className='space-y-2'>
            <Label>{t('preferences.theme')}</Label>
            <div className='flex gap-2'>
              {themeOptions.map(opt => {
                const Icon = opt.icon;
                const active = prefs.theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    type='button'
                    onClick={() => update('theme', opt.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <Icon className='h-4 w-4' />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className='space-y-2'>
            <Label>{t('preferences.language')}</Label>
            <div className='flex gap-2'>
              {[
                { value: 'zh-CN', label: t('preferences.languageZh'), icon: '🇨🇳' },
                { value: 'en-US', label: t('preferences.languageEn'), icon: '🇺🇸' },
              ].map(opt => {
                const active = prefs.language === opt.value;
                return (
                  <button
                    key={opt.value}
                    type='button'
                    onClick={() => update('language', opt.value)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span>{opt.icon}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 测试默认值（仅桌面端） */}
      {_isDesktop && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base'>{t('preferences.sectionDefaults')}</CardTitle>
            <CardDescription className='text-xs'>{t('preferences.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-4'>
              <div className='space-y-1.5'>
                <Label className='text-xs'>{t('preferences.defaultTimeout')}</Label>
                <Input
                  type='number'
                  value={prefs.defaultTimeout}
                  onChange={e => update('defaultTimeout', Number(e.target.value))}
                  min={1000}
                  max={300000}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs'>{t('preferences.defaultConcurrency')}</Label>
                <Input
                  type='number'
                  value={prefs.defaultConcurrency}
                  onChange={e => update('defaultConcurrency', Number(e.target.value))}
                  min={1}
                  max={1000}
                />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs'>{t('preferences.defaultIterations')}</Label>
                <Input
                  type='number'
                  value={prefs.defaultIterations}
                  onChange={e => update('defaultIterations', Number(e.target.value))}
                  min={1}
                  max={100}
                />
              </div>
            </div>

            <div className='flex items-center justify-between'>
              <Label>{t('preferences.followRedirects')}</Label>
              <Switch
                checked={prefs.followRedirects}
                onCheckedChange={v => update('followRedirects', v)}
              />
            </div>
            <div className='flex items-center justify-between'>
              <Label>{t('preferences.retryOnFail')}</Label>
              <Switch checked={prefs.retryOnFail} onCheckedChange={v => update('retryOnFail', v)} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 网络（仅桌面端） */}
      {_isDesktop && (
        <Card>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base'>{t('preferences.sectionNetwork')}</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-1.5'>
              <Label className='text-xs'>{t('preferences.proxyUrl')}</Label>
              <Input
                value={prefs.proxyUrl}
                onChange={e => update('proxyUrl', e.target.value)}
                placeholder={t('preferences.proxyPlaceholder')}
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs'>{t('preferences.customUserAgent')}</Label>
              <Input
                value={prefs.customUserAgent}
                onChange={e => update('customUserAgent', e.target.value)}
                placeholder={t('preferences.userAgentPlaceholder')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 数据与存储 */}
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>{t('preferences.sectionData')}</CardTitle>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-1.5'>
            <Label className='text-xs'>{t('preferences.historyRetention')}</Label>
            <Input
              type='number'
              value={prefs.historyRetention}
              onChange={e => update('historyRetention', Number(e.target.value))}
              min={1}
              max={365}
            />
          </div>
          <div className='flex items-center justify-between'>
            <Label>{t('preferences.autoSaveHistory')}</Label>
            <Switch
              checked={prefs.autoSaveHistory}
              onCheckedChange={v => update('autoSaveHistory', v)}
            />
          </div>
        </CardContent>
      </Card>

      {/* 保存按钮 */}
      <div className='flex justify-end'>
        <Button onClick={handleSave} className='gap-2'>
          <Save className='h-4 w-4' />
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
};

export { PreferencesPage };
export default PreferencesPage;
