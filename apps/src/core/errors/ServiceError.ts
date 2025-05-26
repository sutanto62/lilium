export enum ServiceErrorType {
    VALIDATION_ERROR = 'VALIDATION_ERROR',
    DUPLICATE_ERROR = 'DUPLICATE_ERROR',
    DATABASE_ERROR = 'DATABASE_ERROR',
    NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
    UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class ServiceError extends Error {
    type: ServiceErrorType;
    details?: Record<string, unknown>;

    constructor(message: string, type: ServiceErrorType, details?: Record<string, unknown>) {
        super(message);
        this.name = 'ServiceError';
        this.type = type;
        this.details = details;
    }

    static validation(message: string, details?: Record<string, unknown>): ServiceError {
        return new ServiceError(message, ServiceErrorType.VALIDATION_ERROR, details);
    }

    static duplicate(message: string, details?: Record<string, unknown>): ServiceError {
        return new ServiceError(message, ServiceErrorType.DUPLICATE_ERROR, details);
    }

    static database(message: string, details?: Record<string, unknown>): ServiceError {
        return new ServiceError(message, ServiceErrorType.DATABASE_ERROR, details);
    }

    static notFound(message: string, details?: Record<string, unknown>): ServiceError {
        return new ServiceError(message, ServiceErrorType.NOT_FOUND_ERROR, details);
    }

    static unknown(message: string, details?: Record<string, unknown>): ServiceError {
        return new ServiceError(message, ServiceErrorType.UNKNOWN_ERROR, details);
    }
} 