import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Badge, StatusBadge, DotBadge, ProgressBadge } from '../Badge';

describe('Badge Component', () => {
  it('renders with default props', () => {
    render(<Badge>Default Badge</Badge>);
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('badge', 'badge-primary');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('badge-success');

    rerender(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toHaveClass('badge-warning');

    rerender(<Badge variant="danger">Danger</Badge>);
    expect(screen.getByText('Danger')).toHaveClass('badge-danger');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('badge-sm');

    rerender(<Badge size="lg">Large</Badge>);
    expect(screen.getByText('Large')).toHaveClass('badge-lg');
  });

  it('handles clickable badges', () => {
    const handleClick = vi.fn();
    render(<Badge onClick={handleClick}>Clickable</Badge>);
    
    const badge = screen.getByText('Clickable');
    expect(badge).toHaveClass('badge-clickable');
    
    fireEvent.click(badge);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders with icon', () => {
    const TestIcon = () => <span data-testid="test-icon">Icon</span>;
    render(<Badge icon={<TestIcon />}>With Icon</Badge>);
    expect(screen.getByTestId('test-icon')).toBeInTheDocument();
  });

  it('handles removable badges', () => {
    const handleRemove = vi.fn();
    render(<Badge onRemove={handleRemove}>Removable</Badge>);
    
    const removeButton = screen.getByRole('button');
    expect(removeButton).toBeInTheDocument();
    
    fireEvent.click(removeButton);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<Badge className="custom-badge">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom-badge');
  });
});

describe('StatusBadge Component', () => {
  it('renders with different statuses', () => {
    const { rerender } = render(<StatusBadge status="online">Online</StatusBadge>);
    expect(screen.getByText('Online')).toHaveClass('status-badge-online');

    rerender(<StatusBadge status="offline">Offline</StatusBadge>);
    expect(screen.getByText('Offline')).toHaveClass('status-badge-offline');

    rerender(<StatusBadge status="busy">Busy</StatusBadge>);
    expect(screen.getByText('Busy')).toHaveClass('status-badge-busy');
  });

  it('renders with status indicator', () => {
    render(<StatusBadge status="online" showIndicator>Online</StatusBadge>);
    expect(screen.getByTestId('status-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('status-indicator')).toHaveClass('status-indicator-online');
  });

  it('handles animated indicators', () => {
    render(<StatusBadge status="online" showIndicator animated>Online</StatusBadge>);
    expect(screen.getByTestId('status-indicator')).toHaveClass('status-indicator-animated');
  });
});

describe('DotBadge Component', () => {
  it('renders with default props', () => {
    render(<DotBadge />);
    const dot = screen.getByTestId('dot-badge');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveClass('dot-badge', 'dot-badge-primary');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<DotBadge variant="success" />);
    expect(screen.getByTestId('dot-badge')).toHaveClass('dot-badge-success');

    rerender(<DotBadge variant="danger" />);
    expect(screen.getByTestId('dot-badge')).toHaveClass('dot-badge-danger');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<DotBadge size="sm" />);
    expect(screen.getByTestId('dot-badge')).toHaveClass('dot-badge-sm');

    rerender(<DotBadge size="lg" />);
    expect(screen.getByTestId('dot-badge')).toHaveClass('dot-badge-lg');
  });

  it('handles animated dots', () => {
    render(<DotBadge animated />);
    expect(screen.getByTestId('dot-badge')).toHaveClass('dot-badge-animated');
  });

  it('handles pulsing animation', () => {
    render(<DotBadge pulse />);
    expect(screen.getByTestId('dot-badge')).toHaveClass('dot-badge-pulse');
  });
});

describe('ProgressBadge Component', () => {
  it('renders with progress value', () => {
    render(<ProgressBadge value={75} />);
    const progress = screen.getByTestId('progress-badge');
    expect(progress).toBeInTheDocument();
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<ProgressBadge value={50} label="50 of 100" />);
    expect(screen.getByText('50 of 100')).toBeInTheDocument();
  });

  it('renders with different variants', () => {
    const { rerender } = render(<ProgressBadge value={75} variant="success" />);
    expect(screen.getByTestId('progress-badge')).toHaveClass('progress-badge-success');

    rerender(<ProgressBadge value={25} variant="warning" />);
    expect(screen.getByTestId('progress-badge')).toHaveClass('progress-badge-warning');
  });

  it('handles different sizes', () => {
    const { rerender } = render(<ProgressBadge value={50} size="sm" />);
    expect(screen.getByTestId('progress-badge')).toHaveClass('progress-badge-sm');

    rerender(<ProgressBadge value={50} size="lg" />);
    expect(screen.getByTestId('progress-badge')).toHaveClass('progress-badge-lg');
  });

  it('shows progress bar', () => {
    render(<ProgressBadge value={60} showProgress />);
    const progressBar = screen.getByTestId('progress-bar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveStyle('width: 60%');
  });

  it('handles animated progress', () => {
    render(<ProgressBadge value={80} showProgress animated />);
    expect(screen.getByTestId('progress-bar')).toHaveClass('progress-bar-animated');
  });

  it('handles different progress types', () => {
    const { rerender } = render(<ProgressBadge value={70} type="circular" />);
    expect(screen.getByTestId('progress-badge')).toHaveClass('progress-badge-circular');

    rerender(<ProgressBadge value={70} type="linear" />);
    expect(screen.getByTestId('progress-badge')).toHaveClass('progress-badge-linear');
  });
});
