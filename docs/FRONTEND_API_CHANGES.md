# Frontend API Path Changes - Migration Guide

## ⚠️ Breaking Change Alert

**Date**: 2025-10-06  
**Status**: CRITICAL - Immediate Action Required  
**Impact**: All frontend API calls

---

## Summary

The backend has **removed the `/api` prefix** from all API routes. This is a **breaking change** that requires immediate updates to all frontend code making API calls.

### What Changed

- **Before**: `/api/test/start`, `/api/auth/login`, `/api/monitoring/targets`
- **After**: `/test/start`, `/auth/login`, `/monitoring/targets`

---

## Migration Statistics

✅ **Automated Migration Completed**

- **Files Scanned**: 539
- **Files Updated**: 48
- **Total Replacements**: 192
- **Date**: 2025-10-06

### Affected File Types

- TypeScript files (`.ts`)
- TypeScript React files (`.tsx`)
- JavaScript files (`.js`)
- JavaScript React files (`.jsx`)

---

## Updated Files by Category

### 1. Hooks (11 files)
- `frontend/hooks/useTest.ts` - 8 replacements
- `frontend/hooks/useAuth.ts` - 6 replacements
- `frontend/hooks/useMonitoring.ts` - 12 replacements
- `frontend/hooks/usePermissions.ts` - 4 replacements
- `frontend/hooks/useAppState.ts` - 2 replacements
- `frontend/hooks/useNotifications.ts` - 1 replacement
- `frontend/hooks/useLegacyCompatibility.ts` - 1 replacement
- `frontend/hooks/__tests__/useTestTest.tsx` - 3 replacements
- `frontend/hooks/useDeleteActions.ts` - 2 replacements
- `frontend/hooks/useTestRecords.ts` - 1 replacement

### 2. Services (20 files)
- `frontend/services/api/apiService.ts` - 13 replacements
- `frontend/services/backgroundTestManager.ts` - 2 replacements
- `frontend/services/user/userService.ts` - 18 replacements
- `frontend/services/auth/authService.ts` - 3 replacements
- `frontend/services/dataAnalysisService.ts` - 10 replacements
- `frontend/services/proxyService.ts` - 3 replacements
- `frontend/services/testTemplates.ts` - 4 replacements
- `frontend/services/__tests__/apiIntegrationTest.ts` - 24 replacements
- `frontend/services/__tests__/apiTest.ts` - 3 replacements
- And 11 more service files...

### 3. Components (8 files)
- `frontend/components/business/AlertManager.tsx` - 10 replacements
- `frontend/components/reports/ReportGenerator.tsx` - 2 replacements
- `frontend/components/analysis/ApiAnalysis.tsx` - 5 replacements
- `frontend/components/business/DataExporter.tsx` - 2 replacements
- `frontend/components/testing/TestExecutor.tsx` - 1 replacement
- And 3 more component files...

### 4. Contexts (1 file)
- `frontend/contexts/AuthContext.tsx` - 10 replacements

### 5. Pages (9 files)
- `frontend/pages/APITest.tsx` - 11 replacements
- `frontend/pages/DocumentationTest.tsx` - 11 replacements
- `frontend/pages/ContentTest.tsx` - 11 replacements
- `frontend/pages/InfrastructureTest.tsx` - 11 replacements
- `frontend/pages/Help.tsx` - 4 replacements
- And 4 more page files...

### 6. Tests (4 files)
- `frontend/tests/unit/optimizations.test.ts` - 6 replacements
- `frontend/tests/integration/unifiedEngineIntegration.test.tsx` - 2 replacements
- And 2 more test files...

---

## API Endpoint Mapping

### Authentication & User Management

| Old Path | New Path |
|----------|----------|
| `/api/auth/login` | `/auth/login` |
| `/api/auth/register` | `/auth/register` |
| `/api/auth/logout` | `/auth/logout` |
| `/api/auth/validate` | `/auth/validate` |
| `/api/auth/refresh` | `/auth/refresh` |
| `/api/auth/change-password` | `/auth/change-password` |
| `/api/auth/forgot-password` | `/auth/forgot-password` |
| `/api/auth/reset-password` | `/auth/reset-password` |
| `/api/auth/verify-email` | `/auth/verify-email` |
| `/api/user/profile` | `/user/profile` |

### Testing Endpoints

| Old Path | New Path |
|----------|----------|
| `/api/test/start` | `/test/start` |
| `/api/test/{id}` | `/test/{id}` |
| `/api/test/{id}/cancel` | `/test/{id}/cancel` |
| `/api/test/{id}/stop` | `/test/{id}/stop` |
| `/api/test/{id}/export` | `/test/{id}/export` |
| `/api/test/history` | `/test/history` |
| `/api/test/configurations` | `/test/configurations` |
| `/api/test/database` | `/test/database` |
| `/api/test-status/{id}` | `/test-status/{id}` |
| `/api/tests/start` | `/tests/start` |
| `/api/tests/{id}/progress` | `/tests/{id}/progress` |
| `/api/tests/{id}/result` | `/tests/{id}/result` |
| `/api/tests/queue/status` | `/tests/queue/status` |
| `/api/tests/statistics` | `/tests/statistics` |

### Monitoring Endpoints

