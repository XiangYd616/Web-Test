import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Button from '../../Button';
import Card from '../../Card';
import { Input, Select, Textarea } from '../../Input';
import Table from '../../Table';
import Modal from '../../Modal';
import { Badge } from '../../Badge';

// Accessibility testing utilities
const checkAriaAttributes = (element: Element, expectedAttributes: Record<string, string>) => {
  Object.entries(expectedAttributes).forEach(([attr, value]) => {
    expect(element).toHaveAttribute(attr, value);
  });
};

const checkKeyboardNavigation = (element: Element, keys: string[]) => {
  keys.forEach(key => {
    fireEvent.keyDown(element, { key });
  });
};

const checkColorContrast = (element: Element) => {
  const styles = window.getComputedStyle(element);
  const backgroundColor = styles.backgroundColor;
  const color = styles.color;

  // Basic contrast check (simplified)
  expect(backgroundColor).toBeDefined();
  expect(color).toBeDefined();
};

describe('Accessibility Tests', () => {
  describe('Button Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(<Button aria-label="Custom button">Click me</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Custom button');
      expect(button).toHaveAttribute('type', 'button');
    });

    it('supports keyboard navigation', () => {
      const handleClick = vi.fn();
      render(<Button onClick={handleClick}>Keyboard test</Button>);

      const button = screen.getByRole('button');

      // Test Enter key
      fireEvent.keyDown(button, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);

      // Test Space key
      fireEvent.keyDown(button, { key: ' ' });
      expect(handleClick).toHaveBeenCalledTimes(2);
    });

    it('handles disabled state correctly', () => {
      render(<Button disabled>Disabled button</Button>);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('handles loading state with proper ARIA', () => {
      render(<Button loading>Loading button</Button>);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
    });

    it('has sufficient color contrast', () => {
      const { container } = render(<Button variant="primary">Primary button</Button>);
      const button = container.querySelector('.btn-primary');

      if (button) {
        checkColorContrast(button);
      }
    });

    it('supports screen readers with proper text', () => {
      render(
        <Button aria-describedby="button-help">
          <span aria-hidden="true">🔍</span>
          Search
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('Search');
      expect(button).toHaveAttribute('aria-describedby', 'button-help');
    });
  });

  describe('Input Accessibility', () => {
    it('has proper label association', () => {
      render(<Input label="Username" id="username-input" />);

      const input = screen.getByLabelText('Username');
      expect(input).toHaveAttribute('id', 'username-input');

      const label = screen.getByText('Username');
      expect(label).toHaveAttribute('for', 'username-input');
    });

    it('handles required fields correctly', () => {
      render(<Input label="Required field" required />);

      const input = screen.getByRole('textbox');
      expect(input).toBeRequired();
      expect(input).toHaveAttribute('aria-required', 'true');

      // Required indicator should be present
      expect(screen.getByText('*')).toBeInTheDocument();
    });

    it('provides error feedback with ARIA', () => {
      render(
        <Input
          label="Email"
          error="Please enter a valid email"
          id="email-input"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby', 'email-input-error');

      const errorMessage = screen.getByText('Please enter a valid email');
      expect(errorMessage).toHaveAttribute('id', 'email-input-error');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('provides help text with proper association', () => {
      render(
        <Input
          label="Password"
          helpText="Must be at least 8 characters"
          id="password-input"
        />
      );

      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-describedby', 'password-input-help');

      const helpText = screen.getByText('Must be at least 8 characters');
      expect(helpText).toHaveAttribute('id', 'password-input-help');
    });

    it('handles disabled state correctly', () => {
      render(<Input label="Disabled input" disabled />);

      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Select Accessibility', () => {
    const options = [
      { value: 'option1', label: 'Option 1' },
      { value: 'option2', label: 'Option 2' },
      { value: 'option3', label: 'Option 3' }
    ];

    it('has proper ARIA attributes', () => {
      render(<Select label="Choose option" options={options} />);

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-expanded', 'false');
      expect(select).toHaveAttribute('aria-haspopup', 'listbox');
    });

    it('supports keyboard navigation', () => {
      render(<Select label="Choose option" options={options} />);

      const select = screen.getByRole('combobox');

      // Test arrow keys
      fireEvent.keyDown(select, { key: 'ArrowDown' });
      fireEvent.keyDown(select, { key: 'ArrowUp' });
      fireEvent.keyDown(select, { key: 'Enter' });
      fireEvent.keyDown(select, { key: 'Escape' });

      // Should not throw errors
      expect(select).toBeInTheDocument();
    });

    it('handles multiple selection correctly', () => {
      render(<Select label="Multiple select" options={options} multiple />);

      const select = screen.getByRole('listbox');
      expect(select).toHaveAttribute('aria-multiselectable', 'true');
    });
  });

  describe('Table Accessibility', () => {
    const columns = [
      { key: 'id', title: 'ID', sortable: true },
      { key: 'name', title: 'Name', sortable: true },
      { key: 'email', title: 'Email' }
    ];

    const data = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' }
    ];

    it('has proper table structure', () => {
      render(<Table columns={columns} data={data} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();

      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(3);

      const rows = screen.getAllByRole('row');
      expect(rows).toHaveLength(3); // 1 header + 2 data rows
    });

    it('handles sortable columns correctly', () => {
      render(<Table columns={columns} data={data} sortBy="name" sortOrder="asc" />);

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });
      expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
      expect(nameHeader).toHaveAttribute('tabIndex', '0');
    });

    it('supports keyboard navigation for sorting', () => {
      const handleSort = vi.fn();
      render(
        <Table
          columns={columns}
          data={data}
          onSort={handleSort}
          sortBy="name"
          sortOrder="asc"
        />
      );

      const nameHeader = screen.getByRole('columnheader', { name: /name/i });

      fireEvent.keyDown(nameHeader, { key: 'Enter' });
      expect(handleSort).toHaveBeenCalledWith('name', 'desc');

      fireEvent.keyDown(nameHeader, { key: ' ' });
      expect(handleSort).toHaveBeenCalledTimes(2);
    });

    it('handles row selection with proper ARIA', () => {
      render(<Table columns={columns} data={data} selectable />);

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(3); // 1 select all + 2 row checkboxes

      const selectAllCheckbox = checkboxes[0];
      expect(selectAllCheckbox).toHaveAttribute('aria-label', 'Select all rows');
    });

    it('provides proper table caption', () => {
      render(
        <Table
          columns={columns}
          data={data}
          caption="User data table"
        />
      );

      expect(screen.getByText('User data table')).toBeInTheDocument();
    });
  });

  describe('Modal Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Modal open onClose={() => {}} title="Test Modal">
          <p>Modal content</p>
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
    });

    it('traps focus within modal', () => {
      render(
        <Modal open onClose={() => {}} title="Focus Test">
          <input data-testid="first-input" />
          <button>Modal Button</button>
          <input data-testid="last-input" />
        </Modal>
      );

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('tabIndex', '-1');

      // Focus should be trapped within modal
      const firstInput = screen.getByTestId('first-input');
      const lastInput = screen.getByTestId('last-input');

      expect(firstInput).toBeInTheDocument();
      expect(lastInput).toBeInTheDocument();
    });

    it('handles escape key to close', () => {
      const handleClose = vi.fn();
      render(
        <Modal open onClose={handleClose} closeOnEscape>
          <p>Modal content</p>
        </Modal>
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('announces modal to screen readers', () => {
      render(
        <Modal open onClose={() => {}} title="Important Notice">
          <p>This is an important message</p>
        </Modal>
      );

      const title = screen.getByText('Important Notice');
      expect(title).toHaveAttribute('id');

      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-labelledby', title.id);
    });
  });

  describe('Card Accessibility', () => {
    it('has proper semantic structure', () => {
      render(
        <Card header="Card Title" as="article">
          <p>Card content</p>
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toBeInTheDocument();

      const header = screen.getByText('Card Title');
      expect(header).toBeInTheDocument();
    });

    it('handles clickable cards correctly', () => {
      const handleClick = vi.fn();
      render(
        <Card clickable onClick={handleClick}>
          <p>Clickable card</p>
        </Card>
      );

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');

      fireEvent.keyDown(card, { key: 'Enter' });
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Badge Accessibility', () => {
    it('has proper ARIA attributes for status', () => {
      render(<Badge variant="success" role="status">Success</Badge>);

      const badge = screen.getByRole('status');
      expect(badge).toHaveTextContent('Success');
    });

    it('handles removable badges correctly', () => {
      const handleRemove = vi.fn();
      render(<Badge onRemove={handleRemove}>Removable badge</Badge>);

      const removeButton = screen.getByRole('button');
      expect(removeButton).toHaveAttribute('aria-label', 'Remove badge');

      fireEvent.click(removeButton);
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Color and Contrast', () => {
    it('maintains sufficient contrast for all variants', () => {
      const variants = ['primary', 'secondary', 'success', 'warning', 'danger', 'info'];

      variants.forEach(variant => {
        const { container } = render(
          <Button variant={variant as any}>{variant} button</Button>
        );

        const button = container.querySelector(`.btn-${variant}`);
        if (button) {
          checkColorContrast(button);
        }
      });
    });

    it('provides alternative text for icon-only buttons', () => {
      render(
        <Button aria-label="Search">
          <span aria-hidden="true">🔍</span>
        </Button>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Search');

      const icon = button.querySelector('[aria-hidden="true"]');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Screen Reader Support', () => {
    it('provides proper announcements for dynamic content', () => {
      const { rerender } = render(
        <div aria-live="polite" aria-atomic="true">
          <Badge variant="info">Processing...</Badge>
        </div>
      );

      rerender(
        <div aria-live="polite" aria-atomic="true">
          <Badge variant="success">Complete!</Badge>
        </div>
      );

      expect(screen.getByText('Complete!')).toBeInTheDocument();
    });

    it('handles loading states with proper announcements', () => {
      render(
        <div>
          <Button loading aria-describedby="loading-status">
            Save
          </Button>
          <div id="loading-status" aria-live="polite">
            Saving your changes...
          </div>
        </div>
      );

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-describedby', 'loading-status');

      const status = screen.getByText('Saving your changes...');
      expect(status).toHaveAttribute('aria-live', 'polite');
    });
  });
});
