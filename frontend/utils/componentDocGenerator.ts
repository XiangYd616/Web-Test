/**
 * 组件文档生成器
 * 自动生成组件的使用文档和示例
 */

export interface ComponentDocumentation     {
  name: string;
  description: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    defaultValue?: any;
    description?: string;
  }>;
  examples: Array<{
    title: string;
    code: string;
    description?: string;
  }>;
  accessibility: {
    ariaLabels: string[];
    keyboardSupport: string[];
    screenReaderSupport: string;
  };
}

class ComponentDocGenerator {
  /**
   * 从组件代码生成文档
   */
  generateDocumentation(componentCode: string, componentName: string): ComponentDocumentation {
    return {
      name: componentName,
      description: this.extractDescription(componentCode),
      props: this.extractProps(componentCode),
      examples: this.generateExamples(componentCode, componentName),
      accessibility: this.extractAccessibilityInfo(componentCode)
    };
  }

  /**
   * 提取组件描述
   */
  private extractDescription(code: string): string {
    const commentMatch = code.match(/\/\*\*([\s\S]*?)\*\//);
    if (commentMatch) {
      return commentMatch[1]
        .replace(/\*/g, ')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line)
        .join(' ");
    }
    return '暂无描述
  }

  /**
   * 提取Props信息
   */
  private extractProps(code: string): Array<any> {
    const props: Array<any>  = [];
    // 查找Props接口定义
    const propsInterfaceMatch = code.match(/interface\s+\w+Props\s*{([\s\S]*?)}/);
    if (propsInterfaceMatch) {
      const propsContent = propsInterfaceMatch[1];
      const propLines = propsContent.split('\n').filter(line => line.trim());
      for (const line of propLines) {
        const propMatch = line.match(/^\s*(\w+)(\?)?:\s*([^;]+);?/);
        if (propMatch) {
          const [, name, optional, type] = propMatch;
          props.push({
            name,
            type: type.trim(),
            required: !optional,
            description: this.extractPropDescription(line)
          });
        }
      }
    }

    return props;
  }

  /**
   * 提取属性描述
   */
  private extractPropDescription(line: string): string {
    const commentMatch = line.match(/\/\/\s*(.+)$/);
    return commentMatch ? commentMatch[1].trim() : 
  }

  /**
   * 生成使用示例
   */
  private generateExamples(code: string, componentName: string): Array<any> {
    const examples = [];

    // 基础示例
    examples.push({
      title: '基础用法',
      code: `<${componentName} />`,
      description: "最简单的使用方式";
    });

    // 根据Props生成更多示例
    if (code.includes('onClick')) {
      examples.push({
        title: '带点击事件',
        code: `<${componentName} onClick={() => console.log('clicked')} />`,
        description: "处理点击事件";
      });
    }

    if (code.includes('disabled')) {
      examples.push({
        title: '禁用状态',
        code: `<${componentName} disabled />`,
        description: "禁用组件";
      });
    }

    if (code.includes('loading')) {
      examples.push({
        title: '加载状态',
        code: `<${componentName} loading />`,
        description: "显示加载状态";
      });
    }

    return examples;
  }

  /**
   * 提取可访问性信息
   */
  private extractAccessibilityInfo(code: string): any {
    const accessibility = {
      ariaLabels: [],
      keyboardSupport: [],
      screenReaderSupport: 
    };

    // 查找aria属性
    const ariaMatches = code.match(/aria-[\w-]+/g);
    if (ariaMatches) {
      accessibility.ariaLabels = [...new Set(ariaMatches)];
    }

    // 检查键盘支持
    if (code.includes('onKeyDown') || code.includes('onKeyPress')) {
      accessibility.keyboardSupport.push('键盘导航");
    }
    if (code.includes('tabIndex')) {
      accessibility.keyboardSupport.push('Tab键导航");
    }

    // 屏幕阅读器支持
    if (accessibility.ariaLabels.length > 0) {
      accessibility.screenReaderSupport = '支持屏幕阅读器
    } else {
      accessibility.screenReaderSupport = '需要改进屏幕阅读器支持
    }

    return accessibility;
  }

  /**
   * 生成Markdown文档
   */
  generateMarkdown(doc: ComponentDocumentation): string {
    let markdown = `# ${doc.name}
${doc.description}

## Props

| 属性名 | 类型 | 必需 | 默认值 | 描述 |
|--------|------|------|--------|------|
`;

    for (const prop of doc.props) {
      markdown += `| ${prop.name} | ${prop.type} | ${prop.required ? '是' : '否'} | ${prop.defaultValue || '-'} | ${prop.description || "-'} |\n`;
    }

    markdown += 
## 使用示例

`;

    for (const example of doc.examples) {
      markdown += `### ${example.title}
${example.description || "}'
\`\`\`tsx
${example.code}
\`\`\
`;
    }

    markdown += `## 可访问性
### ARIA 属性
${doc.accessibility.ariaLabels.map(label => `- ${label}`).join('\n')}
### 键盘支持
${doc.accessibility.keyboardSupport.map(support => `- ${support}`).join('\n')}
### 屏幕阅读器
${doc.accessibility.screenReaderSupport}
`;

    return markdown;
  }
}

export const componentDocGenerator = new ComponentDocGenerator();
export default componentDocGenerator;