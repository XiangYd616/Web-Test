import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import Button from './index';

const meta = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: '按钮组件用于触发操作，支持多种变体、尺寸和状态。',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'success', 'warning', 'danger', 'info', 'outline'],
      description: '按钮变体，控制按钮的视觉样式',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: '按钮尺寸',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用按钮',
    },
    loading: {
      control: 'boolean',
      description: '是否显示加载状态',
    },
    fullWidth: {
      control: 'boolean',
      description: '是否占满容器宽度',
    },
    children: {
      control: 'text',
      description: '按钮内容',
    },
  },
  args: {
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// 基础按钮
export const Default: Story = {
  args: {
    children: '默认按钮',
  },
};

// 不同变体
export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="success">Success</Button>
      <Button variant="warning">Warning</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="info">Info</Button>
      <Button variant="outline">Outline</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '按钮支持多种变体，用于不同的场景和重要性级别。',
      },
    },
  },
};

// 不同尺寸
export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '按钮提供三种尺寸：小、中、大，适应不同的界面密度。',
      },
    },
  },
};

// 状态
export const States: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Button>Normal</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '按钮支持正常、禁用和加载状态。',
      },
    },
  },
};

// 全宽按钮
export const FullWidth: Story = {
  render: () => (
    <div className="w-64">
      <Button fullWidth variant="primary">
        全宽按钮
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '按钮可以设置为占满容器的全部宽度。',
      },
    },
  },
};

// 带图标的按钮
export const WithIcon: Story = {
  render: () => (
    <div className="flex gap-2">
      <Button 
        variant="primary"
        icon={<span>🔍</span>}
      >
        搜索
      </Button>
      <Button 
        variant="secondary"
        icon={<span>📁</span>}
      >
        文件夹
      </Button>
      <Button 
        variant="success"
        icon={<span>✓</span>}
      >
        确认
      </Button>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '按钮可以包含图标来增强视觉表达。',
      },
    },
  },
};

// 交互示例
export const Interactive: Story = {
  args: {
    variant: 'primary',
    size: 'md',
    children: '点击我',
    disabled: false,
    loading: false,
  },
  parameters: {
    docs: {
      description: {
        story: '这是一个交互式的按钮示例，你可以在控制面板中调整属性。',
      },
    },
  },
};

// 响应式示例
export const Responsive: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="block md:hidden">
        <Button fullWidth size="lg">移动端大按钮</Button>
      </div>
      <div className="hidden md:block lg:hidden">
        <Button size="md">平板端中等按钮</Button>
      </div>
      <div className="hidden lg:block">
        <Button size="sm">桌面端小按钮</Button>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '按钮可以根据屏幕尺寸调整大小和布局。',
      },
    },
  },
};

// 无障碍示例
export const Accessibility: Story = {
  render: () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">键盘导航</h3>
        <div className="flex gap-2">
          <Button>Tab导航1</Button>
          <Button>Tab导航2</Button>
          <Button>Tab导航3</Button>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          使用Tab键在按钮间导航，Enter或Space键激活按钮
        </p>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold mb-2">ARIA标签</h3>
        <div className="flex gap-2">
          <Button aria-label="关闭对话框">×</Button>
          <Button aria-describedby="help-text">帮助</Button>
        </div>
        <p id="help-text" className="text-sm text-gray-600 mt-2">
          这个按钮提供帮助信息
        </p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: '按钮支持完整的无障碍功能，包括键盘导航和屏幕阅读器支持。',
      },
    },
  },
};
