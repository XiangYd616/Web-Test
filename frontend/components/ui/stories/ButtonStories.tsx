
// Mock Storybook types for development
interface Meta<T = any> {
    title: string;
    component: T;
    parameters?: any;
    decorators?: any[];
    argTypes?: any;
    tags?: string[];
}

interface StoryObj<T = any> {
    args?: any;
    parameters?: any;
    render?: (args: any) => any;
}

// Mock action function
const action = (name: string) => (...args: any[]) => 

/**
 * Button组件Storybook文档
 */

import React from 'react';
// import { action } from '@storybook/addon-actions'; // Storybook未安装
// import type { Meta, StoryObj } from '@storybook/react'; // Storybook未安装
import { Download, Play, Plus, Settings, Trash2 } from 'lucide-react';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { Button, DeleteButton, GhostButton, IconButton, OutlineButton, PrimaryButton, SecondaryButton } from '../Button';

const meta: Meta<typeof Button> = {
    title: 'UI组件/Button',
    component: Button,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: '通用按钮组件，支持多种变体、尺寸和状态。提供良好的可访问性和键盘导航支持。',
            },
        },
    },
    decorators: [
        (Story: any) => (
            <ThemeProvider>
                <div className="p-4">
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'danger', 'ghost', 'outline'],
            description: '按钮变体样式',
        },
        size: {
            control: 'select',
            options: ['xs', 'sm', 'md', 'lg', 'xl'],
            description: '按钮尺寸',
        },
        loading: {
            control: 'boolean',
            description: '加载状态',
        },
        disabled: {
            control: 'boolean',
            description: '禁用状态',
        },
        iconPosition: {
            control: 'select',
            options: ['left', 'right'],
            description: '图标位置',
        },
        onClick: {
            action: 'clicked',
            description: '点击事件处理器',
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

// 基础示例
export const Default: Story = {
    args: {
        children: '默认按钮',
        onClick: action('button-click'),
    },
};

// 变体示例
export const Variants: Story = {
    render: () => (
        <div className="flex flex-wrap gap-4">
            <Button variant="primary" onClick={action('primary-click')}>
                主要按钮
            </Button>
            <Button variant="secondary" onClick={action('secondary-click')}>
                次要按钮
            </Button>
            <Button variant="danger" onClick={action('danger-click')}>
                危险按钮
            </Button>
            <Button variant="ghost" onClick={action('ghost-click')}>
                幽灵按钮
            </Button>
            <Button variant="outline" onClick={action('outline-click')}>
                轮廓按钮
            </Button>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '按钮支持5种不同的变体样式，适用于不同的使用场景。',
            },
        },
    },
};

// 尺寸示例
export const Sizes: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-4">
            <Button size="xs" onClick={action('xs-click')}>
                超小按钮
            </Button>
            <Button size="sm" onClick={action('sm-click')}>
                小按钮
            </Button>
            <Button size="md" onClick={action('md-click')}>
                中等按钮
            </Button>
            <Button size="lg" onClick={action('lg-click')}>
                大按钮
            </Button>
            <Button size="xl" onClick={action('xl-click')}>
                超大按钮
            </Button>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '按钮支持5种不同的尺寸，从xs到xl，满足不同界面需求。',
            },
        },
    },
};

// 状态示例
export const States: Story = {
    render: () => (
        <div className="flex flex-wrap gap-4">
            <Button onClick={action('normal-click')}>
                正常状态
            </Button>
            <Button loading onClick={action('loading-click')}>
                加载状态
            </Button>
            <Button disabled onClick={action('disabled-click')}>
                禁用状态
            </Button>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '按钮支持正常、加载和禁用三种状态。加载状态会显示旋转图标并禁用交互。',
            },
        },
    },
};

// 带图标示例
export const WithIcons: Story = {
    render: () => (
        <div className="flex flex-wrap gap-4">
            <Button icon={<Play className="w-4 h-4" />} iconPosition="left" onClick={action('play-click')}>
                播放
            </Button>
            <Button icon={<Download className="w-4 h-4" />} iconPosition="right" variant="secondary" onClick={action('download-click')}>
                下载
            </Button>
            <Button icon={<Settings className="w-4 h-4" />} variant="ghost" onClick={action('settings-click')}>
                设置
            </Button>
            <Button icon={<Trash2 className="w-4 h-4" />} variant="danger" onClick={action('delete-click')}>
                删除
            </Button>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '按钮支持左侧或右侧图标，图标可以增强按钮的语义表达。',
            },
        },
    },
};

