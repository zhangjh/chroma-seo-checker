import { SEOReport } from '../../types/seo';
import { BatchResults } from '../background/storage-manager';

/**
 * TemplateRenderer handles the rendering of HTML templates with SEO report data
 */
export class TemplateRenderer {
  /**
   * Render a template with the provided data
   */
  static renderTemplate(template: string, data: TemplateData): string {
    let rendered = template;
    
    // Replace all template variables
    for (const [key, value] of Object.entries(data)) {
      const placeholder = `{{${key}}}`;
      const replacement = this.formatValue(value);
      rendered = rendered.replace(new RegExp(placeholder, 'g'), replacement);
    }
    
    return rendered;
  }

  /**
   * Generate template data for a single SEO report
   */
  static generateSingleReportData(report: SEOReport): TemplateData {
    const overallScore = report.score.overall;
    const overallScoreDeg = (overallScore / 100) * 360;
    
    return {
      title: `SEO Report - ${new URL(report.url).hostname}`,
      url: report.url,
      timestamp: new Date(report.timestamp).toLocaleString(),
      overallScore: overallScore.toString(),
      overallScoreDeg: overallScoreDeg.toString(),
      technicalScore: report.score.technical.toString(),
      contentScore: report.score.content.toString(),
      performanceScore: report.score.performance.toString(),
      technicalWidth: report.score.technical.toString(),
      contentWidth: report.score.content.toString(),
      performanceWidth: report.score.performance.toString(),
      totalIssues: report.issues.length.toString(),
      criticalIssues: report.issues.filter(i => i.severity === 'critical').length.toString(),
      highIssues: report.issues.filter(i => i.severity === 'high').length.toString(),
      mediumIssues: report.issues.filter(i => i.severity === 'medium').length.toString(),
      lowIssues: report.issues.filter(i => i.severity === 'low').length.toString(),
      content: this.renderSingleReportContent(report)
    };
  }

  /**
   * Generate template data for batch results
   */
  static generateBatchReportData(batchResults: BatchResults): TemplateData {
    const avgScore = batchResults.summary.averageScore;
    const avgScoreDeg = (avgScore / 100) * 360;
    
    return {
      title: `Batch SEO Report - ${batchResults.urls.length} URLs`,
      timestamp: new Date().toLocaleString(),
      overallScore: avgScore.toFixed(1),
      overallScoreDeg: avgScoreDeg.toString(),
      totalUrls: batchResults.urls.length.toString(),
      completedUrls: batchResults.summary.completedUrls.toString(),
      failedUrls: batchResults.summary.failedUrls.toString(),
      totalIssues: batchResults.summary.totalIssues.toString(),
      criticalIssues: batchResults.summary.criticalIssues.toString(),
      highIssues: batchResults.summary.highPriorityIssues.toString(),
      mediumIssues: batchResults.summary.mediumPriorityIssues.toString(),
      lowIssues: batchResults.summary.lowPriorityIssues.toString(),
      content: this.renderBatchReportContent(batchResults)
    };
  }

  /**
   * Render content for a single SEO report
   */
  private static renderSingleReportContent(report: SEOReport): string {
    return `
      <div class="header">
        <h1>SEO Analysis Report</h1>
        <div class="url">${report.url}</div>
        <div class="timestamp">Generated on ${new Date(report.timestamp).toLocaleString()}</div>
      </div>

      <div class="score-section">
        <div class="overall-score">
          <div class="score-circle">
            <div class="score-value">${report.score.overall}</div>
          </div>
        </div>
        
        <div class="score-breakdown">
          <div class="score-item">
            <h3>Technical SEO</h3>
            <div class="value">${report.score.technical}</div>
            <div class="score-bar">
              <div class="score-bar-fill technical" style="width: ${report.score.technical}%"></div>
            </div>
          </div>
          <div class="score-item">
            <h3>Content Quality</h3>
            <div class="value">${report.score.content}</div>
            <div class="score-bar">
              <div class="score-bar-fill content" style="width: ${report.score.content}%"></div>
            </div>
          </div>
          <div class="score-item">
            <h3>Performance</h3>
            <div class="value">${report.score.performance}</div>
            <div class="score-bar">
              <div class="score-bar-fill performance" style="width: ${report.score.performance}%"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <h2 class="section-title">Issues Found (${report.issues.length})</h2>
        <div class="issues-grid">
          ${report.issues.map(issue => this.renderIssue(issue)).join('')}
        </div>

        ${report.suggestions ? this.renderAISuggestions(report.suggestions) : ''}
        
        <div class="recommendations-section">
          <h2 class="section-title">Recommendations</h2>
          ${this.renderRecommendations(report)}
        </div>
      </div>

      <div class="footer">
        <p>Generated by SEO Checker Extension v1.0 | ${new Date().toLocaleString()}</p>
      </div>
    `;
  }

