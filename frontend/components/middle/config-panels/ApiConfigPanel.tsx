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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Trash2, Zap } from 'lucide-react';
import { type ChangeEvent, useCallback, useState } from 'react';
import type {
  ApiAssertion,
  ApiAssertionType,
  ApiEndpoint,
  ApiExtraction,
  ApiTestMeta,
  ApiVariable,
  RequestHeader,
  RequestMeta,
} from '../../../context/TestContext';

// ── Helpers ──

let _idCounter = 0;
const uid = () => `_${Date.now().toString(36)}_${(++_idCounter).toString(36)}`;

const ASSERTION_TYPE_LABELS: Record<ApiAssertionType, string> = {
  status: '状态码',
  header: '响应头',
  json: 'JSON 路径',
  jsonSchema: 'JSON Schema',
  bodyContains: '响应体包含',
  bodyRegex: '响应体正则',
  responseTime: '响应时间',
  error: '错误信息',
  allOf: '全部满足(AND)',
  anyOf: '任一满足(OR)',
};

const JSON_OPERATORS = [
  { value: 'equals', label: '等于' },
  { value: 'contains', label: '包含' },
  { value: 'exists', label: '存在' },
  { value: 'regex', label: '正则' },
  { value: 'gt', label: '大于' },
  { value: 'gte', label: '大于等于' },
  { value: 'lt', label: '小于' },
  { value: 'lte', label: '小于等于' },
  { value: 'oneOf', label: '枚举' },
];

const HTTP_METHODS: RequestMeta['method'][] = [
  'GET',
  'POST',
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS',
];

// ── Props ──

interface ApiConfigPanelProps {
  meta: ApiTestMeta;
  onChange: (meta: ApiTestMeta) => void;
}

// ════════════════════════════════════════════════════════════════
// Main Panel
// ════════════════════════════════════════════════════════════════

