import { SEOCheckerError } from './error-handler';

// Error logging levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

// Log entry interface
export interface LogEntry {
  id: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
  context: string;
  error?: SEOCheckerError;
  metadata?: Record<string, any>;
  stackTrace?: string;
  userAgent?: string;
  url?: string;
}

// Logger configuration
export interface LoggerConfig {
  level: LogLevel;
  maxEntries: number;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  remoteEndpoint?: string;
}

// Error logger implementation
export class ErrorLogger {
  private logs: LogEntry[] = [];
  private config: LoggerConfig;
  private logId = 0;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      maxEntries: 1000,
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      ...config
    };
  }

  public debug(message: string, context: string = 'Debug', metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, undefined, metadata);
  }

  public info(message: string, context: string = 'Info', metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, undefined, metadata);
  }

  public warn(message: string, context: string = 'Warning', metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, undefined, metadata);
  }

  public error(message: string, context: string = 'Error', error?: SEOCheckerError, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, error, metadata);
  }

  public fatal(message: string, context: string = 'Fatal', error?: SEOCheckerError, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, error, metadata);
  }

  private log(
    level: LogLevel,
    message: string,
    context: string,
    error?: SEOCheckerError,
    metadata?: Record<string, any>
  ): void {
    if (level < this.config.level) {
      return;
    }

    const entry: LogEntry = {
      id: `log_${++this.logId}_${Date.now()}`,
      timestamp: new Date(),
      level,
      message,
      context,
      error,
      metadata,
      stackTrace: error?.stack || new Error().stack,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined
    };

    this.addLogEntry(entry);
    this.processLogEntry(entry);
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);

    // Maintain log size
    if (this.logs.length > this.config.maxEntries) {
      this.logs = this.logs.slice(-this.config.maxEntries);
    }
  }

  private processLogEntry(entry: LogEntry): void {
    // Console logging
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Storage logging
    if (this.config.enableStorage) {
      this.logToStorage(entry);
    }

    // Remote logging
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      this.logToRemote(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const levelName = LogLevel[entry.level];
    const timestamp = entry.timestamp.toISOString();
    const message = `[${timestamp}] [${levelName}] ${entry.context}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.metadata);
        break;
      case LogLevel.INFO:
        console.info(message, entry.metadata);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.metadata);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.error || entry.metadata);
        if (entry.stackTrace) {
          console.error('Stack trace:', entry.stackTrace);
        }
        break;
    }
  }

  private async logToStorage(entry: LogEntry): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const key = `error_log_${entry.id}`;
        const serializedEntry = {
          ...entry,
          timestamp: entry.timestamp.toISOString(),
          error: entry.error ? {
            name: entry.error.name,
            message: entry.error.message,
            context: entry.error.context,
            severity: entry.error.severity,
            timestamp: entry.error.timestamp.toISOString()
          } : undefined
        };

        await chrome.storage.local.set({ [key]: serializedEntry });

        // Clean up old logs periodically
        if (Math.random() < 0.1) { // 10% chance
          await this.cleanupOldLogs();
        }
      }
    } catch (error) {
      console.error('Failed to log to storage:', error);
    }
  }

  private async logToRemote(entry: LogEntry): Promise<void> {
    try {
      if (!this.config.remoteEndpoint) {
        return;
      }

      const payload = {
        ...entry,
        timestamp: entry.timestamp.toISOString(),
        error: entry.error ? {
          name: entry.error.name,
          message: entry.error.message,
          context: entry.error.context,
          severity: entry.error.severity
        } : undefined
      };

      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Failed to log to remote endpoint:', error);
    }
  }

  private async cleanupOldLogs(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.local.get();
        const logKeys = Object.keys(data).filter(key => key.startsWith('error_log_'));
        
        // Keep only the most recent 100 log entries
        if (logKeys.length > 100) {
          const sortedKeys = logKeys.sort((a, b) => {
            const aTime = data[a].timestamp;
            const bTime = data[b].timestamp;
            return new Date(bTime).getTime() - new Date(aTime).getTime();
          });

          const keysToDelete = sortedKeys.slice(100);
          await chrome.storage.local.remove(keysToDelete);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  // Public methods for log management
  public getLogs(level?: LogLevel, context?: string, limit?: number): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (level !== undefined) {
      filteredLogs = filteredLogs.filter(log => log.level >= level);
    }

    if (context) {
      filteredLogs = filteredLogs.filter(log => log.context.includes(context));
    }

    if (limit) {
      filteredLogs = filteredLogs.slice(-limit);
    }

    return filteredLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  public async getStoredLogs(): Promise<LogEntry[]> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.local.get();
        const logEntries: LogEntry[] = [];

        for (const [key, value] of Object.entries(data)) {
          if (key.startsWith('error_log_')) {
            const entry = value as any;
            logEntries.push({
              ...entry,
              timestamp: new Date(entry.timestamp),
              error: entry.error ? {
                ...entry.error,
                timestamp: new Date(entry.error.timestamp)
              } as SEOCheckerError : undefined
            });
          }
        }

        return logEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      }
    } catch (error) {
      console.error('Failed to get stored logs:', error);
    }

    return [];
  }

  public clearLogs(): void {
    this.logs = [];
  }

  public async clearStoredLogs(): Promise<void> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const data = await chrome.storage.local.get();
        const logKeys = Object.keys(data).filter(key => key.startsWith('error_log_'));
        await chrome.storage.local.remove(logKeys);
      }
    } catch (error) {
      console.error('Failed to clear stored logs:', error);
    }
  }

  public getLogStats(): {
    total: number;
    byLevel: Record<string, number>;
    byContext: Record<string, number>;
    recentErrors: number;
  } {
    const stats = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byContext: {} as Record<string, number>,
      recentErrors: 0
    };

    const oneHourAgo = Date.now() - 60 * 60 * 1000;

    this.logs.forEach(log => {
      const levelName = LogLevel[log.level];
      stats.byLevel[levelName] = (stats.byLevel[levelName] || 0) + 1;
      stats.byContext[log.context] = (stats.byContext[log.context] || 0) + 1;

      if (log.timestamp.getTime() > oneHourAgo && log.level >= LogLevel.ERROR) {
        stats.recentErrors++;
      }
    });

    return stats;
  }

  public exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      return this.exportLogsAsCSV();
    } else {
      return JSON.stringify(this.logs, null, 2);
    }
  }

  private exportLogsAsCSV(): string {
    const headers = ['ID', 'Timestamp', 'Level', 'Context', 'Message', 'Error', 'URL'];
    const rows = this.logs.map(log => [
      log.id,
      log.timestamp.toISOString(),
      LogLevel[log.level],
      log.context,
      log.message,
      log.error?.message || '',
      log.url || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  public setConfig(config: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public getConfig(): LoggerConfig {
    return { ...this.config };
  }
}

// Singleton logger instance
export const logger = new ErrorLogger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableConsole: true,
  enableStorage: true,
  enableRemote: false
});

// Utility functions for easy logging
export function logDebug(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.debug(message, context, metadata);
}

export function logInfo(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.info(message, context, metadata);
}

export function logWarn(message: string, context?: string, metadata?: Record<string, any>): void {
  logger.warn(message, context, metadata);
}

export function logError(message: string, context?: string, error?: SEOCheckerError, metadata?: Record<string, any>): void {
  logger.error(message, context, error, metadata);
}

export function logFatal(message: string, context?: string, error?: SEOCheckerError, metadata?: Record<string, any>): void {
  logger.fatal(message, context, error, metadata);
}