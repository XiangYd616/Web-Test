
// Mock Storybook types for development
interface Meta<T = any> {
    title: string;
    component: T;
    parameters?: any;
    decorators?: unknown[];
    argTypes?: any;
    tags?: string[];
}

interface StoryObj<T = any> {
    args?: any;
    parameters?: any;
    render?: (args: any) => any;
}

// Mock action function
const action = (name: string) => (...args: unknown[]) => Logger.debug(name, { args: args.map(String) });

/**
 * Input组件Storybook文档
 */

// import { action } from '@storybook/addon-actions'; // Storybook未安装
// import type { Meta, StoryObj } from '@storybook/react'; // Storybook未安装
import Logger from '@/utils/logger';
import { Lock, Mail, Phone, Search, User } from 'lucide-react';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { Input, NumberInput, PasswordInput, SearchInput, Select, Textarea } from '../Input';

const meta: Meta<typeof Input> = {
    title: 'UI组件/Input',
    component: Input,
    parameters: {
        layout: 'centered',
        docs: {
            description: {
                component: '通用输入框组件，支持多种类型、变体和状态。包含标签、描述、错误提示等完整的表单功能。',
            },
        },
    },
    decorators: [
        (Story: any) => (
            <ThemeProvider>
                <div className="p-4 w-80">
                    <Story />
                </div>
            </ThemeProvider>
        ),
    ],
    argTypes: {
        variant: {
            control: 'select',
            options: ['default', 'filled', 'outlined'],
            description: '输入框变体样式',
        },
        size: {
            control: 'select',
            options: ['sm', 'md', 'lg'],
            description: '输入框尺寸',
        },
        type: {
            control: 'select',
            options: ['text', 'email', 'password', 'number', 'tel', 'url', 'search'],
            description: '输入框类型',
        },
        disabled: {
            control: 'boolean',
            description: '禁用状态',
        },
        loading: {
            control: 'boolean',
            description: '加载状态',
        },
        required: {
            control: 'boolean',
            description: '必填字段',
        },
        onChange: {
            action: 'changed',
            description: '值变化事件处理器',
        },
    },
    tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Input>;

// 基础示例
export const Default: Story = {
    args: {
        placeholder: '请输入内容',
        onChange: action('input-change'),
    },
};

// 带标签示例
export const WithLabel: Story = {
    args: {
        label: '用户名',
        placeholder: '请输入用户名',
        onChange: action('input-change'),
    },
};

// 必填字段示例
export const Required: Story = {
    args: {
        label: '邮箱地址',
        placeholder: '请输入邮箱地址',
        required: true,
        onChange: action('input-change'),
    },
};

// 带描述示例
export const WithDescription: Story = {
    args: {
        label: '密码',
        placeholder: '请输入密码',
        description: '密码长度至少8位，包含字母和数字',
        type: 'password',
        onChange: action('input-change'),
    },
};

// 状态示例
export const States: Story = {
    render: () => (
        <div className="space-y-4">
            <Input
                label="正常状态"
                placeholder="正常输入框"
                onChange={action('normal-change')}
            />
            <Input
                label="成功状态"
                placeholder="输入正确"
                success="输入格式正确"
                onChange={action('success-change')}
            />
            <Input
                label="错误状态"
                placeholder="输入错误"
                error="请输入有效的邮箱地址"
                onChange={action('error-change')}
            />
            <Input
                label="加载状态"
                placeholder="验证中..."
                loading
                onChange={action('loading-change')}
            />
            <Input
                label="禁用状态"
                placeholder="禁用输入框"
                disabled
                onChange={action('disabled-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '输入框支持多种状态：正常、成功、错误、加载和禁用状态。',
            },
        },
    },
};

// 变体示例
export const Variants: Story = {
    render: () => (
        <div className="space-y-4">
            <Input
                label="默认变体"
                variant="default"
                placeholder="默认样式"
                onChange={action('default-change')}
            />
            <Input
                label="填充变体"
                variant="filled"
                placeholder="填充样式"
                onChange={action('filled-change')}
            />
            <Input
                label="轮廓变体"
                variant="outlined"
                placeholder="轮廓样式"
                onChange={action('outlined-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '输入框支持三种变体样式：默认、填充和轮廓样式。',
            },
        },
    },
};

// 尺寸示例
export const Sizes: Story = {
    render: () => (
        <div className="space-y-4">
            <Input
                label="小尺寸"
                size="sm"
                placeholder="小尺寸输入框"
                onChange={action('sm-change')}
            />
            <Input
                label="中等尺寸"
                size="md"
                placeholder="中等尺寸输入框"
                onChange={action('md-change')}
            />
            <Input
                label="大尺寸"
                size="lg"
                placeholder="大尺寸输入框"
                onChange={action('lg-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '输入框支持三种尺寸：小、中、大，适应不同的界面需求。',
            },
        },
    },
};

// 带图标示例
export const WithIcons: Story = {
    render: () => (
        <div className="space-y-4">
            <Input
                label="左侧图标"
                leftIcon={<User className="w-4 h-4" />}
                placeholder="用户名"
                onChange={action('left-icon-change')}
            />
            <Input
                label="右侧图标"
                rightIcon={<Mail className="w-4 h-4" />}
                placeholder="邮箱地址"
                onChange={action('right-icon-change')}
            />
            <Input
                label="双侧图标"
                leftIcon={<Phone className="w-4 h-4" />}
                rightIcon={<Search className="w-4 h-4" />}
                placeholder="搜索电话号码"
                onChange={action('both-icons-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '输入框支持左侧、右侧或双侧图标，增强视觉识别和用户体验。',
            },
        },
    },
};

// 不同类型示例
export const Types: Story = {
    render: () => (
        <div className="space-y-4">
            <Input
                label="文本输入"
                type="text"
                placeholder="请输入文本"
                onChange={action('text-change')}
            />
            <Input
                label="邮箱输入"
                type="email"
                placeholder="请输入邮箱"
                leftIcon={<Mail className="w-4 h-4" />}
                onChange={action('email-change')}
            />
            <Input
                label="密码输入"
                type="password"
                placeholder="请输入密码"
                leftIcon={<Lock className="w-4 h-4" />}
                onChange={action('password-change')}
            />
            <Input
                label="数字输入"
                type="number"
                placeholder="请输入数字"
                onChange={action('number-change')}
            />
            <Input
                label="电话输入"
                type="tel"
                placeholder="请输入电话号码"
                leftIcon={<Phone className="w-4 h-4" />}
                onChange={action('tel-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '输入框支持多种HTML5输入类型，提供相应的键盘和验证支持。',
            },
        },
    },
};

// 密码输入组件示例
export const PasswordInputComponent: Story = {
    render: () => (
        <div className="space-y-4">
            <PasswordInput
                label="密码"
                placeholder="请输入密码"
                onChange={action('password-input-change')}
            />
            <PasswordInput
                label="确认密码"
                placeholder="请再次输入密码"
                description="密码必须包含至少8个字符"
                onChange={action('confirm-password-change')}
            />
            <PasswordInput
                label="无切换按钮"
                placeholder="无法查看密码"
                showToggle={false}
                onChange={action('no-toggle-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '密码输入组件提供密码可见性切换功能，可以选择是否显示切换按钮。',
            },
        },
    },
};

// 搜索输入组件示例
export const SearchInputComponent: Story = {
    render: () => (
        <div className="space-y-4">
            <SearchInput
                placeholder="搜索内容"
                onSearch={action('search')}
                onClear={action('clear')}
                onChange={action('search-input-change')}
            />
            <SearchInput
                label="高级搜索"
                placeholder="输入关键词搜索"
                description="按Enter键开始搜索"
                onSearch={action('advanced-search')}
                onChange={action('advanced-search-change')}
            />
            <SearchInput
                placeholder="无清除按钮"
                showClearButton={false}
                onSearch={action('no-clear-search')}
                onChange={action('no-clear-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '搜索输入组件内置搜索图标和清除功能，支持Enter键搜索。',
            },
        },
    },
};

// 数字输入组件示例
export const NumberInputComponent: Story = {
    render: () => (
        <div className="space-y-4">
            <NumberInput
                label="数量"
                placeholder="请输入数量"
                min={0}
                max={100}
                onChange={action('number-input-change')}
            />
            <NumberInput
                label="价格"
                placeholder="请输入价格"
                step={0.01}
                min={0}
                onChange={action('price-change')}
            />
            <NumberInput
                label="无控制按钮"
                placeholder="纯数字输入"
                showControls={false}
                onChange={action('no-controls-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '数字输入组件支持最小值、最大值、步长设置，可选择是否显示增减控制按钮。',
            },
        },
    },
};

// 文本域组件示例
export const TextareaComponent: Story = {
    render: () => (
        <div className="space-y-4">
            <Textarea
                label="描述"
                placeholder="请输入详细描述"
                onChange={action('textarea-change')}
            />
            <Textarea
                label="评论"
                placeholder="请输入您的评论"
                description="最多500个字符"
                maxLength={500}
                onChange={action('comment-change')}
            />
            <Textarea
                label="固定大小"
                placeholder="不可调整大小"
                resize="none"
                rows={3}
                onChange={action('fixed-size-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '文本域组件支持多行文本输入，可设置调整大小方式和行数。',
            },
        },
    },
};

// 选择框组件示例
export const SelectComponent: Story = {
    render: () => {
        const options = [
            { value: '1', label: '选项1' },
            { value: '2', label: '选项2' },
            { value: '3', label: '选项3' },
            { value: '4', label: '禁用选项', disabled: true },
        ];

        return (
            <div className="space-y-4">
                <Select
                    label="基础选择"
                    options={options}
                    placeholder="请选择"
                    onChange={action('select-change')}
                />
                <Select
                    label="必选项"
                    options={options}
                    required
                    onChange={action('required-select-change')}
                />
                <Select
                    label="带描述"
                    options={options}
                    description="请选择一个选项"
                    onChange={action('described-select-change')}
                />
            </div>
        );
    },
    parameters: {
        docs: {
            description: {
                story: '选择框组件支持选项列表、占位符、禁用选项等功能。',
            },
        },
    },
};

// 表单示例
export const FormExample: Story = {
    render: () => (
        <form className="space-y-4">
            <Input
                label="姓名"
                placeholder="请输入姓名"
                required
                leftIcon={<User className="w-4 h-4" />}
                onChange={action('name-change')}
            />
            <Input
                label="邮箱"
                type="email"
                placeholder="请输入邮箱地址"
                required
                leftIcon={<Mail className="w-4 h-4" />}
                onChange={action('email-change')}
            />
            <PasswordInput
                label="密码"
                placeholder="请输入密码"
                required
                description="密码长度至少8位"
                onChange={action('password-change')}
            />
            <NumberInput
                label="年龄"
                placeholder="请输入年龄"
                min={1}
                max={120}
                onChange={action('age-change')}
            />
            <Textarea
                label="个人简介"
                placeholder="请简单介绍一下自己"
                rows={4}
                onChange={action('bio-change')}
            />
        </form>
    ),
    parameters: {
        docs: {
            description: {
                story: '完整的表单示例，展示各种输入组件的组合使用。',
            },
        },
    },
};

// 可访问性示例
export const Accessibility: Story = {
    render: () => (
        <div className="space-y-4">
            <div className="text-sm text-gray-600 mb-4">
                使用Tab键导航表单字段，屏幕阅读器会读取标签和描述信息
            </div>
            <Input
                label="可访问输入框"
                placeholder="支持屏幕阅读器"
                description="这个输入框完全支持可访问性"
                onChange={action('accessible-change')}
            />
            <Input
                label="错误状态"
                error="这是错误信息，会被屏幕阅读器读取"
                onChange={action('error-accessible-change')}
            />
            <Input
                label="必填字段"
                required
                placeholder="必填字段会有相应的aria属性"
                onChange={action('required-accessible-change')}
            />
        </div>
    ),
    parameters: {
        docs: {
            description: {
                story: '输入组件完全支持键盘导航和屏幕阅读器，符合WCAG可访问性标准。',
            },
        },
    },
};