/**
 * Base error class for all domain errors
 */
export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Error types for different domains
 */
export class ValidationError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class AuthenticationError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class AuthorizationError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class NotFoundError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class ConflictError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class BusinessRuleError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class DatabaseError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

/**
 * Type guard to check if an error is a DomainError
 */
export function isDomainError(error: unknown): error is DomainError {
    return error instanceof DomainError;
}

/**
 * Type guard to check if an error is a specific type of DomainError
 */
export function isSpecificDomainError<T extends DomainError>(
    error: unknown,
    errorType: new (message: string) => T
): error is T {
    return error instanceof errorType;
}

/**
 * Error codes for different types of errors
 */
export enum ErrorCode {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
    NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
    CONFLICT_ERROR = 'CONFLICT_ERROR',
    BUSINESS_RULE_ERROR = 'BUSINESS_RULE_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
}

/**
 * Error response type for API responses
 */
export interface ErrorResponse {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Helper function to create an error response
 */
export function createErrorResponse(
    error: DomainError,
    details?: Record<string, unknown>
): ErrorResponse {
    let code: ErrorCode;

    if (error instanceof ValidationError) {
        code = ErrorCode.VALIDATION_ERROR;
    } else if (error instanceof AuthenticationError) {
        code = ErrorCode.AUTHENTICATION_ERROR;
    } else if (error instanceof AuthorizationError) {
        code = ErrorCode.AUTHORIZATION_ERROR;
    } else if (error instanceof NotFoundError) {
        code = ErrorCode.NOT_FOUND_ERROR;
    } else if (error instanceof ConflictError) {
        code = ErrorCode.CONFLICT_ERROR;
    } else if (error instanceof BusinessRuleError) {
        code = ErrorCode.BUSINESS_RULE_ERROR;
    } else if (error instanceof DatabaseError) {
        code = ErrorCode.DATABASE_ERROR;
    } else {
        code = ErrorCode.BUSINESS_RULE_ERROR;
    }

    return {
        code,
        message: error.message,
        details,
    };
} 