/**
 * Error handling utilities
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403);
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Handle and format errors for API responses
 */
export const handleError = (error: unknown): { message: string; code: string; statusCode: number } => {
  if (error instanceof AppError) {
    return {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      code: 'INTERNAL_ERROR',
      statusCode: 500,
    };
  }

  return {
    message: 'An unknown error occurred',
    code: 'UNKNOWN_ERROR',
    statusCode: 500,
  };
};

