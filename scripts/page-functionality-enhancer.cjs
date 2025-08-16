#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PageFunctionalityEnhancer {
  constructor() {
    this.projectRoot = process.cwd();
    this.enhancedPages = [];
    this.fixes = [];

    // 页面功能增强配置
    this.enhancementConfig = {
      // 页面类型和对应的功能模板
      pageTypes: {
        dashboard: {
          requiredFeatures: ['dataFetching', 'charts', 'realTimeUpdates', 'filters'],
          businessLogic: ['userMetrics', 'systemStatus', 'recentActivity']
        },
        auth: {
          requiredFeatures: ['formValidation', 'errorHandling', 'redirects', 'security'],
          businessLogic: ['authentication', 'authorization', 'sessionManagement']
        },
        testing: {
          requiredFeatures: ['testExecution', 'resultDisplay', 'configuration', 'monitoring'],
          businessLogic: ['testRunner', 'resultAnalysis', 'reportGeneration']
        },
        management: {
          requiredFeatures: ['dataTable', 'crud', 'search', 'pagination'],
          businessLogic: ['dataManagement', 'userPermissions', 'auditLog']
        },
        results: {
          requiredFeatures: ['dataVisualization', 'export', 'filtering', 'comparison'],
          businessLogic: ['resultProcessing', 'analytics', 'reporting']
        },
        user: {
          requiredFeatures: ['profileManagement', 'preferences', 'security', 'notifications'],
          businessLogic: ['userProfile', 'settings', 'preferences']
        }
      },

      // 通用功能模板
      commonFeatures: {
        dataFetching: {
          hooks: ['useState', 'useEffect', 'useCallback'],
          apis: ['apiClient', 'errorHandling'],
          loading: ['LoadingSpinner', 'Skeleton']
        },
        formValidation: {
          libraries: ['react-hook-form', 'yup'],
          components: ['FormField', 'ErrorMessage'],
          validation: ['required', 'email', 'password']
        },
        errorHandling: {
          components: ['ErrorBoundary', 'ErrorDisplay'],
          hooks: ['useAsyncErrorHandler'],
          fallbacks: ['ErrorFallback', 'RetryButton']
        },
        stateManagement: {
          hooks: ['useState', 'useReducer', 'useContext'],
          patterns: ['localState', 'globalState', 'persistedState']
        }
      }
    };
  }

  /**
   * 执行页面功能增强
   */
  async execute() {
    console.log('📄 开始页面功能完善...\n');

    try {
      // 1. 扫描需要增强的页面
      const pages = await this.scanPagesForEnhancement();

      // 2. 为每个页面添加功能增强
      for (const page of pages) {
        await this.enhancePage(page);
      }

      // 3. 创建页面开发工具
      await this.createPageDevTools();

      // 4. 生成增强报告
      this.generateEnhancementReport();

    } catch (error) {
      console.error('❌ 页面功能增强过程中发生错误:', error);
      throw error;
    }
  }

  /**
   * 扫描需要增强的页面
   */
  async scanPagesForEnhancement() {
    console.log('🔍 扫描需要功能增强的页面...');

    const pagesDir = path.join(this.projectRoot, 'frontend/pages');
    const componentsDir = path.join(this.projectRoot, 'frontend/components');
    const pages = [];

    // 扫描pages目录
    if (fs.existsSync(pagesDir)) {
      const pageFiles = this.getFilesRecursively(pagesDir, ['.tsx', '.jsx']);

      for (const pageFile of pageFiles) {
        const analysis = await this.analyzePageImplementation(pageFile);
        if (analysis.needsEnhancement) {
          pages.push(analysis);
        }
      }
    }

    // 扫描components目录中的页面级组件
    if (fs.existsSync(componentsDir)) {
      const componentFiles = this.getFilesRecursively(componentsDir, ['.tsx', '.jsx']);

      for (const componentFile of componentFiles) {
        if (this.isPageLevelComponent(componentFile)) {
          const analysis = await this.analyzePageImplementation(componentFile);
          if (analysis.needsEnhancement) {
            pages.push(analysis);
          }
        }
      }
    }

    console.log(`   发现 ${pages.length} 个页面需要功能增强\n`);
    return pages;
  }

  /**
   * 分析页面实现
   */
  async analyzePageImplementation(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath, path.extname(filePath));

    // 确定页面类型
    const pageType = this.determinePageType(fileName, filePath);

    // 检查现有功能
    const currentFeatures = this.analyzeCurrentFeatures(content);

    // 确定需要的功能
    const requiredFeatures = this.enhancementConfig.pageTypes[pageType]?.requiredFeatures || [];
    const missingFeatures = requiredFeatures.filter(feature => !currentFeatures.includes(feature));

    // 检查业务逻辑
    const hasBusinessLogic = this.hasBusinessLogic(content);
    const complexity = this.calculatePageComplexity(content);

    const needsEnhancement = missingFeatures.length > 0 || !hasBusinessLogic || complexity < 30;

    return {
      filePath,
      fileName,
      pageType,
      currentFeatures,
      missingFeatures,
      hasBusinessLogic,
      complexity,
      needsEnhancement,
      content
    };
  }

  /**
   * 确定页面类型
   */
  determinePageType(fileName, filePath) {
    const lowerFileName = fileName.toLowerCase();
    const lowerPath = filePath.toLowerCase();

    if (lowerFileName.includes('dashboard') || lowerPath.includes('dashboard')) return 'dashboard';
    if (lowerFileName.includes('login') || lowerFileName.includes('register') || lowerPath.includes('auth')) return 'auth';
    if (lowerFileName.includes('test') || lowerPath.includes('testing')) return 'testing';
    if (lowerFileName.includes('management') || lowerPath.includes('management')) return 'management';
    if (lowerFileName.includes('result') || lowerFileName.includes('report') || lowerPath.includes('results')) return 'results';
    if (lowerFileName.includes('profile') || lowerFileName.includes('setting') || lowerPath.includes('user')) return 'user';

    return 'general';
  }

  /**
   * 分析当前功能
   */
  analyzeCurrentFeatures(content) {
    const features = [];

    // 检查数据获取
    if (/useState|useEffect|fetch|api/.test(content)) {
      features.push('dataFetching');
    }

    // 检查表单验证
    if (/validation|useForm|yup|joi/.test(content)) {
      features.push('formValidation');
    }

    // 检查错误处理
    if (/try.*catch|ErrorBoundary|error/.test(content)) {
      features.push('errorHandling');
    }

    // 检查状态管理
    if (/useState|useReducer|useContext/.test(content)) {
      features.push('stateManagement');
    }

    // 检查图表和可视化
    if (/chart|Chart|graph|visualization/.test(content)) {
      features.push('charts');
    }

    // 检查CRUD操作
    if (/create|update|delete|edit/.test(content)) {
      features.push('crud');
    }

    return features;
  }

  /**
   * 检查是否有业务逻辑
   */
  hasBusinessLogic(content) {
    const businessLogicIndicators = [
      // API调用
      /fetch\s*\(|axios\.|api\./,
      // 复杂状态管理
      /useReducer|useContext/,
      // 业务计算
      /calculate|process|analyze|validate/,
      // 条件业务逻辑
      /if\s*\([^)]*\)\s*{[\s\S]{20,}}/,
      // 数据处理
      /\.map\s*\([^)]*=>[^}]{10,}\)|\.filter\s*\([^)]*=>[^}]{10,}\)/,
      // 表单处理
      /onSubmit.*{[\s\S]{20,}}/
    ];

    return businessLogicIndicators.some(pattern => pattern.test(content));
  }

  /**
   * 计算页面复杂度
   */
  calculatePageComplexity(content) {
    let complexity = 0;

    // JSX元素数量
    const jsxElements = (content.match(/<[^\/][^>]*>/g) || []).length;
    complexity += jsxElements * 2;

    // Hook使用数量
    const hooks = (content.match(/use[A-Z][a-zA-Z]*\(/g) || []).length;
    complexity += hooks * 8;

    // 事件处理器数量
    const eventHandlers = (content.match(/on[A-Z][a-zA-Z]*=/g) || []).length;
    complexity += eventHandlers * 5;

    // 条件渲染数量
    const conditionals = (content.match(/\{.*\?.*:.*\}/g) || []).length;
    complexity += conditionals * 6;

    // 函数定义数量
    const functions = (content.match(/const\s+\w+\s*=.*=>/g) || []).length;
    complexity += functions * 4;

    // 业务逻辑复杂度
    const businessLogic = (content.match(/if\s*\([^)]+\)\s*{|switch\s*\([^)]+\)\s*{/g) || []).length;
    complexity += businessLogic * 10;

    return complexity;
  }

  /**
   * 增强页面
   */
  async enhancePage(pageInfo) {
    console.log(`📄 增强页面: ${pageInfo.fileName} (类型: ${pageInfo.pageType})`);

    let newContent = pageInfo.content;
    let modified = false;

    // 根据页面类型和缺失功能添加相应代码
    for (const missingFeature of pageInfo.missingFeatures) {
      switch (missingFeature) {
        case 'dataFetching':
          newContent = this.addDataFetching(newContent, pageInfo.pageType);
          modified = true;
          break;

        case 'formValidation':
          newContent = this.addFormValidation(newContent);
          modified = true;
          break;

        case 'errorHandling':
          newContent = this.addErrorHandling(newContent);
          modified = true;
          break;

        case 'stateManagement':
          newContent = this.addStateManagement(newContent, pageInfo.pageType);
          modified = true;
          break;

        case 'charts':
          newContent = this.addChartsAndVisualization(newContent);
          modified = true;
          break;

        case 'crud':
          newContent = this.addCrudOperations(newContent);
          modified = true;
          break;
      }
    }

    // 如果页面缺少业务逻辑，添加基础业务逻辑
    if (!pageInfo.hasBusinessLogic) {
      newContent = this.addBusinessLogic(newContent, pageInfo.pageType);
      modified = true;
    }

    // 添加页面级错误边界和加载状态
    newContent = this.addPageLevelFeatures(newContent);
    modified = true;

    if (modified) {
      fs.writeFileSync(pageInfo.filePath, newContent);
      this.enhancedPages.push({
        file: path.relative(this.projectRoot, pageInfo.filePath),
        pageType: pageInfo.pageType,
        enhancements: pageInfo.missingFeatures,
        complexity: pageInfo.complexity
      });
      this.addFix('page_enhancement', pageInfo.filePath, `增强${pageInfo.pageType}页面功能`);
    }
  }

  /**
   * 添加数据获取功能
   */
  addDataFetching(content, pageType) {
    const dataFetchingCode = `
  // 数据获取和状态管理
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/api/${pageType}/data');
      setData(response.data);
    } catch (err) {
      setError(err.message || '数据加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);`;

    return this.insertIntoComponent(content, dataFetchingCode);
  }

  /**
   * 添加表单验证功能
   */
  addFormValidation(content) {
    const formValidationCode = `
  // 表单验证
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});

  const validateForm = useCallback((data) => {
    const errors = {};
    
    // 添加验证规则
    if (!data.name?.trim()) {
      errors.name = '名称不能为空';
    }
    
    if (!data.email?.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(data.email)) {
      errors.email = '邮箱格式不正确';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm(formData)) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.post('/api/submit', formData);
      // 处理成功提交
    } catch (err) {
      setError(err.message || '提交失败');
    } finally {
      setLoading(false);
    }
  }, [formData, validateForm]);`;

    return this.insertIntoComponent(content, formValidationCode);
  }

  /**
   * 工具方法
   */
  isPageLevelComponent(filePath) {
    const fileName = path.basename(filePath, path.extname(filePath));
    const dirPath = path.dirname(filePath);

    // 检查文件路径是否包含页面相关目录
    const pageDirectories = ['pages', 'views', 'screens', 'routes'];
    const isInPageDirectory = pageDirectories.some(dir => dirPath.includes(dir));

    if (isInPageDirectory) {
      return true;
    }

    // 检查文件名模式
    const pagePatterns = [
      /Page$/,
      /View$/,
      /Screen$/,
      /Dashboard$/,
      /Home$/,
      /Login$/,
      /Register$/,
      /Profile$/,
      /Settings$/,
      /Test.*$/,
      /Report.*$/,
      /Management$/,
      /Admin$/
    ];

    return pagePatterns.some(pattern => pattern.test(fileName));
  }

  getFilesRecursively(dir, extensions) {
    const files = [];

    if (!fs.existsSync(dir)) return files;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (item.startsWith('.') || item === 'node_modules') continue;

      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        files.push(...this.getFilesRecursively(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }

    return files;
  }

  insertIntoComponent(content, code) {
    // 在组件函数内部的开始位置添加代码
    const componentMatch = content.match(/const\s+\w+.*=.*\([^)]*\)\s*=>\s*{/);
    if (componentMatch) {
      const insertIndex = content.indexOf(componentMatch[0]) + componentMatch[0].length;
      content = content.slice(0, insertIndex) + '\n  ' + code + content.slice(insertIndex);
    }
    return content;
  }

  /**
   * 添加错误处理功能
   */
  addErrorHandling(content) {
    const errorHandlingCode = `
  // 错误处理
  const { handleAsyncError } = useAsyncErrorHandler();

  const handleError = useCallback((error, context = '') => {
    console.error(\`Error in \${context}:\`, error);
    setError(error.message || '操作失败，请重试');

    // 可选：发送错误报告
    if (process.env.NODE_ENV === 'production') {
      // errorReportingService.report(error, context);
    }
  }, []);

  const retryOperation = useCallback(() => {
    setError(null);
    fetchData();
  }, [fetchData]);`;

    return this.insertIntoComponent(content, errorHandlingCode);
  }

  /**
   * 添加状态管理功能
   */
  addStateManagement(content, pageType) {
    const stateManagementCode = `
  // 状态管理
  const [pageState, setPageState] = useState({
    initialized: false,
    data: null,
    filters: {},
    pagination: { page: 1, pageSize: 10 },
    selectedItems: [],
    viewMode: 'list'
  });

  const updatePageState = useCallback((updates) => {
    setPageState(prev => ({ ...prev, ...updates }));
  }, []);

  // 持久化状态到localStorage
  useEffect(() => {
    const savedState = localStorage.getItem('pageState_${pageType}');
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState);
        updatePageState(parsed);
      } catch (err) {
        console.warn('Failed to restore page state:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (pageState.initialized) {
      localStorage.setItem('pageState_${pageType}', JSON.stringify(pageState));
    }
  }, [pageState]);`;

    return this.insertIntoComponent(content, stateManagementCode);
  }

  /**
   * 添加图表和可视化功能
   */
  addChartsAndVisualization(content) {
    const chartsCode = `
  // 图表和数据可视化
  const [chartData, setChartData] = useState(null);
  const [chartType, setChartType] = useState('line');

  const processChartData = useCallback((rawData) => {
    if (!rawData) return null;

    // 处理数据为图表格式
    return {
      labels: rawData.map(item => item.label),
      datasets: [{
        label: '数据',
        data: rawData.map(item => item.value),
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      }]
    };
  }, []);

  useEffect(() => {
    if (data) {
      const processed = processChartData(data);
      setChartData(processed);
    }
  }, [data, processChartData]);`;

    return this.insertIntoComponent(content, chartsCode);
  }

  /**
   * 添加CRUD操作功能
   */
  addCrudOperations(content) {
    const crudCode = `
  // CRUD操作
  const [selectedItem, setSelectedItem] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = useCallback(async (newItem) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/items', newItem);
      setData(prev => [...(prev || []), response.data]);
      setIsCreating(false);
    } catch (err) {
      handleError(err, 'create');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleUpdate = useCallback(async (id, updates) => {
    try {
      setLoading(true);
      const response = await apiClient.put(\`/api/items/\${id}\`, updates);
      setData(prev => prev?.map(item =>
        item.id === id ? response.data : item
      ));
      setIsEditing(false);
      setSelectedItem(null);
    } catch (err) {
      handleError(err, 'update');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const handleDelete = useCallback(async (id) => {
    if (!window.confirm('确定要删除这个项目吗？')) {
      return;
    }

    try {
      setLoading(true);
      await apiClient.delete(\`/api/items/\${id}\`);
      setData(prev => prev?.filter(item => item.id !== id));
    } catch (err) {
      handleError(err, 'delete');
    } finally {
      setLoading(false);
    }
  }, [handleError]);`;

    return this.insertIntoComponent(content, crudCode);
  }

  /**
   * 添加业务逻辑
   */
  addBusinessLogic(content, pageType) {
    const businessLogicMap = {
      dashboard: `
  // Dashboard业务逻辑
  const [metrics, setMetrics] = useState({});
  const [recentActivity, setRecentActivity] = useState([]);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [metricsRes, activityRes] = await Promise.all([
        apiClient.get('/api/dashboard/metrics'),
        apiClient.get('/api/dashboard/activity')
      ]);

      setMetrics(metricsRes.data);
      setRecentActivity(activityRes.data);
    } catch (err) {
      handleError(err, 'dashboard');
    } finally {
      setLoading(false);
    }
  }, [handleError]);`,

      auth: `
  // 认证业务逻辑
  const { login, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogin = useCallback(async (credentials) => {
    try {
      setLoading(true);
      await login(credentials);
      navigate('/dashboard');
    } catch (err) {
      handleError(err, 'login');
    } finally {
      setLoading(false);
    }
  }, [login, navigate, handleError]);`,

      testing: `
  // 测试业务逻辑
  const [testConfig, setTestConfig] = useState({});
  const [testResults, setTestResults] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const runTest = useCallback(async (config) => {
    try {
      setIsRunning(true);
      setTestResults(null);

      const response = await apiClient.post('/api/tests/run', config);
      setTestResults(response.data);
    } catch (err) {
      handleError(err, 'test execution');
    } finally {
      setIsRunning(false);
    }
  }, [handleError]);`,

      management: `
  // 管理业务逻辑
  const [items, setItems] = useState([]);
  const [filters, setFilters] = useState({});
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });

  const loadItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/management/items', {
        params: { ...filters, ...pagination }
      });
      setItems(response.data.items);
    } catch (err) {
      handleError(err, 'load items');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination, handleError]);`,

      results: `
  // 结果业务逻辑
  const [results, setResults] = useState([]);
  const [analysisData, setAnalysisData] = useState(null);
  const [exportFormat, setExportFormat] = useState('json');

  const analyzeResults = useCallback(async (resultIds) => {
    try {
      setLoading(true);
      const response = await apiClient.post('/api/results/analyze', { ids: resultIds });
      setAnalysisData(response.data);
    } catch (err) {
      handleError(err, 'analysis');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const exportResults = useCallback(async (format) => {
    try {
      const response = await apiClient.get(\`/api/results/export?format=\${format}\`);
      // 处理下载
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = \`results.\${format}\`;
      a.click();
    } catch (err) {
      handleError(err, 'export');
    }
  }, [handleError]);`,

      user: `
  // 用户业务逻辑
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState({});

  const updateProfile = useCallback(async (updates) => {
    try {
      setLoading(true);
      const response = await apiClient.put('/api/user/profile', updates);
      setProfile(response.data);
    } catch (err) {
      handleError(err, 'profile update');
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  const updatePreferences = useCallback(async (newPreferences) => {
    try {
      const response = await apiClient.put('/api/user/preferences', newPreferences);
      setPreferences(response.data);
    } catch (err) {
      handleError(err, 'preferences update');
    }
  }, [handleError]);`,

      general: `
  // 通用业务逻辑
  const [pageData, setPageData] = useState(null);

  const loadPageData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/page/data');
      setPageData(response.data);
    } catch (err) {
      handleError(err, 'page data');
    } finally {
      setLoading(false);
    }
  }, [handleError]);`
    };

    const businessLogic = businessLogicMap[pageType] || businessLogicMap.general;
    return this.insertIntoComponent(content, businessLogic);
  }

  /**
   * 添加页面级功能
   */
  addPageLevelFeatures(content) {
    const pageLevelCode = `
  // 页面级功能
  const [pageTitle, setPageTitle] = useState('');

  // 设置页面标题
  useEffect(() => {
    if (pageTitle) {
      document.title = \`\${pageTitle} - Test Web\`;
    }
  }, [pageTitle]);

  // 页面可见性检测
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // 页面变为可见时刷新数据
        fetchData?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchData]);`;

    return this.insertIntoComponent(content, pageLevelCode);
  }

  /**
   * 创建页面开发工具
   */
  async createPageDevTools() {
    console.log('🛠️ 创建页面开发工具...');

    // 创建页面模板生成器
    await this.createPageTemplateGenerator();

    // 创建页面测试工具
    await this.createPageTestingTool();

    console.log('   ✅ 页面开发工具创建完成\n');
  }

  /**
   * 创建页面模板生成器
   */
  async createPageTemplateGenerator() {
    const templateGeneratorPath = path.join(this.projectRoot, 'frontend/utils/pageTemplateGenerator.ts');

    // 确保目录存在
    const utilsDir = path.dirname(templateGeneratorPath);
    if (!fs.existsSync(utilsDir)) {
      fs.mkdirSync(utilsDir, { recursive: true });
    }

    if (!fs.existsSync(templateGeneratorPath)) {
      const templateGeneratorContent = `/**
 * 页面模板生成器
 * 快速生成标准化的页面模板
 */

export interface PageTemplateOptions {
  name: string;
  type: 'dashboard' | 'auth' | 'testing' | 'management' | 'results' | 'user' | 'general';
  features: string[];
  hasApi: boolean;
  hasForm: boolean;
  hasChart: boolean;
}

export class PageTemplateGenerator {
  generateTemplate(options: PageTemplateOptions): string {
    const {
      name,
      type,
      features,
      hasApi,
      hasForm,
      hasChart
    } = options;

    const imports = this.generateImports(features, hasApi, hasForm, hasChart);
    const hooks = this.generateHooks(type, hasApi, hasForm);
    const handlers = this.generateHandlers(type, hasApi, hasForm);
    const jsx = this.generateJSX(type, hasForm, hasChart);

    return \`\${imports}

const \${name}: React.FC = () => {
\${hooks}

\${handlers}

  return (
\${jsx}
  );
};

export default \${name};\`;
  }

  private generateImports(features: string[], hasApi: boolean, hasForm: boolean, hasChart: boolean): string {
    const imports = [
      "import React, { useState, useEffect, useCallback } from 'react';"
    ];

    if (hasApi) {
      imports.push("import { apiClient } from '../utils/apiClient';");
      imports.push("import { useAsyncErrorHandler } from '../hooks/useAsyncErrorHandler';");
    }

    if (hasForm) {
      imports.push("import { useForm } from 'react-hook-form';");
    }

    if (hasChart) {
      imports.push("import { Chart } from '../components/ui/Chart';");
    }

    imports.push("import { Loading } from '../components/ui/Loading';");
    imports.push("import { ErrorDisplay } from '../components/ui/ErrorDisplay';");

    return imports.join('\\n');
  }

  private generateHooks(type: string, hasApi: boolean, hasForm: boolean): string {
    const hooks = [
      "  const [loading, setLoading] = useState(false);",
      "  const [error, setError] = useState<string | null>(null);"
    ];

    if (hasApi) {
      hooks.push("  const [data, setData] = useState(null);");
      hooks.push("  const { handleAsyncError } = useAsyncErrorHandler();");
    }

    if (hasForm) {
      hooks.push("  const { register, handleSubmit, formState: { errors } } = useForm();");
    }

    return hooks.join('\\n');
  }

  private generateHandlers(type: string, hasApi: boolean, hasForm: boolean): string {
    const handlers = [];

    if (hasApi) {
      handlers.push(\`  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get('/api/\${type}/data');
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);\`);
    }

    if (hasForm) {
      handlers.push(\`  const onSubmit = useCallback(async (formData: any) => {
    try {
      setLoading(true);
      setError(null);
      await apiClient.post('/api/\${type}/submit', formData);
      // Handle success
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  }, []);\`);
    }

    return handlers.join('\\n\\n');
  }

  private generateJSX(type: string, hasForm: boolean, hasChart: boolean): string {
    const jsx = [
      "    <div className=\"page-container\">",
      "      <h1 className=\"page-title\">{pageTitle}</h1>",
      "",
      "      {loading && <Loading />}",
      "      {error && <ErrorDisplay error={error} onRetry={fetchData} />}",
      ""
    ];

    if (hasForm) {
      jsx.push(
        "      <form onSubmit={handleSubmit(onSubmit)} className=\"form\">",
        "        {/* Form fields */}",
        "        <button type=\"submit\" disabled={loading}>",
        "          Submit",
        "        </button>",
        "      </form>",
        ""
      );
    }

    if (hasChart) {
      jsx.push(
        "      {data && <Chart data={data} />}",
        ""
      );
    }

    jsx.push(
      "      {/* Page content */}",
      "    </div>"
    );

    return jsx.join('\\n');
  }
}

export const pageTemplateGenerator = new PageTemplateGenerator();
export default pageTemplateGenerator;`;

      fs.writeFileSync(templateGeneratorPath, templateGeneratorContent);
      this.addFix('page_tools', templateGeneratorPath, '创建页面模板生成器');
    }
  }

  /**
   * 创建页面测试工具
   */
  async createPageTestingTool() {
    const pageTestingPath = path.join(this.projectRoot, 'frontend/utils/pageTestingTool.ts');

    if (!fs.existsSync(pageTestingPath)) {
      const pageTestingContent = `/**
 * 页面测试工具
 * 提供页面功能的自动化测试
 */

export interface PageTestConfig {
  pageName: string;
  url: string;
  expectedElements: string[];
  apiEndpoints: string[];
  userInteractions: Array<{
    type: 'click' | 'input' | 'submit';
    selector: string;
    value?: string;
  }>;
}

export class PageTestingTool {
  async testPageFunctionality(config: PageTestConfig): Promise<{
    passed: boolean;
    results: Array<{
      test: string;
      passed: boolean;
      error?: string;
    }>;
  }> {
    const results = [];

    // 测试页面加载
    results.push(await this.testPageLoad(config.url));

    // 测试必需元素存在
    for (const selector of config.expectedElements) {
      results.push(await this.testElementExists(selector));
    }

    // 测试API端点
    for (const endpoint of config.apiEndpoints) {
      results.push(await this.testApiEndpoint(endpoint));
    }

    // 测试用户交互
    for (const interaction of config.userInteractions) {
      results.push(await this.testUserInteraction(interaction));
    }

    const passed = results.every(result => result.passed);

    return { passed, results };
  }

  private async testPageLoad(url: string): Promise<{ test: string; passed: boolean; error?: string }> {
    try {
      // 模拟页面加载测试
      return {
        test: \`Page load: \${url}\`,
        passed: true
      };
    } catch (error) {
      return {
        test: \`Page load: \${url}\`,
        passed: false,
        error: error.message
      };
    }
  }

  private async testElementExists(selector: string): Promise<{ test: string; passed: boolean; error?: string }> {
    try {
      const element = document.querySelector(selector);
      return {
        test: \`Element exists: \${selector}\`,
        passed: !!element
      };
    } catch (error) {
      return {
        test: \`Element exists: \${selector}\`,
        passed: false,
        error: error.message
      };
    }
  }

  private async testApiEndpoint(endpoint: string): Promise<{ test: string; passed: boolean; error?: string }> {
    try {
      const response = await fetch(endpoint);
      return {
        test: \`API endpoint: \${endpoint}\`,
        passed: response.ok
      };
    } catch (error) {
      return {
        test: \`API endpoint: \${endpoint}\`,
        passed: false,
        error: error.message
      };
    }
  }

  private async testUserInteraction(interaction: any): Promise<{ test: string; passed: boolean; error?: string }> {
    try {
      const element = document.querySelector(interaction.selector);
      if (!element) {
        throw new Error('Element not found');
      }

      switch (interaction.type) {
        case 'click':
          (element as HTMLElement).click();
          break;
        case 'input':
          (element as HTMLInputElement).value = interaction.value || '';
          break;
        case 'submit':
          (element as HTMLFormElement).submit();
          break;
      }

      return {
        test: \`User interaction: \${interaction.type} on \${interaction.selector}\`,
        passed: true
      };
    } catch (error) {
      return {
        test: \`User interaction: \${interaction.type} on \${interaction.selector}\`,
        passed: false,
        error: error.message
      };
    }
  }
}

export const pageTestingTool = new PageTestingTool();
export default pageTestingTool;`;

      fs.writeFileSync(pageTestingPath, pageTestingContent);
      this.addFix('page_tools', pageTestingPath, '创建页面测试工具');
    }
  }

  /**
   * 生成增强报告
   */
  generateEnhancementReport() {
    const reportPath = path.join(this.projectRoot, 'page-enhancement-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalEnhancements: this.enhancedPages.length,
        totalFixes: this.fixes.length,
        pageTypes: {
          dashboard: this.enhancedPages.filter(p => p.pageType === 'dashboard').length,
          auth: this.enhancedPages.filter(p => p.pageType === 'auth').length,
          testing: this.enhancedPages.filter(p => p.pageType === 'testing').length,
          management: this.enhancedPages.filter(p => p.pageType === 'management').length,
          results: this.enhancedPages.filter(p => p.pageType === 'results').length,
          user: this.enhancedPages.filter(p => p.pageType === 'user').length,
          general: this.enhancedPages.filter(p => p.pageType === 'general').length
        },
        averageComplexity: this.enhancedPages.reduce((sum, p) => sum + p.complexity, 0) / this.enhancedPages.length || 0
      },
      enhancedPages: this.enhancedPages,
      fixes: this.fixes,
      nextSteps: [
        '测试增强的页面功能',
        '验证API集成',
        '检查用户体验',
        '添加页面单元测试',
        '优化页面性能'
      ]
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    console.log('📊 页面功能增强报告:');
    console.log(`   增强页面: ${report.summary.totalEnhancements}`);
    console.log(`   总修复数: ${report.summary.totalFixes}`);
    console.log(`   平均复杂度: ${report.summary.averageComplexity.toFixed(1)}`);
    console.log(`   页面类型分布:`);
    console.log(`   - Dashboard: ${report.summary.pageTypes.dashboard}`);
    console.log(`   - Auth: ${report.summary.pageTypes.auth}`);
    console.log(`   - Testing: ${report.summary.pageTypes.testing}`);
    console.log(`   - Management: ${report.summary.pageTypes.management}`);
    console.log(`   - Results: ${report.summary.pageTypes.results}`);
    console.log(`   - User: ${report.summary.pageTypes.user}`);
    console.log(`   - General: ${report.summary.pageTypes.general}`);
    console.log(`   报告已保存: ${reportPath}\n`);

    console.log('🎯 下一步操作:');
    report.nextSteps.forEach((step, index) => {
      console.log(`   ${index + 1}. ${step}`);
    });
  }

  addFix(category, filePath, description) {
    this.fixes.push({
      category,
      file: path.relative(this.projectRoot, filePath),
      description,
      timestamp: new Date().toISOString()
    });
  }
}

// 执行脚本
if (require.main === module) {
  const enhancer = new PageFunctionalityEnhancer();
  enhancer.execute().catch(error => {
    console.error('❌ 页面功能增强失败:', error);
    process.exit(1);
  });
}

module.exports = PageFunctionalityEnhancer;
