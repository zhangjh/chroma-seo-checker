// Detailed report page implementation
import { SEOReport, SEOIssue, AISuggestions } from '../../types/seo';

interface DetailedReportElements {
  loading: HTMLElement;
  error: HTMLElement;
  errorMessage: HTMLElement;
  reportContent: HTMLElement;
  
  pageTitle: HTMLElement;
  pageUrl: HTMLElement;
  reportTimestamp: HTMLElement;
  
  overallScore: HTMLElement;
  technicalScore: HTMLElement;
  contentScore: HTMLElement;
  performanceScore: HTMLElement;
  overallFill: HTMLElement;
  technicalFill: HTMLElement;
  contentFill: HTMLElement;
  performanceFill: HTMLElement;
  
  aiSuggestionsContainer: HTMLElement;
  noAiSuggestions: HTMLElement;
  aiSuggestionsGrid: HTMLElement;
  
  issuesContainer: HTMLElement;
  
  backBtn: HTMLElement;
  retryBtn: HTMLElement;
}

class DetailedReportUI {
  private elements: DetailedReportElements;
  private currentReport: SEOReport | null = null;

  constructor() {
    this.elements = this.getUIElements();
    this.initializeEventListeners();
    this.loadReport();
  }

  private getUIElements(): DetailedReportElements {
    return {
      loading: document.getElementById('loading')!,
      error: document.getElementById('error')!,
      errorMessage: document.getElementById('error-message')!,
      reportContent: document.getElementById('report-content')!,
      
      pageTitle: document.getElementById('page-title')!,
      pageUrl: document.getElementById('page-url')!,
      reportTimestamp: document.getElementById('report-timestamp')!,
      
      overallScore: document.getElementById('overall-score')!,
      technicalScore: document.getElementById('technical-score')!,
      contentScore: document.getElementById('content-score')!,
      performanceScore: document.getElementById('performance-score')!,
      overallFill: document.getElementById('overall-fill')!,
      technicalFill: document.getElementById('technical-fill')!,
      contentFill: document.getElementById('content-fill')!,
      performanceFill: document.getElementById('performance-fill')!,
      
      aiSuggestionsContainer: document.getElementById('ai-suggestions-container')!,
      noAiSuggestions: document.getElementById('no-ai-suggestions')!,
      aiSuggestionsGrid: document.getElementById('ai-suggestions-grid')!,
      
      issuesContainer: document.getElementById('issues-container')!,
      
      backBtn: document.getElementById('back-btn')!,
      retryBtn: document.getElementById('retry-btn')!,
    };
  }

  private initializeEventListeners(): void {
    this.elements.backBtn.addEventListener('click', () => {
      window.close();
    });

    this.elements.retryBtn.addEventListener('click', () => {
      this.loadReport();
    });
  }

