import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Button from '../../Button';
import Card from '../../Card';
import { Input, Select, Textarea } from '../../Input';
import Table from '../../Table';
import { Badge, StatusBadge, DotBadge, ProgressBadge } from '../../Badge';
import { Loading, LoadingSpinner, LoadingSkeleton } from '../../Loading';
import Modal from '../../Modal';

// Visual regression tests to ensure components render consistently
describe('Visual Regression Tests', () => {
  describe('Button Component', () => {
    it('renders all button variants correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <div className="space-x-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="success">Success</Button>
            <Button variant="warning">Warning</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="info">Info</Button>
          </div>
          <div className="space-x-2">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="space-x-2">
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
            <Button variant="outline">Outline</Button>
          </div>
        </div>
      );
      expect(container).toMatchSnapshot();
    });

    it('renders button states correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <Button>Normal</Button>
          <Button className="hover:bg-blue-600">Hover State</Button>
          <Button className="focus:ring-2">Focus State</Button>
          <Button className="active:bg-blue-800">Active State</Button>
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Card Component', () => {
    it('renders all card variants correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <Card variant="default">Default Card</Card>
          <Card variant="elevated">Elevated Card</Card>
          <Card variant="outlined">Outlined Card</Card>
          <Card variant="filled">Filled Card</Card>

          <Card header="Card with Header">Content</Card>
          <Card footer="Card with Footer">Content</Card>

          <Card
            header="Complete Card"
            footer="Footer content"
            actions={<Button size="sm">Action</Button>}
          >
            Main content area
          </Card>
        </div>
      );
      expect(container).toMatchSnapshot();
    });

    it('renders card sizes correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <Card size="sm">Small Card</Card>
          <Card size="md">Medium Card</Card>
          <Card size="lg">Large Card</Card>
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Input Components', () => {
    it('renders all input variants correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <Input label="Text Input" placeholder="Enter text" />
          <Input label="With Error" error="This field is required" />
          <Input label="With Help" helpText="Enter your full name" />
          <Input label="Disabled" disabled value="Disabled input" />

          <Select
            label="Select Input"
            options={[
              { value: '1', label: 'Option 1' },
              { value: '2', label: 'Option 2' }
            ]}
          />

          <Textarea label="Textarea" placeholder="Enter description" rows={3} />
        </div>
      );
      expect(container).toMatchSnapshot();
    });

    it('renders input sizes correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <Input size="sm" placeholder="Small input" />
          <Input size="md" placeholder="Medium input" />
          <Input size="lg" placeholder="Large input" />
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Table Component', () => {
    const mockColumns = [
      { key: 'id', title: 'ID', sortable: true },
      { key: 'name', title: 'Name', sortable: true },
      { key: 'status', title: 'Status' }
    ];

    const mockData = [
      { id: 1, name: 'John Doe', status: 'Active' },
      { id: 2, name: 'Jane Smith', status: 'Inactive' }
    ];

    it('renders table variants correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-8">
          <Table columns={mockColumns} data={mockData} />
          <Table columns={mockColumns} data={mockData} striped />
          <Table columns={mockColumns} data={mockData} bordered />
          <Table columns={mockColumns} data={mockData} hover />
        </div>
      );
      expect(container).toMatchSnapshot();
    });

    it('renders table with selection correctly', () => {
      const { container } = render(
        <div className="p-4">
          <Table
            columns={mockColumns}
            data={mockData}
            selectable
            selectedRows={[mockData[0]]}
          />
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Badge Components', () => {
    it('renders all badge variants correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <div className="space-x-2">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="secondary">Secondary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="danger">Danger</Badge>
            <Badge variant="info">Info</Badge>
          </div>

          <div className="space-x-2">
            <Badge size="sm">Small</Badge>
            <Badge size="md">Medium</Badge>
            <Badge size="lg">Large</Badge>
          </div>

          <div className="space-x-2">
            <StatusBadge status="online">Online</StatusBadge>
            <StatusBadge status="offline">Offline</StatusBadge>
            <StatusBadge status="busy">Busy</StatusBadge>
          </div>

          <div className="space-x-2">
            <DotBadge variant="success" />
            <DotBadge variant="warning" />
            <DotBadge variant="danger" />
          </div>

          <div className="space-x-2">
            <ProgressBadge value={25} variant="info" />
            <ProgressBadge value={50} variant="warning" />
            <ProgressBadge value={75} variant="success" />
            <ProgressBadge value={100} variant="success" />
          </div>
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Loading Components', () => {
    it('renders all loading variants correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-4">
          <div className="space-x-4">
            <Loading type="spinner" />
            <Loading type="dots" />
            <Loading type="pulse" />
          </div>

          <div className="space-x-4">
            <LoadingSpinner size="sm" />
            <LoadingSpinner size="md" />
            <LoadingSpinner size="lg" />
          </div>

          <div className="space-y-2">
            <LoadingSkeleton variant="text" />
            <LoadingSkeleton variant="rectangular" width="200px" height="100px" />
            <LoadingSkeleton variant="circular" width="50px" height="50px" />
          </div>
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Modal Component', () => {
    it('renders modal variants correctly', () => {
      const { container } = render(
        <div>
          <Modal open onClose={() => {}} title="Default Modal">
            <p>This is a default modal content.</p>
          </Modal>
        </div>
      );
      expect(container).toMatchSnapshot();
    });

    it('renders modal sizes correctly', () => {
      const { container } = render(
        <div>
          <Modal open onClose={() => {}} size="sm" title="Small Modal">
            <p>Small modal content.</p>
          </Modal>
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Component Combinations', () => {
    it('renders complex component combinations correctly', () => {
      const { container } = render(
        <div className="p-4 space-y-6">
          <Card
            header="User Management"
            footer={
              <div className="flex justify-between">
                <Badge variant="info">5 users</Badge>
                <Button size="sm">Add User</Button>
              </div>
            }
          >
            <div className="space-y-4">
              <Input label="Search" placeholder="Search users..." />
              <Table
                columns={[
                  { key: 'name', title: 'Name' },
                  { key: 'status', title: 'Status' }
                ]}
                data={[
                  { name: 'John', status: 'Active' },
                  { name: 'Jane', status: 'Inactive' }
                ]}
              />
            </div>
          </Card>

          <Card variant="outlined">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DotBadge variant="success" />
                <span>System Status</span>
              </div>
              <ProgressBadge value={85} variant="success" showProgress />
            </div>
          </Card>
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });

  describe('Responsive Design', () => {
    it('renders components in mobile viewport', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      const { container } = render(
        <div className="p-2 space-y-2">
          <Button fullWidth>Mobile Button</Button>
          <Card size="sm">Mobile Card</Card>
          <Input label="Mobile Input" />
        </div>
      );
      expect(container).toMatchSnapshot();
    });

    it('renders components in tablet viewport', () => {
      // Mock tablet viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      const { container } = render(
        <div className="p-4 grid grid-cols-2 gap-4">
          <Card>Tablet Card 1</Card>
          <Card>Tablet Card 2</Card>
        </div>
      );
      expect(container).toMatchSnapshot();
    });
  });
});
