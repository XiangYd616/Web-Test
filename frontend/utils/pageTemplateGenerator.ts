/**
 * 页面模板生成器
 * 快速生成标准化的页面模板
 */

export interface PageTemplateOptions     {
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

    return `${imports}`

const ${name}: React.FC  = () => {
${hooks}

${handlers}

  return (
${jsx}
  );
};

export default ${name};`;`
  }

  private generateImports(features: string[], hasApi: boolean, hasForm: boolean, hasChart: boolean): string {
    const imports = [
      "import React, { useState, useEffect, useCallback   } from 'react';';'`
    ];

    if (hasApi) {
      imports.push('import { apiClient   } from '../utils/apiClient';');'
      imports.push('import { useAsyncErrorHandler   } from '../hooks/useAsyncErrorHandler';');'
    }

    if (hasForm) {
      imports.push('import { useForm   } from 'react-hook-form';');'
    }

    if (hasChart) {
      imports.push('import { Chart   } from '../components/ui/Chart';');'
    }

    imports.push('import { Loading   } from '../components/ui/Loading';');'
    imports.push('import { ErrorDisplay   } from '../components/ui/ErrorDisplay';');'
    return imports.join('\n');'
  }

  private generateHooks(type: string, hasApi: boolean, hasForm: boolean): string {
    const hooks = [
      '  const [loading, setLoading] = useState(false);','
      '  const [error, setError] = useState<string | null>(null);';
    ];

    if (hasApi) {
      hooks.push('  const [data, setData] = useState(null);');'
      hooks.push('  const { handleAsyncError } = useAsyncErrorHandler();');'
    }

    if (hasForm) {
      hooks.push('  const { register, handleSubmit, formState: { errors } } = useForm();');'
    }

    return hooks.join('\n');'
  }

  private generateHandlers(type: string, hasApi: boolean, hasForm: boolean): string {
    const handlers = [];

    if (hasApi) {
      handlers.push(`  const fetchData = useCallback(async () => {`
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/${type}/data');'`
      setData(response.data);
    } catch (err) {
      setError(err.message || 'Failed to load data');'
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);`);`
    }

    if (hasForm) {
      handlers.push(`  const onSubmit = useCallback(async (formData: any) => {`
    try {
      setLoading(true);
      setError(null);
      await apiClient.post("/api/${type}/submit', formData);'`
      // Handle success
    } catch (err) {
      setError(err.message || 'Submission failed');'
    } finally {
      setLoading(false);
    }
  }, []);`);`
    }

    return handlers.join("\n\n');'`
  }

  private generateJSX(type: string, hasForm: boolean, hasChart: boolean): string {
    const jsx = [
      "    <div className= 'page-container'>','
      "      <h1 className= 'page-title'>{pageTitle}</h1>','
      '','
      '      {loading && <Loading  />}','
      '      {error && <ErrorDisplay error={error} onRetry={fetchData}   />}','
      '';
    ];

    if (hasForm) {
      jsx.push(
        "      <form onSubmit={handleSubmit(onSubmit)} className= 'form'>','
        '        {/* Form fields */}','
        "        <button type= 'submit' disabled={loading}>','
        '          Submit','
        '        </button>','
        '      </form>','
        '';
      );
    }

    if (hasChart) {
      jsx.push(
        '      {data && <Chart data={data}   />}','
        '';
      );
    }

    jsx.push(
      '      {/* Page content */}','
      '    </div>';
    );

    return jsx.join('\n');'
  }
}

export const pageTemplateGenerator = new PageTemplateGenerator();
export default pageTemplateGenerator;