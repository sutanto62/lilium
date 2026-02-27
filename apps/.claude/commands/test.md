Review or generate tests following our Vitest and Playwright testing patterns.

## Unit Test Structure (Vitest)

**File naming:** `EntityName.test.ts` in the same directory as the source file.

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('EventService', () => {
  let eventService: EventService;

  beforeEach(() => {
    eventService = new EventService('church-1');
    vi.clearAllMocks(); // Reset mocks between tests
  });

  describe('retrieveEventById', () => {
    it('should return event when found', async () => { });
    it('should throw notFound error when event missing', async () => { });
  });
});
```

## Mocking

```typescript
vi.mock('$src/lib/server/db', () => ({
  repo: {
    getEventById: vi.fn(),
    insertEvent: vi.fn()
  }
}));

// In test:
vi.mocked(repo.getEventById).mockResolvedValue(mockEvent);
```

## Test Data Factories

```typescript
function createMockEvent(overrides?: Partial<ChurchEvent>): ChurchEvent {
  return {
    id: '1',
    church: 'church-1',
    mass: 'mass-1',
    date: '2024-03-20',
    weekNumber: 12,
    active: 1,
    ...overrides
  };
}
```

## Assertions

```typescript
// Happy path
expect(repo.getEventById).toHaveBeenCalledWith('1');
expect(result).toEqual(mockEvent);

// Error path
await expect(service.createEvent({ mass: 'mass-1' }))
  .rejects.toThrow('Church ID is required');
expect(repo.insertEvent).not.toHaveBeenCalled();
```

## Integration Tests (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Event Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/misa');
  });

  test('should display events list', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Misa');
    await expect(page.locator('table')).toBeVisible();
  });
});
```

## Checklist

- [ ] Tests are isolated — no shared mutable state between tests
- [ ] `beforeEach` sets up fresh instances and clears mocks
- [ ] All async operations are awaited
- [ ] Both happy path and error cases are covered
- [ ] Tests verify behavior, not implementation details
- [ ] Test data uses factories, not hardcoded values scattered across tests

Run `npm run test:unit` to validate.
