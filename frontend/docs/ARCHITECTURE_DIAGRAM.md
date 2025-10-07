# Test-Web Frontend 架构可视化图

## 1. 整体架构层次图

```mermaid
graph TB
    subgraph "用户层"
        A[浏览器用户]
    end
    
    subgraph "入口层"
        B[main.tsx] --> C[App.tsx]
        C --> D[BrowserRouter]
    end
    
    subgraph "上下文层 Context"
        E[AppContext]
        F[AuthContext]
        G[ThemeContext]
    end
    
    subgraph "路由层"
        H[AppRoutes]
        H --> I[公开路由]
        H --> J[认证路由]
        H --> K[管理员路由]
    end
    
    subgraph "页面层 Pages"
        L[测试工具页面 14个]
        M[数据管理页面 7个]
        N[系统管理页面]
        O[用户管理页面]
    end
    
    subgraph "组件层 Components"
        P[UI基础组件]
        Q[业务组件 31个目录]
        R[布局组件]
    end
    
    subgraph "逻辑层 Hooks"
        S[状态管理 Hooks]
        T[测试 Hooks 16个]
        U[数据 Hooks]
        V[认证 Hooks]
    end
    
    subgraph "服务层 Services"
        W[API服务]
        X[测试服务]
        Y[数据服务]
        Z[认证服务]
    end
    
    subgraph "工具层 Utils"
        AA[数据处理工具]
        AB[性能优化工具]
        AC[格式化工具]
    end
    
    subgraph "类型层 Types"
        AD[44个类型定义文件]
    end
    
    A --> B
    C --> E & F & G
    C --> H
    H --> L & M & N & O
    L & M & N & O --> Q
    Q --> P & R
    Q --> S & T & U & V
    S & T & U & V --> W & X & Y & Z
    W & X & Y & Z --> AA & AB & AC
    
    style A fill:#4CAF50
    style C fill:#2196F3
    style H fill:#FF9800
    style Q fill:#9C27B0
    style W fill:#F44336
```

## 2. 数据流图

```mermaid
flowchart LR
    A[用户操作] --> B[页面组件]
    B --> C[自定义Hooks]
    C --> D[服务层]
    D --> E[API请求]
    E --> F[后端服务]
    
    F --> G[响应数据]
    G --> D
    D --> C
    C --> B
    B --> H[UI更新]
    
    I[Context状态] -.-> B
    I -.-> C
    
    style A fill:#E3F2FD
    style B fill:#FFF9C4
    style C fill:#F3E5F5
    style D fill:#FFE0B2
    style E fill:#FFCCBC
    style F fill:#C8E6C9
    style I fill:#BBDEFB
```

## 3. 组件层级结构

```mermaid
graph TD
    A[components/]
    
    A --> B[ui/ - UI基础组件]
    A --> C[common/ - 公共组件]
    A --> D[layout/ - 布局组件]
    A --> E[routing/ - 路由组件]
    
    A --> F[测试相关组件]
    F --> F1[testing/]
    F --> F2[performance/]
    F --> F3[security/]
    F --> F4[seo/]
    F --> F5[stress/]
    F --> F6[compatibility/]
    
    A --> G[业务组件]
    G --> G1[admin/ - 管理]
    G --> G2[analytics/ - 分析]
    G --> G3[business/ - 业务]
    G --> G4[data/ - 数据]
    G --> G5[reports/ - 报告]
    G --> G6[scheduling/ - 调度]
    
    A --> H[功能组件]
    H --> H1[auth/ - 认证]
    H --> H2[search/ - 搜索]
    H --> H3[monitoring/ - 监控]
    H --> H4[integration/ - 集成]
    H --> H5[charts/ - 图表]
    
    style A fill:#1976D2,color:#fff
    style F fill:#7B1FA2,color:#fff
    style G fill:#388E3C,color:#fff
    style H fill:#D32F2F,color:#fff
```

## 4. 服务层架构

