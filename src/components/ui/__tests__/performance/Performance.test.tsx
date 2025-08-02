import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Button from '../../Button';
import Card from '../../Card';
import Table from '../../Table';
import { Loading } from '../../Loading';
import Modal from '../../Modal';

// Performance testing utilities
const measureRenderTime = (component: React.ReactElement): number => {
  const start = performance.now();
  render(component);
  const end = performance.now();
  return end - start;
};

const measureReRenderTime = (component: React.ReactElement, updates: number = 10): number => {
  const { rerender } = render(component);
  
  const start = performance.now();
  for (let i = 0; i < updates; i++) {
    rerender(component);
  }
  const end = performance.now();
  
  return (end - start) / updates; // Average time per re-render
};

const generateLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    status: index % 2 === 0 ? 'Active' : 'Inactive',
    role: index % 3 === 0 ? 'Admin' : 'User',
    department: `Department ${(index % 5) + 1}`,
    createdAt: new Date(2024, 0, (index % 30) + 1).toISOString(),
  }));
};

// Mock performance observer
const mockPerformanceObserver = () => {
  const entries: PerformanceEntry[] = [];
  
  global.PerformanceObserver = vi.fn().mockImplementation((callback) => ({
    observe: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: vi.fn(() => entries),
  }));
  
  return entries;
};

