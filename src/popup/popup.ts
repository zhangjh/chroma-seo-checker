// Popup UI entry point
import { SEOScore, SEOIssue, AISuggestions } from '../../types/seo';
import { QuickReport, PopupController } from '../../types/components';

interface UIElements {
  // Loading and error states
  loading: HTMLElement;
  error: HTMLElement;
  errorMessage: HTMLElement;
  mainContent: HTMLElement;

  // Score elements
  overallScore: HTMLElement;
  technicalScore: HTMLElement;
  contentScore: HTMLElement;
  performanceScore: HTMLElement;
  technicalFill: HTMLElement;
  contentFill: HTMLElement;
  performanceFill: HTMLElement;

  // Summary elements
  criticalIssues: HTMLElement;
  highIssues: HTMLElement;
  totalIssues: HTMLElement;
  lastCheckedTime: HTMLElement;

  // Issues elements
  issuesList: HTMLElement;
  noIssues: HTMLElement;
  filterTabs: NodeListOf<HTMLElement>;

  // Suggestions elements
  suggestionsContent: HTMLElement;
  suggestionsStatus: HTMLElement;
  suggestionsStatusText: HTMLElement;
  suggestionsLoading: HTMLElement;
  suggestionsList: HTMLElement;
  noSuggestions: HTMLElement;

  // Action buttons
  refreshBtn: HTMLElement;
  retryBtn: HTMLElement;
  generateSuggestionsBtn: HTMLButtonElement;
  detailedReportBtn: HTMLElement;
  exportBtn: HTMLElement;
}

class PopupUI implements PopupController {
  private elements: UIElements;
  private currentFilter: string = 'all';
  private currentIssues: SEOIssue[] = [];
  private currentSuggestions: AISuggestions | null = null;

  constructor() {
    this.elements = this.getUIElements();
    this.initializeEventListeners();
  }

  private getUIElements(): UIElements {
    return {
      loading: document.getElementById('loading')!,
      error: document.getElementById('error')!,
      errorMessage: document.getElementById('error-message')!,
      mainContent: document.getElementById('main-content')!,

      overallScore: document.getElementById('overall-score')!,
      technicalScore: document.getElementById('technical-score')!,
      contentScore: document.getElementById('content-score')!,
      performanceScore: document.getElementById('performance-score')!,
      technicalFill: document.getElementById('technical-fill')!,
      contentFill: document.getElementById('content-fill')!,
      performanceFill: document.getElementById('performance-fill')!,

      criticalIssues: document.getElementById('critical-issues')!,
      highIssues: document.getElementById('high-issues')!,
      totalIssues: document.getElementById('total-issues')!,
      lastCheckedTime: document.getElementById('last-checked-time')!,

      issuesList: document.getElementById('issues-list')!,
      noIssues: document.getElementById('no-issues')!,
      filterTabs: document.querySelectorAll('.tab-btn'),

      suggestionsContent: document.getElementById('suggestions-content')!,
      suggestionsStatus: document.getElementById('suggestions-status')!,
      suggestionsStatusText: document.getElementById('suggestions-status-text')!,
      suggestionsLoading: document.getElementById('suggestions-loading')!,
      suggestionsList: document.getElementById('suggestions-list')!,
      noSuggestions: document.getElementById('no-suggestions')!,

      refreshBtn: document.getElementById('refresh-btn')!,
      retryBtn: document.getElementById('retry-btn')!,
      generateSuggestionsBtn: document.getElementById('generate-suggestions')! as HTMLButtonElement,
      detailedReportBtn: document.getElementById('detailed-report-btn')!,
      exportBtn: document.getElementById('export-btn')!,
    };
  }

