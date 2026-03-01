import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import HistoryDetailHeader from './HistoryDetailHeader';

const mockNavigate = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const baseProps = {
  id: 'test-123',
  isQueued: false,
  isExportable: true,
  exporting: false,
  actionLoading: false,
  statusValue: 'completed',
  exportFormat: 'json',
  detail: { some: 'data' },
  onExportFormatChange: vi.fn(),
  onExport: vi.fn(),
  onRerun: vi.fn(),
  onReplay: vi.fn(),
  onCancel: vi.fn(),
};

describe('HistoryDetailHeader', () => {
  it('renders test id', () => {
    render(<HistoryDetailHeader {...baseProps} />);
    expect(screen.getByText('test-123')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<HistoryDetailHeader {...baseProps} />);
    expect(screen.getByText('historyDetail.title')).toBeInTheDocument();
  });

  it('shows queued badge when isQueued is true', () => {
    render(<HistoryDetailHeader {...baseProps} isQueued={true} />);
    expect(screen.getByText('historyDetail.queued')).toBeInTheDocument();
  });

  it('does not show queued badge when isQueued is false', () => {
    render(<HistoryDetailHeader {...baseProps} isQueued={false} />);
    expect(screen.queryByText('historyDetail.queued')).toBeNull();
  });

  it('calls onExport when export button clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<HistoryDetailHeader {...baseProps} onExport={onExport} />);

    await user.click(screen.getByText('historyDetail.export'));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('disables export button when not exportable', () => {
    render(<HistoryDetailHeader {...baseProps} isExportable={false} />);
    const exportBtn = screen.getByText('historyDetail.export').closest('button');
    expect(exportBtn).toBeDisabled();
  });

  it('disables export button when exporting', () => {
    render(<HistoryDetailHeader {...baseProps} exporting={true} />);
    const exportBtn = screen.getByText('historyDetail.export').closest('button');
    expect(exportBtn).toBeDisabled();
  });

  it('calls onRerun when rerun button clicked', async () => {
    const user = userEvent.setup();
    const onRerun = vi.fn();
    render(<HistoryDetailHeader {...baseProps} onRerun={onRerun} />);

    await user.click(screen.getByText('historyDetail.rerun'));
    expect(onRerun).toHaveBeenCalledOnce();
  });

  it('disables rerun when actionLoading', () => {
    render(<HistoryDetailHeader {...baseProps} actionLoading={true} />);
    const rerunBtn = screen.getByText('historyDetail.rerun').closest('button');
    expect(rerunBtn).toBeDisabled();
  });

  it('disables rerun when isQueued', () => {
    render(<HistoryDetailHeader {...baseProps} isQueued={true} />);
    const rerunBtn = screen.getByText('historyDetail.rerun').closest('button');
    expect(rerunBtn).toBeDisabled();
  });

  it('disables rerun when status is running', () => {
    render(<HistoryDetailHeader {...baseProps} statusValue='running' />);
    const rerunBtn = screen.getByText('historyDetail.rerun').closest('button');
    expect(rerunBtn).toBeDisabled();
  });

  it('calls onReplay when replay button clicked', async () => {
    const user = userEvent.setup();
    const onReplay = vi.fn();
    render(<HistoryDetailHeader {...baseProps} onReplay={onReplay} />);

    await user.click(screen.getByText('historyDetail.replay'));
    expect(onReplay).toHaveBeenCalledOnce();
  });

  it('disables replay when detail is null', () => {
    render(<HistoryDetailHeader {...baseProps} detail={null} />);
    const replayBtn = screen.getByText('historyDetail.replay').closest('button');
    expect(replayBtn).toBeDisabled();
  });

  it('shows cancel button when isQueued', () => {
    render(<HistoryDetailHeader {...baseProps} isQueued={true} />);
    expect(screen.getByText('historyDetail.cancel')).toBeInTheDocument();
  });

  it('shows cancel button when status is running', () => {
    render(<HistoryDetailHeader {...baseProps} statusValue='running' />);
    expect(screen.getByText('historyDetail.cancel')).toBeInTheDocument();
  });

  it('does not show cancel button in normal state', () => {
    render(<HistoryDetailHeader {...baseProps} />);
    expect(screen.queryByText('historyDetail.cancel')).toBeNull();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <HistoryDetailHeader {...baseProps} isQueued={true} onCancel={onCancel} />
    );

    await user.click(screen.getByText('historyDetail.cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('navigates to /history when back button clicked', async () => {
    const user = userEvent.setup();
    mockNavigate.mockClear();
    render(<HistoryDetailHeader {...baseProps} />);

    // Back button is the first icon button
    const buttons = screen.getAllByRole('button');
    await user.click(buttons[0]);
    expect(mockNavigate).toHaveBeenCalledWith('/history');
  });
});
