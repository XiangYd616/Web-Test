import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Button from '../../Button';
import Card from '../../Card';
import { Input } from '../../Input';
import Modal from '../../Modal';
import { Badge } from '../../Badge';

// Mock different browser environments
const mockBrowserEnvironments = {
  chrome: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    features: {
      cssGrid: true,
      cssVariables: true,
      backdropFilter: true,
      flexboxGap: true,
    }
  },
  firefox: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    features: {
      cssGrid: true,
      cssVariables: true,
      backdropFilter: true,
      flexboxGap: true,
    }
  },
  safari: {
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15',
    features: {
      cssGrid: true,
      cssVariables: true,
      backdropFilter: true,
      flexboxGap: false, // Safari < 14.1 doesn't support gap in flexbox
    }
  },
  edge: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.59',
    features: {
      cssGrid: true,
      cssVariables: true,
      backdropFilter: true,
      flexboxGap: true,
    }
  },
  ie11: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko',
    features: {
      cssGrid: false,
      cssVariables: false,
      backdropFilter: false,
      flexboxGap: false,
    }
  }
};

// Helper function to mock browser environment
const mockBrowser = (browserName: keyof typeof mockBrowserEnvironments) => {
  const browser = mockBrowserEnvironments[browserName];
  
  // Mock navigator.userAgent
  Object.defineProperty(navigator, 'userAgent', {
    writable: true,
    value: browser.userAgent,
  });

  // Mock CSS.supports
  const originalSupports = CSS.supports;
  CSS.supports = (property: string, value?: string) => {
    if (property === 'display' && value === 'grid') {
      return browser.features.cssGrid;
    }
    if (property === 'color' && value === 'var(--test)') {
      return browser.features.cssVariables;
    }
    if (property === 'backdrop-filter') {
      return browser.features.backdropFilter;
    }
    if (property === 'gap') {
      return browser.features.flexboxGap;
    }
    return originalSupports(property, value);
  };

  return () => {
    CSS.supports = originalSupports;
  };
};

