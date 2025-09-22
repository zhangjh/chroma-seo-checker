import { errorHandler, SEOAIError, SEOAnalysisError, SEOStorageError, errorRecovery } from './error-handler';

// Decorator for automatic error handling
export function HandleErrors(context: string = 'Unknown') {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        errorHandler.logError(error as Error, `${target.constructor.name}.${propertyName} - ${context}`);
        throw error;
      }
    };

    return descriptor;
  };
}

// Decorator for retry logic with exponential backoff
export function RetryOnFailure(maxRetries: number = 3, baseDelay: number = 1000) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      return await errorRecovery.retryWithBackoff(
        () => method.apply(this, args),
        maxRetries,
        baseDelay
      );
    };

    return descriptor;
  };
}

// Decorator for AI service methods
export function HandleAIErrors(fallbackValue?: any) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const aiError = error instanceof SEOAIError ? error : new SEOAIError(
          (error as Error).message,
          'api',
          true,
          `${target.constructor.name}.${propertyName}`
        );
        
        errorHandler.handleAIError(aiError);
        
        if (fallbackValue !== undefined) {
          return fallbackValue;
        }
        
        throw aiError;
      }
    };

    return descriptor;
  };
}

// Decorator for storage operations
export function HandleStorageErrors(fallbackValue?: any) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const storageError = error instanceof SEOStorageError ? error : new SEOStorageError(
          (error as Error).message,
          'permission',
          `${target.constructor.name}.${propertyName}`
        );
        
        errorHandler.handleStorageError(storageError);
        
        if (fallbackValue !== undefined) {
          return fallbackValue;
        }
        
        throw storageError;
      }
    };

    return descriptor;
  };
}

// Decorator for analysis operations
export function HandleAnalysisErrors(url: string = 'unknown', fallbackValue?: any) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await method.apply(this, args);
      } catch (error) {
        const analysisError = error instanceof SEOAnalysisError ? error : new SEOAnalysisError(
          (error as Error).message,
          'parsing',
          url,
          `${target.constructor.name}.${propertyName}`
        );
        
        errorHandler.handleAnalysisError(analysisError);
        
        if (fallbackValue !== undefined) {
          return fallbackValue;
        }
        
        throw analysisError;
      }
    };

    return descriptor;
  };
}

// Utility function to wrap promises with error handling
export function withErrorHandling<T>(
  promise: Promise<T>,
  context: string,
  fallbackValue?: T
): Promise<T> {
  return promise.catch((error) => {
    errorHandler.logError(error, context);
    
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    
    throw error;
  });
}

// Utility function for safe async operations
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string,
  fallbackValue?: T
): Promise<T | undefined> {
  try {
    return await operation();
  } catch (error) {
    errorHandler.logError(error as Error, context);
    return fallbackValue;
  }
}

// Utility function for safe sync operations
export function safeSync<T>(
  operation: () => T,
  context: string,
  fallbackValue?: T
): T | undefined {
  try {
    return operation();
  } catch (error) {
    errorHandler.logError(error as Error, context);
    return fallbackValue;
  }
}

// Simple retry utility for Chrome extension
export class SimpleRetry {
  static async execute<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Simple delay between retries
        await new Promise(resolve => setTimeout(resolve, delay));
        
        errorHandler.logError(
          new Error(`Retry attempt ${attempt + 1}/${maxRetries}: ${lastError.message}`),
          'Simple Retry'
        );
      }
    }

    throw lastError!;
  }
}