  /**
   * Render content for batch results
   */
  private static renderBatchReportContent(batchResults: BatchResults): string {
    return `
      <div class="header">
        <h1>Batch SEO Analysis Report</h1>
        <div class="url">${batchResults.urls.length} URLs analyzed</div>
        <div class="timestamp">Generated on ${new Date().toLocaleString()}</div>
      </div>

      <div class="score-section">
        <div class="overall-score">
          <div class="score-circle">
            <div class="score-value">${batchResults.summary.averageScore.toFixed(1)}</div>
          </div>
        </div>
        
        <div class="score-breakdown">
          <div class="score-item">
            <h3>Total URLs</h3>
            <div class="value">${batchResults.urls.length}</div>
          </div>
          <div class="score-item">
            <h3>Completed</h3>
            <div class="value">${batchResults.summary.completedUrls}</div>
          </div>
          <div class="score-item">
            <h3>Total Issues</h3>
            <div class="value">${batchResults.summary.totalIssues}</div>
          </div>
        </div>
      </div>

      <div class="content-section">
        <h2 class="section-title">Summary</h2>
        <div class="issues-grid">
          <div class="issue-card low">
            <div class="issue-header">
              <div class="issue-title">Analysis Summary</div>
            </div>
            <div class="issue-description">
              <p><strong>Critical Issues:</strong> ${batchResults.summary.criticalIssues}</p>
              <p><strong>High Priority Issues:</strong> ${batchResults.summary.highPriorityIssues}</p>
              <p><strong>Medium Priority Issues:</strong> ${batchResults.summary.mediumPriorityIssues}</p>
              <p><strong>Low Priority Issues:</strong> ${batchResults.summary.lowPriorityIssues}</p>
              <p><strong>Failed URLs:</strong> ${batchResults.summary.failedUrls}</p>
            </div>
          </div>
        </div>

        <h2 class="section-title">Individual Reports</h2>
        <div class="issues-grid">
          ${batchResults.results.map(report => this.renderBatchReportItem(report)).join('')}
        </div>
        
        <div class="recommendations-section">
          <h2 class="section-title">Batch Recommendations</h2>
          ${this.renderBatchRecommendations(batchResults)}
        </div>
      </div>

      <div class="footer">
        <p>Generated by SEO Checker Extension v1.0 | ${new Date().toLocaleString()}</p>
      </div>
    `;
  }

