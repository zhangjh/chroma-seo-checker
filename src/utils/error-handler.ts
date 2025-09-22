import { AIError, AnalysisError, StorageError, ErrorHandler } from '../../types/components';

// Error types and classes
export class SEOCheckerError extends Error {
  public readonly timestamp: Date;
  public readonly context: string;
  public readonly severity: 'low' | 'medium' | 'high' | 'critical';

  constructor(message: string, context: string, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') {
    super(message);
    this.name = 'SEOCheckerError';
    this.timestamp = new Date();
    this.context = context;
    this.severity = severity;
  }
}

export class SEOAIError extends SEOCheckerError implements AIError {
  public readonly type: 'network' | 'quota' | 'timeout' | 'api';
  public readonly retryable: boolean;

  constructor(
    message: string,
    type: 'network' | 'quota' | 'timeout' | 'api',
    retryable: boolean = true,
    context: string = 'AI Service'
  ) {
    super(message, context, type === 'quota' ? 'high' : 'medium');
    this.name = 'SEOAIError';
    this.type = type;
    this.retryable = retryable;
  }
}

export class SEOAnalysisError extends SEOCheckerError implements AnalysisError {
  public readonly type: 'permission' | 'parsing' | 'timeout';
  public readonly url: string;

  constructor(
    message: string,
    type: 'permission' | 'parsing' | 'timeout',
    url: string,
    context: string = 'Page Analysis'
  ) {
    super(message, context, type === 'permission' ? 'high' : 'medium');
    this.name = 'SEOAnalysisError';
    this.type = type;
    this.url = url;
  }
}

export class SEOStorageError extends SEOCheckerError implements StorageError {
  public readonly type: 'quota' | 'corruption' | 'permission';

  constructor(
    message: string,
    type: 'quota' | 'corruption' | 'permission',
    context: string = 'Storage'
  ) {
    super(message, context, type === 'corruption' ? 'critical' : 'high');
    this.name = 'SEOStorageError';
    this.type = type;
  }
}

// Error recovery strategies
export interface ErrorRecovery {
  retryWithBackoff(operation: () => Promise<any>, maxRetries: number): Promise<any>;
  fallbackToOfflineMode(): void;
  clearCorruptedData(): Promise<void>;
}

// Main error handler implementation
export class SEOErrorHandler implements ErrorHandler {
  private errorLog: SEOCheckerError[] = [];
  private maxLogSize = 100;
  private notificationCallbacks: Map<string, (error: SEOCheckerError) => void> = new Map();

