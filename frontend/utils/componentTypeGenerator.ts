/**
 * 组件类型生成器
 * 自动生成组件的TypeScript类型定义
 */

export interface ComponentTypeOptions {
  name: string;
  type: 'ui' | 'form' | 'data' | 'layout' | 'interactive';
  hasChildren: boolean;
  hasVariants: boolean;
  hasEvents: boolean;
  customProps?: Array<{
    name: string;
    type: string;
    required: boolean;
    description?: string;
  }>;
}

export class ComponentTypeGenerator {
  generateTypes(options: ComponentTypeOptions): string {
    const {
      name,
      type,
      hasChildren,
      hasVariants,
      hasEvents,
      customProps = []
    } = options;

    const baseProps = this.generateBaseProps(hasChildren);
    const variantProps = hasVariants ? this.generateVariantProps() : '';
    const eventProps = hasEvents ? this.generateEventProps(type) : '';
    const customPropsStr = this.generateCustomProps(customProps);

    return `/**
 * ${name} 组件的 Props 类型定义
 */
export interface ${name}Props {
${baseProps}
${variantProps}
${eventProps}
${customPropsStr}
}

/**
 * ${name} 组件的默认 Props
 */
export const default${name}Props: Partial<${name}Props> = {
  disabled: false,
  loading: false,
${hasVariants ? '  variant: 'primary',
  size: 'medium',' : ''}
};

/**
 * ${name} 组件的 Ref 类型
 */
export type ${name}Ref = HTMLElement;`;
  }

  private generateBaseProps(hasChildren: boolean): string {
    const props = [
      '  className?: string;',
      '  style?: React.CSSProperties;',
      '  disabled?: boolean;',
      '  loading?: boolean;',
      '  'data-testid'?: string;',
      '  'aria-label'?: string;',
      '  'aria-describedby'?: string;',
      '  role?: string;',
      '  tabIndex?: number;'
    ];

    if (hasChildren) {
      props.unshift('  children?: React.ReactNode;');
    }

    return props.join('\n');
  }

  private generateVariantProps(): string {
    return `  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error';`;
  }

  private generateEventProps(type: string): string {
    const commonEvents = [
      '  onClick?: (event: React.MouseEvent<HTMLElement>) => void;',
      '  onFocus?: (event: React.FocusEvent<HTMLElement>) => void;',
      '  onBlur?: (event: React.FocusEvent<HTMLElement>) => void;'
    ];

    switch (type) {
      case 'form':
        return [...commonEvents,
          '  onChange?: (value: any) => void;',
          '  onSubmit?: (event: React.FormEvent) => void;',
          '  onValidate?: (value: any) => boolean | string;'
        ].join('\n');

      case 'interactive':
        return [...commonEvents,
          '  onOpen?: () => void;',
          '  onClose?: () => void;',
          '  onToggle?: (isOpen: boolean) => void;'
        ].join('\n');

      default:
        return commonEvents.join('\n');
    }
  }

  private generateCustomProps(customProps: Array<any>): string {
    return customProps.map(prop => {
      const optional = prop.required ? '' : '?';
      const comment = prop.description ? ` // ${prop.description}` : '';
      return `  ${prop.name}${optional}: ${prop.type};${comment}`;
    }).join('\n');
  }
}

export const componentTypeGenerator = new ComponentTypeGenerator();
export default componentTypeGenerator;