| Old Path | New Path |
|----------|----------|
| `/api/monitoring/start` | `/monitoring/start` |
| `/api/monitoring/stop` | `/monitoring/stop` |
| `/api/monitoring/targets` | `/monitoring/targets` |
| `/api/monitoring/targets/{id}` | `/monitoring/targets/{id}` |
| `/api/monitoring/targets/{id}/check` | `/monitoring/targets/{id}/check` |
| `/api/monitoring/alerts` | `/monitoring/alerts` |
| `/api/monitoring/alerts/{id}/resolve` | `/monitoring/alerts/{id}/resolve` |
| `/api/monitoring/stats` | `/monitoring/stats` |
| `/api/monitoring/targets/batch` | `/monitoring/targets/batch` |

### OAuth & Permissions

| Old Path | New Path |
|----------|----------|
| `/api/oauth/{provider}/url` | `/oauth/{provider}/url` |
| `/api/oauth/{provider}/callback` | `/oauth/{provider}/callback` |
| `/api/permissions/check` | `/permissions/check` |
| `/api/permissions/user/{id}` | `/permissions/user/{id}` |
| `/api/permissions/roles` | `/permissions/roles` |

### Data & Analysis

| Old Path | New Path |
|----------|----------|
| `/api/data/analysis` | `/data/analysis` |
| `/api/data/export` | `/data/export` |
| `/api/data/compare` | `/data/compare` |
| `/api/reports/generate` | `/reports/generate` |

---

## How to Update Your Code

### Example 1: Fetch Calls

**Before:**
```typescript
const response = await fetch('/api/test/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(config)
});
```

**After:**
```typescript
const response = await fetch('/test/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(config)
});
```

### Example 2: Dynamic URLs

**Before:**
```typescript
const url = `/api/monitoring/targets/${targetId}`;
const response = await fetch(url, { headers });
```

**After:**
```typescript
const url = `/monitoring/targets/${targetId}`;
const response = await fetch(url, { headers });
```

### Example 3: Template Literals with Environment Variables

**Before:**
```typescript
const apiUrl = `http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/api/auth/login`;
```

**After:**
```typescript
const apiUrl = `http://${process.env.BACKEND_HOST}:${process.env.BACKEND_PORT}/auth/login`;
```

---

## Automated Migration Script

We've provided a PowerShell script to automate the migration:

**Location**: `scripts/remove-api-prefix.ps1`

**Usage**:
```powershell
powershell -ExecutionPolicy Bypass -File scripts/remove-api-prefix.ps1
```

**What it does**:
- Scans all `.ts`, `.tsx`, `.js`, `.jsx` files in the frontend directory
- Removes `/api/` prefix from fetch calls and URL strings
- Preserves code in documentation and comments
- Provides a summary of changes

---

## Verification Checklist

### ✅ Pre-Deployment

- [x] Run automated migration script
- [x] Review all changes with `git diff`
- [ ] Run frontend tests: `npm test`
- [ ] Run E2E tests: `npm run test:e2e`
- [ ] Test authentication flows
- [ ] Test all major features
- [ ] Verify API calls in browser DevTools Network tab

### ✅ Backend Coordination

- [ ] Confirm backend has removed `/api` prefix from routes
- [ ] Verify backend routing configuration
- [ ] Check nginx/reverse proxy configuration (if applicable)
- [ ] Update API documentation

### ✅ Post-Deployment

- [ ] Monitor error logs
- [ ] Check for 404 errors in production
- [ ] Verify all API endpoints are accessible
- [ ] Test in multiple environments (dev, staging, prod)

---

## Troubleshooting

### Issue: 404 Not Found errors

**Symptom**: API calls return 404 status codes

**Solution**: 
1. Check if the frontend code still has `/api` prefix
2. Verify backend routes have been updated
3. Check nginx/proxy configuration

### Issue: CORS errors

**Symptom**: Cross-origin errors in browser console

**Solution**:
1. Update CORS configuration on backend
2. Ensure allowed origins match new paths
3. Check middleware configuration

### Issue: Authentication failures

**Symptom**: Login/logout not working

**Solution**:
1. Verify `/auth/*` routes are accessible
2. Check token storage and retrieval
3. Confirm Authorization headers are correct

### Issue: Tests failing

**Symptom**: Unit/integration tests fail

**Solution**:
1. Update test mocks and fixtures
2. Check test API endpoints
3. Update test configuration files

---

## Manual Updates Required

If you're adding **new API calls** after this migration:

1. **DO NOT** include `/api` prefix in new fetch calls
2. Use the new path structure: `/resource/action`
3. Follow the patterns in updated files
4. Run tests to verify

### Code Review Checklist

When reviewing new code:
- [ ] No `/api/` prefix in fetch calls
- [ ] URL paths match backend routes
- [ ] Error handling is consistent
- [ ] Tests cover new API calls

---

## Rollback Plan

If you need to rollback this change:

1. **Revert frontend changes**:
   ```bash
   git revert <commit-hash>
   ```

2. **Restore backend routes**:
   - Add `/api` prefix back to all routes
   - Update route configuration

3. **Test thoroughly** before redeploying

---

## Questions & Support

### For Frontend Developers

- Review this document carefully
- Test your changes locally before committing
- Report any issues in the team channel

### For Backend Developers

- Ensure all routes are updated to remove `/api` prefix
- Update backend documentation
- Coordinate deployment timing

### Contact

- **Team Lead**: [Your Name]
- **Slack Channel**: #api-migration
- **Documentation**: See `/docs` folder for more details

---

## Additional Resources

- [Backend Route Configuration](./backend-guide.md)
- [API Documentation](./API.md)
- [Testing Guide](./TEST_ARCHITECTURE.md)
- [Deployment Guide](./DEPLOYMENT_README.md)

---

**Last Updated**: 2025-10-06  
**Migration Status**: ✅ Completed  
**Review Status**: Pending Team Review

