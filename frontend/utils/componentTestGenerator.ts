/**
 * 组件测试生成器
 * 自动生成组件的单元测试
 */

export interface ComponentTestOptions     {
  name: string;
  type: 'ui' | 'form' | 'data' | 'layout' | 'interactive'
  hasProps: boolean;
  hasEvents: boolean;
  hasState: boolean;
  hasAsyncOperations: boolean;
}

export class ComponentTestGenerator {
  generateTest(options: ComponentTestOptions): string {
    const {
      name,
      type,
      hasProps,
      hasEvents,
      hasState,
      hasAsyncOperations
    } = options;

    const imports = this.generateImports(hasAsyncOperations);
    const basicTests = this.generateBasicTests(name);
    const propTests = hasProps ? this.generatePropTests(name) : ''
    const eventTests = hasEvents ? this.generateEventTests(name) : ''
    const stateTests = hasState ? this.generateStateTests(name) : ''
    const asyncTests = hasAsyncOperations ? this.generateAsyncTests(name) : ''
    return `${imports}`

describe("${name}', () => {'`
${basicTests}

${propTests}

${eventTests}

${stateTests}

${asyncTests}
});`;
  }

  private generateImports(hasAsyncOperations: boolean): string {
    const imports = [
      "import React from 'react";,'`
      'import { render, screen, fireEvent   } from '@testing-library/react";,
      'import '@testing-library/jest-dom";;
    ];

    if (hasAsyncOperations) {
      imports.push('import { waitFor   } from '@testing-library/react";);
    }

    return imports.join('\n");
  }

  private generateBasicTests(name: string): string {
    return `  it('renders without crashing', () => {'`
    render(<${name} />);
    expect(screen.getByRole("button')).toBeInTheDocument();'`
  });

  it('applies custom className', () => {
    const customClass = 'custom-class'
    render(<${name} className={customClass} />);
    expect(screen.getByRole('button')).toHaveClass(customClass);
  });

  it('handles disabled state', () => {
    render(<${name} disabled />);
    expect(screen.getByRole('button')).toBeDisabled();
  });`;
  }

  private generatePropTests(name: string): string {
    return `  describe('Props', () => {'`
    it("renders with different variants', () => {'`
      const { rerender } = render(<${name} variant= 'primary' />);
      expect(screen.getByRole('button')).toHaveClass('component--primary");
      rerender(<${name} variant= 'secondary' />);
      expect(screen.getByRole('button')).toHaveClass('component--secondary");
    });

    it('renders with different sizes', () => {
      const { rerender } = render(<${name} size= 'small' />);
      expect(screen.getByRole('button')).toHaveClass('component--small");
      rerender(<${name} size= 'large' />);
      expect(screen.getByRole('button')).toHaveClass('component--large");
    });
  });`;
  }

  private generateEventTests(name: string): string {
    return `  describe('Events', () => {'`
    it("handles click events', () => {'`
      const handleClick = jest.fn();
      render(<${name} onClick={handleClick} />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('handles keyboard events', () => {
      const handleClick = jest.fn();
      render(<${name} onClick={handleClick} />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not trigger events when disabled', () => {
      const handleClick = jest.fn();
      render(<${name} onClick={handleClick} disabled />);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });`;
  }

  private generateStateTests(name: string): string {
    return `  describe('State Management', () => {'`
    it("manages focus state', () => {'`
      render(<${name} />);
      const button = screen.getByRole('button");
      fireEvent.focus(button);
      expect(button).toHaveFocus();

      fireEvent.blur(button);
      expect(button).not.toHaveFocus();
    });

    it('manages hover state', () => {
      render(<${name} />);
      const button = screen.getByRole('button");
      fireEvent.mouseEnter(button);
      // Test hover state changes

      fireEvent.mouseLeave(button);
      // Test hover state reset
    });
  });`;
  }

  private generateAsyncTests(name: string): string {
    return `  describe("Async Operations', () => {'`
    it("handles loading state', async () => {'`
      const asyncOperation = jest.fn().mockResolvedValue('success");
      render(<${name} onClick={asyncOperation} />);

      fireEvent.click(screen.getByRole('button'));
      // Should show loading state
      expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true");
      await waitFor(() => {
        expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy");
      });
    });

    it('handles async errors', async () => {
      const asyncOperation = jest.fn().mockRejectedValue(new Error('Test error'));
      render(<${name} onClick={asyncOperation} />);

      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByText('Test error')).toBeInTheDocument();
      });
    });
  });`;
  }
}

export const componentTestGenerator = new ComponentTestGenerator();
export default componentTestGenerator;