  private initializeEventListeners(): void {
    // Refresh button
    this.elements.refreshBtn.addEventListener('click', () => {
      this.refreshAnalysis();
    });

    // Retry button
    this.elements.retryBtn.addEventListener('click', () => {
      this.refreshAnalysis();
    });

    // Filter tabs
    this.elements.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.getAttribute('data-filter') || 'all';
        this.setActiveFilter(filter);
        this.filterIssues(filter);
      });
    });

    // Generate suggestions button
    this.elements.generateSuggestionsBtn.addEventListener('click', () => {
      this.generateAISuggestions();
    });

    // Action buttons
    this.elements.detailedReportBtn.addEventListener('click', () => {
      this.openDetailedReport();
    });

    this.elements.exportBtn.addEventListener('click', () => {
      this.showExportOptions();
    });
  }

  public initializeUI(): void {
    console.log('SEO Checker: Initializing UI');
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }

  private async loadCurrentPageAnalysis(): Promise<void> {
    try {
      console.log('SEO Checker: Loading current page analysis');

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('SEO Checker: Current tab:', tab);

      if (!tab.id) {
        throw new Error('无法获取当前标签页');
      }

      // Request analysis from background script
      console.log('SEO Checker: Requesting analysis from background script');
      const response = await chrome.runtime.sendMessage({
        action: 'getPageAnalysis',
        tabId: tab.id
      });
      console.log('SEO Checker: Background response:', response);

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.report) {
        console.log('SEO Checker: Found cached report, displaying results');
        this.displaySEOScore(response.report.score);
        this.showQuickReport({
          score: response.report.score,
          criticalIssues: response.report.issues.filter((i: SEOIssue) => i.severity === 'critical').length,
          highPriorityIssues: response.report.issues.filter((i: SEOIssue) => i.severity === 'high').length,
          totalIssues: response.report.issues.length,
          lastChecked: new Date(response.report.timestamp)
        });
        this.displayIssues(response.report.issues);

        if (response.report.suggestions) {
          this.displaySuggestions(response.report.suggestions);
        }
      } else {
        console.log('SEO Checker: No cached analysis found, triggering new analysis');
        // No cached analysis, trigger new analysis
        this.triggerNewAnalysis(tab.id);
      }
    } catch (error) {
      console.error('Failed to load analysis:', error);
      this.showError(error instanceof Error ? error.message : '加载分析结果失败');
    }
  }

  private async triggerNewAnalysis(tabId: number): Promise<void> {
    try {
      console.log('SEO Checker: Triggering new analysis for tab:', tabId);
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeCurrentPage',
        tabId: tabId
      });
      console.log('SEO Checker: Analysis trigger response:', response);

      if (response.error) {
        throw new Error(response.error);
      }

      // Analysis started, wait for completion
      console.log('SEO Checker: Analysis started, waiting for completion');
      this.waitForAnalysisCompletion(tabId);
    } catch (error) {
      console.error('SEO Checker: Failed to trigger analysis:', error);
      this.showError(error instanceof Error ? error.message : '启动分析失败');
    }
  }

  private waitForAnalysisCompletion(tabId: number): void {
    const checkInterval = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getAnalysisStatus',
          tabId: tabId
        });

        if (response.completed && response.report) {
          clearInterval(checkInterval);
          this.displaySEOScore(response.report.score);
          this.showQuickReport({
            score: response.report.score,
            criticalIssues: response.report.issues.filter((i: SEOIssue) => i.severity === 'critical').length,
            highPriorityIssues: response.report.issues.filter((i: SEOIssue) => i.severity === 'high').length,
            totalIssues: response.report.issues.length,
            lastChecked: new Date(response.report.timestamp)
          });
          this.displayIssues(response.report.issues);
        } else if (response.error) {
          clearInterval(checkInterval);
          this.showError(response.error);
        }
      } catch (error) {
        clearInterval(checkInterval);
        this.showError('检查分析状态失败');
      }
    }, 1000);

    // Timeout after 30 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      this.showError('分析超时，请重试');
    }, 30000);
  }

  public displaySEOScore(score: SEOScore): void {
    // Update overall score
    this.elements.overallScore.textContent = score.overall.toString();
    this.updateScoreColor(this.elements.overallScore, score.overall);

    // Update breakdown scores
    this.elements.technicalScore.textContent = score.technical.toString();
    this.elements.contentScore.textContent = score.content.toString();
    this.elements.performanceScore.textContent = score.performance.toString();

    // Update progress bars
    this.elements.technicalFill.style.width = `${score.technical}%`;
    this.elements.contentFill.style.width = `${score.content}%`;
    this.elements.performanceFill.style.width = `${score.performance}%`;

    this.showMainContent();
  }

  public showQuickReport(report: QuickReport): void {
    this.elements.criticalIssues.textContent = report.criticalIssues.toString();
    this.elements.highIssues.textContent = report.highPriorityIssues.toString();
    this.elements.totalIssues.textContent = report.totalIssues.toString();
    this.elements.lastCheckedTime.textContent = this.formatTime(report.lastChecked);
  }

  private displayIssues(issues: SEOIssue[]): void {
    this.currentIssues = issues;
    this.filterIssues(this.currentFilter);
  }

  private filterIssues(filter: string): void {
    let filteredIssues = this.currentIssues;

    if (filter !== 'all') {
      filteredIssues = this.currentIssues.filter(issue => issue.severity === filter);
    }

    if (filteredIssues.length === 0) {
      this.elements.issuesList.style.display = 'none';
      this.elements.noIssues.classList.remove('hidden');
    } else {
      this.elements.issuesList.style.display = 'block';
      this.elements.noIssues.classList.add('hidden');
      this.renderIssuesList(filteredIssues);
    }
  }

  private renderIssuesList(issues: SEOIssue[]): void {
    this.elements.issuesList.innerHTML = '';

    issues.forEach(issue => {
      const issueElement = document.createElement('div');
      issueElement.className = 'issue-item';
      issueElement.innerHTML = `
        <div class="issue-header">
          <span class="severity-badge ${issue.severity}">${this.getSeverityText(issue.severity)}</span>
          <span class="issue-title">${issue.title}</span>
        </div>
        <div class="issue-description">${issue.description}</div>
      `;

      issueElement.addEventListener('click', () => {
        this.showIssueDetails(issue);
      });

      this.elements.issuesList.appendChild(issueElement);
    });
  }

  private displaySuggestions(suggestions: AISuggestions): void {
    this.currentSuggestions = suggestions;
    this.elements.noSuggestions.style.display = 'none';
    this.elements.suggestionsList.style.display = 'block';
    this.showSuggestionsStatus('AI建议生成完成', 'success');
    this.renderSuggestionsList(suggestions);
  }

  private renderSuggestionsList(suggestions: AISuggestions): void {
    this.elements.suggestionsList.innerHTML = '';

    const suggestionItems = [
      {
        title: '标题优化',
        text: suggestions.titleOptimization,
        type: 'title-optimization',
        icon: '📝',
        confidence: 'high'
      },
      {
        title: 'Meta描述建议',
        text: suggestions.metaDescriptionSuggestion,
        type: 'meta-description',
        icon: '📄',
        confidence: 'high'
      },
      ...suggestions.contentImprovements.map(improvement => ({
        title: '内容改进',
        text: improvement,
        type: 'content-improvement',
        icon: '✨',
        confidence: 'medium'
      })),
      ...suggestions.keywordSuggestions.map(keyword => ({
        title: '关键词建议',
        text: keyword,
        type: 'keyword-suggestion',
        icon: '🔍',
        confidence: 'medium'
      })),
      ...suggestions.structureRecommendations.map(recommendation => ({
        title: '结构建议',
        text: recommendation,
        type: 'structure-recommendation',
        icon: '🏗️',
        confidence: 'high'
      }))
    ].filter(item => item.text && item.text.trim());

    suggestionItems.forEach((item, index) => {
      const suggestionElement = document.createElement('div');
      suggestionElement.className = `suggestion-item ${item.type}`;
      suggestionElement.innerHTML = `
        <div class="suggestion-header">
          <div class="suggestion-title">
            <span class="suggestion-type-icon">${item.icon}</span>
            ${item.title}
          </div>
          <div class="suggestion-actions">
            <button class="suggestion-action-btn copy-btn" data-index="${index}" title="复制建议">
              📋
            </button>
            ${this.canApplySuggestion(item.type) ? `
              <button class="suggestion-action-btn apply-btn" data-index="${index}" title="应用建议">
                ✓
              </button>
            ` : ''}
            <button class="suggestion-action-btn preview-btn" data-index="${index}" title="预览效果">
              👁️
            </button>
          </div>
        </div>
        <div class="suggestion-text">${item.text}</div>
        <div class="suggestion-preview" id="preview-${index}">
          <div class="suggestion-preview-label">预览效果:</div>
          <div class="suggestion-preview-content"></div>
        </div>
        <div class="suggestion-meta">
          <div class="suggestion-confidence">
            <span class="confidence-indicator ${item.confidence}"></span>
            <span>置信度: ${this.getConfidenceText(item.confidence)}</span>
          </div>
          <div class="suggestion-feedback">
            <button class="feedback-btn" data-feedback="helpful" data-index="${index}" title="有用">👍</button>
            <button class="feedback-btn" data-feedback="not-helpful" data-index="${index}" title="无用">👎</button>
          </div>
        </div>
      `;

      this.elements.suggestionsList.appendChild(suggestionElement);
      this.attachSuggestionEventListeners(suggestionElement, item, index);
    });
  }

  private attachSuggestionEventListeners(element: HTMLElement, item: any, index: number): void {
    // Copy button
    const copyBtn = element.querySelector('.copy-btn') as HTMLButtonElement;
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copySuggestionToClipboard(item.text);
      });
    }

    // Apply button
    const applyBtn = element.querySelector('.apply-btn') as HTMLButtonElement;
    if (applyBtn) {
      applyBtn.addEventListener('click', () => {
        this.applySuggestion(item);
      });
    }

    // Preview button
    const previewBtn = element.querySelector('.preview-btn') as HTMLButtonElement;
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        this.toggleSuggestionPreview(index, item);
      });
    }

    // Feedback buttons
    const feedbackBtns = element.querySelectorAll('.feedback-btn') as NodeListOf<HTMLButtonElement>;
    feedbackBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const feedback = btn.getAttribute('data-feedback');
        this.submitSuggestionFeedback(index, feedback);
      });
    });
  }

  private canApplySuggestion(type: string): boolean {
    // Only certain types of suggestions can be automatically applied
    return ['title-optimization', 'meta-description'].includes(type);
  }

  private getConfidenceText(confidence: string): string {
    const confidenceMap: Record<string, string> = {
      high: '高',
      medium: '中',
      low: '低'
    };
    return confidenceMap[confidence] || confidence;
  }

  private async copySuggestionToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.showSuggestionsStatus('建议已复制到剪贴板', 'success');
      setTimeout(() => this.hideSuggestionsStatus(), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      this.showSuggestionsStatus('复制失败，请手动选择文本', 'error');
      setTimeout(() => this.hideSuggestionsStatus(), 3000);
    }
  }

  private async applySuggestion(item: any): Promise<void> {
    try {
      this.showSuggestionsStatus('正在应用建议...', 'info');

      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      const response = await chrome.runtime.sendMessage({
        action: 'applySuggestion',
        tabId: tab.id,
        suggestionType: item.type,
        suggestionText: item.text
      });

      if (response.success) {
        this.showSuggestionsStatus('建议应用成功！', 'success');
      } else {
        throw new Error(response.error || '应用建议失败');
      }
    } catch (error) {
      console.error('Failed to apply suggestion:', error);
      this.showSuggestionsStatus('应用建议失败，请手动修改', 'error');
    }

    setTimeout(() => this.hideSuggestionsStatus(), 3000);
  }

  private toggleSuggestionPreview(index: number, item: any): void {
    const preview = document.getElementById(`preview-${index}`) as HTMLElement;
    const previewContent = preview.querySelector('.suggestion-preview-content') as HTMLElement;

    if (preview.classList.contains('show')) {
      preview.classList.remove('show');
    } else {
      // Generate preview content based on suggestion type
      previewContent.innerHTML = this.generatePreviewContent(item);
      preview.classList.add('show');
    }
  }

  private generatePreviewContent(item: any): string {
    switch (item.type) {
      case 'title-optimization':
        return `<strong>优化后标题:</strong><br>${item.text}`;
      case 'meta-description':
        return `<strong>优化后描述:</strong><br>${item.text}`;
      case 'keyword-suggestion':
        return `<strong>建议关键词:</strong> ${item.text}`;
      default:
        return `<strong>建议内容:</strong><br>${item.text}`;
    }
  }

  private async submitSuggestionFeedback(index: number, feedback: string | null): Promise<void> {
    try {
      await chrome.runtime.sendMessage({
        action: 'submitSuggestionFeedback',
        suggestionIndex: index,
        feedback: feedback
      });

      // Visual feedback
      const feedbackBtns = document.querySelectorAll(`[data-index="${index}"].feedback-btn`) as NodeListOf<HTMLButtonElement>;
      feedbackBtns.forEach(btn => {
        if (btn.getAttribute('data-feedback') === feedback) {
          btn.style.color = '#007bff';
          btn.style.background = '#e3f2fd';
        } else {
          btn.style.color = '#6c757d';
          btn.style.background = 'transparent';
        }
      });
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }

  private showSuggestionsStatus(message: string, type: 'info' | 'success' | 'error'): void {
    this.elements.suggestionsStatus.className = `suggestions-status ${type}`;
    this.elements.suggestionsStatusText.textContent = message;

    const statusIcon = this.elements.suggestionsStatus.querySelector('.status-icon') as HTMLElement;
    switch (type) {
      case 'success':
        statusIcon.textContent = '✅';
        break;
      case 'error':
        statusIcon.textContent = '❌';
        break;
      default:
        statusIcon.textContent = 'ℹ️';
    }

    this.elements.suggestionsStatus.classList.remove('hidden');
  }

  private hideSuggestionsStatus(): void {
    this.elements.suggestionsStatus.classList.add('hidden');
  }

  private async generateAISuggestions(): Promise<void> {
    this.elements.suggestionsLoading.classList.remove('hidden');
    this.elements.generateSuggestionsBtn.disabled = true;
    this.elements.generateSuggestionsBtn.textContent = '生成中...';
    this.showSuggestionsStatus('正在分析页面内容...', 'info');

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('无法获取当前标签页');
      }

      this.showSuggestionsStatus('正在生成AI建议...', 'info');

      const response = await chrome.runtime.sendMessage({
        action: 'generateAISuggestions',
        tabId: tab.id
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.suggestions) {
        this.displaySuggestions(response.suggestions);
      } else {
        throw new Error('未收到AI建议数据');
      }
    } catch (error) {
      console.error('Failed to generate suggestions:', error);
      this.showSuggestionsStatus('生成AI建议失败', 'error');

      // Show error in suggestions area
      this.elements.suggestionsList.innerHTML = `
        <div class="suggestion-item" style="border-left-color: #dc3545;">
          <div class="suggestion-header">
            <div class="suggestion-title">
              <span class="suggestion-type-icon">❌</span>
              生成建议失败
            </div>
          </div>
          <div class="suggestion-text">${error instanceof Error ? error.message : '请检查网络连接后重试'}</div>
          <div class="suggestion-meta">
            <button class="btn btn-sm btn-secondary" onclick="location.reload()">重新尝试</button>
          </div>
        </div>
      `;
      this.elements.suggestionsList.style.display = 'block';
      this.elements.noSuggestions.style.display = 'none';

      setTimeout(() => this.hideSuggestionsStatus(), 5000);
    } finally {
      this.elements.suggestionsLoading.classList.add('hidden');
      this.elements.generateSuggestionsBtn.disabled = false;
      this.elements.generateSuggestionsBtn.textContent = '生成建议';
    }
  }



  public exportReport(format: 'pdf' | 'json' = 'pdf', sanitize: boolean = true): void {
    chrome.runtime.sendMessage({
      action: 'exportReport',
      format: format,
      sanitize: sanitize
    });
  }

  private showExportOptions(): void {
    // Create export options modal
    const modal = this.createExportModal();
    document.body.appendChild(modal);

    // Show modal
    modal.classList.add('show');

    // Handle modal close
    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    };

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  private createExportModal(): HTMLElement {
    const modal = document.createElement('div');
    modal.className = 'export-modal';

    modal.innerHTML = `
      <div class="export-modal-content">
        <div class="export-modal-header">
          <h3>导出SEO报告</h3>
          <button class="close-btn" type="button">&times;</button>
        </div>
        
        <div class="export-modal-body">
          <div class="export-section">
            <h4>导出格式</h4>
            <div class="format-options">
              <label class="format-option">
                <input type="radio" name="format" value="pdf" checked>
                <span class="format-label">
                  <strong>PDF报告</strong>
                  <small>完整的可视化报告，适合分享和打印</small>
                </span>
              </label>
              <label class="format-option">
                <input type="radio" name="format" value="json">
                <span class="format-label">
                  <strong>JSON数据</strong>
                  <small>结构化数据，适合进一步分析</small>
                </span>
              </label>
            </div>
          </div>
          
          <div class="export-section">
            <h4>隐私设置</h4>
            <div class="privacy-options">
              <label class="privacy-option">
                <input type="checkbox" id="sanitize-data" checked>
                <span class="privacy-label">
                  <strong>数据脱敏</strong>
                  <small>移除或遮蔽敏感信息（邮箱、电话、令牌等）</small>
                </span>
              </label>
              <label class="privacy-option">
                <input type="checkbox" id="sanitize-urls" checked>
                <span class="privacy-label">
                  <strong>URL清理</strong>
                  <small>移除URL中的查询参数和敏感路径</small>
                </span>
              </label>
            </div>
          </div>
        </div>
        
        <div class="export-modal-footer">
          <button class="btn btn-secondary cancel-btn" type="button">取消</button>
          <button class="btn btn-primary export-confirm-btn" type="button">导出报告</button>
        </div>
      </div>
    `;

    // Add event listeners
    const closeBtn = modal.querySelector('.close-btn') as HTMLButtonElement;
    const cancelBtn = modal.querySelector('.cancel-btn') as HTMLButtonElement;
    const exportBtn = modal.querySelector('.export-confirm-btn') as HTMLButtonElement;

    const closeModal = () => {
      modal.classList.remove('show');
      setTimeout(() => {
        if (modal.parentNode) {
          document.body.removeChild(modal);
        }
      }, 300);
    };

    closeBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);

    exportBtn.addEventListener('click', () => {
      const formatRadios = modal.querySelectorAll('input[name="format"]') as NodeListOf<HTMLInputElement>;
      const sanitizeCheckbox = modal.querySelector('#sanitize-data') as HTMLInputElement;

      let selectedFormat: 'pdf' | 'json' = 'pdf';
      formatRadios.forEach(radio => {
        if (radio.checked) {
          selectedFormat = radio.value as 'pdf' | 'json';
        }
      });

      const sanitize = sanitizeCheckbox.checked;

      // Show loading state
      exportBtn.disabled = true;
      exportBtn.textContent = '导出中...';

      // Perform export
      this.exportReport(selectedFormat, sanitize);

      // Close modal after a short delay
      setTimeout(() => {
        closeModal();
      }, 1000);
    });

    return modal;
  }

  private openDetailedReport(): void {
    chrome.runtime.sendMessage({ action: 'openDetailedReport' });
  }

  private refreshAnalysis(): void {
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }

  private setActiveFilter(filter: string): void {
    this.currentFilter = filter;
    this.elements.filterTabs.forEach(tab => {
      if (tab.getAttribute('data-filter') === filter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  private showIssueDetails(issue: SEOIssue): void {
    // For now, just log the issue details
    // In a more complete implementation, this could open a modal or detailed view
    console.log('Issue details:', issue);

    // Simple alert for demonstration
    alert(`${issue.title}\n\n${issue.description}\n\n推荐: ${issue.recommendation}`);
  }

  private showLoading(): void {
    this.elements.loading.classList.remove('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.mainContent.classList.add('hidden');
  }

  private showError(message: string): void {
    this.elements.errorMessage.textContent = message;
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.remove('hidden');
    this.elements.mainContent.classList.add('hidden');
  }

  private showMainContent(): void {
    this.elements.loading.classList.add('hidden');
    this.elements.error.classList.add('hidden');
    this.elements.mainContent.classList.remove('hidden');
  }

  private updateScoreColor(element: HTMLElement, score: number): void {
    element.classList.remove('warning', 'danger');
    if (score < 50) {
      element.classList.add('danger');
    } else if (score < 80) {
      element.classList.add('warning');
    }
  }

  private getSeverityText(severity: string): string {
    const severityMap: Record<string, string> = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低'
    };
    return severityMap[severity] || severity;
  }

  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return '刚刚';
    } else if (minutes < 60) {
      return `${minutes}分钟前`;
    } else {
      const hours = Math.floor(minutes / 60);
      if (hours < 24) {
        return `${hours}小时前`;
      } else {
        return date.toLocaleDateString();
      }
    }
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new PopupUI();
  popup.initializeUI();
});