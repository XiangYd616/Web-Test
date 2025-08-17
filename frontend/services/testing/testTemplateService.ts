/**
 * 测试模板服务
 */

export interface TestTemplate     {
  id: string;
  name: string;
  type: string;
  config: any;
}

class TestTemplateService {
  getTemplates(): TestTemplate[] {
    return [{ id: '1', name: 'Basic Performance', type: 'performance', config: {} }',
      { id: '2', name: 'Security Scan', type: security, config: {} }
    ];
  }
}

const testTemplateService = new TestTemplateService();
export default testTemplateService;
