/**
 * ContentAnalyzer - 页面分析主控制器
 * 整合各个分析器，协调页面分析和数据收集
 * 提供与Background Service Worker的通信接口
 */

import { PageAnalysis } from '../../types/analysis';
import { MetaTagsExtractor } from '../analyzers/meta-tags-extractor';
import { HeadingStructureAnalyzer } from '../analyzers/heading-structure-analyzer';
import { ContentAnalyzer as ContentAnalyzerCore } from '../analyzers/content-analyzer';
import { ImageAnalyzer } from '../analyzers/image-analyzer';
import { PerformanceAnalyzer } from '../analyzers/performance-analyzer';
import { CacheManager, CacheOptions } from './cache-manager';
import { RealtimeMonitor, MonitorOptions, ChangeEvent } from './realtime-monitor';

export interface AnalysisOptions {
  includePerformance?: boolean;
  includeImages?: boolean;
  includeContent?: boolean;
  includeMetaTags?: boolean;
  includeHeadings?: boolean;
  useCache?: boolean;
  enableRealtime?: boolean;
  forceRefresh?: boolean;
}

export interface AnalysisProgress {
  stage: string;
  progress: number;
  message: string;
}

export type AnalysisProgressCallback = (progress: AnalysisProgress) => void;

export class ContentAnalyzer {
  private document: Document;
  private currentUrl: string;
  private isAnalyzing: boolean = false;
  private abortController?: AbortController;
  private cacheManager: CacheManager;
  private realtimeMonitor: RealtimeMonitor;
  private lastAnalysis?: PageAnalysis;

  constructor(
    document: Document = window.document, 
    currentUrl: string = window.location.href,
    cacheOptions?: Partial<CacheOptions>,
    monitorOptions?: Partial<MonitorOptions>
  ) {
    this.document = document;
    this.currentUrl = currentUrl;
    this.cacheManager = new CacheManager(cacheOptions);
    this.realtimeMonitor = new RealtimeMonitor(monitorOptions);
    
    // 设置实时监控回调
    this.realtimeMonitor.addChangeCallback(this.handlePageChange.bind(this));
  }

  /**
   * 处理页面变化事件
   */
  private async handlePageChange(event: ChangeEvent): Promise<void> {
    if (!event.isSignificant) {
      return;
    }

    try {
      // 执行增量分析
      const analysis = await this.analyzePageIncremental();
      if (analysis) {
        this.lastAnalysis = analysis;
        
        // 通知Background Service Worker
        await this.sendToBackground({
          type: 'REALTIME_ANALYSIS_UPDATE',
          data: {
            analysis,
            changeEvent: event
          }
        });
      }
    } catch (error) {
      console.error('Error in realtime analysis:', error);
    }
  }

  /**
   * 执行增量分析（只分析发生变化的部分）
   */
  public async analyzePageIncremental(): Promise<PageAnalysis | null> {
    if (!this.lastAnalysis) {
      // 如果没有上次的分析结果，执行完整分析
      return this.analyzePage({ useCache: true });
    }

    try {
      // 检查哪些部分需要重新分析
      const needsUpdate = this.detectChangedSections();
      
      if (needsUpdate.length === 0) {
        return null; // 没有需要更新的部分
      }

      // 创建增量分析选项
      const incrementalOptions: AnalysisOptions = {
        includeMetaTags: needsUpdate.includes('meta'),
        includeHeadings: needsUpdate.includes('headings'),
        includeContent: needsUpdate.includes('content'),
        includeImages: needsUpdate.includes('images'),
        includePerformance: needsUpdate.includes('performance'),
        useCache: false, // 增量分析不使用缓存
        forceRefresh: true
      };

      // 执行部分分析
      const newAnalysis = await this.analyzePage(incrementalOptions);
      
      // 合并结果
      const mergedAnalysis: PageAnalysis = {
        ...this.lastAnalysis,
        ...newAnalysis,
        timestamp: new Date()
      };

      return mergedAnalysis;
    } catch (error) {
      console.error('Error in incremental analysis:', error);
      return null;
    }
  }

