# 组件API文档

## Button 按钮组件

### 基础用法

```tsx
import { Button } from '@/components/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  点击我
</Button>
```

### API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'danger' \| 'info' \| 'outline'` | `'primary'` | 按钮变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 按钮尺寸 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否显示加载状态 |
| `fullWidth` | `boolean` | `false` | 是否占满宽度 |
| `icon` | `React.ReactNode` | - | 图标元素 |
| `onClick` | `(event: React.MouseEvent) => void` | - | 点击事件 |
| `children` | `React.ReactNode` | - | 按钮内容 |
| `className` | `string` | - | 自定义CSS类 |

### 示例

```tsx
// 不同变体
<Button variant="primary">主要按钮</Button>
<Button variant="secondary">次要按钮</Button>
<Button variant="outline">轮廓按钮</Button>

// 不同尺寸
<Button size="sm">小按钮</Button>
<Button size="md">中等按钮</Button>
<Button size="lg">大按钮</Button>

// 状态
<Button disabled>禁用按钮</Button>
<Button loading>加载中...</Button>

// 带图标
<Button icon={<SearchIcon />}>搜索</Button>
```

---

## Card 卡片组件

### 基础用法

```tsx
import { Card } from '@/components/ui';

<Card header="标题" footer="底部内容">
  卡片内容
</Card>
```

### API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `'default' \| 'elevated' \| 'outlined' \| 'filled'` | `'default'` | 卡片变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 卡片尺寸 |
| `header` | `React.ReactNode` | - | 头部内容 |
| `footer` | `React.ReactNode` | - | 底部内容 |
| `actions` | `React.ReactNode` | - | 操作按钮区域 |
| `image` | `string` | - | 图片URL |
| `imageAlt` | `string` | - | 图片替代文本 |
| `clickable` | `boolean` | `false` | 是否可点击 |
| `hover` | `boolean` | `false` | 是否有悬停效果 |
| `loading` | `boolean` | `false` | 是否显示加载状态 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `onClick` | `(event: React.MouseEvent) => void` | - | 点击事件 |
| `children` | `React.ReactNode` | - | 卡片内容 |
| `className` | `string` | - | 自定义CSS类 |

### 示例

```tsx
// 基础卡片
<Card>
  <p>这是一个基础卡片</p>
</Card>

// 带头部和底部
<Card 
  header="用户信息"
  footer={<Button size="sm">编辑</Button>}
>
  <p>用户详细信息...</p>
</Card>

// 可点击卡片
<Card clickable onClick={handleCardClick}>
  <p>点击这个卡片</p>
</Card>

// 带图片的卡片
<Card 
  image="/avatar.jpg"
  imageAlt="用户头像"
  header="张三"
>
  <p>前端开发工程师</p>
</Card>
```

---

## Input 输入组件

### 基础用法

```tsx
import { Input, Select, Textarea } from '@/components/ui';

<Input 
  label="用户名"
  placeholder="请输入用户名"
  value={username}
  onChange={handleChange}
/>
```

### Input API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `type` | `'text' \| 'email' \| 'password' \| 'number' \| 'tel' \| 'url'` | `'text'` | 输入类型 |
| `label` | `string` | - | 标签文本 |
| `placeholder` | `string` | - | 占位符文本 |
| `value` | `string` | - | 输入值 |
| `defaultValue` | `string` | - | 默认值 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 输入框尺寸 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `readOnly` | `boolean` | `false` | 是否只读 |
| `required` | `boolean` | `false` | 是否必填 |
| `error` | `string` | - | 错误信息 |
| `helpText` | `string` | - | 帮助文本 |
| `prefix` | `React.ReactNode` | - | 前缀内容 |
| `suffix` | `React.ReactNode` | - | 后缀内容 |
| `onChange` | `(event: React.ChangeEvent<HTMLInputElement>) => void` | - | 值变化事件 |
| `onFocus` | `(event: React.FocusEvent<HTMLInputElement>) => void` | - | 获得焦点事件 |
| `onBlur` | `(event: React.FocusEvent<HTMLInputElement>) => void` | - | 失去焦点事件 |
| `className` | `string` | - | 自定义CSS类 |

