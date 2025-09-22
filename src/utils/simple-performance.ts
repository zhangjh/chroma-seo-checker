// 简化的Chrome扩展性能监控 - 专注于核心需求
import { logger } from './error-logger';

interface SimpleMetrics {
  operation: string;
  duration: number;
  timestamp: Date;
  success: boolean;
}

class SimplePerformanceMonitor {
  private metrics: SimpleMetrics[] = [];
  private maxMetrics = 50; // 保持最近50条记录，减少内存使用

  // 简单的执行时间测量
  async measure<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      this.addMetric({
        operation,
        duration,
        timestamp: new Date(),
        success: true
      });

      // 警告慢操作（Chrome扩展应该快速响应）
      if (duration > 500) {
        logger.warn(`Slow operation: ${operation} took ${duration.toFixed(2)}ms`, 'Performance');
      }

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      this.addMetric({
        operation,
        duration,
        timestamp: new Date(),
        success: false
      });

      throw error;
    }
  }

  private addMetric(metric: SimpleMetrics): void {
    this.metrics.push(metric);
    
    // 保持最大记录数
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  // 获取简单统计
  getStats() {
    const recent = this.metrics.slice(-10); // 最近10条
    const successful = recent.filter(m => m.success);
    
    return {
      totalOperations: recent.length,
      successRate: recent.length > 0 ? (successful.length / recent.length) * 100 : 0,
      averageDuration: successful.length > 0 
        ? successful.reduce((sum, m) => sum + m.duration, 0) / successful.length 
        : 0,
      slowOperations: recent.filter(m => m.duration > 200).length
    };
  }

  // 清理旧数据
  cleanup(): void {
    this.metrics = [];
  }
}

// 单例实例
export const simpleMonitor = new SimplePerformanceMonitor();

// 工具函数
export async function measureAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  return simpleMonitor.measure(operation, fn);
}