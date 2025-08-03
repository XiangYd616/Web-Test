import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Modal from '../Modal';

describe('Modal Component', () => {
  it('renders when open', () => {
    render(
      <Modal open onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <Modal open={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('renders with title', () => {
    render(
      <Modal open onClose={() => {}} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Test Modal').closest('.modal-header')).toBeInTheDocument();
  });

  it('renders with footer', () => {
    const footer = (
      <div data-testid="modal-footer">
        <button>Cancel</button>
        <button>Save</button>
      </div>
    );

    render(
      <Modal open onClose={() => {}} footer={footer}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByTestId('modal-footer')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('handles close button click', () => {
    const handleClose = vi.fn();
    render(
      <Modal open onClose={handleClose} title="Test Modal">
        <div>Modal content</div>
      </Modal>
    );

    const closeButton = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('handles overlay click when closeOnOverlayClick is true', () => {
    const handleClose = vi.fn();
    render(
      <Modal open onClose={handleClose} closeOnOverlayClick>
        <div>Modal content</div>
      </Modal>
    );

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on overlay click when closeOnOverlayClick is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal open onClose={handleClose} closeOnOverlayClick={false}>
        <div>Modal content</div>
      </Modal>
    );

    const overlay = screen.getByTestId('modal-overlay');
    fireEvent.click(overlay);

    expect(handleClose).not.toHaveBeenCalled();
  });

  it('handles escape key press when closeOnEscape is true', () => {
    const handleClose = vi.fn();
    render(
      <Modal open onClose={handleClose} closeOnEscape>
        <div>Modal content</div>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders with different sizes', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} size="sm">
        <div>Small modal</div>
      </Modal>
    );
    expect(screen.getByTestId('modal-content')).toHaveClass('modal-sm');

    rerender(
      <Modal open onClose={() => {}} size="lg">
        <div>Large modal</div>
      </Modal>
    );
    expect(screen.getByTestId('modal-content')).toHaveClass('modal-lg');

    rerender(
      <Modal open onClose={() => {}} size="xl">
        <div>Extra large modal</div>
      </Modal>
    );
    expect(screen.getByTestId('modal-content')).toHaveClass('modal-xl');
  });

  it('renders with different variants', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} variant="success">
        <div>Success modal</div>
      </Modal>
    );
    expect(screen.getByTestId('modal')).toHaveClass('modal-success');

    rerender(
      <Modal open onClose={() => {}} variant="warning">
        <div>Warning modal</div>
      </Modal>
    );
    expect(screen.getByTestId('modal')).toHaveClass('modal-warning');
  });

  it('handles fullscreen mode', () => {
    render(
      <Modal open onClose={() => {}} fullscreen>
        <div>Fullscreen modal</div>
      </Modal>
    );

    expect(screen.getByTestId('modal')).toHaveClass('modal-fullscreen');
  });

  it('handles centered positioning', () => {
    render(
      <Modal open onClose={() => {}} centered>
        <div>Centered modal</div>
      </Modal>
    );

    expect(screen.getByTestId('modal')).toHaveClass('modal-centered');
  });

  it('handles scrollable content', () => {
    render(
      <Modal open onClose={() => {}} scrollable>
        <div>Scrollable modal</div>
      </Modal>
    );

    expect(screen.getByTestId('modal-content')).toHaveClass('modal-scrollable');
  });

  it('applies custom className', () => {
    render(
      <Modal open onClose={() => {}} className="custom-modal">
        <div>Custom modal</div>
      </Modal>
    );

    expect(screen.getByTestId('modal')).toHaveClass('custom-modal');
  });

  it('handles loading state', () => {
    render(
      <Modal open onClose={() => {}} loading>
        <div>Loading modal</div>
      </Modal>
    );

    expect(screen.getByTestId('modal-loading')).toBeInTheDocument();
  });

  it('prevents body scroll when open', () => {
    render(
      <Modal open onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(document.body).toHaveClass('modal-open');
  });

  it('restores body scroll when closed', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(document.body).toHaveClass('modal-open');

    rerender(
      <Modal open={false} onClose={() => {}}>
        <div>Modal content</div>
      </Modal>
    );

    expect(document.body).not.toHaveClass('modal-open');
  });

  it('handles focus management', () => {
    render(
      <Modal open onClose={() => {}} title="Focus Test">
        <input data-testid="modal-input" />
      </Modal>
    );

    // Modal should trap focus within itself
    const modalContent = screen.getByTestId('modal-content');
    expect(modalContent).toHaveAttribute('tabIndex', '-1');
  });

  it('renders with custom header', () => {
    const customHeader = (
      <div data-testid="custom-header">
        <h2>Custom Header</h2>
        <button>Custom Action</button>
      </div>
    );

    render(
      <Modal open onClose={() => {}} header={customHeader}>
        <div>Modal content</div>
      </Modal>
    );

    expect(screen.getByTestId('custom-header')).toBeInTheDocument();
    expect(screen.getByText('Custom Header')).toBeInTheDocument();
    expect(screen.getByText('Custom Action')).toBeInTheDocument();
  });
});
