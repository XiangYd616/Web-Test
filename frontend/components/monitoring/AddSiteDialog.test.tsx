import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AddSiteDialog from './AddSiteDialog';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

describe('AddSiteDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
    editSite: null,
  };

  it('renders add mode title when editSite is null', () => {
    render(<AddSiteDialog {...defaultProps} />);
    expect(screen.getByText('添加监控站点')).toBeInTheDocument();
  });

  it('renders edit mode title when editSite is provided', () => {
    render(
      <AddSiteDialog
        {...defaultProps}
        editSite={{
          id: 's1',
          name: '测试站',
          url: 'https://test.com',
          status: 'active',
          monitoring_type: 'uptime',
          check_interval: 300,
          timeout: 30,
          config: {},
          notification_settings: {},
          last_check: null,
          last_status: null,
          last_response_time: null,
          consecutive_failures: 0,
          created_at: '',
          updated_at: '',
        }}
      />
    );
    expect(screen.getByText('编辑监控站点')).toBeInTheDocument();
  });

  it('renders form fields', () => {
    render(<AddSiteDialog {...defaultProps} />);
    expect(screen.getByLabelText('站点名称')).toBeInTheDocument();
    expect(screen.getByLabelText('URL')).toBeInTheDocument();
    expect(screen.getByText('超时时间 (秒)')).toBeInTheDocument();
  });

  it('renders cancel and submit buttons', () => {
    render(<AddSiteDialog {...defaultProps} />);
    expect(screen.getByText('取消')).toBeInTheDocument();
    expect(screen.getByText('添加')).toBeInTheDocument();
  });

  it('shows 保存 button in edit mode', () => {
    render(
      <AddSiteDialog
        {...defaultProps}
        editSite={{
          id: 's1',
          name: '测试站',
          url: 'https://test.com',
          status: 'active',
          monitoring_type: 'uptime',
          check_interval: 300,
          timeout: 30,
          config: {},
          notification_settings: {},
          last_check: null,
          last_status: null,
          last_response_time: null,
          consecutive_failures: 0,
          created_at: '',
          updated_at: '',
        }}
      />
    );
    expect(screen.getByText('保存')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    render(<AddSiteDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByText('取消'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onSubmit with form data when submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<AddSiteDialog {...defaultProps} onSubmit={onSubmit} />);

    const nameInput = screen.getByLabelText('站点名称');
    const urlInput = screen.getByLabelText('URL');

    await user.type(nameInput, '我的站点');
    await user.type(urlInput, 'https://my-site.com');
    await user.click(screen.getByText('添加'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: '我的站点',
        url: 'https://my-site.com',
        monitoringType: 'uptime',
        checkInterval: 300,
        timeout: 30,
      })
    );
  });

  it('prefills form in edit mode', () => {
    render(
      <AddSiteDialog
        {...defaultProps}
        editSite={{
          id: 's1',
          name: '编辑站',
          url: 'https://edit.com',
          status: 'active',
          monitoring_type: 'performance',
          check_interval: 600,
          timeout: 60,
          config: {},
          notification_settings: {},
          last_check: null,
          last_status: null,
          last_response_time: null,
          consecutive_failures: 0,
          created_at: '',
          updated_at: '',
        }}
      />
    );

    expect(screen.getByLabelText('站点名称')).toHaveValue('编辑站');
    expect(screen.getByLabelText('URL')).toHaveValue('https://edit.com');
  });

  it('disables URL input in edit mode', () => {
    render(
      <AddSiteDialog
        {...defaultProps}
        editSite={{
          id: 's1',
          name: '编辑站',
          url: 'https://edit.com',
          status: 'active',
          monitoring_type: 'uptime',
          check_interval: 300,
          timeout: 30,
          config: {},
          notification_settings: {},
          last_check: null,
          last_status: null,
          last_response_time: null,
          consecutive_failures: 0,
          created_at: '',
          updated_at: '',
        }}
      />
    );

    expect(screen.getByLabelText('URL')).toBeDisabled();
  });
});
