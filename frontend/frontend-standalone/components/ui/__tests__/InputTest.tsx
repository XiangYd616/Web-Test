import { describe, it, expect, vi } from 'vitest';
/**
 * Input组件单元测试
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { ReactElement } from 'react';;
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { Input, NumberInput, PasswordInput, SearchInput, Select, Textarea } from '../Input';

// 测试工具函数
const renderWithTheme = (component: React.ReactElement) => {
  const [error, setError] = useState<string | null>(null);

    return render(
        <ThemeProvider>
            {component}
        </ThemeProvider>
    );
};

describe('Input组件', () => {
    describe('基础功能', () => {
        it('应该正确渲染输入框', () => {
            renderWithTheme(<Input placeholder="请输入内容" />);
            expect(screen.getByPlaceholderText('请输入内容')).toBeInTheDocument();
        });

        it('应该支持受控输入', async () => {
            const handleChange = vi.fn();
            renderWithTheme(<Input value="测试值" onChange={handleChange} />);

            const input = screen.getByDisplayValue('测试值');
            await userEvent.clear(input);
            await userEvent.type(input, '新值');

            expect(handleChange).toHaveBeenCalled();
        });

        it('应该支持非受控输入', async () => {
            renderWithTheme(<Input defaultValue="默认值" />);

            const input = screen.getByDisplayValue('默认值');
            await userEvent.clear(input);
            await userEvent.type(input, '新值');

            expect(input).toHaveValue('新值');
        });

        it('应该支持禁用状态', () => {
            renderWithTheme(<Input disabled placeholder="禁用输入框" />);

            const input = screen.getByPlaceholderText('禁用输入框');
            expect(input).toBeDisabled();
            expect(input).toHaveClass('opacity-50', 'cursor-not-allowed');
        });

        it('应该支持只读状态', () => {
            renderWithTheme(<Input readOnly value="只读内容" />);

            const input = screen.getByDisplayValue('只读内容');
            expect(input).toHaveAttribute('readonly');
        });
    });

    describe('标签和描述', () => {
        it('应该正确渲染标签', () => {
            renderWithTheme(<Input label="用户名" />);
            expect(screen.getByText('用户名')).toBeInTheDocument();
        });

        it('应该显示必填标记', () => {
            renderWithTheme(<Input label="密码" required />);
            expect(screen.getByText('*')).toBeInTheDocument();
            expect(screen.getByText('*')).toHaveClass('text-red-400');
        });

        it('应该显示描述文本', () => {
            renderWithTheme(<Input description="请输入6-20位字符" />);
            expect(screen.getByText('请输入6-20位字符')).toBeInTheDocument();
        });

        it('应该正确关联标签和输入框', () => {
            renderWithTheme(<Input label="邮箱地址" />);

            const label = screen.getByText('邮箱地址');
            const input = screen.getByRole('textbox');

            expect(label).toHaveAttribute('for');
            expect(input).toHaveAttribute('id');
        });
    });

    describe('状态显示', () => {
        it('应该显示错误状态', () => {
            renderWithTheme(<Input error="输入格式不正确" />);

            expect(screen.getByText('输入格式不正确')).toBeInTheDocument();
            expect(screen.getByText('输入格式不正确')).toHaveClass('text-red-400');

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-red-500');
        });

        it('应该显示成功状态', () => {
            renderWithTheme(<Input success="输入正确" />);

            expect(screen.getByText('输入正确')).toBeInTheDocument();
            expect(screen.getByText('输入正确')).toHaveClass('text-green-400');

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('border-green-500');
        });

        it('应该显示加载状态', () => {
            renderWithTheme(<Input loading />);

            const input = screen.getByRole('textbox');
            expect(input.parentElement?.querySelector('.animate-spin')).toBeInTheDocument();
        });
    });

    describe('图标支持', () => {
        const TestIcon = () => <span data-testid="test-icon">🔍</span>;

        it('应该支持左侧图标', () => {
            renderWithTheme(<Input leftIcon={<TestIcon />} />);

            expect(screen.getByTestId('test-icon')).toBeInTheDocument();

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('pl-10');
        });

        it('应该支持右侧图标', () => {
            renderWithTheme(<Input rightIcon={<TestIcon />} />);

            expect(screen.getByTestId('test-icon')).toBeInTheDocument();

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('pr-10');
        });
    });

    describe('变体样式', () => {
        it('应该正确应用default变体样式', () => {
            renderWithTheme(<Input variant="default" />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('bg-gray-700/50', 'border-gray-600/60');
        });

        it('应该正确应用filled变体样式', () => {
            renderWithTheme(<Input variant="filled" />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('bg-gray-700', 'border-gray-700');
        });

        it('应该正确应用outlined变体样式', () => {
            renderWithTheme(<Input variant="outlined" />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('bg-transparent', 'border-gray-600');
        });
    });

    describe('尺寸样式', () => {
        it('应该正确应用sm尺寸样式', () => {
            renderWithTheme(<Input size="sm" />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('px-3', 'py-1.5', 'text-sm');
        });

        it('应该正确应用md尺寸样式（默认）', () => {
            renderWithTheme(<Input size="md" />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('px-3', 'py-2', 'text-sm');
        });

        it('应该正确应用lg尺寸样式', () => {
            renderWithTheme(<Input size="lg" />);

            const input = screen.getByRole('textbox');
            expect(input).toHaveClass('px-4', 'py-3', 'text-base');
        });
    });
});

describe('PasswordInput组件', () => {
    it('应该默认隐藏密码', () => {
        renderWithTheme(<PasswordInput />);

        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('type', 'password');
    });

    it('应该支持切换密码可见性', async () => {
        renderWithTheme(<PasswordInput />);

        const input = screen.getByRole('textbox');
        const toggleButton = screen.getByRole('button');

        expect(input).toHaveAttribute('type', 'password');

        await userEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'text');

        await userEvent.click(toggleButton);
        expect(input).toHaveAttribute('type', 'password');
    });

    it('应该支持禁用切换功能', () => {
        renderWithTheme(<PasswordInput showToggle={false} />);

        expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
});

describe('SearchInput组件', () => {
    it('应该显示搜索图标', () => {
        renderWithTheme(<SearchInput />);

        const input = screen.getByRole('searchbox');
        expect(input.parentElement?.querySelector('svg')).toBeInTheDocument();
    });

    it('应该支持搜索功能', async () => {
        const handleSearch = vi.fn();
        renderWithTheme(<SearchInput onSearch={handleSearch} />);

        const input = screen.getByRole('searchbox');
        await userEvent.type(input, '搜索内容');
        await userEvent.keyboard('{Enter}');

        expect(handleSearch).toHaveBeenCalledWith('搜索内容');
    });

    it('应该支持清除功能', async () => {
        const handleClear = vi.fn();
        renderWithTheme(<SearchInput onClear={handleClear} />);

        const input = screen.getByRole('searchbox');
        await userEvent.type(input, '测试内容');

        const clearButton = screen.getByRole('button');
        await userEvent.click(clearButton);

        expect(handleClear).toHaveBeenCalled();
        expect(input).toHaveValue('');
    });
});

describe('NumberInput组件', () => {
    it('应该只接受数字输入', () => {
        renderWithTheme(<NumberInput />);

        const input = screen.getByRole('spinbutton');
        expect(input).toHaveAttribute('type', 'number');
    });

    it('应该支持最小值和最大值', () => {
        renderWithTheme(<NumberInput min={0} max={100} />);

        const input = screen.getByRole('spinbutton');
        expect(input).toHaveAttribute('min', '0');
        expect(input).toHaveAttribute('max', '100');
    });

    it('应该支持步长', () => {
        renderWithTheme(<NumberInput step={0.1} />);

        const input = screen.getByRole('spinbutton');
        expect(input).toHaveAttribute('step', '0.1');
    });

    it('应该显示增减控制按钮', () => {
        renderWithTheme(<NumberInput showControls />);

        const buttons = screen.getAllByRole('button');
        expect(buttons).toHaveLength(2); // 增加和减少按钮
    });
});

describe('Textarea组件', () => {
    it('应该正确渲染文本域', () => {
        renderWithTheme(<Textarea placeholder="请输入多行文本" />);
        expect(screen.getByPlaceholderText('请输入多行文本')).toBeInTheDocument();
    });

    it('应该支持调整大小设置', () => {
        renderWithTheme(<Textarea resize="vertical" />);

        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveClass('resize-y');
    });

    it('应该有最小高度', () => {
        renderWithTheme(<Textarea />);

        const textarea = screen.getByRole('textbox');
        expect(textarea).toHaveClass('min-h-[80px]');
    });
});

describe('Select组件', () => {
    const options = [
        { value: '1', label: '选项1' },
        { value: '2', label: '选项2' },
        { value: '3', label: '选项3', disabled: true },
    ];

    it('应该正确渲染选择框', () => {
        renderWithTheme(<Select options={options} />);
        expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('应该显示占位符', () => {
        renderWithTheme(<Select options={options} placeholder="请选择" />);
        expect(screen.getByText('请选择')).toBeInTheDocument();
    });

    it('应该渲染所有选项', () => {
        renderWithTheme(<Select options={options} />);

        expect(screen.getByText('选项1')).toBeInTheDocument();
        expect(screen.getByText('选项2')).toBeInTheDocument();
        expect(screen.getByText('选项3')).toBeInTheDocument();
    });

    it('应该支持禁用选项', () => {
        renderWithTheme(<Select options={options} />);

        const option3 = screen.getByText('选项3').closest('option');
        expect(option3).toBeDisabled();
    });

    it('应该支持选择值', async () => {
        const handleChange = vi.fn();
        renderWithTheme(<Select options={options} onChange={handleChange} />);

        const select = screen.getByRole('combobox');
        await userEvent.selectOptions(select, '2');

        expect(handleChange).toHaveBeenCalled();
    });
});

describe('可访问性', () => {
    it('输入框应该支持键盘导航', async () => {
        renderWithTheme(<Input />);

        const input = screen.getByRole('textbox');
        input.focus();

        expect(document.activeElement).toBe(input);
    });

    it('应该有正确的焦点样式', () => {
        renderWithTheme(<Input />);

        const input = screen.getByRole('textbox');
        expect(input).toHaveClass('focus:outline-none', 'focus:ring-offset-2');
    });

    it('错误状态应该有正确的aria属性', () => {
        renderWithTheme(<Input error="错误信息" />);

        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    it('必填字段应该有正确的aria属性', () => {
        renderWithTheme(<Input required />);

        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('aria-required', 'true');
    });
});