import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CheckCircle2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import type { MonitoringSite } from '../../services/monitoringApi';

import SiteDetailDialog from './SiteDetailDialog';

const mockSite: MonitoringSite = {
  id: 'site-1',
  name: '生产环境主站',
  url: 'https://example.com',
  status: 'active',
  monitoring_type: 'uptime',
  check_interval: 300,
  timeout: 30,
  config: {},
  notification_settings: {},
  last_check: '2025-01-15T10:30:00Z',
  last_status: 'up',
  last_response_time: 120,
  consecutive_failures: 0,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-15T10:30:00Z',
};

const defaultStatusInfo = {
  color: 'bg-green-500',
  label: '正常',
  icon: CheckCircle2,
};

describe('SiteDetailDialog', () => {
  it('returns null when site is null', () => {
    const { container } = render(
      <SiteDetailDialog
        site={null}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders site name and url when open', () => {
    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('生产环境主站')).toBeInTheDocument();
    expect(screen.getByText(/example\.com/)).toBeInTheDocument();
  });

  it('renders status label', () => {
    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('正常')).toBeInTheDocument();
  });

  it('renders response time in ms', () => {
    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('120ms')).toBeInTheDocument();
  });

  it('renders dash when response time is null', () => {
    render(
      <SiteDetailDialog
        site={{ ...mockSite, last_response_time: null }}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('renders type label', () => {
    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('可用性监控')).toBeInTheDocument();
  });

  it('renders check interval in minutes for 300s', () => {
    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('5 分钟')).toBeInTheDocument();
  });

  it('renders check interval in hours for >= 3600s', () => {
    render(
      <SiteDetailDialog
        site={{ ...mockSite, check_interval: 7200 }}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('2 小时')).toBeInTheDocument();
  });

  it('renders check interval in seconds for < 60s', () => {
    render(
      <SiteDetailDialog
        site={{ ...mockSite, check_interval: 30 }}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('30 秒')).toBeInTheDocument();
  });

  it('renders 从未 when last_check is null', () => {
    render(
      <SiteDetailDialog
        site={{ ...mockSite, last_check: null }}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    expect(screen.getByText('从未')).toBeInTheDocument();
  });

  it('shows consecutive failures in red when > 0', () => {
    render(
      <SiteDetailDialog
        site={{ ...mockSite, consecutive_failures: 3 }}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    const failureText = screen.getByText('3 次');
    expect(failureText.className).toContain('text-red-500');
  });

  it('shows 0 in green when no failures', () => {
    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={() => {}}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    const zeroText = screen.getByText('0');
    expect(zeroText.className).toContain('text-green-600');
  });

  it('calls onCheck with site id when 立即检查 button clicked', async () => {
    const user = userEvent.setup();
    const onCheck = vi.fn();

    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={() => {}}
        onCheck={onCheck}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    await user.click(screen.getByText('立即检查'));
    expect(onCheck).toHaveBeenCalledWith('site-1');
  });

  it('calls onOpenChange(false) when 关闭 button clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    render(
      <SiteDetailDialog
        site={mockSite}
        open={true}
        onOpenChange={onOpenChange}
        onCheck={() => {}}
        statusInfo={defaultStatusInfo}
        typeLabel='可用性监控'
      />
    );

    await user.click(screen.getByText('关闭'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
