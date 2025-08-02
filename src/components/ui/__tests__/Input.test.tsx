import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Input, Select, Textarea } from '../Input';

describe('Input Component', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('input');
  });

  it('renders with label', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByText('Username')).toHaveClass('input-label');
  });

  it('renders with error state', () => {
    render(<Input error="This field is required" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('input-error');
    expect(screen.getByText('This field is required')).toHaveClass('input-error-message');
  });

  it('renders with help text', () => {
    render(<Input helpText="Enter your full name" />);
    expect(screen.getByText('Enter your full name')).toHaveClass('input-help-text');
  });

  it('handles different sizes', () => {
    const { rerender } = render(<Input size="sm" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-sm');

    rerender(<Input size="lg" />);
    expect(screen.getByRole('textbox')).toHaveClass('input-lg');
  });

  it('handles disabled state', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveClass('input-disabled');
  });

  it('handles readonly state', () => {
    render(<Input readOnly value="Read only value" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('readOnly');
    expect(input).toHaveClass('input-readonly');
  });

  it('handles required state', () => {
    render(<Input required label="Required field" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeRequired();
    expect(screen.getByText('*')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Input onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test value' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: 'test value' })
    }));
  });

  it('renders with prefix and suffix', () => {
    render(
      <Input 
        prefix={<span data-testid="prefix">$</span>}
        suffix={<span data-testid="suffix">.00</span>}
      />
    );
    
    expect(screen.getByTestId('prefix')).toBeInTheDocument();
    expect(screen.getByTestId('suffix')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Input className="custom-input" />);
    expect(screen.getByRole('textbox')).toHaveClass('custom-input');
  });
});

describe('Select Component', () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3' }
  ];

  it('renders with options', () => {
    render(<Select options={options} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass('select');
  });

  it('renders with label', () => {
    render(<Select label="Choose option" options={options} />);
    expect(screen.getByLabelText('Choose option')).toBeInTheDocument();
  });

  it('handles value selection', () => {
    const handleChange = vi.fn();
    render(<Select options={options} onChange={handleChange} />);
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'option2' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('renders with placeholder', () => {
    render(<Select options={options} placeholder="Select an option" />);
    expect(screen.getByDisplayValue('Select an option')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Select options={options} disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('handles multiple selection', () => {
    render(<Select options={options} multiple />);
    const select = screen.getByRole('listbox');
    expect(select).toHaveAttribute('multiple');
  });
});

describe('Textarea Component', () => {
  it('renders with default props', () => {
    render(<Textarea placeholder="Enter description" />);
    const textarea = screen.getByPlaceholderText('Enter description');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveClass('textarea');
  });

  it('renders with label', () => {
    render(<Textarea label="Description" />);
    expect(screen.getByLabelText('Description')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = vi.fn();
    render(<Textarea onChange={handleChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'test content' } });
    
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  it('handles resize options', () => {
    const { rerender } = render(<Textarea resize="none" />);
    expect(screen.getByRole('textbox')).toHaveClass('textarea-resize-none');

    rerender(<Textarea resize="vertical" />);
    expect(screen.getByRole('textbox')).toHaveClass('textarea-resize-vertical');
  });

  it('handles rows prop', () => {
    render(<Textarea rows={5} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '5');
  });

  it('handles disabled state', () => {
    render(<Textarea disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
