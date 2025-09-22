/**
 * RealtimeMonitor - 实时页面变化监控器
 * 监听页面变化并触发增量分析
 */

import { PageAnalysis } from '../../types/analysis';

export interface MonitorOptions {
  debounceDelay: number; // 防抖延迟（毫秒）
  throttleDelay: number; // 节流延迟（毫秒）
  enableMutationObserver: boolean; // 是否启用DOM变化监听
  enableScrollMonitor: boolean; // 是否启用滚动监听
  enableResizeMonitor: boolean; // 是否启用窗口大小变化监听
  significantChangeThreshold: number; // 显著变化阈值（0-1）
}

export interface ChangeEvent {
  type: 'dom' | 'scroll' | 'resize' | 'navigation';
  timestamp: Date;
  details: any;
  isSignificant: boolean;
}

export type ChangeCallback = (event: ChangeEvent) => void;

export class RealtimeMonitor {
  private options: MonitorOptions;
  private mutationObserver?: MutationObserver;
  private isMonitoring: boolean = false;
  private changeCallbacks: Set<ChangeCallback> = new Set();
  
  // 防抖和节流相关
  private debounceTimer?: number;
  private throttleTimer?: number;
  private lastThrottleTime: number = 0;
  
  // 页面状态跟踪
  private lastSnapshot: PageSnapshot;
  private changeBuffer: ChangeEvent[] = [];

  constructor(options: Partial<MonitorOptions> = {}) {
    this.options = {
      debounceDelay: 1000, // 1秒防抖
      throttleDelay: 500, // 500毫秒节流
      enableMutationObserver: true,
      enableScrollMonitor: false, // 默认关闭滚动监听以节省性能
      enableResizeMonitor: true,
      significantChangeThreshold: 0.1, // 10%的变化被认为是显著的
      ...options
    };

    this.lastSnapshot = this.createPageSnapshot();
  }

  /**
   * 创建页面快照
   */
  private createPageSnapshot(): PageSnapshot {
    const document = window.document;
    
    return {
      title: document.title,
      metaDescription: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      imageCount: document.querySelectorAll('img').length,
      linkCount: document.querySelectorAll('a[href]').length,
      textLength: document.body?.textContent?.length || 0,
      htmlLength: document.documentElement.outerHTML.length,
      timestamp: new Date()
    };
  }

  /**
   * 计算页面变化程度
   */
  private calculateChangeSignificance(oldSnapshot: PageSnapshot, newSnapshot: PageSnapshot): number {
    let totalChanges = 0;
    let maxPossibleChanges = 0;

    // 标题变化
    if (oldSnapshot.title !== newSnapshot.title) {
      totalChanges += 1;
    }
    maxPossibleChanges += 1;

    // Meta描述变化
    if (oldSnapshot.metaDescription !== newSnapshot.metaDescription) {
      totalChanges += 1;
    }
    maxPossibleChanges += 1;

    // 结构变化（标题、图片、链接数量）
    const headingChange = Math.abs(oldSnapshot.headingCount - newSnapshot.headingCount) / Math.max(oldSnapshot.headingCount, 1);
    const imageChange = Math.abs(oldSnapshot.imageCount - newSnapshot.imageCount) / Math.max(oldSnapshot.imageCount, 1);
    const linkChange = Math.abs(oldSnapshot.linkCount - newSnapshot.linkCount) / Math.max(oldSnapshot.linkCount, 1);
    
    totalChanges += Math.min(headingChange, 1) + Math.min(imageChange, 1) + Math.min(linkChange, 1);
    maxPossibleChanges += 3;

    // 内容长度变化
    const textLengthChange = Math.abs(oldSnapshot.textLength - newSnapshot.textLength) / Math.max(oldSnapshot.textLength, 1);
    const htmlLengthChange = Math.abs(oldSnapshot.htmlLength - newSnapshot.htmlLength) / Math.max(oldSnapshot.htmlLength, 1);
    
    totalChanges += Math.min(textLengthChange, 1) + Math.min(htmlLengthChange, 1);
    maxPossibleChanges += 2;

    return maxPossibleChanges > 0 ? totalChanges / maxPossibleChanges : 0;
  }

  /**
   * 处理DOM变化
   */
  private handleMutationChanges = (mutations: MutationRecord[]): void => {
    const changeDetails = {
      mutationCount: mutations.length,
      addedNodes: 0,
      removedNodes: 0,
      attributeChanges: 0,
      textChanges: 0
    };

    mutations.forEach(mutation => {
      switch (mutation.type) {
        case 'childList':
          changeDetails.addedNodes += mutation.addedNodes.length;
          changeDetails.removedNodes += mutation.removedNodes.length;
          break;
        case 'attributes':
          changeDetails.attributeChanges++;
          break;
        case 'characterData':
          changeDetails.textChanges++;
          break;
      }
    });

    const newSnapshot = this.createPageSnapshot();
    const significance = this.calculateChangeSignificance(this.lastSnapshot, newSnapshot);
    const isSignificant = significance >= this.options.significantChangeThreshold;

    const event: ChangeEvent = {
      type: 'dom',
      timestamp: new Date(),
      details: changeDetails,
      isSignificant
    };

    this.lastSnapshot = newSnapshot;
    this.processChange(event);
  };

  /**
   * 处理滚动变化
   */
  private handleScrollChange = (): void => {
    const event: ChangeEvent = {
      type: 'scroll',
      timestamp: new Date(),
      details: {
        scrollY: window.scrollY,
        scrollX: window.scrollX
      },
      isSignificant: false // 滚动通常不被认为是显著变化
    };

    this.processChange(event);
  };

