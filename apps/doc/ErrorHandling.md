# Error Handling in Clean Architecture with Svelte

## Overview

This document outlines the proper error handling patterns for clean architecture in Svelte applications, specifically focusing on the layered approach and how errors should flow through different layers.

## Error Handling Principles

### 1. Layer-Specific Error Types

Each layer should have its own error types that are appropriate for that layer's responsibilities:

- **Repository Layer**: Database-specific errors, connection issues
- **Service Layer**: Business logic errors, validation errors
- **Presentation Layer**: User-friendly error messages, HTTP status codes

### 2. Error Propagation Flow

```
Repository → Service → Page Server → Client
    ↓           ↓           ↓          ↓
Database   ServiceError   HTTP      User
Errors     (typed)       Status    Message
```

### 3. ServiceError Types

The application uses a centralized `ServiceError` class with specific error types:

```typescript
export enum ServiceErrorType {
	VALIDATION_ERROR = 'VALIDATION_ERROR',
	DUPLICATE_ERROR = 'DUPLICATE_ERROR',
	DATABASE_ERROR = 'DATABASE_ERROR',
	NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
	UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## Implementation Examples

### Repository Layer

Repository methods should return meaningful values or throw specific errors:

```typescript
// Good: Return 0 for business logic cases
export async function createEventUsher(
	db: ReturnType<typeof drizzle>,
	eventId: string,
	ushers: EventUsher[],
	wilayahId: string,
	lingkunganId: string
): Promise<number> {
	// Check if lingkungan is already submit event usher
	const ifSubmitted = await db
		.select()
		.from(event_usher)
		.where(and(eq(event_usher.event, eventId), eq(event_usher.lingkungan, lingkunganId)));

	if (featureFlags.isEnabled('no_multi_submit')) {
		if (ifSubmitted.length > 0) {
			return 0; // Business logic: already submitted
		}
	}

	// Insert ushers
	const created_date = new Date().getTime();
	const usherValues = ushers.map((usher, index) => ({
		// ... mapping logic
	}));

	await db.insert(event_usher).values(usherValues);
	return created_date; // Success: return timestamp
}
```

### Service Layer

Service methods should:

1. Handle repository return values
2. Convert generic errors to typed ServiceError
3. Never throw generic Error objects

```typescript
async assignEventUshers(
    eventId: string,
    ushers: EventUsher[],
    wilayahId: string,
    lingkunganId: string
): Promise<number> {
    try {
        const createdDate = await repo.insertEventUshers(eventId, ushers, wilayahId, lingkunganId);

        // Handle business logic return values
        if (createdDate === 0) {
            logger.warn(`lingkungan ${lingkunganId} sudah melakukan konfirmasi tugas`);
            throw ServiceError.validation('Lingkungan Bapak/Ibu sudah melakukan konfirmasi tugas');
        }

        return createdDate;
    } catch (error) {
        // If it's already a ServiceError, re-throw it
        if (error instanceof ServiceError) {
            throw error;
        }

        // Convert generic errors to ServiceError.database
        logger.error('failed to add ushers to event:', error);
        throw ServiceError.database('Sistem gagal mencatat petugas', {
            originalError: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
```

### Page Server Layer

Page server actions should:

1. Catch ServiceError types
2. Map them to appropriate HTTP status codes
3. Return user-friendly messages

```typescript
export const actions = {
	default: async ({ request, cookies }) => {
		try {
			const createdDate = await usherService.assignEventUshers(
				confirmedEvent.id,
				ushersArray,
				wilayahId,
				lingkunganId
			);

			// Success path...
		} catch (error: unknown) {
			// Handle ServiceError types appropriately
			if (error instanceof ServiceError) {
				switch (error.type) {
					case ServiceErrorType.VALIDATION_ERROR:
						return fail(422, {
							error: error.message,
							formData: formValues
						});
					case ServiceErrorType.DUPLICATE_ERROR:
						return fail(400, {
							error: error.message,
							formData: formValues
						});
					case ServiceErrorType.DATABASE_ERROR:
						logger.error('Database error in usher assignment:', error);
						return fail(500, {
							error: 'Terjadi kesalahan sistem. Silakan coba lagi.',
							formData: formValues
						});
					default:
						logger.error('Unknown service error:', error);
						return fail(500, {
							error: 'Terjadi kesalahan internal.',
							formData: formValues
						});
				}
			}

			// Handle unexpected errors
			logger.error('Unexpected error in usher assignment:', error);
			return fail(500, {
				error:
					'Terjadi kesalahan internal: ' +
					(error instanceof Error ? error.message : 'Detail tidak diketahui'),
				formData: formValues
			});
		}
	}
};
```

## Common Anti-Patterns to Avoid

### ❌ Bad: Generic Error Throwing

```typescript
// Service layer
catch (error) {
    throw new Error('Sistem gagal mencatat petugas'); // Generic error
}
```

### ❌ Bad: Redundant Validation

```typescript
// Page server - redundant check
const createdDate = await usherService.assignEventUshers(...);
if (createdDate === 0) { // Already handled in service layer
    return fail(400, { error: 'Already submitted' });
}
```

### ❌ Bad: Mixed Error Types

```typescript
// Service layer - mixing error types
if (createdDate === 0) {
	throw ServiceError.validation('Already submitted');
}
throw new Error('Database failed'); // Inconsistent error type
```

## Best Practices

### 1. Single Responsibility for Error Handling

Each layer should only handle errors appropriate for its responsibility:

- Repository: Database operations
- Service: Business logic and validation
- Page Server: HTTP responses and user experience

### 2. Consistent Error Types

Always use `ServiceError` types in the service layer:

- `ServiceError.validation()` for business rule violations
- `ServiceError.database()` for database operation failures
- `ServiceError.notFound()` for missing resources
- `ServiceError.duplicate()` for duplicate entries

### 3. Proper Logging

Log errors at the appropriate level:

- `logger.warn()` for expected business logic violations
- `logger.error()` for unexpected system errors
- Include context information for debugging

### 4. User-Friendly Messages

Always provide user-friendly error messages in the presentation layer:

- Don't expose internal error details to users
- Use appropriate HTTP status codes
- Provide actionable feedback when possible

## Testing Error Handling

### Service Layer Tests

```typescript
describe('UsherService.assignEventUshers', () => {
	it('should throw ServiceError.validation when lingkungan already submitted', async () => {
		vi.mocked(repo.insertEventUshers).mockResolvedValue(0);

		await expect(
			usherService.assignEventUshers('event-1', [], 'wilayah-1', 'lingkungan-1')
		).rejects.toThrow(ServiceError);

		await expect(
			usherService.assignEventUshers('event-1', [], 'wilayah-1', 'lingkungan-1')
		).rejects.toMatchObject({
			type: ServiceErrorType.VALIDATION_ERROR,
			message: 'Lingkungan Bapak/Ibu sudah melakukan konfirmasi tugas'
		});
	});
});
```

### Page Server Tests

```typescript
describe('Page server actions', () => {
	it('should return 422 for validation errors', async () => {
		vi.mocked(usherService.assignEventUshers).mockRejectedValue(
			ServiceError.validation('Invalid data')
		);

		const result = await actions.default({ request, cookies });

		expect(result).toEqual({
			status: 422,
			data: { error: 'Invalid data', formData: expect.any(Object) }
		});
	});
});
```

## Summary

Clean architecture error handling ensures:

1. **Type Safety**: All errors are properly typed
2. **Separation of Concerns**: Each layer handles appropriate errors
3. **Consistency**: Uniform error handling patterns
4. **Maintainability**: Easy to understand and modify error flows
5. **User Experience**: Appropriate error messages for users
6. **Debugging**: Proper logging for developers