  /**
   * 检测哪些部分发生了变化
   */
  private detectChangedSections(): string[] {
    const changedSections: string[] = [];
    
    if (!this.lastAnalysis) {
      return ['meta', 'headings', 'content', 'images', 'performance'];
    }

    // 检查标题变化
    const currentTitle = this.extractPageTitle();
    if (currentTitle !== this.lastAnalysis.title) {
      changedSections.push('meta');
    }

    // 检查标题结构变化
    const currentHeadingCount = this.document.querySelectorAll('h1, h2, h3, h4, h5, h6').length;
    const lastHeadingCount = Object.values(this.lastAnalysis.headings).flat().length;
    if (currentHeadingCount !== lastHeadingCount) {
      changedSections.push('headings');
    }

    // 检查图片数量变化
    const currentImageCount = this.document.querySelectorAll('img').length;
    if (currentImageCount !== this.lastAnalysis.images.totalImages) {
      changedSections.push('images');
    }

    // 检查内容长度变化（简单检测）
    const currentTextLength = this.document.body?.textContent?.length || 0;
    const lastTextLength = this.lastAnalysis.content.textLength;
    const lengthDifference = Math.abs(currentTextLength - lastTextLength) / Math.max(lastTextLength, 1);
    if (lengthDifference > 0.05) { // 5%的变化
      changedSections.push('content');
    }

    return changedSections;
  }

