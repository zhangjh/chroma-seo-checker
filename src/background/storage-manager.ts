import { SEOReport } from '../../types/seo';
import { PageAnalysis } from '../../types/analysis';

/**
 * StorageManager handles all Chrome Storage API operations for SEO reports and batch results
 */
export class StorageManager {
  private static readonly STORAGE_KEYS = {
    REPORTS: 'seo_reports',
    SETTINGS: 'seo_settings',
    CACHE: 'seo_cache'
  } as const;

  private static readonly MAX_REPORTS = 100;
  private static readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Save an SEO report to storage
   */
  async saveReport(report: SEOReport): Promise<void> {
    try {
      const reports = await this.getAllReports();
      
      // Remove existing report for the same URL if it exists
      const filteredReports = reports.filter(r => r.url !== report.url);
      
      // Add new report at the beginning
      filteredReports.unshift(report);
      
      // Keep only the most recent MAX_REPORTS
      const trimmedReports = filteredReports.slice(0, StorageManager.MAX_REPORTS);
      
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.REPORTS]: trimmedReports
      });
    } catch (error) {
      throw new Error(`Failed to save SEO report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all stored SEO reports
   */
  async getAllReports(): Promise<SEOReport[]> {
    try {
      const result = await chrome.storage.local.get(StorageManager.STORAGE_KEYS.REPORTS);
      return result[StorageManager.STORAGE_KEYS.REPORTS] || [];
    } catch (error) {
      throw new Error(`Failed to retrieve SEO reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get SEO report by URL
   */
  async getReportByUrl(url: string): Promise<SEOReport | null> {
    try {
      const reports = await this.getAllReports();
      return reports.find(report => report.url === url) || null;
    } catch (error) {
      throw new Error(`Failed to retrieve SEO report for URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get SEO report by ID
   */
  async getReportById(id: string): Promise<SEOReport | null> {
    try {
      const reports = await this.getAllReports();
      return reports.find(report => report.id === id) || null;
    } catch (error) {
      throw new Error(`Failed to retrieve SEO report with ID ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete SEO report by ID
   */
  async deleteReport(id: string): Promise<boolean> {
    try {
      const reports = await this.getAllReports();
      const filteredReports = reports.filter(report => report.id !== id);
      
      if (filteredReports.length === reports.length) {
        return false; // Report not found
      }
      
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.REPORTS]: filteredReports
      });
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete SEO report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete SEO report by URL
   */
  async deleteReportByUrl(url: string): Promise<boolean> {
    try {
      const reports = await this.getAllReports();
      const filteredReports = reports.filter(report => report.url !== url);
      
      if (filteredReports.length === reports.length) {
        return false; // Report not found
      }
      
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.REPORTS]: filteredReports
      });
      
      return true;
    } catch (error) {
      throw new Error(`Failed to delete SEO report for URL ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all SEO reports
   */
  async clearAllReports(): Promise<void> {
    try {
      await chrome.storage.local.set({
        [StorageManager.STORAGE_KEYS.REPORTS]: []
      });
    } catch (error) {
      throw new Error(`Failed to clear SEO reports: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }



  /**
   * Cache management for temporary data
   */

  /**
   * Cache page analysis results temporarily
   */
  async cachePageAnalysis(url: string, analysis: PageAnalysis): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(url);
      const cacheData = {
        data: analysis,
        timestamp: Date.now(),
        expiresAt: Date.now() + StorageManager.CACHE_EXPIRY_MS
      };
      
      await chrome.storage.local.set({
        [cacheKey]: cacheData
      });
    } catch (error) {
      throw new Error(`Failed to cache page analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get cached page analysis if not expired
   */
  async getCachedPageAnalysis(url: string): Promise<PageAnalysis | null> {
    try {
      const cacheKey = this.getCacheKey(url);
      const result = await chrome.storage.local.get(cacheKey);
      const cacheData = result[cacheKey];
      
      if (!cacheData) {
        return null;
      }
      
      // Check if cache has expired
      if (Date.now() > cacheData.expiresAt) {
        await chrome.storage.local.remove(cacheKey);
        return null;
      }
      
      return cacheData.data;
    } catch (error) {
      throw new Error(`Failed to retrieve cached page analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    try {
      const allData = await chrome.storage.local.get();
      const keysToRemove: string[] = [];
      
      for (const [key, value] of Object.entries(allData)) {
        if (key.startsWith('seo_cache_') && value && typeof value === 'object' && 'expiresAt' in value) {
          if (Date.now() > (value as any).expiresAt) {
            keysToRemove.push(key);
          }
        }
      }
      
      if (keysToRemove.length > 0) {
        await chrome.storage.local.remove(keysToRemove);
      }
    } catch (error) {
      throw new Error(`Failed to clear expired cache: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get storage usage statistics
   */
  async getStorageStats(): Promise<StorageStats> {
    try {
      const reports = await this.getAllReports();
      const allData = await chrome.storage.local.get();
      
      // Calculate storage usage
      const dataSize = JSON.stringify(allData).length;
      const maxSize = chrome.storage.local.QUOTA_BYTES || 5242880; // 5MB default
      
      return {
        reportsCount: reports.length,
        totalSize: dataSize,
        maxSize: maxSize,
        usagePercentage: (dataSize / maxSize) * 100,
        cacheEntries: Object.keys(allData).filter(key => key.startsWith('seo_cache_')).length
      };
    } catch (error) {
      throw new Error(`Failed to get storage statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Export all data for backup
   */
  async exportAllData(): Promise<ExportData> {
    try {
      const reports = await this.getAllReports();
      
      return {
        reports,
        exportedAt: new Date(),
        version: '1.0'
      };
    } catch (error) {
      throw new Error(`Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Import data from backup
   */
  async importData(data: ExportData): Promise<void> {
    try {
      if (data.reports && Array.isArray(data.reports)) {
        await chrome.storage.local.set({
          [StorageManager.STORAGE_KEYS.REPORTS]: data.reports.slice(0, StorageManager.MAX_REPORTS)
        });
      }
    } catch (error) {
      throw new Error(`Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Clear all stored data
   */
  async clearAllData(): Promise<void> {
    try {
      await chrome.storage.local.clear();
    } catch (error) {
      throw new Error(`Failed to clear all data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Private helper methods
   */
  private getCacheKey(url: string): string {
    return `seo_cache_${this.hashUrl(url)}`;
  }

  private hashUrl(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

/**
 * Supporting interfaces for storage management
 */
export interface StorageStats {
  reportsCount: number;
  totalSize: number;
  maxSize: number;
  usagePercentage: number;
  cacheEntries: number;
}

export interface ExportData {
  reports: SEOReport[];
  exportedAt: Date;
  version: string;
}