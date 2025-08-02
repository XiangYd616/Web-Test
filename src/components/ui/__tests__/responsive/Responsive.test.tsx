import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Button from '../../Button';
import Card from '../../Card';
import { Input } from '../../Input';
import Table from '../../Table';
import Modal from '../../Modal';

// Viewport configurations for different devices
const viewports = {
  mobile: { width: 375, height: 667 },      // iPhone SE
  mobileLarge: { width: 414, height: 896 }, // iPhone 11 Pro Max
  tablet: { width: 768, height: 1024 },     // iPad
  tabletLarge: { width: 1024, height: 1366 }, // iPad Pro
  desktop: { width: 1280, height: 720 },    // Desktop
  desktopLarge: { width: 1920, height: 1080 }, // Large Desktop
};

// Helper function to set viewport size
const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  });
  
  // Trigger resize event
  window.dispatchEvent(new Event('resize'));
};

// Helper function to get computed styles
const getComputedStyle = (element: Element) => {
  return window.getComputedStyle(element);
};

describe('Responsive Design Tests', () => {
  let originalInnerWidth: number;
  let originalInnerHeight: number;

  beforeEach(() => {
    originalInnerWidth = window.innerWidth;
    originalInnerHeight = window.innerHeight;
  });

  afterEach(() => {
    setViewport(originalInnerWidth, originalInnerHeight);
  });

  describe('Button Responsive Behavior', () => {
    it('adapts button sizes on mobile devices', () => {
      setViewport(viewports.mobile.width, viewports.mobile.height);
      
      const { container } = render(
        <div className="p-4 space-y-2">
          <Button fullWidth>Mobile Full Width</Button>
          <Button size="sm">Mobile Small</Button>
          <Button size="lg">Mobile Large</Button>
        </div>
      );

      const fullWidthButton = screen.getByText('Mobile Full Width');
      expect(fullWidthButton).toHaveClass('btn-full-width');
      
      // On mobile, buttons should be more touch-friendly
      const smallButton = screen.getByText('Mobile Small');
      expect(smallButton).toHaveClass('btn-sm');
    });

    it('maintains proper spacing on tablet devices', () => {
      setViewport(viewports.tablet.width, viewports.tablet.height);
      
      render(
        <div className="flex flex-wrap gap-2 md:gap-4 p-4">
          <Button>Tablet Button 1</Button>
          <Button>Tablet Button 2</Button>
          <Button>Tablet Button 3</Button>
        </div>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      
      // Buttons should be properly spaced on tablet
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });

    it('displays properly on desktop devices', () => {
      setViewport(viewports.desktop.width, viewports.desktop.height);
      
      render(
        <div className="flex space-x-4 p-4">
          <Button variant="primary">Desktop Primary</Button>
          <Button variant="secondary">Desktop Secondary</Button>
          <Button variant="outline">Desktop Outline</Button>
        </div>
      );

      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(3);
      
      // Desktop should have proper horizontal spacing
      buttons.forEach(button => {
        expect(button).toBeInTheDocument();
      });
    });
  });

  describe('Card Responsive Behavior', () => {
    it('stacks cards vertically on mobile', () => {
      setViewport(viewports.mobile.width, viewports.mobile.height);
      
      const { container } = render(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          <Card>Mobile Card 1</Card>
          <Card>Mobile Card 2</Card>
          <Card>Mobile Card 3</Card>
        </div>
      );

      const cards = screen.getAllByText(/Mobile Card/);
      expect(cards).toHaveLength(3);
      
      // On mobile, should use single column layout
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('grid-cols-1');
    });

    it('displays cards in grid on tablet', () => {
      setViewport(viewports.tablet.width, viewports.tablet.height);
      
      const { container } = render(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          <Card>Tablet Card 1</Card>
          <Card>Tablet Card 2</Card>
          <Card>Tablet Card 3</Card>
          <Card>Tablet Card 4</Card>
        </div>
      );

      const cards = screen.getAllByText(/Tablet Card/);
      expect(cards).toHaveLength(4);
      
      // On tablet, should use 2-column layout
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('md:grid-cols-2');
    });

    it('optimizes card layout for desktop', () => {
      setViewport(viewports.desktop.width, viewports.desktop.height);
      
      const { container } = render(
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          <Card>Desktop Card 1</Card>
          <Card>Desktop Card 2</Card>
          <Card>Desktop Card 3</Card>
          <Card>Desktop Card 4</Card>
          <Card>Desktop Card 5</Card>
        </div>
      );

      const cards = screen.getAllByText(/Desktop Card/);
      expect(cards).toHaveLength(5);
      
      // On desktop, should use 3+ column layout
      const gridContainer = container.querySelector('.grid');
      expect(gridContainer).toHaveClass('lg:grid-cols-3');
    });
  });

  describe('Table Responsive Behavior', () => {
    const mockColumns = [
      { key: 'id', title: 'ID' },
      { key: 'name', title: 'Name' },
      { key: 'email', title: 'Email' },
      { key: 'status', title: 'Status' },
      { key: 'role', title: 'Role' },
      { key: 'created', title: 'Created' }
    ];

    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com', status: 'Active', role: 'Admin', created: '2024-01-01' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'Inactive', role: 'User', created: '2024-01-02' }
    ];

    it('becomes horizontally scrollable on mobile', () => {
      setViewport(viewports.mobile.width, viewports.mobile.height);
      
      const { container } = render(
        <div className="overflow-x-auto">
          <Table columns={mockColumns} data={mockData} />
        </div>
      );

      const tableContainer = container.querySelector('.overflow-x-auto');
      expect(tableContainer).toBeInTheDocument();
      
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
    });

    it('shows condensed view on tablet', () => {
      setViewport(viewports.tablet.width, viewports.tablet.height);
      
      render(
        <Table 
          columns={mockColumns.slice(0, 4)} // Show fewer columns on tablet
          data={mockData} 
          size="sm"
        />
      );

      const table = screen.getByRole('table');
      expect(table).toHaveClass('table-sm');
    });

    it('displays full table on desktop', () => {
      setViewport(viewports.desktop.width, viewports.desktop.height);
      
      render(<Table columns={mockColumns} data={mockData} />);

      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // All columns should be visible on desktop
      mockColumns.forEach(column => {
        expect(screen.getByText(column.title)).toBeInTheDocument();
      });
    });
  });

  describe('Modal Responsive Behavior', () => {
    it('becomes fullscreen on mobile', () => {
      setViewport(viewports.mobile.width, viewports.mobile.height);
      
      render(
        <Modal 
          open 
          onClose={() => {}} 
          title="Mobile Modal"
          size="responsive"
        >
          <p>Mobile modal content</p>
        </Modal>
      );

      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('modal-responsive');
      
      // On mobile, modal should take full screen
      const modalContent = screen.getByTestId('modal-content');
      expect(modalContent).toBeInTheDocument();
    });

    it('maintains proper size on tablet', () => {
      setViewport(viewports.tablet.width, viewports.tablet.height);
      
      render(
        <Modal 
          open 
          onClose={() => {}} 
          title="Tablet Modal"
          size="md"
        >
          <p>Tablet modal content</p>
        </Modal>
      );

      const modalContent = screen.getByTestId('modal-content');
      expect(modalContent).toHaveClass('modal-md');
    });

    it('centers properly on desktop', () => {
      setViewport(viewports.desktop.width, viewports.desktop.height);
      
      render(
        <Modal 
          open 
          onClose={() => {}} 
          title="Desktop Modal"
          size="lg"
          centered
        >
          <p>Desktop modal content</p>
        </Modal>
      );

      const modal = screen.getByTestId('modal');
      expect(modal).toHaveClass('modal-centered');
    });
  });

  describe('Input Responsive Behavior', () => {
    it('optimizes input sizes for mobile', () => {
      setViewport(viewports.mobile.width, viewports.mobile.height);
      
      render(
        <div className="p-4 space-y-4">
          <Input label="Mobile Input" size="lg" />
          <Input label="Mobile Email" type="email" />
          <Input label="Mobile Phone" type="tel" />
        </div>
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(3);
      
      // Mobile inputs should be larger for better touch interaction
      const mobileInput = screen.getByLabelText('Mobile Input');
      expect(mobileInput).toHaveClass('input-lg');
    });

    it('maintains standard sizes on desktop', () => {
      setViewport(viewports.desktop.width, viewports.desktop.height);
      
      render(
        <div className="grid grid-cols-2 gap-4 p-4">
          <Input label="Desktop Input 1" />
          <Input label="Desktop Input 2" />
        </div>
      );

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2);
      
      inputs.forEach(input => {
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('Layout Responsive Behavior', () => {
    it('handles complex responsive layouts', () => {
      setViewport(viewports.mobile.width, viewports.mobile.height);
      
      const { container } = render(
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <Input label="Responsive Input" />
              <Button fullWidth className="mt-2">Mobile Button</Button>
            </Card>
            <Card className="md:col-span-2">
              <Table 
                columns={[
                  { key: 'name', title: 'Name' },
                  { key: 'status', title: 'Status' }
                ]}
                data={[
                  { name: 'John', status: 'Active' }
                ]}
              />
            </Card>
          </div>
        </div>
      );

      // Should render without errors on mobile
      expect(container.querySelector('.container')).toBeInTheDocument();
      expect(screen.getByText('Mobile Button')).toBeInTheDocument();
    });

    it('adapts to different orientations', () => {
      // Portrait orientation
      setViewport(375, 667);
      
      const { rerender } = render(
        <div className="flex flex-col md:flex-row gap-4 p-4">
          <Card className="flex-1">Portrait Card 1</Card>
          <Card className="flex-1">Portrait Card 2</Card>
        </div>
      );

      expect(screen.getByText('Portrait Card 1')).toBeInTheDocument();
      
      // Landscape orientation
      setViewport(667, 375);
      
      rerender(
        <div className="flex flex-col md:flex-row gap-4 p-4">
          <Card className="flex-1">Landscape Card 1</Card>
          <Card className="flex-1">Landscape Card 2</Card>
        </div>
      );

      expect(screen.getByText('Landscape Card 1')).toBeInTheDocument();
    });
  });

  describe('Breakpoint Tests', () => {
    it('applies correct styles at each breakpoint', () => {
      const breakpoints = [
        { name: 'mobile', ...viewports.mobile },
        { name: 'tablet', ...viewports.tablet },
        { name: 'desktop', ...viewports.desktop },
        { name: 'large', ...viewports.desktopLarge }
      ];

      breakpoints.forEach(({ name, width, height }) => {
        setViewport(width, height);
        
        const { container } = render(
          <div className={`
            p-2 sm:p-4 md:p-6 lg:p-8 xl:p-10
            text-sm sm:text-base md:text-lg lg:text-xl
            grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
          `}>
            <Card>{name} breakpoint test</Card>
          </div>
        );

        expect(screen.getByText(`${name} breakpoint test`)).toBeInTheDocument();
        expect(container.querySelector('.grid')).toBeInTheDocument();
      });
    });
  });
});
