/**
 * 代码编辑器组件
 */

import React from 'react';

interface CodeEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  language?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value = '',
  onChange,
  language = 'javascript',
  readOnly = false
}) => {
  return (
    <div className="code-editor">
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={readOnly}
        style={{
          width: '100%',
          height: '300px',
          fontFamily: 'monospace',
          fontSize: '14px'
        }}
      />
    </div>
  );
};

export default CodeEditor;
