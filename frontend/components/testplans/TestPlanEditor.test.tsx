import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import TestPlanEditor, { type TestPlanEditorProps } from './TestPlanEditor';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const noop = () => {};

const baseProps: TestPlanEditorProps = {
  isEditing: false,
  formName: '',
  formDesc: '',
  formUrl: '',
  formSteps: [],
  formEnvId: null,
  formFailureStrategy: 'continue',
  environments: [],
  collections: [],
  onFormNameChange: noop,
  onFormDescChange: noop,
  onFormUrlChange: noop,
  onFormEnvIdChange: noop,
  onFormFailureStrategyChange: noop,
  onAddStep: noop,
  onUpdateStep: noop,
  onRemoveStep: noop,
  onSmartRecommend: noop,
  onSave: noop,
  onCancel: noop,
};

describe('TestPlanEditor', () => {
  it('renders create title when not editing', () => {
    render(<TestPlanEditor {...baseProps} />);
    expect(screen.getByText('创建测试计划')).toBeInTheDocument();
  });

  it('renders edit title when editing', () => {
    render(<TestPlanEditor {...baseProps} isEditing={true} />);
    expect(screen.getByText('编辑测试计划')).toBeInTheDocument();
  });

  it('renders name and url inputs', () => {
    render(<TestPlanEditor {...baseProps} />);
    expect(screen.getByPlaceholderText('e.g. 网站全面评估')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://example.com')).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    render(<TestPlanEditor {...baseProps} />);
    expect(screen.getByPlaceholderText('可选描述')).toBeInTheDocument();
  });

  it('renders empty steps placeholder', () => {
    render(<TestPlanEditor {...baseProps} />);
    expect(screen.getByText('点击"添加步骤"开始构建测试计划')).toBeInTheDocument();
  });

  it('renders smart recommend button', () => {
    render(<TestPlanEditor {...baseProps} />);
    expect(screen.getByText('智能推荐')).toBeInTheDocument();
  });

  it('renders add step button', () => {
    render(<TestPlanEditor {...baseProps} />);
    expect(screen.getByText('添加步骤')).toBeInTheDocument();
  });

  it('calls onSmartRecommend when smart recommend clicked', async () => {
    const user = userEvent.setup();
    const onSmartRecommend = vi.fn();
    render(<TestPlanEditor {...baseProps} onSmartRecommend={onSmartRecommend} />);

    await user.click(screen.getByText('智能推荐'));
    expect(onSmartRecommend).toHaveBeenCalledOnce();
  });

  it('calls onAddStep when add step clicked', async () => {
    const user = userEvent.setup();
    const onAddStep = vi.fn();
    render(<TestPlanEditor {...baseProps} onAddStep={onAddStep} />);

    await user.click(screen.getByText('添加步骤'));
    expect(onAddStep).toHaveBeenCalledOnce();
  });

  it('disables save button when name is empty', () => {
    render(<TestPlanEditor {...baseProps} formName='' formUrl='https://x.com' />);
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(b => b.textContent?.includes('新建计划'));
    expect(saveBtn).toBeDefined();
    expect(saveBtn).toBeDisabled();
  });

  it('disables save button when url is empty', () => {
    render(<TestPlanEditor {...baseProps} formName='Test' formUrl='' />);
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(b => b.textContent?.includes('新建计划'));
    expect(saveBtn).toBeDisabled();
  });

  it('enables save button when name and url are present', () => {
    render(<TestPlanEditor {...baseProps} formName='Test' formUrl='https://x.com' />);
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(b => b.textContent?.includes('新建计划'));
    expect(saveBtn).not.toBeDisabled();
  });

  it('calls onSave when save button clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TestPlanEditor {...baseProps} formName='Test' formUrl='https://x.com' onSave={onSave} />
    );

    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(b => b.textContent?.includes('新建计划'));
    await user.click(saveBtn!);
    expect(onSave).toHaveBeenCalledOnce();
  });

  it('calls onCancel when cancel button clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TestPlanEditor {...baseProps} onCancel={onCancel} />);

    const buttons = screen.getAllByRole('button');
    const cancelBtn = buttons.find(b => b.textContent?.includes('common.cancel'));
    await user.click(cancelBtn!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('shows save text when editing', () => {
    render(
      <TestPlanEditor {...baseProps} isEditing={true} formName='Test' formUrl='https://x.com' />
    );
    const buttons = screen.getAllByRole('button');
    const saveBtn = buttons.find(b => b.textContent?.includes('common.save'));
    expect(saveBtn).toBeDefined();
  });

  it('calls onFormNameChange when name input typed', async () => {
    const user = userEvent.setup();
    const onFormNameChange = vi.fn();
    render(<TestPlanEditor {...baseProps} onFormNameChange={onFormNameChange} />);

    const nameInput = screen.getByPlaceholderText('e.g. 网站全面评估');
    await user.type(nameInput, 'A');
    expect(onFormNameChange).toHaveBeenCalledWith('A');
  });

  it('calls onFormUrlChange when url input typed', async () => {
    const user = userEvent.setup();
    const onFormUrlChange = vi.fn();
    render(<TestPlanEditor {...baseProps} onFormUrlChange={onFormUrlChange} />);

    const urlInput = screen.getByPlaceholderText('https://example.com');
    await user.type(urlInput, 'h');
    expect(onFormUrlChange).toHaveBeenCalledWith('h');
  });

  it('renders step items when formSteps provided', () => {
    const steps = [
      {
        id: 's1',
        type: 'performance' as const,
        name: '性能测试',
        url: '',
        enabled: true,
        sortOrder: 0,
        config: {},
      },
    ];
    render(<TestPlanEditor {...baseProps} formSteps={steps} />);
    expect(screen.getByDisplayValue('性能测试')).toBeInTheDocument();
  });

  it('does not show environment select when environments is empty', () => {
    render(<TestPlanEditor {...baseProps} />);
    expect(screen.queryByText('默认环境')).toBeNull();
  });

  it('shows environment select when environments provided', () => {
    const envs = [
      {
        id: 'env1',
        name: '生产环境',
        variables: [],
        isDefault: false,
        workspaceId: 'w1',
        createdAt: '',
        updatedAt: '',
      },
    ];
    render(<TestPlanEditor {...baseProps} environments={envs} />);
    expect(screen.getByText('默认环境')).toBeInTheDocument();
  });
});
