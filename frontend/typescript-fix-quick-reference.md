# TypeScript Error Fix - Quick Reference Cheat Sheet

## 🔥 Most Common Errors & Quick Fixes

### TS2308: Module re-export ambiguity
**Count:** 118 errors

```typescript
// ❌ WRONG - causes conflicts
export * from './auth.types';  // exports ApiResponse
export * from './api.types';   // also exports ApiResponse

// ✅ CORRECT - Option 1: Specific exports
export type { User, LoginData } from './auth.types';
export type { ApiResponse as APIResponse } from './api.types';

// ✅ CORRECT - Option 2: Type-only re-exports
export type * from './auth.types';
export type * from './api.types';
```

**Files affected:**
- `types/index.ts` (81 errors)
- `services/types.ts` (20 errors)
- `../shared/types/index.ts` (17 errors)

---

### TS2339: Property does not exist on type
**Count:** 254 errors

```typescript
// ❌ WRONG - accessing unknown properties
function process(data: unknown) {
  console.log(data.name);  // Error!
}

// ✅ CORRECT - Add type guard
function process(data: unknown) {
  if (typeof data === 'object' && data !== null && 'name' in data) {
    console.log((data as { name: string }).name);
  }
}

// ✅ BETTER - Define proper interface
interface DataWithName {
  name: string;
  [key: string]: unknown;
}

function process(data: DataWithName) {
  console.log(data.name);  // OK!
}
```

**Common patterns:**

1. **Missing interface properties:**
```typescript
// ❌ Interface incomplete
interface QueueStats {
  total: number;
}
stats.totalQueued;  // Error!

// ✅ Add missing properties
interface QueueStats {
  total: number;
  totalQueued: number;
  totalRunning: number;
  totalCompleted: number;
}
```

2. **Wrong property name:**
```typescript
// ❌ Typo in property name
result.technicalSEO;  // Error! Should be 'technical'

// ✅ Use correct name
result.technical;
```

---

### TS2322: Type is not assignable
**Count:** 130 errors

```typescript
// ❌ WRONG - type mismatch
interface User {
  name: string;
  age: number;
}
const user: User = { name: "John" };  // Missing 'age'

// ✅ CORRECT - Complete the type
const user: User = { name: "John", age: 30 };

// ✅ OR make property optional
interface User {
  name: string;
  age?: number;
}
```

**Common patterns:**

1. **String vs Number:**
```typescript
// ❌ WRONG
const timeout: number = "5000";

// ✅ CORRECT
const timeout: number = 5000;
// OR
const timeout: number = parseInt("5000");
```

2. **Missing required properties:**
```typescript
// ❌ WRONG
const config: TestConfig = { url: "..." };  // Missing other props

// ✅ CORRECT
const config: TestConfig = {
  url: "...",
  timeout: 30000,
  retries: 3,
};
```

---

### TS2345: Argument type not assignable
**Count:** 52 errors

```typescript
// ❌ WRONG
function greet(name: string) { }
greet(123);  // Error!

// ✅ CORRECT
greet("John");
// OR
greet(String(123));
```

**Common patterns:**

1. **Event handlers:**
```typescript
// ❌ WRONG
const handleChange = (url: string) => { };
<input onChange={handleChange} />  // Passes ChangeEvent, not string!

// ✅ CORRECT
const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
  const url = e.target.value;
};
<input onChange={handleChange} />
```

2. **Array methods:**
```typescript
// ❌ WRONG
const items: string[] = [1, 2, 3];  // Error!

// ✅ CORRECT
const items: string[] = ["1", "2", "3"];
// OR
const items: number[] = [1, 2, 3];
```

---

### TS2304: Cannot find name
**Count:** 26 errors

```typescript
// ❌ WRONG - using undefined type
const stats: QueueStats = { };  // Error: Cannot find name 'QueueStats'

// ✅ CORRECT - Define or import the type
// Option 1: Define it
export interface QueueStats {
  totalQueued: number;
  // ...
}

// Option 2: Import it
import type { QueueStats } from './types';
```

---

### TS2305: Module has no exported member
**Count:** 20 errors

```typescript
// ❌ WRONG - importing non-existent export
import { ApiRequestConfig } from '@shared/types';  // Doesn't exist!

// ✅ CORRECT - Check what's actually exported
// Option 1: Use correct name
import { RequestConfig } from '@shared/types';

// Option 2: Define it if missing
export interface ApiRequestConfig {
  // ...
}
```

**How to debug:**
```bash
# Check what a module exports
cat types/index.ts | grep "export"

# Search for type definition
grep -r "interface ApiRequestConfig" . --include="*.ts"
```

---

### TS2551: Property does not exist (with suggestion)
**Count:** 16 errors

```typescript
// ❌ WRONG - typo in property name
interface User {
  username: string;
}
user.userName;  // Error: Did you mean 'username'?

// ✅ CORRECT - use suggested name
user.username;
```

---

### TS2554: Expected N arguments but got M
**Count:** 18 errors

```typescript
// ❌ WRONG - wrong number of arguments
function add(a: number, b: number) { return a + b; }
add(5);  // Error: Expected 2 arguments, but got 1

// ✅ CORRECT - provide all arguments
add(5, 3);

// ✅ OR make parameters optional
function add(a: number, b: number = 0) { return a + b; }
add(5);  // OK!
```

---

### TS2693: Type used as value
**Count:** 12 errors

```typescript
// ❌ WRONG - importing type as value
import type { TestType } from './enums';
const x = TestType.API;  // Error! TestType is just a type

// ✅ CORRECT - import as value (remove 'type')
import { TestType } from './enums';
const x = TestType.API;  // OK!

// ✅ OR convert to const object
export const TestType = {
  API: 'api',
  PERFORMANCE: 'performance',
} as const;
export type TestType = typeof TestType[keyof typeof TestType];
```

