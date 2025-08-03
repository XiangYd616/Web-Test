import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import Card from './index';
import Button from '../Button';

const meta = {
  title: 'Components/Card',
  component: Card,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '卡片组件是一个灵活的容器，用于展示相关的信息和操作。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'outlined', 'filled'],
      description: '卡片变体，控制卡片的视觉样式',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '卡片尺寸',
    },
    clickable: {
      control: 'boolean',
      description: '是否可点击',
    },
    hover: {
      control: 'boolean',
      description: '是否有悬停效果',
    },
    loading: {
      control: 'boolean',
      description: '是否显示加载状态',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础卡片
export const Default: Story = {
  args: {
    children: (
      <div>
        <h3 className="text-lg font-semibold mb-2">卡片标题</h3>
        <p className="text-gray-600">这是一个基础的卡片组件，可以包含任何内容。</p>
      </div>
    ),
  },
};

// 不同变体
export const Variants: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-96">
      <Card variant="default">
        <h4 className="font-semibold">Default</h4>
        <p className="text-sm text-gray-600">默认样式</p>
      </Card>
      <Card variant="elevated">
        <h4 className="font-semibold">Elevated</h4>
        <p className="text-sm text-gray-600">阴影效果</p>
      </Card>
      <Card variant="outlined">
        <h4 className="font-semibold">Outlined</h4>
        <p className="text-sm text-gray-600">边框样式</p>
      </Card>
      <Card variant="filled">
        <h4 className="font-semibold">Filled</h4>
        <p className="text-sm text-gray-600">填充背景</p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片支持多种变体，适应不同的设计需求。',
      },
    },
  },
};

// 带头部和底部
export const WithHeaderAndFooter: Story = {
  render: () => (
    <Card
      header="用户信息"
      footer={
        <div className="flex justify-end space-x-2">
          <Button variant="secondary" size="sm">取消</Button>
          <Button variant="primary" size="sm">保存</Button>
        </div>
      }
    >
      <div className="space-y-2">
        <p><strong>姓名:</strong> 张三</p>
        <p><strong>邮箱:</strong> zhang@example.com</p>
        <p><strong>部门:</strong> 前端开发</p>
      </div>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片可以包含头部和底部区域，用于显示标题和操作按钮。',
      },
    },
  },
};

// 带图片的卡片
export const WithImage: Story = {
  render: () => (
    <Card
      image="https://via.placeholder.com/300x200"
      imageAlt="示例图片"
      header="图片卡片"
      actions={<Button size="sm">查看详情</Button>}
    >
      <p className="text-gray-600">
        这是一个带有图片的卡片示例，图片会显示在卡片的顶部。
      </p>
    </Card>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片可以包含图片，通常用于产品展示或内容预览。',
      },
    },
  },
};

// 可点击卡片
export const Clickable: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-96">
      <Card clickable onClick={() => alert('卡片被点击了！')}>
        <h4 className="font-semibold">可点击卡片</h4>
        <p className="text-sm text-gray-600">点击整个卡片区域</p>
      </Card>
      <Card clickable hover>
        <h4 className="font-semibold">悬停效果</h4>
        <p className="text-sm text-gray-600">鼠标悬停时有动画</p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片可以设置为可点击，并支持悬停效果。',
      },
    },
  },
};

// 不同尺寸
export const Sizes: Story = {
  render: () => (
    <div className="space-y-4">
      <Card size="sm">
        <h4 className="font-semibold">小尺寸卡片</h4>
        <p className="text-sm text-gray-600">紧凑的内边距</p>
      </Card>
      <Card size="md">
        <h4 className="font-semibold">中等尺寸卡片</h4>
        <p className="text-sm text-gray-600">标准的内边距</p>
      </Card>
      <Card size="lg">
        <h4 className="font-semibold">大尺寸卡片</h4>
        <p className="text-sm text-gray-600">宽松的内边距</p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片提供三种尺寸，适应不同的内容密度需求。',
      },
    },
  },
};

// 状态
export const States: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 w-96">
      <Card>
        <h4 className="font-semibold">正常状态</h4>
        <p className="text-sm text-gray-600">默认的卡片状态</p>
      </Card>
      <Card loading>
        <h4 className="font-semibold">加载状态</h4>
        <p className="text-sm text-gray-600">显示加载指示器</p>
      </Card>
      <Card disabled>
        <h4 className="font-semibold">禁用状态</h4>
        <p className="text-sm text-gray-600">卡片被禁用</p>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片支持不同的状态：正常、加载和禁用。',
      },
    },
  },
};

// 复杂布局
export const ComplexLayout: Story = {
  render: () => (
    <div className="max-w-md">
      <Card
        variant="elevated"
        header={
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">项目进度</h3>
            <span className="text-sm text-gray-500">75%</span>
          </div>
        }
        footer={
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">截止日期: 2025-08-15</span>
            <Button size="sm" variant="primary">查看详情</Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>前端开发</span>
              <span>90%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-green-500 h-2 rounded-full" style={{ width: '90%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>后端开发</span>
              <span>60%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-blue-500 h-2 rounded-full" style={{ width: '60%' }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>测试</span>
              <span>30%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '30%' }}></div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片可以包含复杂的布局和内容，如进度条、图表等。',
      },
    },
  },
};

// 响应式网格
export const ResponsiveGrid: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }, (_, i) => (
        <Card key={i} variant="outlined">
          <h4 className="font-semibold">卡片 {i + 1}</h4>
          <p className="text-sm text-gray-600">
            这是第 {i + 1} 个卡片，展示响应式网格布局。
          </p>
        </Card>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '卡片在响应式网格中的表现，会根据屏幕尺寸自动调整列数。',
      },
    },
  },
};