### Select API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `options` | `Array<{value: string, label: string}>` | `[]` | 选项列表 |
| `value` | `string \| string[]` | - | 选中值 |
| `defaultValue` | `string \| string[]` | - | 默认选中值 |
| `placeholder` | `string` | - | 占位符文本 |
| `multiple` | `boolean` | `false` | 是否多选 |
| `searchable` | `boolean` | `false` | 是否可搜索 |
| `clearable` | `boolean` | `false` | 是否可清除 |
| `disabled` | `boolean` | `false` | 是否禁用 |
| `loading` | `boolean` | `false` | 是否显示加载状态 |
| `onChange` | `(value: string \| string[]) => void` | - | 值变化事件 |

### 示例

```tsx
// 基础输入框
<Input 
  label="邮箱"
  type="email"
  placeholder="请输入邮箱地址"
  required
/>

// 带错误信息
<Input 
  label="密码"
  type="password"
  error="密码长度至少8位"
/>

// 带前缀后缀
<Input 
  label="价格"
  type="number"
  prefix="¥"
  suffix=".00"
/>

// 下拉选择
<Select 
  label="城市"
  options={[
    { value: 'beijing', label: '北京' },
    { value: 'shanghai', label: '上海' },
    { value: 'guangzhou', label: '广州' }
  ]}
  placeholder="请选择城市"
/>

// 文本域
<Textarea 
  label="描述"
  placeholder="请输入描述信息"
  rows={4}
/>
```

---

## Table 表格组件

### 基础用法

```tsx
import { Table } from '@/components/ui';

const columns = [
  { key: 'name', title: '姓名', sortable: true },
  { key: 'age', title: '年龄', sortable: true },
  { key: 'email', title: '邮箱' }
];

const data = [
  { name: '张三', age: 25, email: 'zhang@example.com' },
  { name: '李四', age: 30, email: 'li@example.com' }
];

<Table columns={columns} data={data} />
```

### API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `columns` | `Array<Column>` | `[]` | 列配置 |
| `data` | `Array<any>` | `[]` | 数据源 |
| `loading` | `boolean` | `false` | 是否显示加载状态 |
| `selectable` | `boolean` | `false` | 是否可选择行 |
| `selectedRows` | `Array<any>` | `[]` | 选中的行 |
| `sortBy` | `string` | - | 排序字段 |
| `sortOrder` | `'asc' \| 'desc'` | `'asc'` | 排序方向 |
| `pagination` | `PaginationConfig` | - | 分页配置 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 表格尺寸 |
| `striped` | `boolean` | `false` | 是否显示斑马纹 |
| `bordered` | `boolean` | `false` | 是否显示边框 |
| `hover` | `boolean` | `false` | 是否显示悬停效果 |
| `emptyMessage` | `string` | `'暂无数据'` | 空数据提示 |
| `onSort` | `(field: string, order: 'asc' \| 'desc') => void` | - | 排序事件 |
| `onSelectionChange` | `(selectedRows: any[]) => void` | - | 选择变化事件 |
| `onRowClick` | `(row: any, index: number) => void` | - | 行点击事件 |

### Column 配置

```tsx
interface Column {
  key: string;           // 数据字段名
  title: string;         // 列标题
  sortable?: boolean;    // 是否可排序
  width?: string;        // 列宽度
  align?: 'left' | 'center' | 'right'; // 对齐方式
  render?: (value: any, row: any, index: number) => React.ReactNode; // 自定义渲染
}
```

### 示例

```tsx
// 基础表格
<Table columns={columns} data={data} />

// 可选择表格
<Table 
  columns={columns} 
  data={data} 
  selectable
  onSelectionChange={handleSelectionChange}
/>

// 带分页表格
<Table 
  columns={columns} 
  data={data} 
  pagination={{
    current: 1,
    pageSize: 10,
    total: 100,
    onChange: handlePageChange
  }}
/>

// 自定义列渲染
const columns = [
  { key: 'name', title: '姓名' },
  { 
    key: 'status', 
    title: '状态',
    render: (value) => (
      <Badge variant={value === 'active' ? 'success' : 'danger'}>
        {value === 'active' ? '活跃' : '禁用'}
      </Badge>
    )
  }
];
```

