import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from '../Card';

describe('Card Component', () => {
  it('renders with default props', () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText('Card content');
    expect(card.closest('.card')).toBeInTheDocument();
    expect(card.closest('.card')).toHaveClass('card-default');
  });

  it('renders with different variants', () => {
    const { rerender } = render(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByText('Elevated').closest('.card')).toHaveClass('card-elevated');

    rerender(<Card variant="outlined">Outlined</Card>);
    expect(screen.getByText('Outlined').closest('.card')).toHaveClass('card-outlined');

    rerender(<Card variant="filled">Filled</Card>);
    expect(screen.getByText('Filled').closest('.card')).toHaveClass('card-filled');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<Card size="sm">Small card</Card>);
    expect(screen.getByText('Small card').closest('.card')).toHaveClass('card-sm');

    rerender(<Card size="lg">Large card</Card>);
    expect(screen.getByText('Large card').closest('.card')).toHaveClass('card-lg');
  });

  it('renders with header', () => {
    render(
      <Card header="Card Header">
        Card content
      </Card>
    );
    expect(screen.getByText('Card Header')).toBeInTheDocument();
    expect(screen.getByText('Card Header').closest('.card-header')).toBeInTheDocument();
  });

  it('renders with footer', () => {
    render(
      <Card footer="Card Footer">
        Card content
      </Card>
    );
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
    expect(screen.getByText('Card Footer').closest('.card-footer')).toBeInTheDocument();
  });

  it('renders with both header and footer', () => {
    render(
      <Card header="Header" footer="Footer">
        Content
      </Card>
    );
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('handles clickable cards', () => {
    render(<Card clickable>Clickable card</Card>);
    const card = screen.getByText('Clickable card').closest('.card');
    expect(card).toHaveClass('card-clickable');
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveAttribute('role', 'button');
  });

  it('handles loading state', () => {
    render(<Card loading>Loading card</Card>);
    const card = screen.getByText('Loading card').closest('.card');
    expect(card).toHaveClass('card-loading');
    expect(screen.getByTestId('card-loading-spinner')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-card">Custom</Card>);
    expect(screen.getByText('Custom').closest('.card')).toHaveClass('custom-card');
  });

  it('renders with image', () => {
    render(
      <Card image="/test-image.jpg" imageAlt="Test image">
        Card with image
      </Card>
    );
    const image = screen.getByAltText('Test image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-image.jpg');
    expect(image.closest('.card-image')).toBeInTheDocument();
  });

  it('handles disabled state', () => {
    render(<Card disabled>Disabled card</Card>);
    const card = screen.getByText('Disabled card').closest('.card');
    expect(card).toHaveClass('card-disabled');
  });

  it('renders with actions', () => {
    const actions = (
      <div data-testid="card-actions">
        <button>Action 1</button>
        <button>Action 2</button>
      </div>
    );

    render(
      <Card actions={actions}>
        Card with actions
      </Card>
    );

    expect(screen.getByTestId('card-actions')).toBeInTheDocument();
    expect(screen.getByText('Action 1')).toBeInTheDocument();
    expect(screen.getByText('Action 2')).toBeInTheDocument();
  });

  it('supports custom padding', () => {
    render(<Card padding="none">No padding</Card>);
    expect(screen.getByText('No padding').closest('.card')).toHaveClass('card-padding-none');
  });

  it('renders with correct semantic structure', () => {
    render(
      <Card header="Test Header" footer="Test Footer">
        <p>Test content</p>
      </Card>
    );

    const card = screen.getByText('Test content').closest('.card');
    const header = screen.getByText('Test Header').closest('.card-header');
    const body = screen.getByText('Test content').closest('.card-body');
    const footer = screen.getByText('Test Footer').closest('.card-footer');

    expect(card).toContainElement(header);
    expect(card).toContainElement(body);
    expect(card).toContainElement(footer);
  });

  it('handles hover effects', () => {
    render(<Card hover>Hover card</Card>);
    expect(screen.getByText('Hover card').closest('.card')).toHaveClass('card-hover');
  });
});
