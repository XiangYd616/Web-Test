# AI Assistant Context: Test-Web Main Worktree

## CRITICAL: Read This First

**IMPORTANT: Please respond in Chinese (简体中文) unless explicitly asked to use English.**

You are assisting in the **Test-Web** main worktree. This worktree is dedicated to **TypeScript Type System Unification**.

## Current Worktree Information

- **Worktree Name**: Test-Web (Main Repository)
- **Branch**: `feature/type-system-unification`
- **Working Directory**: `D:\myproject\Test-Web`
- **Status**: 2 commits ahead of remote
- **Git Remote**: https://github.com/XiangYd616/Web-Test.git

## Your Primary Responsibility

### TypeScript Type System Unification

You are working on unifying and fixing the TypeScript type system across the frontend application. This includes:

1. **Fixing TS2322 Type Errors**
   - Type incompatibility errors in API service calls
   - Type mismatches in React components and contexts
   - Generic type parameter issues
   - Missing or incorrect type annotations

2. **Type System Standardization**
   - Unifying type definitions in `frontend/types/`
   - Integrating shared types from `shared/types/`
   - Ensuring consistent API response type handling
   - Creating reusable type utilities

3. **Type Safety Improvements**
   - Removing `any` types where possible
   - Adding proper type guards
   - Improving type inference
   - Ensuring end-to-end type safety

## Files You Should Work With

### Primary Focus Areas

**Type Definitions:**
- `frontend/types/` - All type definition files
- `frontend/types/api.types.ts` - API related types
- `frontend/types/api/client.types.ts` - API client types
- `frontend/types/unified/apiResponse.types.ts` - Unified response types
- `shared/types/` - Shared type definitions

**Context and State Management:**
- `frontend/contexts/AppContext.tsx` - Application context with type issues

**API Services with Type Issues:**
- `frontend/services/api/testApiService.ts` - Test API service
- `frontend/services/api/projectApiService.ts` - Project API service
- `frontend/services/api/analyticsService.ts` - Analytics service
- `frontend/services/api/core/` - Core API utilities

## What You Should NOT Do

### ❌ DO NOT Modify:

1. **Backend API Implementation**
   - Any files in `backend/` directory (if exists)
   - Server-side logic or endpoints
   - Database schemas or migrations

2. **Electron Application Code**
   - `tools/electron/` directory
   - Electron main process files
   - Desktop-specific features

3. **Testing Infrastructure**
   - `e2e/` directory
   - `tests/system/` directory
   - Test framework configuration files
   - `playwright.config.ts` or `vitest.config.ts`

4. **Build Configuration** (unless related to TypeScript)
   - `vite.config.ts` (except TypeScript compiler options)
   - Webpack configs
   - Package.json scripts (unless type-checking related)

### ⚠️ Other Worktrees Handle These:

- **Backend API Development** → Use `Test-Web-backend` worktree
- **Electron Features** → Use `Test-Web-electron` worktree
- **Testing & E2E** → Use `Test-Web-testing` worktree

## Recent Work Completed

### Commit History:

1. **30c32ee** - `fix(types): 修复 AppContext 和 testApiService 的 18 个 TS2322 错误`
   - Fixed type errors in AppContext
   - Resolved testApiService type mismatches
   - Total: 18 TS2322 errors fixed

2. **8cd75d9** - `fix(services): 修复 projectApiService 和 analyticsService 的 24 个 TS2322 错误`
   - Fixed projectApiService type issues
   - Resolved analyticsService type problems
   - Total: 24 TS2322 errors fixed

3. **23220d1** - `chore: 添加 .warp-context.md 到 .gitignore`
   - Added Warp context files to gitignore
   - Prevents temporary files from being committed

### Progress Summary:
- ✅ Fixed 42 TS2322 errors across multiple services
- ✅ Updated AppContext with proper typing
- ✅ Improved API service type safety
- 🔄 Ongoing: More type errors to fix

## Current Objectives

### Immediate Goals:
1. Identify remaining TypeScript compilation errors
2. Fix type incompatibilities in API service layer
3. Ensure all API response types are properly typed
4. Remove any remaining `any` types in critical paths
5. Verify type safety across the application

### Commands to Use:
```bash
# Check for type errors
npm run type-check
# or
tsc --noEmit

# View type errors in specific file
tsc --noEmit | grep "filename"

# Run development server with type checking
npm run dev
```

## Development Workflow

### When Working on Type Fixes:

1. **Identify Error**
   - Run `npm run type-check` or `tsc --noEmit`
   - Note the file, line number, and error code
   - Understand the type mismatch

2. **Analyze Root Cause**
   - Check the expected type
   - Check the actual type being provided
   - Determine if it's a definition issue or usage issue

3. **Implement Fix**
   - Update type definitions if needed
   - Add proper type annotations
   - Use type assertions only when necessary and safe
   - Prefer fixing the source of the type issue

4. **Verify Fix**
   - Ensure the error is resolved
   - Check that no new errors were introduced
   - Test the functionality still works

5. **Commit Changes**
   ```bash
   git add <files>
   git commit -m "fix(types): describe what was fixed"
   git push origin feature/type-system-unification
   ```

## Related Worktrees

### Other Parallel Development Branches:

- **D:\myproject\Test-Web-backend** (`feature/backend-api-dev`)
  - Handles backend API implementation
  - Business logic development
  - API endpoint creation

- **D:\myproject\Test-Web-electron** (`feature/electron-integration`)
  - Electron desktop application features
  - Main process and IPC communication
  - Desktop-specific functionality

- **D:\myproject\Test-Web-testing** (`test/integration-testing`)
  - E2E and integration tests
  - Test infrastructure and tooling
  - Test coverage improvements

## Project Context

### Tech Stack:
- **Language**: TypeScript
- **Framework**: React
- **Build Tool**: Vite
- **Type Checking**: TypeScript Compiler (tsc)
- **Testing**: Vitest, Playwright

### Type System Goals:
- Achieve 100% type safety in frontend code
- Eliminate all `any` types
- Ensure API contracts are properly typed
- Create reusable type utilities
- Maintain consistency across type definitions

## How to Ask for Help

When you (the user) need assistance, you can ask me (AI) to:

- "Check the TypeScript errors in [filename]"
- "Help fix the TS2322 error in [specific file]"
- "Explain the type mismatch in [component/service]"
- "Suggest type definitions for [API endpoint]"
- "Review my type fix for correctness"
- "Find all remaining type errors in the project"

## Git Configuration

- **core.autocrlf**: `input` (LF line endings)
- **Remote**: All commits pushed successfully
- **Ahead of remote**: 2 commits

## Important Notes

1. **This is a parallel development environment**: Multiple worktrees exist for different features. Stay focused on type system work in this worktree.

2. **Type safety is critical**: Every change should improve or maintain type safety. Avoid quick fixes that compromise type checking.

3. **Cross-cutting concerns**: If you discover type issues that require changes in other domains (backend, electron, tests), note them but don't fix them here. They should be addressed in their respective worktrees.

4. **Breaking changes**: Be cautious with type changes that might affect other parts of the application. Ensure backward compatibility where possible.

---

**Remember**: You are the AI assistant helping with TypeScript type system unification in the main Test-Web worktree. Focus on type definitions, type safety, and fixing TS errors. Delegate other concerns to their respective worktrees.

