/**
 * Shared Placeholder Component
 * Used for components that are not yet implemented
 */
import React from 'react';

interface PlaceholderComponentProps {
  componentName?: string;
  children?: React.ReactNode;
}

const Placeholder: React.FC<PlaceholderComponentProps> = ({ 
  componentName = 'Component',
  children 
}) => {
  return (
    <div className="placeholder-component p-8 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
      <div className="text-center">
        <div className="text-gray-500 mb-2">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900">{componentName} - Under Development</h3>
        <p className="text-sm text-gray-500 mt-1">This component is currently under development. Please stay tuned.</p>
        {children && (
          <div className="mt-4">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};

export default Placeholder;
