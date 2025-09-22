import { SEOReport } from '../../types/seo';
import { BatchResults } from '../background/storage-manager';

/**
 * ReportGenerator handles the generation of SEO reports in various formats
 * Supports PDF and JSON export formats with customizable templates
 */
export class ReportGenerator {
  private static readonly REPORT_VERSION = '1.0';
  private static readonly MAX_REPORT_SIZE = 10 * 1024 * 1024; // 10MB limit

  /**
   * Generate a JSON report from SEO data
   */
  async generateJSONReport(data: SEOReport | BatchResults, options: JSONReportOptions = {}): Promise<JSONReportData> {
    try {
      const reportData: JSONReportData = {
        version: ReportGenerator.REPORT_VERSION,
        generatedAt: new Date(),
        type: this.isSeOReport(data) ? 'single' : 'batch',
        data: this.formatDataForJSON(data, options),
        metadata: this.generateMetadata(data, options)
      };

      // Apply data sanitization if requested
      if (options.sanitizeData) {
        reportData.data = this.sanitizeData(reportData.data);
      }

      // Validate report size
      const reportSize = JSON.stringify(reportData).length;
      if (reportSize > ReportGenerator.MAX_REPORT_SIZE) {
        throw new Error(`Report size (${reportSize} bytes) exceeds maximum allowed size`);
      }

      return reportData;
    } catch (error) {
      throw new Error(`Failed to generate JSON report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a PDF report from SEO data
   */
  async generatePDFReport(data: SEOReport | BatchResults, options: PDFReportOptions = {}): Promise<PDFReportData> {
    try {
      const htmlContent = await this.generateHTMLContent(data, options);
      const pdfBlob = await this.convertHTMLToPDF(htmlContent, options);
      
      return {
        version: ReportGenerator.REPORT_VERSION,
        generatedAt: new Date(),
        type: this.isSeOReport(data) ? 'single' : 'batch',
        blob: pdfBlob,
        filename: this.generateFilename(data, 'pdf'),
        metadata: this.generateMetadata(data, options)
      };
    } catch (error) {
      throw new Error(`Failed to generate PDF report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate HTML content for PDF conversion or direct display
   */
  async generateHTMLContent(data: SEOReport | BatchResults, options: ReportOptions = {}): Promise<string> {
    try {
      const template = options.template || 'default';
      const templateContent = await this.loadTemplate(template);
      
      const templateData = {
        ...this.formatDataForHTML(data, options),
        generatedAt: new Date().toLocaleString(),
        version: ReportGenerator.REPORT_VERSION,
        options
      };

      return this.renderTemplate(templateContent, templateData);
    } catch (error) {
      throw new Error(`Failed to generate HTML content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Format SEO data for JSON export
   */
  private formatDataForJSON(data: SEOReport | BatchResults, options: JSONReportOptions): any {
    if (this.isSeOReport(data)) {
      return this.formatSingleReportForJSON(data, options);
    } else {
      return this.formatBatchResultsForJSON(data, options);
    }
  }

  /**
   * Format single SEO report for JSON
   */
  private formatSingleReportForJSON(report: SEOReport, options: JSONReportOptions): SingleReportJSON {
    const formatted: SingleReportJSON = {
      id: report.id,
      url: report.url,
      timestamp: report.timestamp,
      score: report.score,
      summary: {
        totalIssues: report.issues.length,
        criticalIssues: report.issues.filter(i => i.severity === 'critical').length,
        highIssues: report.issues.filter(i => i.severity === 'high').length,
        mediumIssues: report.issues.filter(i => i.severity === 'medium').length,
        lowIssues: report.issues.filter(i => i.severity === 'low').length
      }
    };

    // Include detailed data based on options
    if (options.includeIssues !== false) {
      formatted.issues = report.issues;
    }

    if (options.includeAISuggestions !== false) {
      formatted.suggestions = report.suggestions;
    }

    if (options.includeTechnicalResults !== false) {
      formatted.technicalResults = report.technicalResults;
    }

    if (options.includeContentResults !== false) {
      formatted.contentResults = report.contentResults;
    }

    if (options.includePerformanceResults !== false) {
      formatted.performanceResults = report.performanceResults;
    }

    return formatted;
  }

  /**
   * Format batch results for JSON
   */
  private formatBatchResultsForJSON(batchResults: BatchResults, options: JSONReportOptions): BatchResultsJSON {
    return {
      id: batchResults.id,
      urls: batchResults.urls,
      summary: batchResults.summary,
      createdAt: batchResults.createdAt,
      completedAt: batchResults.completedAt,
      status: batchResults.status,
      reports: batchResults.results.map(report => 
        this.formatSingleReportForJSON(report, options)
      )
    };
  }

  /**
   * Format data for HTML display
   */
  private formatDataForHTML(data: SEOReport | BatchResults, options: ReportOptions): any {
    if (this.isSeOReport(data)) {
      return {
        type: 'single',
        report: data,
        charts: this.generateChartData(data),
        recommendations: this.generateRecommendations(data)
      };
    } else {
      return {
        type: 'batch',
        batchResults: data,
        charts: this.generateBatchChartData(data),
        recommendations: this.generateBatchRecommendations(data)
      };
    }
  }

  /**
   * Generate chart data for visualization
   */
  private generateChartData(report: SEOReport): ChartData {
    return {
      scoreBreakdown: {
        technical: report.score.technical,
        content: report.score.content,
        performance: report.score.performance
      },
      issueDistribution: {
        critical: report.issues.filter(i => i.severity === 'critical').length,
        high: report.issues.filter(i => i.severity === 'high').length,
        medium: report.issues.filter(i => i.severity === 'medium').length,
        low: report.issues.filter(i => i.severity === 'low').length
      },
      categoryBreakdown: {
        technical: report.issues.filter(i => i.category === 'technical').length,
        content: report.issues.filter(i => i.category === 'content').length,
        performance: report.issues.filter(i => i.category === 'performance').length
      }
    };
  }

  /**
   * Generate chart data for batch results
   */
  private generateBatchChartData(batchResults: BatchResults): BatchChartData {
    const scores = batchResults.results.map(r => r.score.overall);
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    
    return {
      scoreDistribution: this.calculateScoreDistribution(scores),
      averageScores: {
        overall: avgScore,
        technical: batchResults.results.reduce((sum, r) => sum + r.score.technical, 0) / batchResults.results.length,
        content: batchResults.results.reduce((sum, r) => sum + r.score.content, 0) / batchResults.results.length,
        performance: batchResults.results.reduce((sum, r) => sum + r.score.performance, 0) / batchResults.results.length
      },
      issuesSummary: batchResults.summary
    };
  }

  /**
   * Calculate score distribution for batch results
   */
  private calculateScoreDistribution(scores: number[]): ScoreDistribution {
    const distribution = {
      excellent: 0, // 90-100
      good: 0,      // 70-89
      fair: 0,      // 50-69
      poor: 0       // 0-49
    };

    scores.forEach(score => {
      if (score >= 90) distribution.excellent++;
      else if (score >= 70) distribution.good++;
      else if (score >= 50) distribution.fair++;
      else distribution.poor++;
    });

    return distribution;
  }

  /**
   * Generate recommendations based on report data
   */
  private generateRecommendations(report: SEOReport): string[] {
    const recommendations: string[] = [];
    
    // Critical issues first
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical SEO issues immediately`);
    }

    // Score-based recommendations
    if (report.score.technical < 70) {
      recommendations.push('Focus on improving technical SEO elements');
    }
    if (report.score.content < 70) {
      recommendations.push('Enhance content quality and structure');
    }
    if (report.score.performance < 70) {
      recommendations.push('Optimize page performance and loading speed');
    }

    // AI suggestions
    if (report.suggestions.titleOptimization) {
      recommendations.push('Consider AI-suggested title optimization');
    }

    return recommendations;
  }

  /**
   * Generate recommendations for batch results
   */
  private generateBatchRecommendations(batchResults: BatchResults): string[] {
    const recommendations: string[] = [];
    
    if (batchResults.summary.criticalIssues > 0) {
      recommendations.push(`Address ${batchResults.summary.criticalIssues} critical issues across all pages`);
    }
    
    if (batchResults.summary.averageScore < 70) {
      recommendations.push('Overall SEO performance needs improvement');
    }
    
    const failedUrls = batchResults.summary.failedUrls;
    if (failedUrls > 0) {
      recommendations.push(`Re-check ${failedUrls} failed URLs`);
    }

    return recommendations;
  }

  /**
   * Load HTML template for report generation
   */
  private async loadTemplate(templateName: string): Promise<string> {
    try {
      // For now, return a default template
      // In a full implementation, this would load from template files
      return this.getDefaultTemplate();
    } catch (error) {
      throw new Error(`Failed to load template '${templateName}': ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get default HTML template
   */
  private getDefaultTemplate(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SEO Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .score { font-size: 24px; font-weight: bold; color: #2196F3; }
        .section { margin: 20px 0; }
        .issue { margin: 10px 0; padding: 10px; border-left: 4px solid #f44336; }
        .issue.critical { border-color: #f44336; }
        .issue.high { border-color: #ff9800; }
        .issue.medium { border-color: #ffeb3b; }
        .issue.low { border-color: #4caf50; }
        .chart { margin: 20px 0; }
        .recommendation { background: #e3f2fd; padding: 10px; margin: 5px 0; border-radius: 4px; }
    </style>
</head>
<body>
    {{content}}
</body>
</html>`;
  }

  /**
   * Render template with data
   */
  private renderTemplate(template: string, data: any): string {
    // Simple template rendering - replace {{content}} with generated content
    let content = '';
    
    if (data.type === 'single') {
      content = this.renderSingleReportContent(data);
    } else {
      content = this.renderBatchReportContent(data);
    }
    
    return template.replace('{{content}}', content);
  }

  /**
   * Render single report content
   */
  private renderSingleReportContent(data: any): string {
    const report = data.report;
    return `
      <div class="header">
        <h1>SEO Report</h1>
        <p><strong>URL:</strong> ${report.url}</p>
        <p><strong>Generated:</strong> ${data.generatedAt}</p>
        <div class="score">Overall Score: ${report.score.overall}/100</div>
      </div>
      
      <div class="section">
        <h2>Score Breakdown</h2>
        <p>Technical: ${report.score.technical}/100</p>
        <p>Content: ${report.score.content}/100</p>
        <p>Performance: ${report.score.performance}/100</p>
      </div>
      
      <div class="section">
        <h2>Issues Found</h2>
        ${report.issues.map((issue: any) => `
          <div class="issue ${issue.severity}">
            <h3>${issue.title}</h3>
            <p>${issue.description}</p>
            <p><strong>Recommendation:</strong> ${issue.recommendation}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Recommendations</h2>
        ${data.recommendations.map((rec: string) => `
          <div class="recommendation">${rec}</div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Render batch report content
   */
  private renderBatchReportContent(data: any): string {
    const batch = data.batchResults;
    return `
      <div class="header">
        <h1>Batch SEO Report</h1>
        <p><strong>URLs Checked:</strong> ${batch.urls.length}</p>
        <p><strong>Generated:</strong> ${data.generatedAt}</p>
        <div class="score">Average Score: ${batch.summary.averageScore.toFixed(1)}/100</div>
      </div>
      
      <div class="section">
        <h2>Summary</h2>
        <p>Total Issues: ${batch.summary.totalIssues}</p>
        <p>Critical Issues: ${batch.summary.criticalIssues}</p>
        <p>Completed URLs: ${batch.summary.completedUrls}</p>
        <p>Failed URLs: ${batch.summary.failedUrls}</p>
      </div>
      
      <div class="section">
        <h2>Individual Reports</h2>
        ${batch.results.map((report: any) => `
          <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd;">
            <h3>${report.url}</h3>
            <p>Score: ${report.score.overall}/100</p>
            <p>Issues: ${report.issues.length}</p>
          </div>
        `).join('')}
      </div>
      
      <div class="section">
        <h2>Recommendations</h2>
        ${data.recommendations.map((rec: string) => `
          <div class="recommendation">${rec}</div>
        `).join('')}
      </div>
    `;
  }

  /**
   * Convert HTML to PDF (placeholder implementation)
   */
  private async convertHTMLToPDF(htmlContent: string, options: PDFReportOptions): Promise<Blob> {
    // In a real implementation, this would use a PDF generation library
    // For now, we'll create a simple text-based PDF-like blob
    const pdfContent = this.htmlToText(htmlContent);
    return new Blob([pdfContent], { type: 'application/pdf' });
  }

  /**
   * Convert HTML to plain text (simplified)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Generate filename for report
   */
  private generateFilename(data: SEOReport | BatchResults, format: 'pdf' | 'json'): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    if (this.isSeOReport(data)) {
      const domain = new URL(data.url).hostname;
      return `seo-report-${domain}-${timestamp}.${format}`;
    } else {
      return `seo-batch-report-${timestamp}.${format}`;
    }
  }

  /**
   * Generate metadata for report
   */
  private generateMetadata(data: SEOReport | BatchResults, options: ReportOptions): ReportMetadata {
    return {
      generator: 'SEO Checker Extension',
      version: ReportGenerator.REPORT_VERSION,
      generatedAt: new Date(),
      dataType: this.isSeOReport(data) ? 'single' : 'batch',
      options: {
        template: options.template || 'default',
        sanitized: options.sanitizeData || false
      }
    };
  }

  /**
   * Sanitize sensitive data from report
   */
  private sanitizeData(data: any): any {
    // Create a deep copy and sanitize sensitive information
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Remove or mask sensitive URLs, IPs, etc.
    if (sanitized.url) {
      sanitized.url = this.sanitizeUrl(sanitized.url);
    }
    
    if (sanitized.urls) {
      sanitized.urls = sanitized.urls.map((url: string) => this.sanitizeUrl(url));
    }
    
    return sanitized;
  }

  /**
   * Sanitize URL by removing sensitive parts
   */
  private sanitizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep only protocol, hostname, and path
      return `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
    } catch {
      return '[SANITIZED_URL]';
    }
  }

  /**
   * Type guard to check if data is SEOReport
   */
  private isSeOReport(data: SEOReport | BatchResults): data is SEOReport {
    return 'score' in data && 'issues' in data;
  }
}

// Supporting interfaces and types
export interface ReportOptions {
  template?: string;
  sanitizeData?: boolean;
}

export interface JSONReportOptions extends ReportOptions {
  includeIssues?: boolean;
  includeAISuggestions?: boolean;
  includeTechnicalResults?: boolean;
  includeContentResults?: boolean;
  includePerformanceResults?: boolean;
}

export interface PDFReportOptions extends ReportOptions {
  pageSize?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  includeCharts?: boolean;
}

export interface JSONReportData {
  version: string;
  generatedAt: Date;
  type: 'single' | 'batch';
  data: SingleReportJSON | BatchResultsJSON;
  metadata: ReportMetadata;
}

export interface PDFReportData {
  version: string;
  generatedAt: Date;
  type: 'single' | 'batch';
  blob: Blob;
  filename: string;
  metadata: ReportMetadata;
}

export interface SingleReportJSON {
  id: string;
  url: string;
  timestamp: Date;
  score: any;
  summary: IssueSummary;
  issues?: any[];
  suggestions?: any;
  technicalResults?: any;
  contentResults?: any;
  performanceResults?: any;
}

export interface BatchResultsJSON {
  id: string;
  urls: string[];
  summary: any;
  createdAt: Date;
  completedAt?: Date;
  status: string;
  reports: SingleReportJSON[];
}

export interface IssueSummary {
  totalIssues: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
}

export interface ChartData {
  scoreBreakdown: {
    technical: number;
    content: number;
    performance: number;
  };
  issueDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: {
    technical: number;
    content: number;
    performance: number;
  };
}

export interface BatchChartData {
  scoreDistribution: ScoreDistribution;
  averageScores: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
  };
  issuesSummary: any;
}

export interface ScoreDistribution {
  excellent: number; // 90-100
  good: number;      // 70-89
  fair: number;      // 50-69
  poor: number;      // 0-49
}

export interface ReportMetadata {
  generator: string;
  version: string;
  generatedAt: Date;
  dataType: 'single' | 'batch';
  options: {
    template: string;
    sanitized: boolean;
  };
}