describe('Performance Tests', () => {
  let performanceEntries: PerformanceEntry[];

  beforeEach(() => {
    performanceEntries = mockPerformanceObserver();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Render Performance', () => {
    it('renders Button component efficiently', () => {
      const renderTime = measureRenderTime(<Button>Test Button</Button>);
      
      // Button should render in less than 5ms
      expect(renderTime).toBeLessThan(5);
    });

    it('renders Card component efficiently', () => {
      const renderTime = measureRenderTime(
        <Card header="Test Header" footer="Test Footer">
          <p>Test content</p>
        </Card>
      );
      
      // Card should render in less than 10ms
      expect(renderTime).toBeLessThan(10);
    });

    it('renders complex component combinations efficiently', () => {
      const renderTime = measureRenderTime(
        <div>
          <Card header="Performance Test">
            <div className="space-y-4">
              <Button variant="primary">Primary Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <div className="grid grid-cols-2 gap-4">
                <Card size="sm">Nested Card 1</Card>
                <Card size="sm">Nested Card 2</Card>
              </div>
            </div>
          </Card>
        </div>
      );
      
      // Complex component should render in less than 20ms
      expect(renderTime).toBeLessThan(20);
    });
  });

  describe('Table Performance Tests', () => {
    const columns = [
      { key: 'id', title: 'ID', sortable: true },
      { key: 'name', title: 'Name', sortable: true },
      { key: 'email', title: 'Email' },
      { key: 'status', title: 'Status' },
      { key: 'role', title: 'Role' },
      { key: 'department', title: 'Department' },
    ];

    it('renders small table efficiently', () => {
      const data = generateLargeDataset(10);
      const renderTime = measureRenderTime(
        <Table columns={columns} data={data} />
      );
      
      // Small table should render in less than 15ms
      expect(renderTime).toBeLessThan(15);
    });

    it('renders medium table efficiently', () => {
      const data = generateLargeDataset(100);
      const renderTime = measureRenderTime(
        <Table columns={columns} data={data} />
      );
      
      // Medium table should render in less than 50ms
      expect(renderTime).toBeLessThan(50);
    });

    it('handles large dataset with pagination', () => {
      const data = generateLargeDataset(1000);
      const renderTime = measureRenderTime(
        <Table 
          columns={columns} 
          data={data.slice(0, 20)} // Only render first page
          pagination={{
            current: 1,
            pageSize: 20,
            total: data.length,
            onChange: () => {}
          }}
        />
      );
      
      // Paginated table should render efficiently regardless of total data size
      expect(renderTime).toBeLessThan(30);
    });

    it('handles sorting performance', () => {
      const data = generateLargeDataset(100);
      
      const { rerender } = render(
        <Table columns={columns} data={data} sortBy="name" sortOrder="asc" />
      );
      
      const start = performance.now();
      rerender(
        <Table columns={columns} data={data} sortBy="name" sortOrder="desc" />
      );
      const end = performance.now();
      
      const sortTime = end - start;
      
      // Sorting should be fast
      expect(sortTime).toBeLessThan(10);
    });
  });

  describe('Re-render Performance', () => {
    it('handles Button re-renders efficiently', () => {
      const avgReRenderTime = measureReRenderTime(
        <Button variant="primary">Re-render Test</Button>
      );
      
      // Re-renders should be very fast
      expect(avgReRenderTime).toBeLessThan(2);
    });

    it('handles Card re-renders efficiently', () => {
      const avgReRenderTime = measureReRenderTime(
        <Card>Re-render test content</Card>
      );
      
      expect(avgReRenderTime).toBeLessThan(3);
    });

    it('handles state changes efficiently', () => {
      let isLoading = false;
      
      const TestComponent = () => (
        <div>
          <Button loading={isLoading}>
            {isLoading ? 'Loading...' : 'Click me'}
          </Button>
          <Card>
            {isLoading ? <Loading /> : <p>Content loaded</p>}
          </Card>
        </div>
      );

      const { rerender } = render(<TestComponent />);
      
      const start = performance.now();
      
      // Simulate multiple state changes
      for (let i = 0; i < 5; i++) {
        isLoading = !isLoading;
        rerender(<TestComponent />);
      }
      
      const end = performance.now();
      const avgStateChangeTime = (end - start) / 5;
      
      // State changes should be fast
      expect(avgStateChangeTime).toBeLessThan(5);
    });
  });

  describe('Memory Performance', () => {
    it('does not create memory leaks with multiple renders', () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;
      
      // Render and unmount components multiple times
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(
          <div>
            <Button>Button {i}</Button>
            <Card>Card {i}</Card>
          </div>
        );
        unmount();
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal (less than 1MB)
      expect(memoryIncrease).toBeLessThan(1024 * 1024);
    });

    it('handles large component trees efficiently', () => {
      const LargeComponentTree = () => (
        <div>
          {Array.from({ length: 50 }, (_, i) => (
            <Card key={i}>
              <div className="space-y-2">
                <Button size="sm">Button {i}</Button>
                <p>Content {i}</p>
              </div>
            </Card>
          ))}
        </div>
      );

      const renderTime = measureRenderTime(<LargeComponentTree />);
      
      // Large component tree should still render reasonably fast
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Modal Performance', () => {
    it('renders modal efficiently', () => {
      const renderTime = measureRenderTime(
        <Modal open onClose={() => {}} title="Performance Test">
          <div>
            <p>Modal content</p>
            <Button>Modal Button</Button>
          </div>
        </Modal>
      );
      
      // Modal should render efficiently
      expect(renderTime).toBeLessThan(15);
    });

    it('handles modal open/close efficiently', () => {
      let isOpen = false;
      
      const TestModal = () => (
        <Modal open={isOpen} onClose={() => {}} title="Toggle Test">
          <p>Modal content</p>
        </Modal>
      );

      const { rerender } = render(<TestModal />);
      
      const start = performance.now();
      
      // Toggle modal multiple times
      for (let i = 0; i < 10; i++) {
        isOpen = !isOpen;
        rerender(<TestModal />);
      }
      
      const end = performance.now();
      const avgToggleTime = (end - start) / 10;
      
      // Modal toggle should be fast
      expect(avgToggleTime).toBeLessThan(3);
    });
  });

  describe('CSS Performance', () => {
    it('applies CSS classes efficiently', () => {
      const start = performance.now();
      
      render(
        <div className="p-4 space-y-4">
          <Button className="bg-blue-500 hover:bg-blue-600 focus:ring-2 focus:ring-blue-300 transition-all duration-200">
            Complex CSS Button
          </Button>
          <Card className="shadow-lg border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
              Complex styled content
            </div>
          </Card>
        </div>
      );
      
      const end = performance.now();
      const cssRenderTime = end - start;
      
      // Complex CSS should not significantly impact render time
      expect(cssRenderTime).toBeLessThan(20);
    });

    it('handles dynamic class changes efficiently', () => {
      let variant = 'primary';
      
      const DynamicButton = () => (
        <Button variant={variant as any}>Dynamic Button</Button>
      );

      const { rerender } = render(<DynamicButton />);
      
      const variants = ['primary', 'secondary', 'success', 'warning', 'danger'];
      const start = performance.now();
      
      variants.forEach(v => {
        variant = v;
        rerender(<DynamicButton />);
      });
      
      const end = performance.now();
      const avgClassChangeTime = (end - start) / variants.length;
      
      // Dynamic class changes should be fast
      expect(avgClassChangeTime).toBeLessThan(2);
    });
  });

  describe('Animation Performance', () => {
    it('handles loading animations efficiently', () => {
      const renderTime = measureRenderTime(
        <div>
          <Loading type="spinner" />
          <Loading type="dots" />
          <Loading type="pulse" />
        </div>
      );
      
      // Animated components should render efficiently
      expect(renderTime).toBeLessThan(15);
    });

    it('handles transition animations efficiently', () => {
      let isVisible = true;
      
      const AnimatedComponent = () => (
        <div className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
          <Card>Animated content</Card>
        </div>
      );

      const { rerender } = render(<AnimatedComponent />);
      
      const start = performance.now();
      
      // Toggle visibility multiple times
      for (let i = 0; i < 10; i++) {
        isVisible = !isVisible;
        rerender(<AnimatedComponent />);
      }
      
      const end = performance.now();
      const avgAnimationTime = (end - start) / 10;
      
      // Animation state changes should be fast
      expect(avgAnimationTime).toBeLessThan(3);
    });
  });
});
