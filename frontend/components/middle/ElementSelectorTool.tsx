/**
 * 元素选择器工具
 * 可视化 CSS / XPath 选择器编辑器，支持实时预览、语法高亮、常用选择器模板
 * 用于无障碍测试、UX 测试、兼容性测试等场景中指定目标元素
 */

import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  ChevronDown,
  Code2,
  Copy,
  Hash,
  Layers,
  MousePointerClick,
  Plus,
  Tag,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type SelectorMode = 'css' | 'xpath';

interface SelectorEntry {
  id: string;
  selector: string;
  mode: SelectorMode;
  label?: string;
  color?: string;
}

interface ElementSelectorToolProps {
  /** 当前选择器列表 */
  selectors?: SelectorEntry[];
  /** 选择器变更回调 */
  onChange?: (selectors: SelectorEntry[]) => void;
  /** 是否允许多选 */
  multiple?: boolean;
  /** 最大选择器数量 */
  maxSelectors?: number;
  /** 紧凑模式 */
  compact?: boolean;
}

const HIGHLIGHT_COLORS = [
  { value: 'rgba(239, 68, 68, 0.35)', label: '红色', dot: 'bg-red-500' },
  { value: 'rgba(59, 130, 246, 0.35)', label: '蓝色', dot: 'bg-blue-500' },
  { value: 'rgba(34, 197, 94, 0.35)', label: '绿色', dot: 'bg-green-500' },
  { value: 'rgba(234, 179, 8, 0.35)', label: '黄色', dot: 'bg-yellow-500' },
  { value: 'rgba(168, 85, 247, 0.35)', label: '紫色', dot: 'bg-purple-500' },
  { value: 'rgba(236, 72, 153, 0.35)', label: '粉色', dot: 'bg-pink-500' },
];

/** CSS 选择器常用模板 */
const CSS_TEMPLATES = [
  { label: '所有图片', selector: 'img', icon: '🖼️', desc: '选择所有 <img> 元素' },
  { label: '所有链接', selector: 'a[href]', icon: '🔗', desc: '选择所有带 href 的链接' },
  { label: '表单输入', selector: 'input, textarea, select', icon: '📝', desc: '所有表单控件' },
  {
    label: '按钮',
    selector: 'button, [role="button"], input[type="submit"]',
    icon: '🔘',
    desc: '所有按钮元素',
  },
  { label: '标题', selector: 'h1, h2, h3, h4, h5, h6', icon: '📰', desc: '所有标题元素' },
  { label: '导航', selector: 'nav, [role="navigation"]', icon: '🧭', desc: '导航区域' },
  {
    label: '无 alt 图片',
    selector: 'img:not([alt]), img[alt=""]',
    icon: '⚠️',
    desc: '缺少 alt 属性的图片',
  },
  {
    label: '交互元素',
    selector: 'a, button, input, select, textarea, [tabindex]',
    icon: '👆',
    desc: '所有可交互元素',
  },
  {
    label: 'ARIA 标签',
    selector: '[aria-label], [aria-labelledby], [aria-describedby]',
    icon: '♿',
    desc: 'ARIA 标注元素',
  },
  {
    label: '隐藏元素',
    selector: '[hidden], [aria-hidden="true"], .sr-only',
    icon: '👁️',
    desc: '视觉隐藏元素',
  },
];

/** XPath 选择器常用模板 */
const XPATH_TEMPLATES = [
  { label: '所有图片', selector: '//img', icon: '🖼️', desc: '选择所有 img 元素' },
  { label: '所有链接', selector: '//a[@href]', icon: '🔗', desc: '带 href 的链接' },
  {
    label: '包含文本',
    selector: '//*[contains(text(), "")]',
    icon: '🔍',
    desc: '包含指定文本的元素',
  },
  { label: '按 ID', selector: '//*[@id=""]', icon: '#️⃣', desc: '按 ID 查找' },
  { label: '按 class', selector: '//*[contains(@class, "")]', icon: '🏷️', desc: '按 class 查找' },
  {
    label: '表单输入',
    selector: '//input | //textarea | //select',
    icon: '📝',
    desc: '所有表单控件',
  },
];

const SELECTOR_SYNTAX_HELP: Record<SelectorMode, Array<{ pattern: string; desc: string }>> = {
  css: [
    { pattern: '#id', desc: 'ID 选择器' },
    { pattern: '.class', desc: 'Class 选择器' },
    { pattern: 'tag', desc: '标签选择器' },
    { pattern: '[attr]', desc: '属性选择器' },
    { pattern: '[attr="val"]', desc: '属性值选择器' },
    { pattern: ':nth-child(n)', desc: '第 n 个子元素' },
    { pattern: ':not(sel)', desc: '排除选择器' },
    { pattern: 'A > B', desc: '直接子元素' },
    { pattern: 'A B', desc: '后代元素' },
    { pattern: 'A + B', desc: '相邻兄弟' },
  ],
  xpath: [
    { pattern: '//tag', desc: '全局查找标签' },
    { pattern: '//*[@attr]', desc: '按属性查找' },
    { pattern: '//tag[@attr="val"]', desc: '属性值匹配' },
    { pattern: 'contains(@attr, "val")', desc: '属性包含' },
    { pattern: 'text()', desc: '文本内容' },
    { pattern: '..', desc: '父元素' },
    { pattern: 'following-sibling::tag', desc: '后续兄弟' },
    { pattern: '[position()=1]', desc: '第一个匹配' },
  ],
};