---

### TS2739: Type is missing properties
**Count:** 20 errors

```typescript
// ❌ WRONG - incomplete object
interface User {
  id: string;
  name: string;
  email: string;
}
const user: User = { id: "1" };  // Missing name and email!

// ✅ CORRECT - provide all properties
const user: User = {
  id: "1",
  name: "John",
  email: "john@example.com"
};

// ✅ OR make properties optional
interface User {
  id: string;
  name?: string;
  email?: string;
}
```

---

### TS2698: Spread types may only be created from object types
**Count:** 3 errors

```typescript
// ❌ WRONG - spreading non-object
const result = { ...someUnknownValue };

// ✅ CORRECT - add type guard
if (typeof someValue === 'object' && someValue !== null) {
  const result = { ...someValue };
}

// ✅ OR assert the type
const result = { ...(someValue as Record<string, unknown>) };
```

---

### TS2694: Namespace has no exported member
**Count:** 15 errors

```typescript
// ❌ WRONG - using non-existent jest namespace member
const mockFn = jest.fn() as global.jest.MockedFunction<typeof fn>;

// ✅ CORRECT - import from jest-mock
import type { MockedFunction } from 'jest-mock';
const mockFn = jest.fn() as MockedFunction<typeof fn>;

// ✅ OR use simpler typing
const mockFn = jest.fn<ReturnType<typeof fn>, Parameters<typeof fn>>();
```

---

## 🎯 Priority Order for Fixes

1. **TS2308 (Module re-export)** - 118 errors
   - Start here! Fixes cascade to other files
   - Files: `types/index.ts`, `services/types.ts`, `../shared/types/index.ts`

2. **TS2305 (Missing export)** - 20 errors
   - Define missing types or fix import names
   - Files: `services/api/testApiService.ts`, `types/models.types.ts`

3. **TS2304 (Cannot find name)** - 26 errors
   - Define or import missing types
   - Files: `hooks/useStressTestRecord.ts`, `hooks/useTestProgress.ts`

4. **TS2339 (Property missing)** - 254 errors
   - Add missing properties to interfaces
   - Many files - fix after type definitions are solid

5. **TS2322 (Type mismatch)** - 130 errors
   - Fix type assignments
   - Handle after definitions and properties are correct

---

## 🛠 Essential Type Guard Patterns

### 1. Check if object has property
```typescript
function hasProperty<T, K extends string>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj;
}

// Usage:
if (hasProperty(data, 'name')) {
  console.log(data.name);  // OK!
}
```

### 2. Check error type
```typescript
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

// Usage:
catch (error) {
  if (isErrorWithMessage(error)) {
    console.log(error.message);
  }
}
```

### 3. Check API response
```typescript
function isApiResponse<T>(value: unknown): value is ApiResponse<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'data' in value
  );
}
```

### 4. Array type guard
```typescript
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}
```

---

## 📝 Common Patterns

### Pattern 1: Optional chaining with type assertion
```typescript
// Access nested optional properties safely
const name = (data as { user?: { name?: string } })?.user?.name ?? 'Unknown';
```

### Pattern 2: Type narrowing with multiple conditions
```typescript
if (
  typeof response === 'object' &&
  response !== null &&
  'data' in response &&
  Array.isArray((response as { data: unknown }).data)
) {
  const data = (response as { data: unknown[] }).data;
  // Process array...
}
```

### Pattern 3: Generic type utilities
```typescript
// Make all properties optional
type Partial<T> = { [P in keyof T]?: T[P] };

// Make all properties required
type Required<T> = { [P in keyof T]-?: T[P] };

// Pick specific properties
type Pick<T, K extends keyof T> = { [P in K]: T[P] };

// Omit specific properties
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;
```

---

## 🔍 Debugging Commands

```bash
# Find where a type is defined
grep -r "interface TypeName" . --include="*.ts" --include="*.tsx"

# Find all uses of a type
grep -r "TypeName" . --include="*.ts" --include="*.tsx"

# Check what a file exports
cat path/to/file.ts | grep "export"

# Count errors by type
npm run type-check 2>&1 | Select-String "error TS" | ForEach-Object { $_ -replace '^.*error (TS\d+):.*$', '$1' } | Group-Object | Sort-Object Count -Descending

# Errors in specific file
npm run type-check 2>&1 | Select-String "filename.ts"

# Total error count
npm run type-check 2>&1 | Select-String "error TS" | Measure-Object -Line
```

---

## 💉 Temporary Fixes (Use Sparingly!)

```typescript
// Suppress single line error
// @ts-expect-error TODO: Fix this type issue
const result = someUntypedFunction();

// Ignore next line
// @ts-ignore
const x = problematicValue;

// Assert as any (last resort!)
const data = (response as any).data;

// Better: Assert to unknown first, then narrow
const data = (response as unknown) as ResponseType;
```

⚠️ **WARNING:** These should only be used temporarily while you fix the real issue!

---

## ✅ Checklist for Each Fix

- [ ] Understand the root cause
- [ ] Check if type exists elsewhere
- [ ] Add proper type definition if missing
- [ ] Update imports if needed
- [ ] Test the fix with `npm run type-check`
- [ ] Remove any `@ts-expect-error` comments
- [ ] Commit the change

---

## 📚 Useful Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TypeScript Error Messages](https://typescript.tv/errors/)
- [Type Guards](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Utility Types](https://www.typescriptlang.org/docs/handbook/utility-types.html)

---

**Remember:** Fix type definitions first, then services, then components. Type safety cascades from the bottom up! 🚀