export const ApiConfigPanel = ({ meta, onChange }: ApiConfigPanelProps) => {
  const [activePreset, setActivePreset] = useState<string | null>(null);

  const assertionCount = meta.assertions.filter(a => a.enabled).length;
  const endpointCount = meta.endpoints.filter(e => e.enabled).length;
  const variableCount = meta.variables.filter(v => v.enabled).length;
  const extractionCount = meta.extractions.filter(e => e.enabled).length;

  const applyPreset = useCallback(
    (preset: (typeof PRESETS)[number]) => {
      setActivePreset(preset.name);
      onChange(structuredClone(preset.meta));
    },
    [onChange]
  );

  const userChange = useCallback(
    (next: ApiTestMeta) => {
      setActivePreset(null);
      onChange(next);
    },
    [onChange]
  );

  return (
    <div className='space-y-4'>
      {/* ── 快捷预设（横向平铺） ── */}
      <div className='flex items-center gap-1.5 flex-wrap'>
        <Zap className='h-3.5 w-3.5 text-amber-500 shrink-0' />
        {PRESETS.map(preset => (
          <button
            key={preset.name}
            type='button'
            title={preset.description}
            onClick={() => applyPreset(preset)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
              activePreset === preset.name
                ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary/30'
                : 'border-border text-muted-foreground hover:border-primary/40 hover:bg-primary/5'
            }`}
          >
            {preset.name}
          </button>
        ))}
      </div>

      {/* ── 端点（多端点链式） ── */}
      <PanelSection
        title='端点'
        subtitle='添加多个端点时自动启用链式测试'
        badge={endpointCount > 0 ? endpointCount : undefined}
      >
        <EndpointsSection
          endpoints={meta.endpoints}
          onChange={endpoints => userChange({ ...meta, endpoints })}
        />
      </PanelSection>

      {/* ── 断言（全局） ── */}
      <PanelSection title='断言' badge={assertionCount > 0 ? assertionCount : undefined}>
        <AssertionsSection
          assertions={meta.assertions}
          onChange={assertions => userChange({ ...meta, assertions })}
        />
      </PanelSection>

      {/* ── 变量 & 提取 ── */}
      <PanelSection
        title='变量 & 提取'
        badge={variableCount + extractionCount > 0 ? variableCount + extractionCount : undefined}
      >
        <VariablesSection
          variables={meta.variables}
          extractions={meta.extractions}
          onChangeVariables={variables => userChange({ ...meta, variables })}
          onChangeExtractions={extractions => userChange({ ...meta, extractions })}
        />
      </PanelSection>
    </div>
  );
};

// ── Layout helpers ──

const PanelSection = ({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: number;
  children: React.ReactNode;
}) => (
  <div className='space-y-2'>
    <div className='flex items-center gap-2'>
      <h3 className='text-xs font-semibold text-foreground'>{title}</h3>
      {badge != null && (
        <span className='text-[10px] bg-primary/15 text-primary rounded-full px-1.5 leading-4'>
          {badge}
        </span>
      )}
      {subtitle && <span className='text-[10px] text-muted-foreground ml-auto'>{subtitle}</span>}
    </div>
    {children}
  </div>
);

// ════════════════════════════════════════════════════════════════
// Assertions Section
// ════════════════════════════════════════════════════════════════

const AssertionsSection = ({
  assertions,
  onChange,
}: {
  assertions: ApiAssertion[];
  onChange: (assertions: ApiAssertion[]) => void;
}) => {
  const addAssertion = useCallback(
    (type: ApiAssertionType) => {
      const base: ApiAssertion = { id: uid(), type, enabled: true };
      switch (type) {
        case 'status':
          base.expected = 200;
          break;
        case 'header':
          base.name = '';
          base.value = '';
          break;
        case 'json':
          base.path = '';
          base.operator = 'equals';
          base.expected = '';
          break;
        case 'jsonSchema':
          base.schema = { type: 'object', required: [], properties: {} };
          break;
        case 'bodyContains':
          base.expected = '';
          break;
        case 'bodyRegex':
          base.pattern = '';
          break;
        case 'responseTime':
          base.max = 3000;
          break;
        case 'error':
          base.expected = '';
          break;
        case 'allOf':
        case 'anyOf':
          base.assertions = [];
          break;
      }
      onChange([...assertions, base]);
    },
    [assertions, onChange]
  );

  const update = useCallback(
    (index: number, patch: Partial<ApiAssertion>) => {
      const next = [...assertions];
      next[index] = { ...next[index], ...patch };
      onChange(next);
    },
    [assertions, onChange]
  );

  const remove = useCallback(
    (index: number) => onChange(assertions.filter((_, i) => i !== index)),
    [assertions, onChange]
  );

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-xs'>断言规则</Label>
        <Select onValueChange={(v: string) => addAssertion(v as ApiAssertionType)}>
          <SelectTrigger className='h-7 w-[140px] text-xs'>
            <SelectValue placeholder='添加断言...' />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ASSERTION_TYPE_LABELS) as ApiAssertionType[]).map(type => (
              <SelectItem key={type} value={type}>
                {ASSERTION_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {assertions.length === 0 && (
        <div className='text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md'>
          暂无断言规则，点击上方下拉框添加
        </div>
      )}

      {assertions.map((assertion, index) => (
        <AssertionRow
          key={assertion.id}
          assertion={assertion}
          onUpdate={patch => update(index, patch)}
          onRemove={() => remove(index)}
        />
      ))}
    </div>
  );
};

// ── Single Assertion Row ──

const AssertionRow = ({
  assertion,
  onUpdate,
  onRemove,
}: {
  assertion: ApiAssertion;
  onUpdate: (patch: Partial<ApiAssertion>) => void;
  onRemove: () => void;
}) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className='rounded-md border bg-card'>
      <div className='flex items-center gap-2 px-3 py-1.5'>
        <GripVertical className='h-3.5 w-3.5 text-muted-foreground/50 shrink-0' />
        <Badge variant='outline' className='text-[10px] shrink-0'>
          {ASSERTION_TYPE_LABELS[assertion.type]}
        </Badge>
        <span className='text-xs text-muted-foreground truncate flex-1'>
          {getAssertionSummary(assertion)}
        </span>
        <Switch
          checked={assertion.enabled}
          onCheckedChange={enabled => onUpdate({ enabled })}
          className='scale-75'
        />
        <button type='button' onClick={() => setExpanded(!expanded)} className='p-0.5'>
          {expanded ? (
            <ChevronUp className='h-3.5 w-3.5 text-muted-foreground' />
          ) : (
            <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
          )}
        </button>
        <button type='button' onClick={onRemove} className='p-0.5'>
          <Trash2 className='h-3.5 w-3.5 text-muted-foreground hover:text-destructive' />
        </button>
      </div>

      {expanded && (
        <div className='px-3 pb-3 pt-1 border-t space-y-2'>
          {assertion.type === 'status' && (
            <div className='grid gap-1.5'>
              <Label className='text-xs'>期望状态码</Label>
              <Input
                className='h-8 text-xs'
                value={String(assertion.expected ?? '')}
                placeholder='200 或 200,201 或 200-299'
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const v = e.target.value;
                  if (v.includes('-')) {
                    const [min, max] = v.split('-').map(Number);
                    onUpdate({ expected: { min, max } });
                  } else if (v.includes(',')) {
                    onUpdate({ expected: v.split(',').map(Number) });
                  } else {
                    onUpdate({ expected: Number(v) || v });
                  }
                }}
              />
              <span className='text-[10px] text-muted-foreground'>
                支持：精确值 200、列表 200,201、范围 200-299
              </span>
            </div>
          )}

          {assertion.type === 'header' && (
            <div className='grid grid-cols-2 gap-2'>
              <div className='grid gap-1.5'>
                <Label className='text-xs'>响应头名称</Label>
                <Input
                  className='h-8 text-xs'
                  value={assertion.name ?? ''}
                  placeholder='Content-Type'
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onUpdate({ name: e.target.value })
                  }
                />
              </div>
              <div className='grid gap-1.5'>
                <Label className='text-xs'>期望值（留空=仅检查存在）</Label>
                <Input
                  className='h-8 text-xs'
                  value={String(assertion.value ?? '')}
                  placeholder='application/json'
                  onChange={(e: ChangeEvent<HTMLInputElement>) =>
                    onUpdate({ value: e.target.value })
                  }
                />
              </div>
            </div>
          )}

          {assertion.type === 'json' && (
            <div className='space-y-2'>
              <div className='grid grid-cols-3 gap-2'>
                <div className='grid gap-1.5'>
                  <Label className='text-xs'>JSON 路径</Label>
                  <Input
                    className='h-8 text-xs font-mono'
                    value={assertion.path ?? ''}
                    placeholder='data.user.name'
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onUpdate({ path: e.target.value })
                    }
                  />
                </div>
                <div className='grid gap-1.5'>
                  <Label className='text-xs'>操作符</Label>
                  <Select
                    value={assertion.operator ?? 'equals'}
                    onValueChange={operator => onUpdate({ operator })}
                  >
                    <SelectTrigger className='h-8 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JSON_OPERATORS.map(op => (
                        <SelectItem key={op.value} value={op.value}>
                          {op.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid gap-1.5'>
                  <Label className='text-xs'>期望值</Label>
                  <Input
                    className='h-8 text-xs'
                    value={String(assertion.expected ?? '')}
                    placeholder={assertion.operator === 'exists' ? '(无需填写)' : '期望值'}
                    disabled={assertion.operator === 'exists'}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      onUpdate({ expected: e.target.value })
                    }
                  />
                </div>
              </div>
              <span className='text-[10px] text-muted-foreground'>
                路径示例：data.items[0].id、user.email、meta.total
              </span>
            </div>
          )}

          {assertion.type === 'jsonSchema' && (
            <div className='grid gap-1.5'>
              <Label className='text-xs'>JSON Schema（简化格式）</Label>
              <Textarea
                className='font-mono text-xs min-h-[80px] resize-y'
                value={
                  typeof assertion.schema === 'string'
                    ? assertion.schema
                    : JSON.stringify(assertion.schema ?? {}, null, 2)
                }
                placeholder={'{\n  "type": "object",\n  "required": ["id", "name"]\n}'}
                onChange={e => {
                  try {
                    onUpdate({ schema: JSON.parse(e.target.value) });
                  } catch {
                    onUpdate({ schema: e.target.value });
                  }
                }}
              />
            </div>
          )}

          {assertion.type === 'bodyContains' && (
            <div className='grid gap-1.5'>
              <Label className='text-xs'>响应体应包含</Label>
              <Input
                className='h-8 text-xs'
                value={String(assertion.expected ?? '')}
                placeholder='success'
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onUpdate({ expected: e.target.value })
                }
              />
            </div>
          )}

          {assertion.type === 'bodyRegex' && (
            <div className='grid gap-1.5'>
              <Label className='text-xs'>正则表达式</Label>
              <Input
                className='h-8 text-xs font-mono'
                value={assertion.pattern ?? ''}
                placeholder='"id":\s*\d+'
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onUpdate({ pattern: e.target.value })
                }
              />
            </div>
          )}

          {assertion.type === 'responseTime' && (
            <div className='grid gap-1.5'>
              <Label className='text-xs'>最大响应时间 (ms)</Label>
              <Input
                className='h-8 text-xs'
                type='number'
                min={0}
                value={assertion.max ?? 3000}
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onUpdate({ max: Number(e.target.value) || 3000 })
                }
              />
            </div>
          )}

          {assertion.type === 'error' && (
            <div className='grid gap-1.5'>
              <Label className='text-xs'>期望错误信息（包含或正则）</Label>
              <Input
                className='h-8 text-xs'
                value={String(assertion.expected ?? '')}
                placeholder='timeout'
                onChange={(e: ChangeEvent<HTMLInputElement>) =>
                  onUpdate({ expected: e.target.value })
                }
              />
            </div>
          )}

          {(assertion.type === 'allOf' || assertion.type === 'anyOf') && (
            <div className='space-y-2'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs'>
                  {assertion.type === 'allOf' ? '全部满足（AND）' : '任一满足（OR）'}
                </Label>
                <Select
                  onValueChange={(v: string) => {
                    const sub: ApiAssertion = {
                      id: uid(),
                      type: v as ApiAssertionType,
                      enabled: true,
                    };
                    if (v === 'status') sub.expected = 200;
                    else if (v === 'header') {
                      sub.name = '';
                      sub.value = '';
                    } else if (v === 'json') {
                      sub.path = '';
                      sub.operator = 'equals';
                      sub.expected = '';
                    } else if (v === 'responseTime') sub.max = 3000;
                    else if (v === 'bodyContains' || v === 'error') sub.expected = '';
                    else if (v === 'bodyRegex') sub.pattern = '';
                    else if (v === 'jsonSchema') sub.schema = { type: 'object' };
                    onUpdate({ assertions: [...(assertion.assertions || []), sub] });
                  }}
                >
                  <SelectTrigger className='h-7 w-[130px] text-xs'>
                    <SelectValue placeholder='添加子断言...' />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ASSERTION_TYPE_LABELS) as ApiAssertionType[])
                      .filter(t => t !== 'allOf' && t !== 'anyOf')
                      .map(type => (
                        <SelectItem key={type} value={type}>
                          {ASSERTION_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {(!assertion.assertions || assertion.assertions.length === 0) && (
                <div className='text-[10px] text-muted-foreground text-center py-2 border border-dashed rounded'>
                  暂无子断言
                </div>
              )}
              <div className='pl-3 border-l-2 border-primary/20 space-y-2'>
                {(assertion.assertions || []).map((sub, si) => (
                  <AssertionRow
                    key={sub.id}
                    assertion={sub}
                    onUpdate={patch => {
                      const next = [...(assertion.assertions || [])];
                      next[si] = { ...next[si], ...patch };
                      onUpdate({ assertions: next });
                    }}
                    onRemove={() => {
                      onUpdate({
                        assertions: (assertion.assertions || []).filter((_, i) => i !== si),
                      });
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const getAssertionSummary = (a: ApiAssertion): string => {
  switch (a.type) {
    case 'status':
      return `状态码 = ${JSON.stringify(a.expected)}`;
    case 'header':
      return a.value ? `${a.name}: ${a.value}` : `${a.name} 存在`;
    case 'json':
      return `${a.path} ${a.operator} ${a.expected ?? ''}`;
    case 'jsonSchema':
      return 'Schema 校验';
    case 'bodyContains':
      return `包含 "${a.expected}"`;
    case 'bodyRegex':
      return `匹配 /${a.pattern}/`;
    case 'responseTime':
      return `≤ ${a.max}ms`;
    case 'error':
      return `错误包含 "${a.expected}"`;
    case 'allOf':
      return `全部满足 (${a.assertions?.length ?? 0} 条)`;
    case 'anyOf':
      return `任一满足 (${a.assertions?.length ?? 0} 条)`;
    default:
      return '';
  }
};

// ════════════════════════════════════════════════════════════════
// Endpoints Section
// ════════════════════════════════════════════════════════════════

const EndpointsSection = ({
  endpoints,
  onChange,
}: {
  endpoints: ApiEndpoint[];
  onChange: (endpoints: ApiEndpoint[]) => void;
}) => {
  const addEndpoint = useCallback(() => {
    onChange([
      ...endpoints,
      {
        id: uid(),
        name: `端点 ${endpoints.length + 1}`,
        url: '',
        method: 'GET',
        headers: [],
        body: '',
        bodyType: 'none',
        assertions: [],
        variables: {},
        enabled: true,
      },
    ]);
  }, [endpoints, onChange]);

  const update = useCallback(
    (index: number, patch: Partial<ApiEndpoint>) => {
      const next = [...endpoints];
      next[index] = { ...next[index], ...patch };
      onChange(next);
    },
    [endpoints, onChange]
  );

  const remove = useCallback(
    (index: number) => onChange(endpoints.filter((_, i) => i !== index)),
    [endpoints, onChange]
  );

  const duplicate = useCallback(
    (index: number) => {
      const src = endpoints[index];
      const copy: ApiEndpoint = {
        ...src,
        id: uid(),
        name: `${src.name} (副本)`,
      };
      const next = [...endpoints];
      next.splice(index + 1, 0, copy);
      onChange(next);
    },
    [endpoints, onChange]
  );

  const moveUp = useCallback(
    (index: number) => {
      if (index === 0) return;
      const next = [...endpoints];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      onChange(next);
    },
    [endpoints, onChange]
  );

  const moveDown = useCallback(
    (index: number) => {
      if (index >= endpoints.length - 1) return;
      const next = [...endpoints];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      onChange(next);
    },
    [endpoints, onChange]
  );

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-xs'>
          端点列表
          <span className='ml-1 text-muted-foreground'>（按顺序执行，共享 Cookie）</span>
        </Label>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-7 text-xs'
          onClick={addEndpoint}
        >
          <Plus className='mr-1 h-3.5 w-3.5' />
          添加端点
        </Button>
      </div>

      {endpoints.length === 0 && (
        <div className='text-xs text-muted-foreground text-center py-4 border border-dashed rounded-md'>
          暂无端点，点击「添加端点」开始配置多端点链式测试
        </div>
      )}

      {endpoints.map((endpoint, index) => (
        <EndpointRow
          key={endpoint.id}
          endpoint={endpoint}
          index={index}
          total={endpoints.length}
          onUpdate={patch => update(index, patch)}
          onRemove={() => remove(index)}
          onDuplicate={() => duplicate(index)}
          onMoveUp={() => moveUp(index)}
          onMoveDown={() => moveDown(index)}
        />
      ))}
    </div>
  );
};

// ── Single Endpoint Row ──

const EndpointRow = ({
  endpoint,
  index,
  total,
  onUpdate,
  onRemove,
  onDuplicate,
  onMoveUp,
  onMoveDown,
}: {
  endpoint: ApiEndpoint;
  index: number;
  total: number;
  onUpdate: (patch: Partial<ApiEndpoint>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) => {
  const [expanded, setExpanded] = useState(false);
  const [headerTab, setHeaderTab] = useState<'headers' | 'body'>('headers');

  return (
    <div className='rounded-md border bg-card'>
      {/* Header bar */}
      <div className='flex items-center gap-2 px-3 py-1.5'>
        <GripVertical className='h-3.5 w-3.5 text-muted-foreground/50 shrink-0' />
        <Badge variant='secondary' className='text-[10px] shrink-0'>
          #{index + 1}
        </Badge>
        <Input
          className='h-6 text-xs border-none shadow-none px-1 flex-1'
          value={endpoint.name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate({ name: e.target.value })}
        />
        <Switch
          checked={endpoint.enabled}
          onCheckedChange={enabled => onUpdate({ enabled })}
          className='scale-75'
        />
        <div className='flex gap-0.5'>
          <button
            type='button'
            onClick={onMoveUp}
            disabled={index === 0}
            className='p-0.5 disabled:opacity-30'
          >
            <ChevronUp className='h-3.5 w-3.5 text-muted-foreground' />
          </button>
          <button
            type='button'
            onClick={onMoveDown}
            disabled={index >= total - 1}
            className='p-0.5 disabled:opacity-30'
          >
            <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
          </button>
          <button type='button' onClick={onDuplicate} className='p-0.5'>
            <Copy className='h-3.5 w-3.5 text-muted-foreground' />
          </button>
          <button type='button' onClick={() => setExpanded(!expanded)} className='p-0.5'>
            {expanded ? (
              <ChevronUp className='h-3.5 w-3.5 text-muted-foreground' />
            ) : (
              <ChevronDown className='h-3.5 w-3.5 text-muted-foreground' />
            )}
          </button>
          <button type='button' onClick={onRemove} className='p-0.5'>
            <Trash2 className='h-3.5 w-3.5 text-muted-foreground hover:text-destructive' />
          </button>
        </div>
      </div>

      {/* Collapsed summary */}
      {!expanded && (
        <div className='px-3 pb-2 text-xs text-muted-foreground'>
          <Badge variant='outline' className='text-[10px] mr-1'>
            {endpoint.method}
          </Badge>
          {endpoint.url || '(未设置 URL)'}
        </div>
      )}

      {/* Expanded form */}
      {expanded && (
        <div className='px-3 pb-3 pt-1 border-t space-y-3'>
          {/* URL + Method */}
          <div className='grid grid-cols-[100px_1fr] gap-2'>
            <Select
              value={endpoint.method}
              onValueChange={(v: string) => onUpdate({ method: v as RequestMeta['method'] })}
            >
              <SelectTrigger className='h-8 text-xs'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HTTP_METHODS.map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className='h-8 text-xs font-mono'
              value={endpoint.url}
              placeholder='https://api.example.com/users/{{userId}}'
              onChange={(e: ChangeEvent<HTMLInputElement>) => onUpdate({ url: e.target.value })}
            />
          </div>

          {/* Headers / Body sub-tabs */}
          <Tabs value={headerTab} onValueChange={v => setHeaderTab(v as 'headers' | 'body')}>
            <TabsList className='h-7 p-0.5'>
              <TabsTrigger value='headers' className='text-[11px] h-6 px-2'>
                Headers
                {endpoint.headers.length > 0 && (
                  <span className='ml-1 text-[9px] bg-primary/15 text-primary rounded-full px-1'>
                    {endpoint.headers.length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value='body' className='text-[11px] h-6 px-2'>
                Body
              </TabsTrigger>
            </TabsList>

            <TabsContent value='headers' className='mt-1.5 space-y-1.5'>
              {endpoint.headers.map((h: RequestHeader, hi: number) => (
                <div key={hi} className='flex items-center gap-1.5'>
                  <Input
                    className='h-7 text-[11px]'
                    value={h.key}
                    placeholder='Key'
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const next = [...endpoint.headers];
                      next[hi] = { ...next[hi], key: e.target.value };
                      onUpdate({ headers: next });
                    }}
                  />
                  <Input
                    className='h-7 text-[11px]'
                    value={h.value}
                    placeholder='Value'
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const next = [...endpoint.headers];
                      next[hi] = { ...next[hi], value: e.target.value };
                      onUpdate({ headers: next });
                    }}
                  />
                  <button
                    type='button'
                    onClick={() =>
                      onUpdate({ headers: endpoint.headers.filter((_, i) => i !== hi) })
                    }
                    className='p-0.5'
                  >
                    <Trash2 className='h-3 w-3 text-muted-foreground' />
                  </button>
                </div>
              ))}
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='h-6 text-[11px]'
                onClick={() =>
                  onUpdate({
                    headers: [...endpoint.headers, { key: '', value: '', enabled: true }],
                  })
                }
              >
                <Plus className='mr-1 h-3 w-3' />
                添加
              </Button>
            </TabsContent>

            <TabsContent value='body' className='mt-1.5 space-y-1.5'>
              <div className='flex gap-1 flex-wrap'>
                {(['none', 'json', 'form', 'text', 'xml'] as const).map(bt => (
                  <button
                    key={bt}
                    type='button'
                    onClick={() => onUpdate({ bodyType: bt })}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-all ${
                      endpoint.bodyType === bt
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {bt.toUpperCase()}
                  </button>
                ))}
              </div>
              {endpoint.bodyType !== 'none' && (
                <Textarea
                  className='font-mono text-[11px] min-h-[60px] resize-y'
                  value={endpoint.body}
                  placeholder={endpoint.bodyType === 'json' ? '{"key": "value"}' : 'body content'}
                  onChange={e => onUpdate({ body: e.target.value })}
                />
              )}
            </TabsContent>
          </Tabs>

          {/* Endpoint-level variables hint */}
          <div className='text-[10px] text-muted-foreground'>
            💡 URL 和 Body 中可使用 {'{{变量名}}'} 引用上游端点提取的变量
          </div>
        </div>
      )}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Variables & Extractions Section
// ════════════════════════════════════════════════════════════════

const VariablesSection = ({
  variables,
  extractions,
  onChangeVariables,
  onChangeExtractions,
}: {
  variables: ApiVariable[];
  extractions: ApiExtraction[];
  onChangeVariables: (variables: ApiVariable[]) => void;
  onChangeExtractions: (extractions: ApiExtraction[]) => void;
}) => {
  const [subTab, setSubTab] = useState<'vars' | 'extract'>('vars');

  return (
    <div className='space-y-3'>
      <Tabs value={subTab} onValueChange={v => setSubTab(v as 'vars' | 'extract')}>
        <TabsList className='h-7 p-0.5'>
          <TabsTrigger value='vars' className='text-[11px] h-6 px-2'>
            初始变量
          </TabsTrigger>
          <TabsTrigger value='extract' className='text-[11px] h-6 px-2'>
            提取规则
          </TabsTrigger>
        </TabsList>

        <TabsContent value='vars' className='mt-2 space-y-2'>
          <div className='text-[10px] text-muted-foreground mb-1'>
            定义初始变量，可在 URL、Headers、Body 中通过 {'{{key}}'} 引用
          </div>
          {variables.map((v, i) => (
            <div key={i} className='flex items-center gap-2'>
              <Input
                className='h-8 text-xs'
                value={v.key}
                placeholder='变量名'
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const next = [...variables];
                  next[i] = { ...next[i], key: e.target.value };
                  onChangeVariables(next);
                }}
              />
              <Input
                className='h-8 text-xs'
                value={v.value}
                placeholder='变量值'
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  const next = [...variables];
                  next[i] = { ...next[i], value: e.target.value };
                  onChangeVariables(next);
                }}
              />
              <Switch
                checked={v.enabled}
                onCheckedChange={enabled => {
                  const next = [...variables];
                  next[i] = { ...next[i], enabled };
                  onChangeVariables(next);
                }}
                className='scale-75'
              />
              <button
                type='button'
                onClick={() => onChangeVariables(variables.filter((_, idx) => idx !== i))}
                className='p-0.5'
              >
                <Trash2 className='h-3.5 w-3.5 text-muted-foreground' />
              </button>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() => onChangeVariables([...variables, { key: '', value: '', enabled: true }])}
          >
            <Plus className='mr-1 h-3.5 w-3.5' />
            添加变量
          </Button>
        </TabsContent>

        <TabsContent value='extract' className='mt-2 space-y-2'>
          <div className='text-[10px] text-muted-foreground mb-1'>
            从响应中提取值到变量，供后续请求使用（多端点模式下自动链式传递）
          </div>
          {extractions.map((ext, i) => (
            <div key={ext.id} className='rounded-md border p-2 space-y-2'>
              <div className='grid grid-cols-3 gap-2'>
                <div className='grid gap-1'>
                  <Label className='text-[10px]'>变量名</Label>
                  <Input
                    className='h-7 text-xs'
                    value={ext.name}
                    placeholder='token'
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const next = [...extractions];
                      next[i] = { ...next[i], name: e.target.value };
                      onChangeExtractions(next);
                    }}
                  />
                </div>
                <div className='grid gap-1'>
                  <Label className='text-[10px]'>来源</Label>
                  <Select
                    value={ext.source}
                    onValueChange={(v: string) => {
                      const next = [...extractions];
                      next[i] = { ...next[i], source: v as ApiExtraction['source'] };
                      onChangeExtractions(next);
                    }}
                  >
                    <SelectTrigger className='h-7 text-xs'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='json'>JSON 路径</SelectItem>
                      <SelectItem value='header'>响应头</SelectItem>
                      <SelectItem value='regex'>正则提取</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className='grid gap-1'>
                  <Label className='text-[10px]'>
                    {ext.source === 'json' ? '路径' : ext.source === 'header' ? '头名称' : '正则'}
                  </Label>
                  <Input
                    className='h-7 text-xs font-mono'
                    value={ext.source === 'regex' ? (ext.pattern ?? '') : ext.path}
                    placeholder={
                      ext.source === 'json'
                        ? 'data.token'
                        : ext.source === 'header'
                          ? 'Authorization'
                          : '"token":"([^"]+)"'
                    }
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const next = [...extractions];
                      if (ext.source === 'regex') {
                        next[i] = { ...next[i], pattern: e.target.value };
                      } else {
                        next[i] = { ...next[i], path: e.target.value };
                      }
                      onChangeExtractions(next);
                    }}
                  />
                </div>
              </div>
              <div className='flex items-center justify-between'>
                <Switch
                  checked={ext.enabled}
                  onCheckedChange={enabled => {
                    const next = [...extractions];
                    next[i] = { ...next[i], enabled };
                    onChangeExtractions(next);
                  }}
                  className='scale-75'
                />
                <button
                  type='button'
                  onClick={() => onChangeExtractions(extractions.filter((_, idx) => idx !== i))}
                  className='p-0.5'
                >
                  <Trash2 className='h-3.5 w-3.5 text-muted-foreground' />
                </button>
              </div>
            </div>
          ))}
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7 text-xs'
            onClick={() =>
              onChangeExtractions([
                ...extractions,
                { id: uid(), name: '', source: 'json', path: '', enabled: true },
              ])
            }
          >
            <Plus className='mr-1 h-3.5 w-3.5' />
            添加提取规则
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ════════════════════════════════════════════════════════════════
// Presets Section
// ════════════════════════════════════════════════════════════════

const PRESETS: Array<{
  name: string;
  description: string;
  meta: ApiTestMeta;
}> = [
  {
    name: '健康检查',
    description: '验证 API 返回 200 且响应时间 ≤ 3s',
    meta: {
      assertions: [
        { id: uid(), type: 'status', enabled: true, expected: 200 },
        { id: uid(), type: 'responseTime', enabled: true, max: 3000 },
      ],
      endpoints: [],
      variables: [],
      extractions: [],
    },
  },
  {
    name: 'JSON API 验证',
    description: '验证状态码 200、Content-Type 为 JSON、响应体为合法 JSON 对象',
    meta: {
      assertions: [
        { id: uid(), type: 'status', enabled: true, expected: 200 },
        {
          id: uid(),
          type: 'header',
          enabled: true,
          name: 'content-type',
          value: 'application/json',
        },
        { id: uid(), type: 'jsonSchema', enabled: true, schema: { type: 'object' } },
        { id: uid(), type: 'responseTime', enabled: true, max: 5000 },
      ],
      endpoints: [],
      variables: [],
      extractions: [],
    },
  },
  {
    name: 'CRUD 流程',
    description: '创建 → 读取 → 更新 → 删除，链式变量传递',
    meta: {
      assertions: [],
      endpoints: [
        {
          id: uid(),
          name: 'POST 创建',
          url: '{{baseUrl}}/items',
          method: 'POST',
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          body: '{"name": "test-item"}',
          bodyType: 'json',
          assertions: [],
          variables: {},
          enabled: true,
        },
        {
          id: uid(),
          name: 'GET 读取',
          url: '{{baseUrl}}/items/{{itemId}}',
          method: 'GET',
          headers: [],
          body: '',
          bodyType: 'none',
          assertions: [],
          variables: {},
          enabled: true,
        },
        {
          id: uid(),
          name: 'PUT 更新',
          url: '{{baseUrl}}/items/{{itemId}}',
          method: 'PUT',
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          body: '{"name": "updated-item"}',
          bodyType: 'json',
          assertions: [],
          variables: {},
          enabled: true,
        },
        {
          id: uid(),
          name: 'DELETE 删除',
          url: '{{baseUrl}}/items/{{itemId}}',
          method: 'DELETE',
          headers: [],
          body: '',
          bodyType: 'none',
          assertions: [],
          variables: {},
          enabled: true,
        },
      ],
      variables: [{ key: 'baseUrl', value: 'https://api.example.com', enabled: true }],
      extractions: [{ id: uid(), name: 'itemId', source: 'json', path: 'data.id', enabled: true }],
    },
  },
  {
    name: '认证流程',
    description: '登录获取 Token → 使用 Token 调用受保护接口',
    meta: {
      assertions: [],
      endpoints: [
        {
          id: uid(),
          name: '登录',
          url: '{{baseUrl}}/auth/login',
          method: 'POST',
          headers: [{ key: 'Content-Type', value: 'application/json', enabled: true }],
          body: '{"username": "{{username}}", "password": "{{password}}"}',
          bodyType: 'json',
          assertions: [],
          variables: {},
          enabled: true,
        },
        {
          id: uid(),
          name: '受保护接口',
          url: '{{baseUrl}}/api/profile',
          method: 'GET',
          headers: [{ key: 'Authorization', value: 'Bearer {{token}}', enabled: true }],
          body: '',
          bodyType: 'none',
          assertions: [],
          variables: {},
          enabled: true,
        },
      ],
      variables: [
        { key: 'baseUrl', value: 'https://api.example.com', enabled: true },
        { key: 'username', value: 'admin', enabled: true },
        { key: 'password', value: 'password', enabled: true },
      ],
      extractions: [
        { id: uid(), name: 'token', source: 'json', path: 'data.token', enabled: true },
      ],
    },
  },
];