let nextId = 1;
const genId = () => `sel_${Date.now()}_${nextId++}`;

const ElementSelectorTool = ({
  selectors: externalSelectors,
  onChange,
  multiple = true,
  maxSelectors = 10,
  compact = false,
}: ElementSelectorToolProps) => {
  const { t } = useTranslation();
  const [internalSelectors, setInternalSelectors] = useState<SelectorEntry[]>([]);
  const [activeMode, setActiveMode] = useState<SelectorMode>('css');
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSyntax, setShowSyntax] = useState(false);

  const selectors = externalSelectors ?? internalSelectors;

  const updateSelectors = useCallback(
    (next: SelectorEntry[]) => {
      if (onChange) {
        onChange(next);
      } else {
        setInternalSelectors(next);
      }
    },
    [onChange]
  );

  const addSelector = useCallback(
    (selector = '', mode: SelectorMode = activeMode, label?: string) => {
      if (!multiple && selectors.length >= 1) return;
      if (selectors.length >= maxSelectors) return;
      const color = HIGHLIGHT_COLORS[selectors.length % HIGHLIGHT_COLORS.length].value;
      updateSelectors([...selectors, { id: genId(), selector, mode, label, color }]);
    },
    [selectors, activeMode, multiple, maxSelectors, updateSelectors]
  );

  const removeSelector = useCallback(
    (id: string) => {
      updateSelectors(selectors.filter(s => s.id !== id));
    },
    [selectors, updateSelectors]
  );

  const updateSelector = useCallback(
    (id: string, patch: Partial<SelectorEntry>) => {
      updateSelectors(selectors.map(s => (s.id === id ? { ...s, ...patch } : s)));
    },
    [selectors, updateSelectors]
  );

  const applyTemplate = useCallback(
    (template: { selector: string; label: string }) => {
      addSelector(template.selector, activeMode, template.label);
      setShowTemplates(false);
    },
    [addSelector, activeMode]
  );

  const copySelector = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  }, []);

  const templates = useMemo(
    () => (activeMode === 'css' ? CSS_TEMPLATES : XPATH_TEMPLATES),
    [activeMode]
  );

  const syntaxHelp = useMemo(() => SELECTOR_SYNTAX_HELP[activeMode], [activeMode]);

  return (
    <div className={cn('space-y-3', compact && 'space-y-2')}>
      {/* 头部：模式切换 + 操作按钮 */}
      <div className='flex items-center gap-2 flex-wrap'>
        <Tabs
          value={activeMode}
          onValueChange={v => setActiveMode(v as SelectorMode)}
          className='flex-shrink-0'
        >
          <TabsList className='h-8'>
            <TabsTrigger value='css' className='text-xs h-7 px-3 gap-1'>
              <Tag className='h-3 w-3' /> CSS
            </TabsTrigger>
            <TabsTrigger value='xpath' className='text-xs h-7 px-3 gap-1'>
              <Code2 className='h-3 w-3' /> XPath
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Button
          size='sm'
          variant='outline'
          className='h-7 text-xs gap-1'
          onClick={() => addSelector()}
          disabled={(!multiple && selectors.length >= 1) || selectors.length >= maxSelectors}
        >
          <Plus className='h-3 w-3' />
          {t('elementSelector.add', '添加选择器')}
        </Button>

        <Button
          size='sm'
          variant='ghost'
          className='h-7 text-xs gap-1'
          onClick={() => setShowTemplates(!showTemplates)}
        >
          <Layers className='h-3 w-3' />
          {t('elementSelector.templates', '模板')}
          <ChevronDown
            className={cn('h-3 w-3 transition-transform', showTemplates && 'rotate-180')}
          />
        </Button>

        <Button
          size='sm'
          variant='ghost'
          className='h-7 text-xs gap-1 ml-auto'
          onClick={() => setShowSyntax(!showSyntax)}
        >
          <Hash className='h-3 w-3' />
          {t('elementSelector.syntax', '语法')}
        </Button>
      </div>

      {/* 模板面板 */}
      {showTemplates && (
        <div className='rounded-md border p-3 bg-muted/30'>
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2'>
            {templates.map(tpl => (
              <button
                key={tpl.selector}
                type='button'
                className='flex flex-col items-start gap-0.5 p-2 rounded-md border bg-background hover:bg-accent text-left transition-colors'
                onClick={() => applyTemplate(tpl)}
                title={tpl.desc}
              >
                <span className='text-sm'>
                  {tpl.icon} {tpl.label}
                </span>
                <span className='text-[10px] text-muted-foreground font-mono truncate w-full'>
                  {tpl.selector}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 语法帮助面板 */}
      {showSyntax && (
        <div className='rounded-md border p-3 bg-muted/30'>
          <div className='grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1'>
            {syntaxHelp.map(item => (
              <div key={item.pattern} className='flex items-center gap-2 text-xs py-0.5'>
                <code className='font-mono bg-muted px-1 rounded text-[11px]'>{item.pattern}</code>
                <span className='text-muted-foreground'>{item.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 选择器列表 */}
      {selectors.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-6 text-muted-foreground text-sm gap-2 border rounded-md border-dashed'>
          <MousePointerClick className='h-8 w-8 opacity-40' />
          <p>{t('elementSelector.empty', '点击"添加选择器"或从模板中选择')}</p>
        </div>
      ) : (
        <div className='space-y-2'>
          {selectors.map((entry, index) => {
            const colorInfo =
              HIGHLIGHT_COLORS.find(c => c.value === entry.color) || HIGHLIGHT_COLORS[0];
            return (
              <div
                key={entry.id}
                className='flex items-start gap-2 p-2 rounded-md border bg-background group'
              >
                {/* 颜色指示器 */}
                <div className='flex flex-col items-center gap-1 pt-1'>
                  <div className={cn('w-3 h-3 rounded-full', colorInfo.dot)} />
                  <span className='text-[10px] text-muted-foreground'>#{index + 1}</span>
                </div>

                {/* 选择器输入区 */}
                <div className='flex-1 space-y-1.5'>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] h-5 gap-0.5 shrink-0'>
                      {entry.mode === 'css' ? (
                        <Tag className='h-2.5 w-2.5' />
                      ) : (
                        <Code2 className='h-2.5 w-2.5' />
                      )}
                      {entry.mode.toUpperCase()}
                    </Badge>
                    <Input
                      value={entry.selector}
                      onChange={e => updateSelector(entry.id, { selector: e.target.value })}
                      placeholder={
                        entry.mode === 'css' ? 'e.g. img:not([alt])' : 'e.g. //img[not(@alt)]'
                      }
                      className='h-7 text-xs font-mono flex-1'
                    />
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity'
                      onClick={() => void copySelector(entry.selector)}
                      title='复制'
                    >
                      <Copy className='h-3 w-3' />
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 w-7 p-0 text-destructive opacity-0 group-hover:opacity-100 transition-opacity'
                      onClick={() => removeSelector(entry.id)}
                      title='删除'
                    >
                      <Trash2 className='h-3 w-3' />
                    </Button>
                  </div>

                  {/* 标签和颜色选择 */}
                  {!compact && (
                    <div className='flex items-center gap-2'>
                      <Label className='text-[10px] text-muted-foreground shrink-0'>标签</Label>
                      <Input
                        value={entry.label || ''}
                        onChange={e => updateSelector(entry.id, { label: e.target.value })}
                        placeholder='可选标签名'
                        className='h-6 text-[11px] max-w-[140px]'
                      />
                      <Label className='text-[10px] text-muted-foreground shrink-0 ml-2'>
                        颜色
                      </Label>
                      <Select
                        value={entry.color || HIGHLIGHT_COLORS[0].value}
                        onValueChange={val => updateSelector(entry.id, { color: val })}
                      >
                        <SelectTrigger className='h-6 w-[90px] text-[11px]'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {HIGHLIGHT_COLORS.map(c => (
                            <SelectItem key={c.value} value={c.value} className='text-xs'>
                              <span className='flex items-center gap-1.5'>
                                <span className={cn('w-2 h-2 rounded-full', c.dot)} />
                                {c.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={entry.mode}
                        onValueChange={val =>
                          updateSelector(entry.id, { mode: val as SelectorMode })
                        }
                      >
                        <SelectTrigger className='h-6 w-[80px] text-[11px] ml-auto'>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value='css' className='text-xs'>
                            CSS
                          </SelectItem>
                          <SelectItem value='xpath' className='text-xs'>
                            XPath
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 底部统计 */}
      {selectors.length > 0 && (
        <div className='flex items-center justify-between text-xs text-muted-foreground'>
          <span>
            {selectors.length} 个选择器
            {maxSelectors < Infinity && ` / 最多 ${maxSelectors}`}
          </span>
          {selectors.length > 1 && (
            <Button
              size='sm'
              variant='ghost'
              className='h-6 text-xs text-destructive'
              onClick={() => updateSelectors([])}
            >
              清空全部
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default ElementSelectorTool;
export type { ElementSelectorToolProps, SelectorEntry, SelectorMode };
