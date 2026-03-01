import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import RequestDraftForm, { type RequestDraft } from './RequestDraftForm';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

const baseDraft: RequestDraft = {
  id: 'draft-1',
  mode: 'new',
  name: '',
  method: 'GET',
  url: '',
  headers: '',
  body: '',
};

const noop = () => {};

describe('RequestDraftForm', () => {
  it('renders all form fields', () => {
    render(<RequestDraftForm draft={baseDraft} onUpdate={noop} onSave={noop} onCancel={noop} />);

    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Headers (JSON)')).toBeInTheDocument();
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('shows "Add" button for new mode', () => {
    render(<RequestDraftForm draft={baseDraft} onUpdate={noop} onSave={noop} onCancel={noop} />);

    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find(b => b.textContent?.includes('common.add'));
    expect(addButton).toBeDefined();
  });

  it('shows "Save" button for edit mode', () => {
    render(
      <RequestDraftForm
        draft={{ ...baseDraft, mode: 'edit' }}
        onUpdate={noop}
        onSave={noop}
        onCancel={noop}
      />
    );

    const buttons = screen.getAllByRole('button');
    const saveButton = buttons.find(b => b.textContent?.includes('common.save'));
    expect(saveButton).toBeDefined();
  });

  it('disables save button when url is empty', () => {
    render(
      <RequestDraftForm
        draft={{ ...baseDraft, url: '' }}
        onUpdate={noop}
        onSave={noop}
        onCancel={noop}
      />
    );

    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find(b => b.textContent?.includes('common.add'));
    expect(addButton).toBeDefined();
    expect(
      addButton!.hasAttribute('disabled') || addButton!.closest('button')?.disabled
    ).toBeTruthy();
  });

  it('enables save button when url is present', () => {
    render(
      <RequestDraftForm
        draft={{ ...baseDraft, url: 'https://example.com' }}
        onUpdate={noop}
        onSave={noop}
        onCancel={noop}
      />
    );

    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find(b => b.textContent?.includes('common.add'));
    expect(addButton).toBeDefined();
    expect(addButton!.hasAttribute('disabled')).toBe(false);
  });

  it('calls onSave with draft id when save button is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <RequestDraftForm
        draft={{ ...baseDraft, url: 'https://example.com' }}
        onUpdate={noop}
        onSave={onSave}
        onCancel={noop}
      />
    );

    const buttons = screen.getAllByRole('button');
    const addButton = buttons.find(b => b.textContent?.includes('common.add'));
    expect(addButton).toBeDefined();
    await user.click(addButton!);

    expect(onSave).toHaveBeenCalledWith('draft-1');
  });

  it('calls onCancel with draft id when cancel button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();

    render(
      <RequestDraftForm draft={baseDraft} onUpdate={noop} onSave={noop} onCancel={onCancel} />
    );

    const buttons = screen.getAllByRole('button');
    const cancelButton = buttons.find(b => b.textContent?.includes('common.cancel'))!;
    await user.click(cancelButton);

    expect(onCancel).toHaveBeenCalledWith('draft-1');
  });

  it('calls onUpdate when name input changes', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <RequestDraftForm draft={baseDraft} onUpdate={onUpdate} onSave={noop} onCancel={noop} />
    );

    const nameInput = screen.getByPlaceholderText('e.g. Get Users');
    await user.type(nameInput, 'A');

    expect(onUpdate).toHaveBeenCalledWith('draft-1', { name: 'A' });
  });

  it('calls onUpdate when url input changes', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();

    render(
      <RequestDraftForm draft={baseDraft} onUpdate={onUpdate} onSave={noop} onCancel={noop} />
    );

    const urlInput = screen.getByPlaceholderText('https://api.example.com/endpoint');
    await user.type(urlInput, 'h');

    expect(onUpdate).toHaveBeenCalledWith('draft-1', { url: 'h' });
  });
});