  /**
   * Render a single issue
   */
  private static renderIssue(issue: any): string {
    return `
      <div class="issue-card ${issue.severity}">
        <div class="issue-header">
          <div class="issue-title">${issue.title}</div>
          <div class="issue-severity ${issue.severity}">${issue.severity}</div>
        </div>
        <div class="issue-description">${issue.description}</div>
        <div class="issue-recommendation">
          <strong>Recommendation:</strong> ${issue.recommendation}
        </div>
        ${issue.aiSuggestion ? `
          <div class="ai-suggestion-item">
            <strong>AI Suggestion:</strong> ${issue.aiSuggestion}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render AI suggestions section
   */
  private static renderAISuggestions(suggestions: any): string {
    return `
      <div class="ai-suggestions">
        <h4>AI-Powered Suggestions</h4>
        ${suggestions.titleOptimization ? `
          <div class="ai-suggestion-item">
            <strong>Title Optimization:</strong> ${suggestions.titleOptimization}
          </div>
        ` : ''}
        ${suggestions.metaDescriptionSuggestion ? `
          <div class="ai-suggestion-item">
            <strong>Meta Description:</strong> ${suggestions.metaDescriptionSuggestion}
          </div>
        ` : ''}
        ${suggestions.contentImprovements && suggestions.contentImprovements.length > 0 ? `
          <div class="ai-suggestion-item">
            <strong>Content Improvements:</strong>
            <ul>
              ${suggestions.contentImprovements.map((improvement: string) => `<li>${improvement}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${suggestions.keywordSuggestions && suggestions.keywordSuggestions.length > 0 ? `
          <div class="ai-suggestion-item">
            <strong>Keyword Suggestions:</strong> ${suggestions.keywordSuggestions.join(', ')}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Render recommendations for single report
   */
  private static renderRecommendations(report: SEOReport): string {
    const recommendations: string[] = [];
    
    // Generate recommendations based on issues and scores
    const criticalIssues = report.issues.filter(i => i.severity === 'critical');
    if (criticalIssues.length > 0) {
      recommendations.push(`Address ${criticalIssues.length} critical SEO issues immediately`);
    }

    if (report.score.technical < 70) {
      recommendations.push('Focus on improving technical SEO elements like meta tags, heading structure, and URL optimization');
    }
    
    if (report.score.content < 70) {
      recommendations.push('Enhance content quality by improving readability, keyword optimization, and content structure');
    }
    
    if (report.score.performance < 70) {
      recommendations.push('Optimize page performance by reducing load times and improving Core Web Vitals');
    }

    if (recommendations.length === 0) {
      recommendations.push('Great job! Your SEO is in good shape. Continue monitoring and making incremental improvements.');
    }

    return recommendations.map(rec => `
      <div class="recommendation-item">${rec}</div>
    `).join('');
  }

  /**
   * Render batch recommendations
   */
  private static renderBatchRecommendations(batchResults: BatchResults): string {
    const recommendations: string[] = [];
    
    if (batchResults.summary.criticalIssues > 0) {
      recommendations.push(`Address ${batchResults.summary.criticalIssues} critical issues across all pages`);
    }
    
    if (batchResults.summary.averageScore < 70) {
      recommendations.push('Overall SEO performance needs improvement across multiple pages');
    }
    
    if (batchResults.summary.failedUrls > 0) {
      recommendations.push(`Re-check ${batchResults.summary.failedUrls} failed URLs for analysis errors`);
    }

    const completionRate = (batchResults.summary.completedUrls / batchResults.urls.length) * 100;
    if (completionRate < 90) {
      recommendations.push('Consider investigating why some URLs failed analysis');
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent! Your website\'s SEO performance is consistent across all analyzed pages.');
    }

    return recommendations.map(rec => `
      <div class="recommendation-item">${rec}</div>
    `).join('');
  }

  /**
   * Render individual report item in batch results
   */
  private static renderBatchReportItem(report: SEOReport): string {
    const scoreClass = report.score.overall >= 80 ? 'low' : 
                     report.score.overall >= 60 ? 'medium' : 
                     report.score.overall >= 40 ? 'high' : 'critical';
    
    return `
      <div class="issue-card ${scoreClass}">
        <div class="issue-header">
          <div class="issue-title">${new URL(report.url).hostname}</div>
          <div class="issue-severity ${scoreClass}">${report.score.overall}/100</div>
        </div>
        <div class="issue-description">
          <p><strong>URL:</strong> ${report.url}</p>
          <p><strong>Issues Found:</strong> ${report.issues.length}</p>
          <p><strong>Technical:</strong> ${report.score.technical}/100</p>
          <p><strong>Content:</strong> ${report.score.content}/100</p>
          <p><strong>Performance:</strong> ${report.score.performance}/100</p>
        </div>
      </div>
    `;
  }

  /**
   * Format a value for template replacement
   */
  private static formatValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }
}

/**
 * Template data interface
 */
export interface TemplateData {
  [key: string]: string;
}