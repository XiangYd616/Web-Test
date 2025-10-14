/**
 * Button组件测试
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from '../Button';

describe('Button组件', () => {
    it('应该渲染基本按钮', () => {
        render(<Button>点击我</Button>);

        const button = screen.getByRole('button', { name: '点击我' });
        expect(button).toBeInTheDocument();
    });

    it('应该处理点击事件', () => {
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>点击我</Button>);

        const button = screen.getByRole('button', { name: '点击我' });
        fireEvent.click(button);

        expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('应该在禁用状态下不响应点击', () => {
        const handleClick = vi.fn();
        render(
            <Button onClick={handleClick} disabled>
                禁用按钮
            </Button>
        );

        const button = screen.getByRole('button', { name: '禁用按钮' });
        expect(button).toBeDisabled();

        fireEvent.click(button);
        expect(handleClick).not.toHaveBeenCalled();
    });

    it('应该显示加载状态', () => {
        render(<Button loading>加载中</Button>);

        const button = screen.getByRole('button');
        expect(button).toBeDisabled();
        expect(screen.getByText('加载中')).toBeInTheDocument();
    });

    it('应该应用正确的变体样式', () => {
        const { rerender } = render(<Button variant="primary">主要按钮</Button>);

        let button = screen.getByRole('button');
        expect(button).toHaveClass('bg-blue-600');

        rerender(<Button variant="secondary">次要按钮</Button>);
        button = screen.getByRole('button');
        expect(button).toHaveClass('bg-gray-600');

        rerender(<Button variant="danger">危险按钮</Button>);
        button = screen.getByRole('button');
        expect(button).toHaveClass('bg-red-600');
    });

    it('应该应用正确的尺寸样式', () => {
        const { rerender } = render(<Button size="sm">小按钮</Button>);

        let button = screen.getByRole('button');
        expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm');

        rerender(<Button size="md">中等按钮</Button>);
        button = screen.getByRole('button');
        expect(button).toHaveClass('px-4', 'py-2', 'text-base');

        rerender(<Button size="lg">大按钮</Button>);
        button = screen.getByRole('button');
        expect(button).toHaveClass('px-6', 'py-3', 'text-lg');
    });

    it('应该支持自定义className', () => {
        render(<Button className="custom-class">自定义按钮</Button>);

        const button = screen.getByRole('button');
        expect(button).toHaveClass('custom-class');
    });

    it('应该支持data-testid属性', () => {
        render(<Button data-testid="test-button">测试按钮</Button>);

        const button = screen.getByTestId('test-button');
        expect(button).toBeInTheDocument();
    });

    it('应该支持不同的按钮类型', () => {
        const { rerender } = render(<Button type="button">普通按钮</Button>);

        let button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'button');

        rerender(<Button type="submit">提交按钮</Button>);
        button = screen.getByRole('button');
        expect(button).toHaveAttribute('type', 'submit');
    });

    it('应该支持图标按钮', () => {
        const TestIcon = () => <span data-testid="test-icon">图标</span>;

        render(
            <Button icon={<TestIcon />}>
                带图标的按钮
            </Button>
        );

        expect(screen.getByTestId('test-icon')).toBeInTheDocument();
        expect(screen.getByText('带图标的按钮')).toBeInTheDocument();
    });

    it('应该支持仅图标按钮', () => {
        const TestIcon = () => <span data-testid="test-icon">图标</span>;

        render(<Button icon={<TestIcon />} aria-label="图标按钮">图标</Button>);

        expect(screen.getByTestId('test-icon')).toBeInTheDocument();
        expect(screen.getByLabelText('图标按钮')).toBeInTheDocument();
    });
});