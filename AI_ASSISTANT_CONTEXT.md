# AI Assistant Context: Test-Web-backend Worktree

## CRITICAL: Read This First

**IMPORTANT: Please respond in Chinese (简体中文) unless explicitly asked to use English.**

You are assisting in the **Test-Web-backend** worktree. This worktree is dedicated to **Backend API Development and Business Logic**.

## Current Worktree Information

- **Worktree Name**: Test-Web-backend
- **Branch**: `feature/backend-api-dev`
- **Working Directory**: `D:\myproject\Test-Web-backend`
- **Status**: Synchronized with remote
- **Git Remote**: https://github.com/XiangYd616/Web-Test.git

## Your Primary Responsibility

### Backend API Development

You are working on backend API endpoints, business logic implementation, and API service optimization. This includes:

1. **Backend Core Business Logic**
   - RESTful API endpoint design and implementation
   - Business rule enforcement
   - Data validation and transformation
   - Error handling and response formatting

2. **API Service Layer**
   - Frontend API client services (`frontend/services/api/`)
   - API communication utilities
   - Request/response interceptors
   - API caching and optimization

3. **Data Integration**
   - Database operations (if applicable)
   - External API integration
   - Data processing pipelines
   - State management for API data

## Files You Should Work With

### Primary Focus Areas

**Backend Implementation** (if backend directory exists):
- `backend/` - Backend server code
- `backend/routes/` - API route definitions
- `backend/controllers/` - Business logic controllers
- `backend/services/` - Business services
- `backend/models/` - Data models
- `backend/middleware/` - Express/server middleware

**Frontend API Services**:
- `frontend/services/api/` - API client services
- `frontend/services/api/core/apiCache.ts` - API caching
- `frontend/services/api/core/apiMetrics.ts` - API metrics
- `frontend/services/api/test/testApiClient.ts` - Test API client
- `frontend/config/apiConfig.ts` - API configuration
- `frontend/config/authConfig.ts` - Authentication config

**Business Components**:
- `frontend/components/business/` - Business-related components
- `frontend/components/business/BusinessMetricsDashboard.tsx`
- `frontend/components/business/DataExporter.tsx`

**Shared API Types**:
- `shared/types/api.types.ts` - API type definitions
- `shared/types/apiResponse.types.ts` - Response type definitions
- `shared/types/standardApiTypes.ts` - Standard API types

## What You Should NOT Do

### ❌ DO NOT Modify:

1. **Type System Unification Work**
   - Don't refactor core type definitions
   - Don't change type system architecture
   - Leave type-only fixes to the main worktree

2. **Electron Application Code**
   - `tools/electron/` directory
   - Electron-specific features
   - IPC communication (unless API-related)

3. **Testing Infrastructure**
   - `e2e/` E2E test files (can add API tests)
   - `tests/system/` system tests
   - Test framework configuration
   - `playwright.config.ts` or `vitest.config.ts`

4. **UI Components** (unless API integration)
   - Pure presentational components
   - UI styling and themes
   - Animations and transitions

### ⚠️ Other Worktrees Handle These:

- **Type System Fixes** → Use `Test-Web` main worktree
- **Electron Features** → Use `Test-Web-electron` worktree
- **Testing & E2E** → Use `Test-Web-testing` worktree

## Recent Work Completed

### Commit History:

1. **6b090db** - `fix: 修复后端核心业务逻辑和启动问题`
   - Fixed backend core business logic issues
   - Resolved startup problems
   - Improved error handling

2. **2931ee0** - `refactor(architecture): 架构优化 - 去除冗余，提升到卓越水平`
   - Architecture optimization
   - Removed redundant code
   - Improved code quality

3. **7c5c600** - `chore: 统一换行符格式为 LF (134 files)`
   - Normalized line endings to LF
   - Fixed CRLF issues across 134 files
   - Improved cross-platform compatibility

### Progress Summary:
- ✅ Backend core logic stabilized
- ✅ Architecture improvements implemented
- ✅ Line ending normalization completed
- 🔄 Ongoing: API feature development

## Current Objectives

### Immediate Goals:
1. Develop new API endpoints as needed
2. Optimize existing API performance
3. Improve error handling and logging
4. Enhance API security and validation
5. Implement API documentation

