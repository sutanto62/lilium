---
name: test
description: >
  Review or generate tests following this project's Vitest (unit) and Playwright (integration)
  patterns. Trigger whenever the user writes new service, repository, or adapter code — even
  if they don't ask for tests, proactively suggest them. Also trigger on explicit requests like
  "write tests", "add unit tests", "is this tested?", "coverage", or when working on *.test.ts
  or Playwright spec files. Always trigger when a new service class or repository implementation
  is completed — untested business logic is a liability.
---

Review existing tests for pattern compliance, or generate tests for the provided code. Follow these patterns exactly — consistency across the test suite matters for readability and maintenance.

## Unit Test Structure (Vitest)

**File placement:** `EntityName.test.ts` in the same directory as the source file.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('ServiceName', () => {
  let service: ServiceName;

  beforeEach(() => {
    service = new ServiceName('church-1');
    vi.clearAllMocks(); // Always reset between tests
  });

  describe('methodName', () => {
    it('should <expected behavior> when <condition>', async () => { });
    it('should throw <error> when <bad condition>', async () => { });
  });
});
```

## Mocking

Mock at the module boundary, not deep inside the implementation:

```typescript
vi.mock('$src/lib/server/db', () => ({
  repo: {
    findById: vi.fn(),
    persist: vi.fn()
  }
}));

// In test body:
vi.mocked(repo.findById).mockResolvedValue(mockEntity);
```

## Test Data Factories

Always use factories — never scatter hardcoded objects across tests:

```typescript
function createMock<EntityName>(overrides?: Partial<EntityName>): EntityName {
  return {
    id: '1',
    church: 'church-1',
    active: 1,
    createdAt: 1700000000,
    ...overrides
  };
}
```

## Assertions

```typescript
// Happy path — verify both the call and the result
expect(repo.findById).toHaveBeenCalledWith('1');
expect(result).toEqual(mockEntity);

// Error path — verify the error AND that side effects didn't run
await expect(service.create({ name: '' }))
  .rejects.toThrow('Name is required');
expect(repo.persist).not.toHaveBeenCalled();
```

## Integration Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/route');
  });

  test('should <behavior>', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Expected Title');
    await expect(page.locator('table')).toBeVisible();
  });
});
```

## Checklist

- [ ] Tests are isolated — no shared mutable state between tests
- [ ] `beforeEach` sets up fresh instances and clears all mocks
- [ ] All async operations are awaited
- [ ] Both happy path and error cases are covered
- [ ] Tests verify observable behavior, not internal implementation details
- [ ] Test data comes from factories with `overrides`, not hardcoded inline objects

## Validation

Run `npm run test:unit` to confirm tests pass before finishing.
