/**
 * 组件测试工具
 * 提供组件的可视化测试和调试功能
 */

import React, { useState    } from 'react';export interface ComponentTestProps     {
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  variants?: Record<string, Record<string, any>>;
  title?: string;
}

export const ComponentTester: React.FC<ComponentTestProps> = ({
  component: Component,
  props = {},
  variants = {},
  title = 'Component Test'
}) => {
  const [selectedVariant, setSelectedVariant] = useState('default");
  const [customProps, setCustomProps] = useState(props);

  const currentProps = selectedVariant === 'default'
    ? customProps 
    : { ...customProps, ...variants[selectedVariant] };

  return (
    <div className= 'p-6 border rounded-lg bg-white'>
      <h3 className= 'text-lg font-semibold mb-4'>{title}</h3>
      
      {/* 变体选择器 */}
      {Object.keys(variants).length > 0 && (<div className= 'mb-4'>
          <label className= 'block text-sm font-medium mb-2'>变体:</label>
          <select
            value={selectedVariant}
            onChange={(e) => setSelectedVariant(e.target.value)}
            className= 'border rounded px-3 py-1'
          >
            <option value= 'default'>默认</option>
            {Object.keys(variants).map(variant => (
              <option key={variant} value={variant}>{variant}</option>
            ))}
          </select>
        </div>
      )}

      {/* 组件渲染 */}
      <div className= 'mb-4 p-4 border rounded bg-gray-50'>
        <Component {...currentProps}    />
      </div>

      {/* Props 编辑器 */}
      <div className= 'mb-4'>
        <label className= 'block text-sm font-medium mb-2'>Props (JSON):</label>
        <textarea
          value={JSON.stringify(currentProps, null, 2)}
          onChange={(e) => {
            try {
              setCustomProps(JSON.parse(e.target.value));
            } catch {
              // 忽略无效JSON
            }
          }}
          className= 'w-full h-32 p-2 border rounded font-mono text-sm'
        />
      </div>

      {/* 组件信息 */}
      <div className= 'text-sm text-gray-600'>
        <p>组件名称: {Component.displayName || Component.name}</p>
        <p>Props 数量: {Object.keys(currentProps).length}</p>
      </div>
    </div>
  );
};

export default ComponentTester;