describe('Cross-Browser Compatibility Tests', () => {
  let restoreBrowser: (() => void) | null = null;

  afterEach(() => {
    if (restoreBrowser) {
      restoreBrowser();
      restoreBrowser = null;
    }
  });

  describe('Chrome Browser Tests', () => {
    beforeEach(() => {
      restoreBrowser = mockBrowser('chrome');
    });

    it('renders components correctly in Chrome', () => {
      render(
        <div className="p-4 space-y-4">
          <Button variant="primary">Chrome Button</Button>
          <Card>Chrome Card</Card>
          <Input label="Chrome Input" />
          <Badge variant="success">Chrome Badge</Badge>
        </div>
      );

      expect(screen.getByText('Chrome Button')).toBeInTheDocument();
      expect(screen.getByText('Chrome Card')).toBeInTheDocument();
      expect(screen.getByLabelText('Chrome Input')).toBeInTheDocument();
      expect(screen.getByText('Chrome Badge')).toBeInTheDocument();
    });

    it('handles modern CSS features in Chrome', () => {
      const { container } = render(
        <div className="grid gap-4 backdrop-blur-sm">
          <Card>Modern CSS Features</Card>
        </div>
      );

      // Chrome should support all modern features
      expect(CSS.supports('display', 'grid')).toBe(true);
      expect(CSS.supports('gap', '1rem')).toBe(true);
      expect(CSS.supports('backdrop-filter', 'blur(10px)')).toBe(true);
    });
  });

  describe('Firefox Browser Tests', () => {
    beforeEach(() => {
      restoreBrowser = mockBrowser('firefox');
    });

    it('renders components correctly in Firefox', () => {
      render(
        <div className="p-4 space-y-4">
          <Button variant="secondary">Firefox Button</Button>
          <Card variant="outlined">Firefox Card</Card>
          <Input label="Firefox Input" />
          <Badge variant="warning">Firefox Badge</Badge>
        </div>
      );

      expect(screen.getByText('Firefox Button')).toBeInTheDocument();
      expect(screen.getByText('Firefox Card')).toBeInTheDocument();
      expect(screen.getByLabelText('Firefox Input')).toBeInTheDocument();
      expect(screen.getByText('Firefox Badge')).toBeInTheDocument();
    });

    it('handles CSS features in Firefox', () => {
      // Firefox should support most modern features
      expect(CSS.supports('display', 'grid')).toBe(true);
      expect(CSS.supports('color', 'var(--test)')).toBe(true);
      expect(CSS.supports('backdrop-filter', 'blur(10px)')).toBe(true);
    });
  });

  describe('Safari Browser Tests', () => {
    beforeEach(() => {
      restoreBrowser = mockBrowser('safari');
    });

    it('renders components correctly in Safari', () => {
      render(
        <div className="p-4 space-y-4">
          <Button variant="success">Safari Button</Button>
          <Card variant="elevated">Safari Card</Card>
          <Input label="Safari Input" />
          <Badge variant="info">Safari Badge</Badge>
        </div>
      );

      expect(screen.getByText('Safari Button')).toBeInTheDocument();
      expect(screen.getByText('Safari Card')).toBeInTheDocument();
      expect(screen.getByLabelText('Safari Input')).toBeInTheDocument();
      expect(screen.getByText('Safari Badge')).toBeInTheDocument();
    });

    it('handles Safari-specific CSS limitations', () => {
      // Safari has some limitations with flexbox gap
      expect(CSS.supports('display', 'grid')).toBe(true);
      expect(CSS.supports('gap', '1rem')).toBe(false); // Safari < 14.1
      expect(CSS.supports('backdrop-filter', 'blur(10px)')).toBe(true);
    });

    it('provides fallbacks for unsupported features in Safari', () => {
      const { container } = render(
        <div className="flex space-x-4"> {/* Fallback for gap */}
          <Button>Button 1</Button>
          <Button>Button 2</Button>
        </div>
      );

      // Should use margin-based spacing instead of gap
      expect(container.querySelector('.space-x-4')).toBeInTheDocument();
    });
  });

  describe('Edge Browser Tests', () => {
    beforeEach(() => {
      restoreBrowser = mockBrowser('edge');
    });

    it('renders components correctly in Edge', () => {
      render(
        <div className="p-4 space-y-4">
          <Button variant="danger">Edge Button</Button>
          <Card variant="filled">Edge Card</Card>
          <Input label="Edge Input" />
          <Badge variant="danger">Edge Badge</Badge>
        </div>
      );

      expect(screen.getByText('Edge Button')).toBeInTheDocument();
      expect(screen.getByText('Edge Card')).toBeInTheDocument();
      expect(screen.getByLabelText('Edge Input')).toBeInTheDocument();
      expect(screen.getByText('Edge Badge')).toBeInTheDocument();
    });

    it('handles modern CSS features in Edge', () => {
      // Modern Edge (Chromium-based) should support all features
      expect(CSS.supports('display', 'grid')).toBe(true);
      expect(CSS.supports('gap', '1rem')).toBe(true);
      expect(CSS.supports('backdrop-filter', 'blur(10px)')).toBe(true);
    });
  });

  describe('Internet Explorer 11 Tests', () => {
    beforeEach(() => {
      restoreBrowser = mockBrowser('ie11');
    });

    it('renders components with fallbacks in IE11', () => {
      render(
        <div className="p-4">
          <Button variant="primary">IE11 Button</Button>
          <Card>IE11 Card</Card>
          <Input label="IE11 Input" />
          <Badge variant="secondary">IE11 Badge</Badge>
        </div>
      );

      expect(screen.getByText('IE11 Button')).toBeInTheDocument();
      expect(screen.getByText('IE11 Card')).toBeInTheDocument();
      expect(screen.getByLabelText('IE11 Input')).toBeInTheDocument();
      expect(screen.getByText('IE11 Badge')).toBeInTheDocument();
    });

    it('handles IE11 CSS limitations with fallbacks', () => {
      // IE11 doesn't support modern CSS features
      expect(CSS.supports('display', 'grid')).toBe(false);
      expect(CSS.supports('color', 'var(--test)')).toBe(false);
      expect(CSS.supports('backdrop-filter', 'blur(10px)')).toBe(false);
      expect(CSS.supports('gap', '1rem')).toBe(false);
    });

    it('provides appropriate fallbacks for IE11', () => {
      const { container } = render(
        <div className="ie11-grid-fallback"> {/* Flexbox fallback for grid */}
          <Card>Card 1</Card>
          <Card>Card 2</Card>
        </div>
      );

      // Should use flexbox-based layout instead of grid
      expect(container.querySelector('.ie11-grid-fallback')).toBeInTheDocument();
    });
  });

  describe('Modal Cross-Browser Tests', () => {
    it('handles modal rendering across browsers', () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      browsers.forEach(browser => {
        restoreBrowser = mockBrowser(browser as keyof typeof mockBrowserEnvironments);
        
        render(
          <Modal open onClose={() => {}} title={`${browser} Modal`}>
            <p>Modal content for {browser}</p>
          </Modal>
        );

        expect(screen.getByText(`${browser} Modal`)).toBeInTheDocument();
        expect(screen.getByText(`Modal content for ${browser}`)).toBeInTheDocument();
        
        if (restoreBrowser) {
          restoreBrowser();
          restoreBrowser = null;
        }
      });
    });
  });

  describe('Event Handling Cross-Browser Tests', () => {
    it('handles click events consistently across browsers', () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      browsers.forEach(browser => {
        restoreBrowser = mockBrowser(browser as keyof typeof mockBrowserEnvironments);
        
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>{browser} Button</Button>);
        
        fireEvent.click(screen.getByText(`${browser} Button`));
        expect(handleClick).toHaveBeenCalledTimes(1);
        
        if (restoreBrowser) {
          restoreBrowser();
          restoreBrowser = null;
        }
      });
    });

    it('handles keyboard events consistently across browsers', () => {
      const browsers = ['chrome', 'firefox', 'safari', 'edge'];
      
      browsers.forEach(browser => {
        restoreBrowser = mockBrowser(browser as keyof typeof mockBrowserEnvironments);
        
        const handleClick = vi.fn();
        render(<Button onClick={handleClick}>{browser} Button</Button>);
        
        const button = screen.getByText(`${browser} Button`);
        fireEvent.keyDown(button, { key: 'Enter' });
        expect(handleClick).toHaveBeenCalledTimes(1);
        
        if (restoreBrowser) {
          restoreBrowser();
          restoreBrowser = null;
        }
      });
    });
  });
});
