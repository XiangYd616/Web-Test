/**
 * UrlInput.tsx - React组件
 *
 * 文件路径: frontend\components\security\UrlInput.tsx
 * 创建时间: 2025-09-25
 */

import React from 'react';
import { URLInput } from '../ui/URLInput';

export type UrlInputProps = React.ComponentProps<typeof URLInput>;

export const UrlInput: React.FC<UrlInputProps> = props => <URLInput {...props} />;

export default UrlInput;
