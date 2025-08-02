import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Mock theme context for testing
const MockThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div data-theme="light">
      {children}
    </div>
  );
};

// Custom render function that includes providers
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
      <BrowserRouter>
        <MockThemeProvider>
          {children}
        </MockThemeProvider>
      </BrowserRouter>
    );
  };

  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Test utilities
export const createMockEvent = (overrides = {}) => ({
  preventDefault: jest.fn(),
  stopPropagation: jest.fn(),
  target: { value: '' },
  ...overrides,
});

export const createMockComponent = (name: string) => {
  const MockComponent = (props: any) => (
    <div data-testid={`mock-${name.toLowerCase()}`} {...props} />
  );
  MockComponent.displayName = `Mock${name}`;
  return MockComponent;
};

// CSS class testing utilities
export const hasClass = (element: Element, className: string): boolean => {
  return element.classList.contains(className);
};

export const hasClasses = (element: Element, classNames: string[]): boolean => {
  return classNames.every(className => element.classList.contains(className));
};

// Accessibility testing utilities
export const getByAriaLabel = (container: HTMLElement, label: string) => {
  return container.querySelector(`[aria-label="${label}"]`);
};

export const getByRole = (container: HTMLElement, role: string) => {
  return container.querySelector(`[role="${role}"]`);
};

// Theme testing utilities
export const mockTheme = {
  colors: {
    primary: '#3b82f6',
    secondary: '#6b7280',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
  },
};

// Component testing helpers
export const expectComponentToRender = (component: React.ReactElement) => {
  const { container } = customRender(component);
  expect(container.firstChild).toBeInTheDocument();
};

export const expectComponentToHaveClass = (
  component: React.ReactElement,
  className: string
) => {
  const { container } = customRender(component);
  expect(container.firstChild).toHaveClass(className);
};

export const expectComponentToHaveClasses = (
  component: React.ReactElement,
  classNames: string[]
) => {
  const { container } = customRender(component);
  classNames.forEach(className => {
    expect(container.firstChild).toHaveClass(className);
  });
};

// Form testing utilities
export const fillInput = (input: HTMLElement, value: string) => {
  fireEvent.change(input, { target: { value } });
};

export const submitForm = (form: HTMLElement) => {
  fireEvent.submit(form);
};

// Animation testing utilities
export const waitForAnimation = (duration = 300) => {
  return new Promise(resolve => setTimeout(resolve, duration));
};

// Mock data generators
export const generateMockTableData = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `User ${index + 1}`,
    email: `user${index + 1}@example.com`,
    status: index % 2 === 0 ? 'Active' : 'Inactive',
    role: index % 3 === 0 ? 'Admin' : 'User',
    createdAt: new Date(2024, 0, index + 1).toISOString(),
  }));
};

export const generateMockSelectOptions = (count: number) => {
  return Array.from({ length: count }, (_, index) => ({
    value: `option${index + 1}`,
    label: `Option ${index + 1}`,
  }));
};

// Performance testing utilities
export const measureRenderTime = (component: React.ReactElement) => {
  const start = performance.now();
  customRender(component);
  const end = performance.now();
  return end - start;
};

// Snapshot testing utilities
export const expectComponentToMatchSnapshot = (component: React.ReactElement) => {
  const { container } = customRender(component);
  expect(container.firstChild).toMatchSnapshot();
};