  constructor() {
    // Initialize error handler
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.logError(new Error(event.reason), 'Unhandled Promise Rejection');
        event.preventDefault();
      });

      // Handle general errors
      window.addEventListener('error', (event) => {
        this.logError(event.error || new Error(event.message), 'Global Error Handler');
      });
    }
  }

  public handleAIError(error: AIError): void {
    const aiError = error instanceof SEOAIError ? error : new SEOAIError(
      error.message,
      error.type,
      error.retryable,
      'AI Service'
    );

    this.logError(aiError, aiError.context);
    this.notifyUser(aiError);

    // Implement specific recovery strategies for AI errors
    switch (aiError.type) {
      case 'network':
        this.handleNetworkError(aiError);
        break;
      case 'quota':
        this.handleQuotaError(aiError);
        break;
      case 'timeout':
        this.handleTimeoutError(aiError);
        break;
      case 'api':
        this.handleAPIError(aiError);
        break;
    }
  }

  public handleAnalysisError(error: AnalysisError): void {
    const analysisError = error instanceof SEOAnalysisError ? error : new SEOAnalysisError(
      error.message,
      error.type,
      error.url,
      'Page Analysis'
    );

    this.logError(analysisError, analysisError.context);
    this.notifyUser(analysisError);

    // Implement specific recovery strategies for analysis errors
    switch (analysisError.type) {
      case 'permission':
        this.handlePermissionError(analysisError);
        break;
      case 'parsing':
        this.handleParsingError(analysisError);
        break;
      case 'timeout':
        this.handleAnalysisTimeoutError(analysisError);
        break;
    }
  }

  public handleStorageError(error: StorageError): void {
    const storageError = error instanceof SEOStorageError ? error : new SEOStorageError(
      error.message,
      error.type,
      'Storage'
    );

    this.logError(storageError, storageError.context);
    this.notifyUser(storageError);

    // Implement specific recovery strategies for storage errors
    switch (storageError.type) {
      case 'quota':
        this.handleStorageQuotaError(storageError);
        break;
      case 'corruption':
        this.handleDataCorruptionError(storageError);
        break;
      case 'permission':
        this.handleStoragePermissionError(storageError);
        break;
    }
  }

  public logError(error: Error, context: string): void {
    const seoError = error instanceof SEOCheckerError ? error : new SEOCheckerError(
      error.message,
      context,
      'medium'
    );

    // Add to error log
    this.errorLog.push(seoError);

    // Maintain log size
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${seoError.severity.toUpperCase()}] ${seoError.context}:`, seoError);
    }

    // Send to analytics/monitoring service if available
    this.sendToMonitoring(seoError);
  }

  // Error recovery methods
  private handleNetworkError(error: SEOAIError): void {
    // Implement network error recovery
    this.showUserMessage('网络连接失败，请检查网络连接后重试', 'warning');
  }

  private handleQuotaError(error: SEOAIError): void {
    // Implement quota error recovery
    this.showUserMessage('AI服务配额已用完，请稍后重试或使用基础检查功能', 'error');
  }

  private handleTimeoutError(error: SEOAIError): void {
    // Implement timeout error recovery
    this.showUserMessage('AI服务响应超时，正在重试...', 'warning');
  }

  private handleAPIError(error: SEOAIError): void {
    // Implement API error recovery
    this.showUserMessage('AI服务暂时不可用，已切换到基础检查模式', 'warning');
  }

  private handlePermissionError(error: SEOAnalysisError): void {
    // Implement permission error recovery
    this.showUserMessage('页面访问权限不足，请刷新页面后重试', 'warning');
  }

  private handleParsingError(error: SEOAnalysisError): void {
    // Implement parsing error recovery
    this.showUserMessage('页面内容解析失败，将提供部分分析结果', 'warning');
  }

  private handleAnalysisTimeoutError(error: SEOAnalysisError): void {
    // Implement analysis timeout error recovery
    this.showUserMessage('页面分析超时，请重试或检查页面复杂度', 'warning');
  }

  private handleStorageQuotaError(error: SEOStorageError): void {
    // Implement storage quota error recovery
    this.showUserMessage('存储空间不足，正在清理旧数据...', 'warning');
    this.clearOldData();
  }

  private handleDataCorruptionError(error: SEOStorageError): void {
    // Implement data corruption error recovery
    this.showUserMessage('检测到数据损坏，正在重置存储...', 'error');
    this.resetStorage();
  }

  private handleStoragePermissionError(error: SEOStorageError): void {
    // Implement storage permission error recovery
    this.showUserMessage('存储权限不足，部分功能可能受限', 'warning');
  }

  // Utility methods
  private notifyUser(error: SEOCheckerError): void {
    // Notify registered callbacks
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (e) {
        console.error('Error in notification callback:', e);
      }
    });
  }

  private showUserMessage(message: string, type: 'info' | 'warning' | 'error'): void {
    // Show user-friendly message in UI
    if (typeof chrome !== 'undefined' && chrome.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'SEO Checker',
        message: message
      });
    } else {
      // Fallback for content script or popup
      console.log(`[${type.toUpperCase()}] ${message}`);
    }
  }

  private sendToMonitoring(error: SEOCheckerError): void {
    // Send error to monitoring service (placeholder)
    // In a real implementation, this would send to analytics/monitoring
    if (error.severity === 'critical' || error.severity === 'high') {
      // Send critical errors to monitoring service
    }
  }

  private async clearOldData(): Promise<void> {
    try {
      // Clear old reports and data to free up space
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.local.get();
        const reports = Object.keys(data).filter(key => key.startsWith('seo_report_'));
        
        // Keep only the 10 most recent reports
        if (reports.length > 10) {
          const toDelete = reports.slice(0, reports.length - 10);
          await chrome.storage.local.remove(toDelete);
        }
      }
    } catch (e) {
      this.logError(new SEOStorageError('Failed to clear old data', 'corruption'), 'Data Cleanup');
    }
  }

  private async resetStorage(): Promise<void> {
    try {
      // Reset storage in case of corruption
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.clear();
      }
    } catch (e) {
      this.logError(new SEOStorageError('Failed to reset storage', 'permission'), 'Storage Reset');
    }
  }

  // Public utility methods
  public registerNotificationCallback(id: string, callback: (error: SEOCheckerError) => void): void {
    this.notificationCallbacks.set(id, callback);
  }

  public unregisterNotificationCallback(id: string): void {
    this.notificationCallbacks.delete(id);
  }

  public getErrorLog(): SEOCheckerError[] {
    return [...this.errorLog];
  }

  public clearErrorLog(): void {
    this.errorLog = [];
  }

  public getErrorStats(): { total: number; bySeverity: Record<string, number>; byContext: Record<string, number> } {
    const stats = {
      total: this.errorLog.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      byContext: {} as Record<string, number>
    };

    this.errorLog.forEach(error => {
      stats.bySeverity[error.severity]++;
      stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
    });

    return stats;
  }
}

// Error recovery implementation
export class SEOErrorRecovery implements ErrorRecovery {
  private errorHandler: SEOErrorHandler;

  constructor(errorHandler: SEOErrorHandler) {
    this.errorHandler = errorHandler;
  }

  public async retryWithBackoff(
    operation: () => Promise<any>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt);
        await this.delay(delay);

        this.errorHandler.logError(
          new SEOCheckerError(`Retry attempt ${attempt + 1}/${maxRetries}: ${(error as Error).message}`, 'Retry Logic'),
          'Error Recovery'
        );
      }
    }

    throw lastError!;
  }

  public fallbackToOfflineMode(): void {
    // Implement offline mode fallback
    this.errorHandler.logError(
      new SEOCheckerError('Switching to offline mode', 'Offline Fallback'),
      'Error Recovery'
    );

    // Disable AI features and use basic analysis only
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('seo-checker:offline-mode'));
    }
  }

  public async clearCorruptedData(): Promise<void> {
    try {
      // Clear potentially corrupted data
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.local.get();
        const corruptedKeys: string[] = [];

        // Check for corrupted data patterns
        for (const [key, value] of Object.entries(data)) {
          try {
            JSON.stringify(value);
          } catch {
            corruptedKeys.push(key);
          }
        }

        if (corruptedKeys.length > 0) {
          await chrome.storage.local.remove(corruptedKeys);
          this.errorHandler.logError(
            new SEOCheckerError(`Cleared ${corruptedKeys.length} corrupted entries`, 'Data Recovery'),
            'Error Recovery'
          );
        }
      }
    } catch (error) {
      this.errorHandler.logError(error as Error, 'Data Recovery');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const errorHandler = new SEOErrorHandler();
export const errorRecovery = new SEOErrorRecovery(errorHandler);

// Utility functions for easy error handling
export function handleError(error: Error, context: string): void {
  errorHandler.logError(error, context);
}

export function createAIError(message: string, type: AIError['type'], retryable: boolean = true): SEOAIError {
  return new SEOAIError(message, type, retryable);
}

export function createAnalysisError(message: string, type: AnalysisError['type'], url: string): SEOAnalysisError {
  return new SEOAnalysisError(message, type, url);
}

export function createStorageError(message: string, type: StorageError['type']): SEOStorageError {
  return new SEOStorageError(message, type);
}