  private async loadReport(): Promise<void> {
    this.showLoading();

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getCurrentReport'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.report) {
        this.currentReport = response.report;
        this.displayReport(response.report);
      } else {
        throw new Error('未找到SEO报告数据');
      }
    } catch (error) {
      console.error('Failed to load report:', error);
      this.showError(error instanceof Error ? error.message : '加载报告失败');
    }
  }

  private displayReport(report: SEOReport): void {
    // Update header
    this.elements.pageTitle.textContent = `${report.url} - SEO详细报告`;
    this.elements.pageUrl.textContent = report.url;
    this.elements.reportTimestamp.textContent = this.formatTimestamp(report.timestamp);

    // Update scores
    this.displayScores(report.score);

    // Display AI suggestions
    this.displayAISuggestions(report.suggestions);

    // Display issues
    this.displayIssues(report.issues);

    this.showReportContent();
  }

  private displayScores(score: any): void {
    // Update score numbers
    this.elements.overallScore.textContent = score.overall?.toString() || '--';
    this.elements.technicalScore.textContent = score.technical?.toString() || '--';
    this.elements.contentScore.textContent = score.content?.toString() || '--';
    this.elements.performanceScore.textContent = score.performance?.toString() || '--';

    // Update progress bars
    this.elements.overallFill.style.width = `${score.overall || 0}%`;
    this.elements.technicalFill.style.width = `${score.technical || 0}%`;
    this.elements.contentFill.style.width = `${score.content || 0}%`;
    this.elements.performanceFill.style.width = `${score.performance || 0}%`;

    // Update colors based on scores
    this.updateScoreColor(this.elements.overallScore, score.overall || 0);
  }

  private displayAISuggestions(suggestions?: AISuggestions): void {
    if (!suggestions) {
      this.elements.noAiSuggestions.classList.remove('hidden');
      this.elements.aiSuggestionsGrid.classList.add('hidden');
      return;
    }

    this.elements.noAiSuggestions.classList.add('hidden');
    this.elements.aiSuggestionsGrid.classList.remove('hidden');

    // Clear existing suggestions
    this.elements.aiSuggestionsGrid.innerHTML = '';

    // Create suggestion cards
    const suggestionItems = [
      {
        title: '标题优化建议',
        content: suggestions.titleOptimization,
        type: 'title-optimization',
        icon: '📝'
      },
      {
        title: 'Meta描述建议',
        content: suggestions.metaDescriptionSuggestion,
        type: 'meta-description',
        icon: '📄'
      },
      ...suggestions.contentImprovements.map(improvement => ({
        title: '内容改进建议',
        content: improvement,
        type: 'content-improvement',
        icon: '✨'
      })),
      ...suggestions.keywordSuggestions.map(keyword => ({
        title: '关键词建议',
        content: keyword,
        type: 'keyword-suggestion',
        icon: '🔍'
      })),
      ...suggestions.structureRecommendations.map(recommendation => ({
        title: '结构优化建议',
        content: recommendation,
        type: 'structure-recommendation',
        icon: '🏗️'
      }))
    ].filter(item => item.content && item.content.trim());

    suggestionItems.forEach(item => {
      const card = document.createElement('div');
      card.className = `suggestion-card ${item.type}`;
      card.innerHTML = `
        <div class="suggestion-card-title">
          <span>${item.icon}</span>
          ${item.title}
        </div>
        <div class="suggestion-card-content">${item.content}</div>
      `;
      this.elements.aiSuggestionsGrid.appendChild(card);
    });
  }

  private displayIssues(issues: SEOIssue[]): void {
    this.elements.issuesContainer.innerHTML = '';

    if (issues.length === 0) {
      this.elements.issuesContainer.innerHTML = `
        <div class="no-issues">
          <div class="success-icon">✅</div>
          <p>太棒了！没有发现SEO问题</p>
        </div>
      `;
      return;
    }

    // Group issues by severity
    const groupedIssues = this.groupIssuesBySeverity(issues);

    Object.entries(groupedIssues).forEach(([severity, severityIssues]) => {
      if (severityIssues.length === 0) return;

      const severitySection = document.createElement('div');
      severitySection.className = 'issues-severity-section';
      severitySection.innerHTML = `
        <h4 class="severity-title ${severity}">
          ${this.getSeverityText(severity)} (${severityIssues.length})
        </h4>
        <div class="severity-issues">
          ${severityIssues.map(issue => `
            <div class="issue-item detailed">
              <div class="issue-header">
                <span class="severity-badge ${issue.severity}">${this.getSeverityText(issue.severity)}</span>
                <span class="issue-title">${issue.title}</span>
              </div>
              <div class="issue-description">${issue.description}</div>
              <div class="issue-recommendation">
                <strong>建议:</strong> ${issue.recommendation}
              </div>
              ${issue.aiSuggestion ? `
                <div class="issue-ai-suggestion">
                  <strong>AI建议:</strong> ${issue.aiSuggestion}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
      this.elements.issuesContainer.appendChild(severitySection);
    });
  }

  private groupIssuesBySeverity(issues: SEOIssue[]): Record<string, SEOIssue[]> {
    return {
      critical: issues.filter(issue => issue.severity === 'critical'),
      high: issues.filter(issue => issue.severity === 'high'),
      medium: issues.filter(issue => issue.severity === 'medium'),
      low: issues.filter(issue => issue.severity === 'low')
    };
  }

  private getSeverityText(severity: string): string {
    const severityMap: Record<string, string> = {
      critical: '严重问题',
      high: '高优先级',
      medium: '中等优先级',
      low: '低优先级'
    };
    return severityMap[severity] || severity;
  }

  private updateScoreColor(element: HTMLElement, score: number): void {
    element.classList.remove('warning', 'danger');
    if (score < 50) {
      element.classList.add('danger');
    } else if (score < 80) {
      element.classList.add('warning');
    }
  }

  private formatTimestamp(timestamp: Date | string): string {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private showLoading(): void {
    this.elements.loading.classList.remove('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.reportContent.classList.add('hidden');
  }

  private showError(message: string): void {
    this.elements.errorMessage.textContent = message;
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.remove('hidden');
    this.elements.reportContent.classList.add('hidden');
  }

  private showReportContent(): void {
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.reportContent.classList.remove('hidden');
  }
}

// Initialize detailed report when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DetailedReportUI();
});