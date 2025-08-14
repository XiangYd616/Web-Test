import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../Input';

describe('Input Component', () => {
  it('renders input with label', () => {
    render(<Input label="Username" />);

    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByText(/username/i)).toBeInTheDocument();
  });

  it('shows required indicator when required', () => {
    render(<Input label="Email" required />);

    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toHaveAttribute('required');
  });

  it('displays error message', () => {
    render(<Input label="Password" error="Password is required" />);

    const input = screen.getByLabelText(/password/i);
    const errorMessage = screen.getByText(/password is required/i);

    expect(input).toHaveClass('input-error');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  it('displays helper text', () => {
    render(<Input label="Username" helperText="Must be at least 3 characters" />);

    expect(screen.getByText(/must be at least 3 characters/i)).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input label="Name" onChange={handleChange} />);

    const input = screen.getByLabelText(/name/i);
    fireEvent.change(input, { target: { value: 'John Doe' } });

    expect(handleChange).toHaveBeenCalledTimes(1);
    expect(handleChange).toHaveBeenCalledWith(expect.objectContaining({
      target: expect.objectContaining({ value: 'John Doe' })
    }));
  });

  it('renders with left and right icons', () => {
    const LeftIcon = () => <span data-testid="left-icon">@</span>;
    const RightIcon = () => <span data-testid="right-icon">✓</span>;

    render(
      <Input
        label="Email"
        leftIcon={<LeftIcon />}
        rightIcon={<RightIcon />}
      />
    );

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input label="Disabled Input" disabled />);

    const input = screen.getByLabelText(/disabled input/i);
    expect(input).toBeDisabled();
    expect(input).toHaveClass('opacity-50');
  });

  it('applies fullWidth class when fullWidth is true', () => {
    render(<Input label="Full Width" fullWidth />);

    const container = screen.getByLabelText(/full width/i).closest('div');
    expect(container).toHaveClass('w-full');
  });

  it('generates unique id when not provided', () => {
    const { rerender } = render(<Input label="Input 1" />);
    const input1 = screen.getByLabelText(/input 1/i);
    const id1 = input1.getAttribute('id');

    rerender(<Input label="Input 2" />);
    const input2 = screen.getByLabelText(/input 2/i);
    const id2 = input2.getAttribute('id');

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it('uses provided id', () => {
    render(<Input label="Custom ID" id="custom-input" />);

    const input = screen.getByLabelText(/custom id/i);
    expect(input).toHaveAttribute('id', 'custom-input');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input label="Ref Input" ref={ref} />);

    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('prioritizes error over helper text', () => {
    render(
      <Input
        label="Test"
        error="Error message"
        helperText="Helper text"
      />
    );

    expect(screen.getByText(/error message/i)).toBeInTheDocument();
    expect(screen.queryByText(/helper text/i)).not.toBeInTheDocument();
  });
});