  /**
   * 处理窗口大小变化
   */
  private handleResizeChange = (): void => {
    const event: ChangeEvent = {
      type: 'resize',
      timestamp: new Date(),
      details: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      isSignificant: true // 窗口大小变化可能影响布局分析
    };

    this.processChange(event);
  };

  /**
   * 处理导航变化
   */
  private handleNavigationChange = (): void => {
    const event: ChangeEvent = {
      type: 'navigation',
      timestamp: new Date(),
      details: {
        url: window.location.href,
        pathname: window.location.pathname
      },
      isSignificant: true // 导航变化总是显著的
    };

    this.lastSnapshot = this.createPageSnapshot();
    this.processChange(event);
  };

  /**
   * 处理变化事件（应用防抖和节流）
   */
  private processChange(event: ChangeEvent): void {
    this.changeBuffer.push(event);

    // 清除之前的防抖定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 节流逻辑：如果距离上次触发时间不足，则跳过
    const now = Date.now();
    if (now - this.lastThrottleTime < this.options.throttleDelay) {
      // 设置防抖定时器，确保最终会触发
      this.debounceTimer = window.setTimeout(() => {
        this.flushChanges();
      }, this.options.debounceDelay);
      return;
    }

    // 立即处理显著变化
    if (event.isSignificant) {
      this.flushChanges();
      this.lastThrottleTime = now;
    } else {
      // 对于非显著变化，使用防抖
      this.debounceTimer = window.setTimeout(() => {
        this.flushChanges();
      }, this.options.debounceDelay);
    }
  }

  /**
   * 刷新变化缓冲区，通知所有回调
   */
  private flushChanges(): void {
    if (this.changeBuffer.length === 0) {
      return;
    }

    // 合并缓冲区中的事件
    const significantChanges = this.changeBuffer.filter(e => e.isSignificant);
    const hasSignificantChanges = significantChanges.length > 0;

    // 创建合并事件
    const mergedEvent: ChangeEvent = {
      type: hasSignificantChanges ? significantChanges[0].type : this.changeBuffer[0].type,
      timestamp: new Date(),
      details: {
        eventCount: this.changeBuffer.length,
        significantCount: significantChanges.length,
        events: this.changeBuffer.map(e => ({
          type: e.type,
          timestamp: e.timestamp,
          isSignificant: e.isSignificant
        }))
      },
      isSignificant: hasSignificantChanges
    };

    // 通知所有回调
    this.changeCallbacks.forEach(callback => {
      try {
        callback(mergedEvent);
      } catch (error) {
        console.error('Error in change callback:', error);
      }
    });

    // 清空缓冲区
    this.changeBuffer = [];
  }

  /**
   * 开始监控
   */
  public startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // 设置DOM变化监听
    if (this.options.enableMutationObserver) {
      this.mutationObserver = new MutationObserver(this.handleMutationChanges);
      this.mutationObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeOldValue: false,
        characterData: true,
        characterDataOldValue: false
      });
    }

    // 设置滚动监听
    if (this.options.enableScrollMonitor) {
      window.addEventListener('scroll', this.handleScrollChange, { passive: true });
    }

    // 设置窗口大小变化监听
    if (this.options.enableResizeMonitor) {
      window.addEventListener('resize', this.handleResizeChange, { passive: true });
    }

    // 设置导航变化监听
    window.addEventListener('popstate', this.handleNavigationChange);
    
    // 监听pushState和replaceState（用于SPA导航）
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    
    history.pushState = (...args) => {
      originalPushState.apply(history, args);
      this.handleNavigationChange();
    };
    
    history.replaceState = (...args) => {
      originalReplaceState.apply(history, args);
      this.handleNavigationChange();
    };
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // 清理定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = undefined;
    }

    // 停止DOM变化监听
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }

    // 移除事件监听器
    window.removeEventListener('scroll', this.handleScrollChange);
    window.removeEventListener('resize', this.handleResizeChange);
    window.removeEventListener('popstate', this.handleNavigationChange);

    // 刷新剩余的变化
    this.flushChanges();
  }

  /**
   * 添加变化回调
   */
  public addChangeCallback(callback: ChangeCallback): void {
    this.changeCallbacks.add(callback);
  }

  /**
   * 移除变化回调
   */
  public removeChangeCallback(callback: ChangeCallback): void {
    this.changeCallbacks.delete(callback);
  }

  /**
   * 获取监控状态
   */
  public get monitoring(): boolean {
    return this.isMonitoring;
  }

  /**
   * 获取当前配置
   */
  public getOptions(): MonitorOptions {
    return { ...this.options };
  }

  /**
   * 更新配置
   */
  public updateOptions(newOptions: Partial<MonitorOptions>): void {
    const wasMonitoring = this.isMonitoring;
    
    if (wasMonitoring) {
      this.stopMonitoring();
    }
    
    this.options = { ...this.options, ...newOptions };
    
    if (wasMonitoring) {
      this.startMonitoring();
    }
  }

  /**
   * 手动触发变化检测
   */
  public triggerChangeDetection(): void {
    const newSnapshot = this.createPageSnapshot();
    const significance = this.calculateChangeSignificance(this.lastSnapshot, newSnapshot);
    
    const event: ChangeEvent = {
      type: 'dom',
      timestamp: new Date(),
      details: {
        manual: true,
        significance
      },
      isSignificant: significance >= this.options.significantChangeThreshold
    };

    this.lastSnapshot = newSnapshot;
    this.processChange(event);
  }

  /**
   * 获取页面快照
   */
  public getPageSnapshot(): PageSnapshot {
    return { ...this.lastSnapshot };
  }
}

interface PageSnapshot {
  title: string;
  metaDescription: string;
  headingCount: number;
  imageCount: number;
  linkCount: number;
  textLength: number;
  htmlLength: number;
  timestamp: Date;
}