```mermaid
graph TB
    A[Services Layer]
    
    subgraph "核心服务"
        B1[api.ts - API基础]
        B2[testHistoryService.ts]
        B3[adminService.ts]
        B4[errorService.ts]
    end
    
    subgraph "专业服务目录"
        C1[auth/ - 认证服务]
        C2[api/ - API服务]
        C3[testing/ - 测试服务]
        C4[cache/ - 缓存服务]
        C5[monitoring/ - 监控服务]
        C6[analytics/ - 分析服务]
        C7[reporting/ - 报告服务]
        C8[user/ - 用户服务]
    end
    
    subgraph "工具服务"
        D1[backgroundTestManager]
        D2[stressTestQueueManager]
        D3[websocketManager]
        D4[exportManager]
    end
    
    A --> B1 & B2 & B3 & B4
    A --> C1 & C2 & C3 & C4 & C5 & C6 & C7 & C8
    A --> D1 & D2 & D3 & D4
    
    style A fill:#FF5722,color:#fff
    style B1 fill:#FFC107
    style C1 fill:#4CAF50
    style D1 fill:#2196F3
```

## 5. Hooks 组织结构

```mermaid
mindmap
  root((Hooks))
    状态管理类
      useAppState
      useDataState
      useTestState
    测试类 16个
      useTest
      useTestEngine
      useCoreTestEngine
      useUnifiedTestEngine
      useApiTestState
      useDatabaseTestState
      useNetworkTestState
      useSEOTest
      useStressTestRecord
    认证授权类
      useAuth
      useMFA
      usePermissions
      useRBAC
    数据管理类
      useDataManagement
      useDataStorage
      useDataVisualization
      useCache
    UI/UX类
      useNotification
      useCSS
    性能优化类
      usePerformanceOptimization
      useMonitoring
```

## 6. 路由结构图

```mermaid
graph LR
    A[AppRoutes] --> B[公开路由]
    A --> C[认证路由]
    A --> D[管理员路由]
    
    B --> B1[/login]
    B --> B2[/register]
    B --> B3[/test-*]
    B --> B4[/help]
    
    C --> C1[/dashboard]
    C --> C2[/profile]
    C --> C3[/test-history]
    C --> C4[/reports]
    C --> C5[/notifications]
    
    D --> D1[/admin]
    D --> D2[/admin/users]
    D --> D3[/admin/settings]
    D --> D4[/admin/data-storage]
    
    B3 --> E1[/website-test]
    B3 --> E2[/security-test]
    B3 --> E3[/performance-test]
    B3 --> E4[/seo-test]
    B3 --> E5[/api-test]
    B3 --> E6[/network-test]
    B3 --> E7[/database-test]
    B3 --> E8[/stress-test]
    B3 --> E9[/compatibility-test]
    
    style A fill:#1976D2,color:#fff
    style B fill:#4CAF50
    style C fill:#FF9800
    style D fill:#F44336,color:#fff
```

## 7. 页面分类图

```mermaid
pie title 页面分类分布
    "测试工具页面" : 14
    "数据管理页面" : 7
    "用户管理页面" : 4
    "系统管理页面" : 5
    "集成配置页面" : 5
    "其他功能页面" : 2
```

## 8. 技术栈依赖图

```mermaid
graph TB
    A[React 18.2]
    B[TypeScript 5.9]
    C[Vite 4.5]
    
    A --> D[React Router 6.20]
    A --> E[React Hooks]
    
    F[UI框架层]
    F --> G[Ant Design 5.27]
    F --> H[Material-UI 7.3]
    F --> I[Lucide Icons]
    
    J[工具库层]
    J --> K[Axios 1.11]
    J --> L[date-fns 4.1]
    J --> M[ahooks 3.9]
    J --> N[socket.io-client 4.8]
    
    O[可视化层]
    O --> P[Chart.js 4.5]
    O --> Q[Recharts 2.15]
    
    R[测试层]
    R --> S[Vitest 1.6]
    R --> T[Testing Library 16.3]
    
    A --> F
    A --> J
    A --> O
    B --> A
    C --> A
    
    style A fill:#61DAFB,color:#000
    style B fill:#3178C6,color:#fff
    style C fill:#646CFF,color:#fff
    style F fill:#1890FF
    style J fill:#4CAF50
    style O fill:#FF6F00
    style R fill:#9C27B0
```

## 9. 状态管理架构