### Commands to Use:
```bash
# Start backend development server (if applicable)
npm run dev
npm run server:dev

# Test API endpoints
npm run test:api
curl -X GET http://localhost:3000/api/endpoint

# Check for errors
npm run lint
npm run type-check

# Build backend
npm run build:server
```

## Development Workflow

### When Developing API Features:

1. **Design API Endpoint**
   - Define the route and HTTP method
   - Design request/response structure
   - Document expected behavior
   - Consider error cases

2. **Implement Backend Logic**
   - Create route handler
   - Implement business logic
   - Add data validation
   - Handle errors gracefully

3. **Create Frontend Client**
   - Add API client function in `frontend/services/api/`
   - Define request/response types
   - Add error handling
   - Implement caching if needed

4. **Test the API**
   - Manual testing with curl or Postman
   - Add unit tests for business logic
   - Test error scenarios
   - Verify performance

5. **Commit Changes**
   ```bash
   git add <files>
   git commit -m "feat(api): describe the new feature"
   git push origin feature/backend-api-dev
   ```

## API Development Best Practices

### Request/Response Format:
```typescript
// Standard API Response Format
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    timestamp: number;
    requestId: string;
  };
}
```

### Error Handling:
- Use consistent error codes
- Provide meaningful error messages
- Log errors for debugging
- Return appropriate HTTP status codes

### Security:
- Validate all inputs
- Sanitize user data
- Implement rate limiting
- Use authentication/authorization
- Protect against common vulnerabilities

## Related Worktrees

### Other Parallel Development Branches:

- **D:\myproject\Test-Web** (`feature/type-system-unification`)
  - TypeScript type system work
  - Type error fixes
  - Type definition improvements

- **D:\myproject\Test-Web-electron** (`feature/electron-integration`)
  - Electron desktop features
  - Main process development
  - IPC communication

- **D:\myproject\Test-Web-testing** (`test/integration-testing`)
  - E2E and integration tests
  - Test infrastructure
  - Quality assurance

## Project Context

### Tech Stack:
- **Backend** (if applicable): Node.js, Express
- **Frontend**: React, TypeScript
- **API Client**: Axios or Fetch API
- **State Management**: React Context/Redux (as applicable)
- **Build Tool**: Vite

### API Architecture:
- RESTful API design
- JSON request/response format
- Token-based authentication (if implemented)
- Centralized error handling
- API versioning support

## Key Modules

### API Client Services:
- **testApiClient.ts** - Testing API operations
- **apiCache.ts** - API response caching
- **apiMetrics.ts** - API performance metrics
- **apiConfig.ts** - API configuration and base URLs

### Business Logic:
- **BusinessMetricsDashboard** - Display business metrics
- **DataExporter** - Export business data
- Business validation rules
- Data transformation utilities

## How to Ask for Help

When you (the user) need assistance, you can ask me (AI) to:

- "Create a new API endpoint for [feature]"
- "Optimize the [specific API] performance"
- "Add error handling to [API function]"
- "Design the request/response format for [feature]"
- "Review my API implementation"
- "Debug the [specific] API error"
- "Add validation for [endpoint]"

## Git Configuration

- **core.autocrlf**: `input` (LF line endings)
- **Remote**: All commits pushed successfully
- **In sync with remote**: Yes

## Important Notes

1. **Focus on backend and API layer**: This worktree handles backend logic and API integration. Frontend business logic that depends on APIs also belongs here.

2. **API-first development**: Design APIs before implementing frontend features. Ensure clear contracts between frontend and backend.

3. **Performance matters**: Consider caching, pagination, and optimization for all API endpoints.

4. **Security is critical**: Always validate inputs, handle errors securely, and protect against common vulnerabilities.

5. **Documentation**: Document all API endpoints, request/response formats, and error codes.

6. **Cross-cutting concerns**: If you need type definitions changed, coordinate with the type system worktree. If you need E2E tests, coordinate with the testing worktree.

---

**Remember**: You are the AI assistant helping with backend API development in the Test-Web-backend worktree. Focus on API endpoints, business logic, and frontend-backend integration. Delegate type system concerns to the main worktree and testing concerns to the testing worktree.

