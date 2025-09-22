/**
 * CacheManager - 分析结果缓存管理器
 * 实现本地缓存机制，提升分析性能
 */

import { PageAnalysis } from '../../types/analysis';

export interface CacheEntry {
  data: PageAnalysis;
  timestamp: Date;
  hash: string; // 页面内容哈希值
  ttl: number; // 缓存生存时间（毫秒）
}

export interface CacheOptions {
  maxSize: number; // 最大缓存条目数
  defaultTTL: number; // 默认缓存时间（毫秒）
  enableCompression: boolean; // 是否启用压缩
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  totalMemoryUsage: number;
}

export class CacheManager {
  private cache: Map<string, CacheEntry> = new Map();
  private options: CacheOptions;
  private stats = {
    hits: 0,
    misses: 0
  };

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = {
      maxSize: 50,
      defaultTTL: 5 * 60 * 1000, // 5分钟
      enableCompression: false,
      ...options
    };
  }

  /**
   * 生成页面内容哈希值
   */
  private generatePageHash(document: Document): string {
    // 提取关键内容用于生成哈希
    const title = document.title || '';
    const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .map(h => h.textContent?.trim())
      .filter(Boolean)
      .join('|');
    
    const bodyText = document.body?.textContent?.trim().substring(0, 1000) || '';
    
    const content = `${title}|${metaDescription}|${headings}|${bodyText}`;
    
    // 简单哈希算法
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(url: string): string {
    // 移除查询参数和片段标识符，只保留路径
    try {
      const urlObj = new URL(url);
      return `${urlObj.origin}${urlObj.pathname}`;
    } catch {
      return url;
    }
  }

  /**
   * 检查缓存条目是否过期
   */
  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const entryTime = entry.timestamp.getTime();
    return (now - entryTime) > entry.ttl;
  }

  /**
   * 清理过期的缓存条目
   */
  private cleanupExpired(): void {
    const expiredKeys: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.cache.delete(key));
  }

  /**
   * 确保缓存大小不超过限制
   */
  private enforceMaxSize(): void {
    if (this.cache.size <= this.options.maxSize) {
      return;
    }

    // 按时间戳排序，删除最旧的条目
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
    
    const toDelete = entries.slice(0, this.cache.size - this.options.maxSize);
    toDelete.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * 压缩数据（如果启用）
   */
  private compressData(data: PageAnalysis): PageAnalysis {
    if (!this.options.enableCompression) {
      return data;
    }

    // 简单的数据压缩：移除不必要的字段
    const compressed = { ...data };
    
    // 压缩内容分析中的详细数据
    if (compressed.content) {
      compressed.content = {
        ...compressed.content,
        keywordDensity: Object.fromEntries(
          Object.entries(compressed.content.keywordDensity)
            .filter(([, density]) => density > 0.01) // 只保留密度大于1%的关键词
            .slice(0, 20) // 最多保留20个关键词
        )
      };
    }

    return compressed;
  }

  /**
   * 获取缓存的分析结果
   */
  public get(url: string, document: Document): PageAnalysis | null {
    this.cleanupExpired();
    
    const key = this.generateCacheKey(url);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // 检查页面内容是否发生变化
    const currentHash = this.generatePageHash(document);
    if (entry.hash !== currentHash) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * 缓存分析结果
   */
  public set(url: string, data: PageAnalysis, document: Document, ttl?: number): void {
    const key = this.generateCacheKey(url);
    const hash = this.generatePageHash(document);
    const compressedData = this.compressData(data);
    
    const entry: CacheEntry = {
      data: compressedData,
      timestamp: new Date(),
      hash,
      ttl: ttl || this.options.defaultTTL
    };

    this.cache.set(key, entry);
    this.enforceMaxSize();
  }

  /**
   * 检查是否有缓存
   */
  public has(url: string, document: Document): boolean {
    return this.get(url, document) !== null;
  }

  /**
   * 删除特定URL的缓存
   */
  public delete(url: string): boolean {
    const key = this.generateCacheKey(url);
    return this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  public clear(): void {
    this.cache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
  }

  /**
   * 获取缓存统计信息
   */
  public getStats(): CacheStats {
    this.cleanupExpired();
    
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;
    
    // 估算内存使用量
    let totalMemoryUsage = 0;
    for (const entry of this.cache.values()) {
      // 粗略估算每个条目的内存使用量
      const jsonString = JSON.stringify(entry.data);
      totalMemoryUsage += jsonString.length * 2; // 假设每个字符占用2字节
    }

    return {
      size: this.cache.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: Math.round(hitRate * 100) / 100,
      totalMemoryUsage
    };
  }

  /**
   * 预热缓存（可选功能）
   */
  public async preload(urls: string[]): Promise<void> {
    // 这个方法可以在后台预加载常用页面的分析结果
    // 实际实现需要配合ContentAnalyzer
    console.log('Cache preload requested for URLs:', urls);
  }

  /**
   * 导出缓存数据
   */
  public export(): Record<string, CacheEntry> {
    const exported: Record<string, CacheEntry> = {};
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isExpired(entry)) {
        exported[key] = entry;
      }
    }
    return exported;
  }

  /**
   * 导入缓存数据
   */
  public import(data: Record<string, CacheEntry>): void {
    this.clear();
    
    for (const [key, entry] of Object.entries(data)) {
      if (!this.isExpired(entry)) {
        this.cache.set(key, entry);
      }
    }
    
    this.enforceMaxSize();
  }

  /**
   * 获取缓存配置
   */
  public getOptions(): CacheOptions {
    return { ...this.options };
  }

  /**
   * 更新缓存配置
   */
  public updateOptions(newOptions: Partial<CacheOptions>): void {
    this.options = { ...this.options, ...newOptions };
    this.enforceMaxSize();
  }
}