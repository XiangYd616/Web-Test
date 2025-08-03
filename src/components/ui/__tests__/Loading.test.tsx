import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Loading, LoadingSpinner, LoadingSkeleton, LoadingOverlay } from '../Loading';

describe('Loading Component', () => {
  it('renders with default props', () => {
    render(<Loading />);
    const loading = screen.getByTestId('loading');
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveClass('loading');
  });

  it('renders with different types', () => {
    const { rerender } = render(<Loading type="spinner" />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();

    rerender(<Loading type="dots" />);
    expect(screen.getByTestId('loading-dots')).toBeInTheDocument();

    rerender(<Loading type="pulse" />);
    expect(screen.getByTestId('loading-pulse')).toBeInTheDocument();
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Loading size="sm" />);
    expect(screen.getByTestId('loading')).toHaveClass('loading-sm');

    rerender(<Loading size="lg" />);
    expect(screen.getByTestId('loading')).toHaveClass('loading-lg');
  });

  it('renders with text', () => {
    render(<Loading text="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('renders with custom color', () => {
    render(<Loading color="primary" />);
    expect(screen.getByTestId('loading')).toHaveClass('loading-primary');
  });

  it('applies custom className', () => {
    render(<Loading className="custom-loading" />);
    expect(screen.getByTestId('loading')).toHaveClass('custom-loading');
  });
});

describe('LoadingSpinner Component', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    const spinner = screen.getByTestId('loading-spinner');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('loading-spinner');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="sm" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner-sm');

    rerender(<LoadingSpinner size="lg" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner-lg');
  });

  it('renders with different colors', () => {
    const { rerender } = render(<LoadingSpinner color="success" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner-success');

    rerender(<LoadingSpinner color="warning" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner-warning');
  });

  it('renders with custom speed', () => {
    render(<LoadingSpinner speed="slow" />);
    expect(screen.getByTestId('loading-spinner')).toHaveClass('loading-spinner-slow');
  });
});

describe('LoadingSkeleton Component', () => {
  it('renders with default props', () => {
    render(<LoadingSkeleton />);
    const skeleton = screen.getByTestId('loading-skeleton');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveClass('loading-skeleton');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<LoadingSkeleton variant="text" />);
    expect(screen.getByTestId('loading-skeleton')).toHaveClass('loading-skeleton-text');

    rerender(<LoadingSkeleton variant="circular" />);
    expect(screen.getByTestId('loading-skeleton')).toHaveClass('loading-skeleton-circular');

    rerender(<LoadingSkeleton variant="rectangular" />);
    expect(screen.getByTestId('loading-skeleton')).toHaveClass('loading-skeleton-rectangular');
  });

  it('renders with custom width and height', () => {
    render(<LoadingSkeleton width="200px" height="100px" />);
    const skeleton = screen.getByTestId('loading-skeleton');
    expect(skeleton).toHaveStyle('width: 200px');
    expect(skeleton).toHaveStyle('height: 100px');
  });

  it('renders multiple lines', () => {
    render(<LoadingSkeleton lines={3} />);
    const skeletons = screen.getAllByTestId('loading-skeleton');
    expect(skeletons).toHaveLength(3);
  });

  it('handles animation', () => {
    const { rerender } = render(<LoadingSkeleton animation="wave" />);
    expect(screen.getByTestId('loading-skeleton')).toHaveClass('loading-skeleton-wave');

    rerender(<LoadingSkeleton animation="pulse" />);
    expect(screen.getByTestId('loading-skeleton')).toHaveClass('loading-skeleton-pulse');

    rerender(<LoadingSkeleton animation={false} />);
    expect(screen.getByTestId('loading-skeleton')).not.toHaveClass('loading-skeleton-wave');
    expect(screen.getByTestId('loading-skeleton')).not.toHaveClass('loading-skeleton-pulse');
  });
});

describe('LoadingOverlay Component', () => {
  it('renders with default props', () => {
    render(
      <LoadingOverlay>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByTestId('loading-overlay')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(
      <LoadingOverlay loading>
        <div>Content</div>
      </LoadingOverlay>
    );

    const overlay = screen.getByTestId('loading-overlay');
    expect(overlay).toHaveClass('loading-overlay-active');
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders with custom loading text', () => {
    render(
      <LoadingOverlay loading text="Processing...">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('renders with different spinner types', () => {
    render(
      <LoadingOverlay loading spinnerType="dots">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByTestId('loading-dots')).toBeInTheDocument();
  });

  it('handles blur effect', () => {
    render(
      <LoadingOverlay loading blur>
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByTestId('loading-overlay')).toHaveClass('loading-overlay-blur');
  });

  it('handles different overlay colors', () => {
    render(
      <LoadingOverlay loading overlayColor="dark">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByTestId('loading-overlay')).toHaveClass('loading-overlay-dark');
  });

  it('applies custom className', () => {
    render(
      <LoadingOverlay className="custom-overlay">
        <div>Content</div>
      </LoadingOverlay>
    );

    expect(screen.getByTestId('loading-overlay')).toHaveClass('custom-overlay');
  });
});