// 专用按钮组件示例
export const SpecializedButtons: Story = {
    render: () => (
        <div className="flex flex-wrap gap-4">
            <PrimaryButton onClick={action('primary-specialized-click')}>
                主要按钮
            </PrimaryButton>
            <SecondaryButton onClick={action('secondary-specialized-click')}>
                次要按钮
            </SecondaryButton>
            <DeleteButton onClick={action('delete-specialized-click')}>
                删除按钮
            </DeleteButton>
            <GhostButton onClick={action('ghost-specialized-click')}>
                幽灵按钮
            </GhostButton>
            <OutlineButton onClick={action('outline-specialized-click')}>
                轮廓按钮
            </OutlineButton>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '提供预设变体的专用按钮组件，简化常用按钮的使用。',
            },
        },
    },
};

// 图标按钮示例
export const IconButtons: Story = {
    render: () => (
        <div className="flex flex-wrap gap-4">
            <IconButton
                icon={<Plus className="w-4 h-4" />}
                aria-label="添加"
                onClick={action('add-click')}
            />
            <IconButton
                icon={<Settings className="w-4 h-4" />}
                aria-label="设置"
                variant="secondary"
                onClick={action('settings-icon-click')}
            />
            <IconButton
                icon={<Trash2 className="w-4 h-4" />}
                aria-label="删除"
                variant="danger"
                onClick={action('delete-icon-click')}
            />
            <IconButton
                icon={<Download className="w-4 h-4" />}
                aria-label="下载"
                variant="ghost"
                size="lg"
                onClick={action('download-icon-click')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '图标按钮适用于工具栏、操作栏等需要紧凑布局的场景。必须提供aria-label以确保可访问性。',
            },
        },
    },
};

// 交互示例
export const Interactive: Story = {
    args: {
        children: '点击我',
        onClick: action('interactive-click'),
    },
    parameters: {
        docs: {
            description: {
                story: '点击按钮查看交互效果，支持鼠标点击和键盘操作（Enter/Space）。',
            },
        },
    },
};

// 加载状态动画示例
export const LoadingAnimation: Story = {
    render: () => {
        const [loading, setLoading] = React.useState(false);

        const handleClick = () => {
            setLoading(true);
            setTimeout(() => setLoading(false), 2000);
        };

        return (
            <Button loading={loading} onClick={handleClick}>
                {loading ? '处理中...' : '点击开始处理'}
            </Button>
        );
    },
    parameters: {
        docs: {
            description: {
                story: '演示加载状态的动画效果，点击按钮后会显示2秒的加载动画。',
            },
        },
    },
};

// 响应式示例
export const Responsive: Story = {
    render: () => (
        <div className="w-full space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
                <Button className="w-full sm:w-auto" onClick={action('responsive-1-click')}>
                    响应式按钮 1
                </Button>
                <Button className="w-full sm:w-auto" variant="secondary" onClick={action('responsive-2-click')}>
                    响应式按钮 2
                </Button>
            </div>
            <Button className="w-full" variant="primary" onClick={action('full-width-click')}>
                全宽按钮
            </Button>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '按钮支持响应式布局，可以根据屏幕尺寸调整宽度和排列方式。',
            },
        },
    },
};

// 可访问性示例
export const Accessibility: Story = {
    render: () => (
        <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
                使用Tab键导航，Enter或Space键激活按钮
            </div>
            <div className="flex flex-wrap gap-4">
                <Button onClick={action('accessible-1-click')}>
                    可访问按钮 1
                </Button>
                <Button variant="secondary" onClick={action('accessible-2-click')}>
                    可访问按钮 2
                </Button>
                <IconButton
                    icon={<Settings className="w-4 h-4" />}
                    aria-label="打开设置"
                    onClick={action('accessible-icon-click')}
                />
            </div>
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '按钮组件完全支持键盘导航和屏幕阅读器，符合WCAG可访问性标准。',
            },
        },
    },
};