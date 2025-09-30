# API Types Migration Guide - Phase 2C

**Migration Date:** 2024-12-29  
**Version:** 3.0.0  
**Status:** ✅ Complete

## Overview

As part of Phase 2C cleanup, all scattered API type definitions have been consolidated into a single source of truth at `types/api/index.ts`. This improves maintainability, reduces duplication, and provides better developer experience.

## What Changed

### Consolidated Files
The following files have been **consolidated** into `types/api/index.ts`:

- ✅ `types/api.ts` → **Deprecated** (now wrapper)
- ✅ `types/api.types.ts` → **Deprecated** (now wrapper) 
- ✅ `types/apiResponse.ts` → **Deprecated** (now wrapper)
- ✅ `types/unified/apiResponse.ts` → **Deprecated** (now wrapper)
- ✅ `types/unified/apiResponse.types.ts` → **Deprecated** (now wrapper)
- ✅ `types/api/client.types.ts` → **Deprecated** (now wrapper)

### New Structure
```
frontend/types/
├── api/
│   └── index.ts          ← 🎯 Single source of truth
├── api.ts                ← ⚠️ Deprecated wrapper
├── api.types.ts          ← ⚠️ Deprecated wrapper  
├── apiResponse.ts        ← ⚠️ Deprecated wrapper
└── unified/
    ├── apiResponse.ts    ← ⚠️ Deprecated wrapper
    └── apiResponse.types.ts ← ⚠️ Deprecated wrapper
```

## Migration Steps

### For New Code (Recommended)
```typescript
// ✅ NEW - Use consolidated types
import type { 
  ApiResponse, 
  TestStartRequest, 
  AuthConfig,
  HttpMethod 
} from '@/types/api';

// ✅ Or with explicit path
import type { ApiResponse } from '@/types/api/index';
```

### For Existing Code (Backward Compatible)
```typescript
// ✅ EXISTING - Still works (backward compatible)
import type { ApiResponse } from '@/types/apiResponse';
import type { AuthConfig } from '@/types/api.types';
import type { HttpMethod } from '@/types/unified/apiResponse.types';

// These imports still work but are deprecated
```

## Available Types

### Core API Types
- `ApiResponse<T>` - Generic API response wrapper
- `ApiSuccessResponse<T>` - Success response type
- `ApiErrorResponse` - Error response type
- `ErrorCode` - Enum of all error codes
- `ApiError` - Structured error information

### Request/Response Types
- `RequestConfig` - Request configuration options
- `RequestHeaders` - HTTP headers interface
- `AuthConfig` - Authentication configuration
- `QueryParams` - URL query parameters
- `PaginationInfo` - Pagination metadata

### Test API Types
- `TestStartRequest/Response` - Start test endpoint
- `TestStatusRequest/Response` - Get test status
- `TestResultRequest/Response` - Get test results
- `TestHistoryQuery` - Test history filtering
- `BaseTestConfig` - Base test configuration

### Type-Specific Configs
- `PerformanceTestConfig` - Performance test settings
- `SecurityTestConfig` - Security test settings  
- `ApiTestConfig` - API test settings
- `UxTestConfig` - UX test settings

### Utility Types
- `TestType` - Union of all test types
- `TestStatus` - Union of test statuses
- `DeviceType` - Device type options
- `NetworkCondition` - Network simulation options

## Type Guards & Utilities

```typescript
import { 
  isSuccessResponse, 
  isErrorResponse, 
  isApiError 
} from '@/types/api';

// Type-safe response handling
const response = await api.get('/test');
if (isSuccessResponse(response)) {
  // response.data is available and type-safe
  console.log(response.data);
} else {
  // response.error is available
  console.error(response.error);
}
```

## Breaking Changes

### ❌ None for Phase 2C
All existing imports continue to work through deprecated wrapper files. This is a **non-breaking** migration.

### Future Breaking Changes (Phase 3+)
In a future major version, the deprecated wrapper files may be removed:

```typescript
// ❌ These will eventually be removed
import { ApiResponse } from '@/types/apiResponse';        // Will be removed
import { AuthConfig } from '@/types/api.types';          // Will be removed  
import { HttpMethod } from '@/types/unified/apiResponse'; // Will be removed

// ✅ Use this instead
import { ApiResponse, AuthConfig, HttpMethod } from '@/types/api';
```

## Best Practices

### 1. Use Consolidated Imports
```typescript
// ✅ GOOD - Single import source
import type { 
  ApiResponse, 
  TestStartRequest, 
  AuthConfig 
} from '@/types/api';

// ❌ AVOID - Multiple import sources  
import type { ApiResponse } from '@/types/apiResponse';
import type { TestStartRequest } from '@/types/api.types';
import type { AuthConfig } from '@/types/unified/apiResponse.types';
```

### 2. Leverage Type Guards
```typescript
// ✅ GOOD - Type-safe error handling
import { isSuccessResponse, isApiError } from '@/types/api';

try {
  const response = await apiCall();
  if (isSuccessResponse(response)) {
    return response.data;
  } else {
    throw new Error(response.error);
  }
} catch (error) {
  if (isApiError(error)) {
    console.error(`API Error ${error.code}: ${error.message}`);
  }
}
```

### 3. Use Specific Types
```typescript
// ✅ GOOD - Specific test config types
import type { PerformanceTestConfig, SecurityTestConfig } from '@/types/api';

const perfConfig: PerformanceTestConfig = {
  testType: 'performance',
  url: 'https://example.com',
  includeScreenshots: true
};

// ❌ AVOID - Generic config types
const config: BaseTestConfig = {
  testType: 'performance', // No type safety for test-specific options
  url: 'https://example.com'
};
```

## IDE Configuration

Update your TypeScript path mappings in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/types/api": ["./types/api/index.ts"],
      "@/types/api/*": ["./types/api/*"]
    }
  }
}
```

## Testing Your Migration

1. **Build Check**: Ensure project builds without TypeScript errors
   ```bash
   npm run type-check
   ```

2. **Import Verification**: Check that both old and new imports work
   ```typescript
   // Test file: verify both patterns work
   import type { ApiResponse as NewApi } from '@/types/api';
   import type { ApiResponse as OldApi } from '@/types/apiResponse';
   
   // These should be the same type
   const test: NewApi<string> = { success: true, data: 'test' };
   const test2: OldApi<string> = test; // Should work without errors
   ```

3. **Runtime Testing**: Verify API calls work as expected

## Support & Questions

- **Documentation**: See `types/api/index.ts` for complete type definitions
- **Migration Issues**: Check existing imports continue to work via deprecated wrappers
- **Type Safety**: Use type guards (`isSuccessResponse`, `isErrorResponse`) for runtime safety

## Timeline

- **Phase 2C** (Current): ✅ Non-breaking consolidation completed
- **Phase 3** (Future): Consider removing deprecated wrapper files
- **Phase 4** (Future): Full migration to new import patterns

---

**Migration Status**: ✅ **Complete - Backward Compatible**  
**Next Action**: Update new code to use `types/api` imports  
**Breaking Changes**: None (all existing imports work via wrappers)