---

## Badge 标签组件

### 基础用法

```tsx
import { Badge, StatusBadge, DotBadge, ProgressBadge } from '@/components/ui';

<Badge variant="success">成功</Badge>
```

### Badge API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `variant` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'primary'` | 标签变体 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 标签尺寸 |
| `icon` | `React.ReactNode` | - | 图标 |
| `removable` | `boolean` | `false` | 是否可移除 |
| `onClick` | `(event: React.MouseEvent) => void` | - | 点击事件 |
| `onRemove` | `() => void` | - | 移除事件 |
| `children` | `React.ReactNode` | - | 标签内容 |

### 示例

```tsx
// 基础标签
<Badge variant="primary">主要</Badge>
<Badge variant="success">成功</Badge>
<Badge variant="warning">警告</Badge>
<Badge variant="danger">危险</Badge>

// 状态标签
<StatusBadge status="online">在线</StatusBadge>
<StatusBadge status="offline">离线</StatusBadge>
<StatusBadge status="busy">忙碌</StatusBadge>

// 点状标签
<DotBadge variant="success" />
<DotBadge variant="warning" pulse />

// 进度标签
<ProgressBadge value={75} variant="success" />
<ProgressBadge value={45} showProgress />
```

---

## Loading 加载组件

### 基础用法

```tsx
import { Loading, LoadingSpinner, LoadingSkeleton, LoadingOverlay } from '@/components/ui';

<Loading type="spinner" size="md" />
```

### API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `type` | `'spinner' \| 'dots' \| 'pulse'` | `'spinner'` | 加载类型 |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | 加载器尺寸 |
| `color` | `'primary' \| 'secondary' \| 'success' \| 'warning' \| 'danger'` | `'primary'` | 颜色 |
| `text` | `string` | - | 加载文本 |

### 示例

```tsx
// 基础加载器
<Loading type="spinner" />
<Loading type="dots" />
<Loading type="pulse" />

// 带文本
<Loading type="spinner" text="加载中..." />

// 骨架屏
<LoadingSkeleton variant="text" lines={3} />
<LoadingSkeleton variant="rectangular" width="200px" height="100px" />

// 加载遮罩
<LoadingOverlay loading={isLoading}>
  <div>内容区域</div>
</LoadingOverlay>
```

---

## Modal 模态框组件

### 基础用法

```tsx
import { Modal } from '@/components/ui';

<Modal 
  open={isOpen} 
  onClose={handleClose}
  title="模态框标题"
>
  <p>模态框内容</p>
</Modal>
```

### API

| 属性 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `open` | `boolean` | `false` | 是否显示 |
| `title` | `string` | - | 标题 |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | 尺寸 |
| `variant` | `'default' \| 'success' \| 'warning' \| 'danger'` | `'default'` | 变体 |
| `centered` | `boolean` | `false` | 是否居中 |
| `fullscreen` | `boolean` | `false` | 是否全屏 |
| `scrollable` | `boolean` | `false` | 内容是否可滚动 |
| `closeOnOverlayClick` | `boolean` | `true` | 点击遮罩是否关闭 |
| `closeOnEscape` | `boolean` | `true` | 按ESC是否关闭 |
| `header` | `React.ReactNode` | - | 自定义头部 |
| `footer` | `React.ReactNode` | - | 底部内容 |
| `onClose` | `() => void` | - | 关闭事件 |
| `children` | `React.ReactNode` | - | 模态框内容 |

### 示例

```tsx
// 基础模态框
<Modal open={isOpen} onClose={handleClose} title="确认删除">
  <p>确定要删除这个项目吗？</p>
</Modal>

// 带底部按钮
<Modal 
  open={isOpen} 
  onClose={handleClose}
  title="编辑用户"
  footer={
    <div className="flex justify-end space-x-2">
      <Button variant="secondary" onClick={handleClose}>取消</Button>
      <Button variant="primary" onClick={handleSave}>保存</Button>
    </div>
  }
>
  <form>
    <Input label="姓名" />
    <Input label="邮箱" type="email" />
  </form>
</Modal>
```
