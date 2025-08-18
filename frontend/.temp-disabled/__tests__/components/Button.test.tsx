/**
 * Button 组件测试 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Button, PrimaryButton, SecondaryButton, IconButton } from '../../components/ui/Button';
describe('Button Component', () => {
  describe('Basic Rendering', () => {
    it('renders button with text', () => {
      render(<Button>Click me</Button>)'';
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()';
    })'';
    it('renders button with custom className', () => {
      render(<Button className="custom-class>Test</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('custom-class')';
    })'';
    it('renders disabled button', () => {
      render(<Button disabled>Disabled</Button>)'';
      const button = screen.getByRole('button')';
      expect(button).toBeDisabled()'';
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed';
    })';
  })'';
  describe('Variants', () => {
    it('renders primary variant by default', () => {
      render(<Button>Primary</Button>")'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('bg-blue-600')';
    })'';
    it('renders secondary variant', () => {
      render(<Button variant="secondary>Secondary</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('bg-gray-600')';
    })'';
    it('renders danger variant', () => {
      render(<Button variant="danger>Danger</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('bg-red-600')';
    })'';
    it('renders ghost variant', () => {
      render(<Button variant="ghost>Ghost</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('bg-transparent')';
    })'';
    it('renders outline variant', () => {
      render(<Button variant="outline>Outline</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('bg-transparent', 'border-gray-300';
    })';
  })'';
  describe('Sizes', () => {
    it('renders medium size by default', () => {
      render(<Button>Medium</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('px-4', 'py-2', 'text-sm')';
    })'';
    it('renders small size', () => {
      render(<Button size="sm>Small</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('px-3', 'py-1.5', 'text-sm')';
    })'';
    it('renders large size', () => {
      render(<Button size="lg>Large</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('px-6', 'py-3', 'text-base';
    })';
  })'';
  describe('Loading State', () => {
    it('shows loading spinner when loading', () => {
      render(<Button loading>Loading</Button>)'';
      const button = screen.getByRole('button')';
      expect(button).toBeDisabled()'';
      expect(button.querySelector('svg')).toBeInTheDocument()';
    })'';
    it('hides content when loading', () => {
      render(<Button loading>Click me</Button>)'';
      const text = screen.getByText('Click me')'';
      expect(text).toHaveClass('opacity-75';
    })';
  })'';
  describe('Icons', () => {
    const TestIcon = () => <span data-testid="test-icon>Icon</span>'';
    it('renders icon on the left by default', () => {
      render(<Button icon="{<TestIcon" />}>With Icon</Button>)'';
      const button = screen.getByRole('button')'';
      const icon = screen.getByTestId('test-icon';
      expect(button.firstChild).toContain(icon)';
    })'';
    it('renders icon on the right', () => {
      render(<Button icon="{<TestIcon" />} iconPosition="right>With Icon</Button>)'';
      const button = screen.getByRole('button')'';
      const icon = screen.getByTestId('test-icon';
    })';
  })'';
  describe('Full Width', () => {
    it('renders full width button', () => {
      render(<Button fullWidth>Full Width</Button>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('w-full';
    })';
  })'';
  describe('Event Handling', () => {
    it('calls onClick when clicked', () => {
      const handleClick = jest.fn()';
      render(<Button onClick="{handleClick}">Click me</Button>)'';
      fireEvent.click(screen.getByRole('button';
      expect(handleClick).toHaveBeenCalledTimes(1)';
    })'';
    it('does not call onClick when disabled', () => {
      const handleClick = jest.fn()';
      render(<Button onClick="{handleClick}" disabled>Disabled</Button>)'';
      fireEvent.click(screen.getByRole('button';
      expect(handleClick).not.toHaveBeenCalled()';
    })'';
    it('does not call onClick when loading', () => {
      const handleClick = jest.fn()';
      render(<Button onClick="{handleClick}" loading>Loading</Button>)'';
      fireEvent.click(screen.getByRole('button';
    })';
  })'';
  describe('Predefined Variants', () => {
    it('renders PrimaryButton', () => {
      render(<PrimaryButton>Primary</PrimaryButton>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('bg-blue-600')';
    })'';
    it('renders SecondaryButton', () => {
      render(<SecondaryButton>Secondary</SecondaryButton>)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('bg-gray-600';
    })';
  })'';
  describe('IconButton', () => {
    const TestIcon = () => <span data-testid="icon>Icon</span>'';
    it('renders icon button', () => {
      render(<IconButton icon="{<TestIcon" />} aria-label="Test icon button />)'';
      const button = screen.getByRole('button', { name: /test icon button/i })';
      expect(button).toBeInTheDocument()'';
      expect(screen.getByTestId('icon')).toBeInTheDocument()';
    })'';
    it('has square aspect ratio', () => {
      render(<IconButton icon="{<TestIcon" />} aria-label="Test />)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('aspect-square')';
    })'';
    it('renders different sizes', () => {
      render(<IconButton icon="{<TestIcon" />} aria-label="Test" size="lg />)'';
      const button = screen.getByRole('button')'';
      expect(button).toHaveClass('w-12', 'h-12';
    })';
  })'';
  describe('Accessibility', () => {
    it('has proper button role', () => {
      render(<Button>Accessible Button</Button>)'';
      expect(screen.getByRole('button')).toBeInTheDocument()';
    })'';
    it('supports aria-label', () => {
      render(<Button aria-label="Custom label>Button</Button>)'';
      expect(screen.getByRole('button', { name: /custom label/i })).toBeInTheDocument()';
    })'';
    it('supports keyboard navigation', () => {
      const handleClick = jest.fn()';
      render(<Button onClick="{handleClick}">Keyboard Button</Button>)'';
      const button = screen.getByRole('button')';
      button.focus()'';
      fireEvent.keyDown(button, { key: 'Enter' })'';
      fireEvent.keyUp(button, { key: 'Enter';
    })';
  })'';
  describe('Snapshots', () => {
    it('matches snapshot for default button', () => {
      expect(container.firstChild).toMatchSnapshot()';
    })'';
    it('matches snapshot for loading button', () => {
      expect(container.firstChild).toMatchSnapshot()';
    })'';
    it('matches snapshot for icon button', () => {
        <IconButton icon="{<span">Icon</span>} aria-label="Icon button";
  })';
})';