```mermaid
graph TD
    A[全局状态管理]
    
    A --> B[Context API]
    B --> B1[AppContext<br/>应用全局状态]
    B --> B2[AuthContext<br/>认证状态]
    B --> B3[ThemeContext<br/>主题状态]
    
    A --> C[Custom Hooks]
    C --> C1[业务状态 Hooks]
    C --> C2[UI状态 Hooks]
    C --> C3[缓存状态 Hooks]
    
    A --> D[本地状态]
    D --> D1[useState]
    D --> D2[useReducer]
    D --> D3[useRef]
    
    E[组件树] --> B1 & B2 & B3
    E --> C1 & C2 & C3
    E --> D1 & D2 & D3
    
    style A fill:#673AB7,color:#fff
    style B fill:#3F51B5,color:#fff
    style C fill:#2196F3,color:#fff
    style D fill:#00BCD4,color:#fff
```

## 10. 测试相关组件生态系统

```mermaid
graph TB
    A[测试生态系统]
    
    subgraph "测试页面"
        B1[WebsiteTest]
        B2[SecurityTest]
        B3[PerformanceTest]
        B4[SEOTest]
        B5[APITest]
        B6[NetworkTest]
        B7[DatabaseTest]
        B8[StressTest]
        B9[CompatibilityTest]
        B10[AccessibilityTest]
        B11[UXTest]
    end
    
    subgraph "测试组件"
        C1[TestExecutor]
        C2[TestHistory]
        C3[TestProgress]
        C4[TestResults]
    end
    
    subgraph "测试Hooks"
        D1[useTest]
        D2[useTestEngine]
        D3[useCoreTestEngine]
        D4[useTestManager]
        D5[useTestProgress]
    end
    
    subgraph "测试服务"
        E1[testHistoryService]
        E2[backgroundTestManager]
        E3[batchTestingService]
        E4[testStateManager]
    end
    
    A --> B1 & B2 & B3 & B4 & B5 & B6 & B7 & B8 & B9 & B10 & B11
    B1 & B2 & B3 & B4 & B5 & B6 & B7 & B8 --> C1 & C2 & C3 & C4
    C1 & C2 & C3 & C4 --> D1 & D2 & D3 & D4 & D5
    D1 & D2 & D3 & D4 & D5 --> E1 & E2 & E3 & E4
    
    style A fill:#4A148C,color:#fff
    style B1 fill:#6A1B9A,color:#fff
    style C1 fill:#8E24AA,color:#fff
    style D1 fill:#AB47BC,color:#fff
    style E1 fill:#CE93D8,color:#000
```

## 11. 文件类型统计

```mermaid
pie title 项目文件类型分布
    "TypeScript (.ts)" : 111
    "React组件 (.tsx)" : 150
    "样式文件 (.css)" : 10
    "配置文件" : 10
    "文档文件 (.md)" : 15
    "测试文件" : 20
```

## 12. 项目复杂度评估

```mermaid
graph LR
    A[项目规模: 大型]
    
    A --> B[组件数量<br/>300+]
    A --> C[代码行数<br/>50,000+]
    A --> D[文件数量<br/>400+]
    A --> E[目录深度<br/>5-7层]
    
    B --> F[复杂度: 高]
    C --> F
    D --> F
    E --> F
    
    F --> G[维护难度: 中等]
    F --> H[学习曲线: 陡峭]
    F --> I[团队规模建议<br/>5-10人]
    
    style A fill:#1A237E,color:#fff
    style F fill:#D32F2F,color:#fff
    style G fill:#FF6F00,color:#fff
    style H fill:#F57C00,color:#fff
    style I fill:#388E3C,color:#fff
```

---

## 图表说明

1. **整体架构层次图**: 展示从用户层到工具层的完整技术栈
2. **数据流图**: 展示数据在应用中的流动路径
3. **组件层级结构**: 展示组件目录的组织结构
4. **服务层架构**: 展示服务层的模块划分
5. **Hooks组织结构**: 展示自定义Hooks的分类
6. **路由结构图**: 展示路由的层级关系
7. **页面分类图**: 展示不同类型页面的数量分布
8. **技术栈依赖图**: 展示核心技术栈和依赖关系
9. **状态管理架构**: 展示状态管理的层次结构
10. **测试生态系统**: 展示测试相关的完整生态
11. **文件类型统计**: 展示项目文件类型分布
12. **项目复杂度评估**: 评估项目规模和复杂度

---

**注意**: 这些图表使用 Mermaid 语法编写，可以在支持 Mermaid 的 Markdown 查看器中直接渲染，如：
- GitHub
- GitLab
- VS Code (需要安装 Mermaid 插件)
- Typora
- Obsidian

