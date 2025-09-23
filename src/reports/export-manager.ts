import { ReportGenerator, JSONReportData, PDFReportData, JSONReportOptions, PDFReportOptions } from './report-generator';
import { SEOReport } from '../../types/seo';

/**
 * ExportManager handles the export and sharing of SEO reports
 * Supports local downloads, data sanitization, and privacy protection
 */
export class ExportManager {
  private reportGenerator: ReportGenerator;
  
  constructor() {
    this.reportGenerator = new ReportGenerator();
  }

  /**
   * Export report as JSON file for download
   */
  async exportJSONReport(
    report: SEOReport, 
    options: JSONReportOptions = {},
    sanitize: boolean = true
  ): Promise<void> {
    try {
      const sanitizedReport = sanitize ? this.sanitizeReport(report) : report;
      const jsonData = await this.reportGenerator.generateJSONReport(sanitizedReport, options);
      
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { 
        type: 'application/json' 
      });
      
      const filename = `seo-report-${report.url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.json`;
      await this.downloadFile(blob, filename);
    } catch (error) {
      console.error('Failed to export JSON report:', error);
      throw new Error('导出JSON报告失败');
    }
  }

  /**
   * Export report as PDF file for download
   */
  async exportPDFReport(
    report: SEOReport, 
    options: PDFReportOptions = {},
    sanitize: boolean = true
  ): Promise<void> {
    try {
      const sanitizedReport = sanitize ? this.sanitizeReport(report) : report;
      const pdfData = await this.reportGenerator.generatePDFReport(sanitizedReport, options);
      
      const blob = pdfData.blob;
      
      const filename = `seo-report-${report.url.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
      await this.downloadFile(blob, filename);
    } catch (error) {
      console.error('Failed to export PDF report:', error);
      throw new Error('导出PDF报告失败');
    }
  }



  /**
   * Generate shareable link for report (placeholder for future implementation)
   */
  async generateShareableLink(report: SEOReport): Promise<string> {
    // This would require a backend service to store and serve reports
    // For now, return a placeholder
    console.warn('Shareable links not implemented - requires backend service');
    throw new Error('分享链接功能需要后端服务支持');
  }

  /**
   * Sanitize report data for privacy protection
   */
  private sanitizeReport(report: SEOReport): SEOReport {
    const sanitized = { ...report };
    
    // Remove or mask sensitive information
    if (sanitized.url) {
      // Keep domain but remove query parameters and paths that might contain sensitive data
      try {
        const url = new URL(sanitized.url);
        sanitized.url = `${url.protocol}//${url.hostname}${url.pathname}`;
      } catch {
        // If URL parsing fails, just remove query parameters
        sanitized.url = sanitized.url.split('?')[0];
      }
    }
    
    // Sanitize issues that might contain sensitive content
    if (sanitized.issues) {
      sanitized.issues = sanitized.issues.map(issue => ({
        ...issue,
        description: this.sanitizeText(issue.description),
        recommendation: this.sanitizeText(issue.recommendation)
      }));
    }
    
    // Sanitize AI suggestions
    if (sanitized.suggestions) {
      sanitized.suggestions = {
        ...sanitized.suggestions,
        titleOptimization: this.sanitizeText(sanitized.suggestions.titleOptimization),
        metaDescriptionSuggestion: this.sanitizeText(sanitized.suggestions.metaDescriptionSuggestion),
        contentImprovements: sanitized.suggestions.contentImprovements.map(improvement => 
          this.sanitizeText(improvement)
        ),
        keywordSuggestions: sanitized.suggestions.keywordSuggestions.map(keyword => 
          this.sanitizeText(keyword)
        ),
        structureRecommendations: sanitized.suggestions.structureRecommendations.map(rec => 
          this.sanitizeText(rec)
        )
      };
    }
    
    return sanitized;
  }



  /**
   * Sanitize text content to remove potential sensitive information
   */
  private sanitizeText(text: string): string {
    if (!text) return text;
    
    // Remove email addresses
    text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[email]');
    
    // Remove phone numbers (basic pattern)
    text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[phone]');
    
    // Remove potential API keys or tokens (long alphanumeric strings)
    text = text.replace(/\b[A-Za-z0-9]{32,}\b/g, '[token]');
    
    return text;
  }

  /**
   * Download file using browser download API
   */
  private async downloadFile(blob: Blob, filename: string): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.downloads) {
      // Use Chrome extension downloads API
      const url = URL.createObjectURL(blob);
      
      try {
        await chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        });
      } finally {
        URL.revokeObjectURL(url);
      }
    } else {
      // Fallback to standard download method
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Save report to local storage
   */
  async saveReportLocally(report: SEOReport, key?: string): Promise<string> {
    try {
      const storageKey = key || `seo-report-${Date.now()}`;
      
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.set({
          [storageKey]: report
        });
      } else {
        // Fallback to localStorage
        localStorage.setItem(storageKey, JSON.stringify(report));
      }
      
      return storageKey;
    } catch (error) {
      console.error('Failed to save report locally:', error);
      throw new Error('本地保存报告失败');
    }
  }

  /**
   * Load report from local storage
   */
  async loadReportLocally(key: string): Promise<SEOReport | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
      } else {
        // Fallback to localStorage
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      }
    } catch (error) {
      console.error('Failed to load report locally:', error);
      return null;
    }
  }

  /**
   * Get privacy protection options for export
   */
  getPrivacyOptions(): { [key: string]: boolean } {
    return {
      sanitizeUrls: true,
      removePersonalData: true,
      maskSensitiveContent: true,
      excludeInternalLinks: false
    };
  }
   }