  /**
   * 执行完整的页面分析
   */
  public async analyzePage(
    options: AnalysisOptions = {},
    progressCallback?: AnalysisProgressCallback
  ): Promise<PageAnalysis> {
    if (this.isAnalyzing) {
      throw new Error('Analysis already in progress');
    }

    this.isAnalyzing = true;
    this.abortController = new AbortController();

    try {
      const defaultOptions: AnalysisOptions = {
        includePerformance: true,
        includeImages: true,
        includeContent: true,
        includeMetaTags: true,
        includeHeadings: true,
        useCache: true,
        enableRealtime: false,
        forceRefresh: false,
        ...options
      };

      // 检查缓存
      if (defaultOptions.useCache && !defaultOptions.forceRefresh) {
        const cachedResult = this.cacheManager.get(this.currentUrl, this.document);
        if (cachedResult) {
          this.lastAnalysis = cachedResult;
          
          if (progressCallback) {
            progressCallback({
              stage: 'cache',
              progress: 100,
              message: '从缓存加载分析结果'
            });
          }
          
          return cachedResult;
        }
      }

      const analysis: Partial<PageAnalysis> = {
        url: this.currentUrl,
        title: this.extractPageTitle(),
        timestamp: new Date()
      };

      const totalStages = Object.values(defaultOptions).filter(Boolean).length;
      let currentStage = 0;

      // 分析元数据
      if (defaultOptions.includeMetaTags) {
        this.reportProgress(progressCallback, {
          stage: 'meta-tags',
          progress: (currentStage / totalStages) * 100,
          message: '正在分析页面元数据...'
        });

        analysis.metaTags = await this.analyzeMetaTags();
        currentStage++;
      }

      // 分析标题结构
      if (defaultOptions.includeHeadings) {
        this.reportProgress(progressCallback, {
          stage: 'headings',
          progress: (currentStage / totalStages) * 100,
          message: '正在分析标题结构...'
        });

        analysis.headings = await this.analyzeHeadingStructure();
        currentStage++;
      }

      // 分析内容
      if (defaultOptions.includeContent) {
        this.reportProgress(progressCallback, {
          stage: 'content',
          progress: (currentStage / totalStages) * 100,
          message: '正在分析页面内容...'
        });

        analysis.content = await this.analyzeContent();
        currentStage++;
      }

      // 分析图片
      if (defaultOptions.includeImages) {
        this.reportProgress(progressCallback, {
          stage: 'images',
          progress: (currentStage / totalStages) * 100,
          message: '正在分析页面图片...'
        });

        analysis.images = await this.analyzeImages();
        currentStage++;
      }

      // 分析性能
      if (defaultOptions.includePerformance) {
        this.reportProgress(progressCallback, {
          stage: 'performance',
          progress: (currentStage / totalStages) * 100,
          message: '正在分析页面性能...'
        });

        analysis.performance = await this.analyzePerformance();
        currentStage++;
      }

      this.reportProgress(progressCallback, {
        stage: 'complete',
        progress: 100,
        message: '分析完成'
      });

      const finalAnalysis = analysis as PageAnalysis;
      
      // 缓存结果
      if (defaultOptions.useCache) {
        this.cacheManager.set(this.currentUrl, finalAnalysis, this.document);
      }
      
      // 保存最后的分析结果
      this.lastAnalysis = finalAnalysis;
      
      // 启用实时监控
      if (defaultOptions.enableRealtime && !this.realtimeMonitor.monitoring) {
        this.realtimeMonitor.startMonitoring();
      }

      return finalAnalysis;

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        const cancelError = new Error('Analysis was cancelled');
        cancelError.name = 'AbortError';
        throw cancelError;
      }
      throw error;
    } finally {
      this.isAnalyzing = false;
      this.abortController = undefined;
    }
  }

  /**
   * 取消当前分析
   */
  public cancelAnalysis(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * 检查是否正在分析
   */
  public get analyzing(): boolean {
    return this.isAnalyzing;
  }

  /**
   * 分析页面元数据
   */
  private async analyzeMetaTags() {
    this.checkAborted();
    const extractor = new MetaTagsExtractor(this.document);
    return extractor.extractMetaTags();
  }

  /**
   * 分析标题结构
   */
  private async analyzeHeadingStructure() {
    this.checkAborted();
    const analyzer = new HeadingStructureAnalyzer(this.document);
    return analyzer.analyzeHeadingStructure();
  }

  /**
   * 分析页面内容
   */
  private async analyzeContent() {
    this.checkAborted();
    const analyzer = new ContentAnalyzerCore(this.document, this.currentUrl);
    return analyzer.analyzeContent();
  }

  /**
   * 分析页面图片
   */
  private async analyzeImages() {
    this.checkAborted();
    const analyzer = new ImageAnalyzer(this.document);
    return await analyzer.analyzeImages();
  }

  /**
   * 分析页面性能
   */
  private async analyzePerformance() {
    this.checkAborted();
    const analyzer = new PerformanceAnalyzer(this.document);
    return analyzer.analyzePerformance();
  }

  /**
   * 提取页面标题
   */
  private extractPageTitle(): string {
    const titleElement = this.document.querySelector('title');
    return titleElement?.textContent?.trim() || '';
  }

  /**
   * 检查是否被取消
   */
  private checkAborted(): void {
    if (this.abortController?.signal.aborted) {
      const error = new Error('Analysis was cancelled');
      error.name = 'AbortError';
      throw error;
    }
  }

  /**
   * 报告分析进度
   */
  private reportProgress(
    callback: AnalysisProgressCallback | undefined,
    progress: AnalysisProgress
  ): void {
    if (callback) {
      callback(progress);
    }
  }

  /**
   * 发送消息到Background Service Worker
   */
  public async sendToBackground(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
        chrome.runtime.sendMessage(message, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      } else {
        reject(new Error('Chrome runtime not available'));
      }
    });
  }

  /**
   * 发送分析结果到Background Service Worker
   */
  public async sendAnalysisToBackground(analysis: PageAnalysis): Promise<void> {
    try {
      await this.sendToBackground({
        type: 'ANALYSIS_COMPLETE',
        data: analysis
      });
    } catch (error) {
      console.error('Failed to send analysis to background:', error);
      throw error;
    }
  }

  /**
   * 请求AI建议
   */
  public async requestAISuggestions(analysis: PageAnalysis): Promise<any> {
    try {
      const response = await this.sendToBackground({
        type: 'REQUEST_AI_SUGGESTIONS',
        data: analysis
      });
      return response;
    } catch (error) {
      console.error('Failed to request AI suggestions:', error);
      throw error;
    }
  }

  /**
   * 监听来自Background的消息
   */
  public setupMessageListener(): void {
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        this.handleBackgroundMessage(message, sender, sendResponse);
        return true; // 保持消息通道开放
      });
    }
  }

  /**
   * 处理来自Background的消息
   */
  private handleBackgroundMessage(message: any, sender: any, sendResponse: (response: any) => void): void {
    switch (message.type) {
      case 'START_ANALYSIS':
        this.handleStartAnalysisMessage(message.data, sendResponse);
        break;
      
      case 'CANCEL_ANALYSIS':
        this.handleCancelAnalysisMessage(sendResponse);
        break;
      
      case 'GET_ANALYSIS_STATUS':
        this.handleGetAnalysisStatusMessage(sendResponse);
        break;
      
      default:
        sendResponse({ error: 'Unknown message type' });
    }
  }

  /**
   * 处理开始分析消息
   */
  private async handleStartAnalysisMessage(data: any, sendResponse: (response: any) => void): Promise<void> {
    try {
      const options = data?.options || {};
      const analysis = await this.analyzePage(options, (progress) => {
        // 发送进度更新到Background
        this.sendToBackground({
          type: 'ANALYSIS_PROGRESS',
          data: progress
        }).catch(console.error);
      });

      await this.sendAnalysisToBackground(analysis);
      sendResponse({ success: true, data: analysis });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  /**
   * 处理取消分析消息
   */
  private handleCancelAnalysisMessage(sendResponse: (response: any) => void): void {
    try {
      this.cancelAnalysis();
      sendResponse({ success: true });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      sendResponse({ success: false, error: errorMessage });
    }
  }

  /**
   * 处理获取分析状态消息
   */
  private handleGetAnalysisStatusMessage(sendResponse: (response: any) => void): void {
    sendResponse({
      success: true,
      data: {
        analyzing: this.analyzing,
        url: this.currentUrl
      }
    });
  }

  /**
   * 初始化Content Analyzer
   */
  public initialize(): void {
    this.setupMessageListener();
    
    // 通知Background Service Worker页面已准备就绪
    this.sendToBackground({
      type: 'CONTENT_READY',
      data: {
        url: this.currentUrl,
        title: this.extractPageTitle()
      }
    }).catch(console.error);
  }

  /**
   * 启用实时监控
   */
  public enableRealtimeMonitoring(): void {
    if (!this.realtimeMonitor.monitoring) {
      this.realtimeMonitor.startMonitoring();
    }
  }

  /**
   * 禁用实时监控
   */
  public disableRealtimeMonitoring(): void {
    if (this.realtimeMonitor.monitoring) {
      this.realtimeMonitor.stopMonitoring();
    }
  }

  /**
   * 获取缓存统计信息
   */
  public getCacheStats() {
    return this.cacheManager.getStats();
  }

  /**
   * 清空缓存
   */
  public clearCache(): void {
    this.cacheManager.clear();
  }

  /**
   * 获取实时监控状态
   */
  public get realtimeMonitoring(): boolean {
    return this.realtimeMonitor.monitoring;
  }

  /**
   * 手动触发变化检测
   */
  public triggerChangeDetection(): void {
    this.realtimeMonitor.triggerChangeDetection();
  }

  /**
   * 更新缓存配置
   */
  public updateCacheOptions(options: Partial<CacheOptions>): void {
    this.cacheManager.updateOptions(options);
  }

  /**
   * 更新监控配置
   */
  public updateMonitorOptions(options: Partial<MonitorOptions>): void {
    this.realtimeMonitor.updateOptions(options);
  }

  /**
   * 获取最后的分析结果
   */
  public getLastAnalysis(): PageAnalysis | undefined {
    return this.lastAnalysis;
  }

  /**
   * 预热缓存
   */
  public async preloadCache(urls: string[]): Promise<void> {
    await this.cacheManager.preload(urls);
  }

  /**
   * 导出缓存数据
   */
  public exportCache() {
    return this.cacheManager.export();
  }

  /**
   * 导入缓存数据
   */
  public importCache(data: any): void {
    this.cacheManager.import(data);
  }

  /**
   * 清理资源
   */
  public cleanup(): void {
    if (this.isAnalyzing) {
      this.cancelAnalysis();
      this.isAnalyzing = false;
    }
    
    // 停止实时监控
    this.disableRealtimeMonitoring();
    
    // 清理缓存（可选）
    // this.clearCache();
  }
}