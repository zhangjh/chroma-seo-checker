// Batch Check UI Controller
import { SEOReport, SEOScore, SEOIssue } from '../../types/seo';
import { BatchResults, BatchSummary } from '../../types/components';

interface BatchCheckUIElements {
  // Navigation
  backBtn: HTMLButtonElement;
  helpBtn: HTMLButtonElement;
  
  // URL Input
  urlCount: HTMLElement;
  methodTabs: NodeListOf<HTMLButtonElement>;
  inputMethods: NodeListOf<HTMLElement>;
  singleUrlInput: HTMLInputElement;
  addSingleUrlBtn: HTMLButtonElement;
  bulkUrlInput: HTMLTextAreaElement;
  addBulkUrlsBtn: HTMLButtonElement;
  sitemapUrlInput: HTMLInputElement;
  importSitemapBtn: HTMLButtonElement;
  
  // URL List
  emptyList: HTMLElement;
  urlList: HTMLElement;
  selectAllUrls: HTMLInputElement;
  urlItems: HTMLElement;
  clearAllUrlsBtn: HTMLButtonElement;
  removeSelectedBtn: HTMLButtonElement;
  
  // Batch Controls
  concurrentLimit: HTMLSelectElement;
  delayBetween: HTMLSelectElement;
  startBatchCheckBtn: HTMLButtonElement;
  pauseBatchCheckBtn: HTMLButtonElement;
  stopBatchCheckBtn: HTMLButtonElement;
  
  // Progress
  progressSection: HTMLElement;
  progressCurrent: HTMLElement;
  progressTotal: HTMLElement;
  progressFill: HTMLElement;
  progressPercent: HTMLElement;
  completedCount: HTMLElement;
  failedCount: HTMLElement;
  estimatedTime: HTMLElement;
  currentUrl: HTMLElement;
  
  // Results
  resultsSection: HTMLElement;
  exportResultsBtn: HTMLButtonElement;
  viewSummaryBtn: HTMLButtonElement;
  avgScore: HTMLElement;
  totalCritical: HTMLElement;
  totalHigh: HTMLElement;
  successRate: HTMLElement;
  sortResults: HTMLSelectElement;
  filterResults: HTMLSelectElement;
  resultsList: HTMLElement;
}

interface BatchCheckURL {
  id: string;
  url: string;
  status: 'pending' | 'checking' | 'completed' | 'failed';
  result?: SEOReport;
  error?: string;
}

interface BatchCheckProgress {
  total: number;
  completed: number;
  failed: number;
  current: number;
  startTime: Date;
  estimatedEndTime?: Date;
}

class BatchCheckUI {
  private elements: BatchCheckUIElements;
  private urls: BatchCheckURL[] = [];
  private currentMethod: string = 'single';
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private progress: BatchCheckProgress | null = null;
  private batchResults: BatchResults | null = null;

  constructor() {
    this.elements = this.getUIElements();
    this.initializeEventListeners();
    this.updateUI();
  }

  private getUIElements(): BatchCheckUIElements {
    return {
      backBtn: document.getElementById('back-btn') as HTMLButtonElement,
      helpBtn: document.getElementById('help-btn') as HTMLButtonElement,
      
      urlCount: document.getElementById('url-count')!,
      methodTabs: document.querySelectorAll('.method-tab'),
      inputMethods: document.querySelectorAll('.input-method'),
      singleUrlInput: document.getElementById('single-url-input') as HTMLInputElement,
      addSingleUrlBtn: document.getElementById('add-single-url') as HTMLButtonElement,
      bulkUrlInput: document.getElementById('bulk-url-input') as HTMLTextAreaElement,
      addBulkUrlsBtn: document.getElementById('add-bulk-urls') as HTMLButtonElement,
      sitemapUrlInput: document.getElementById('sitemap-url') as HTMLInputElement,
      importSitemapBtn: document.getElementById('import-sitemap') as HTMLButtonElement,
      
      emptyList: document.getElementById('empty-list')!,
      urlList: document.getElementById('url-list')!,
      selectAllUrls: document.getElementById('select-all-urls') as HTMLInputElement,
      urlItems: document.getElementById('url-items')!,
      clearAllUrlsBtn: document.getElementById('clear-all-urls') as HTMLButtonElement,
      removeSelectedBtn: document.getElementById('remove-selected') as HTMLButtonElement,
      
      concurrentLimit: document.getElementById('concurrent-limit') as HTMLSelectElement,
      delayBetween: document.getElementById('delay-between') as HTMLSelectElement,
      startBatchCheckBtn: document.getElementById('start-batch-check') as HTMLButtonElement,
      pauseBatchCheckBtn: document.getElementById('pause-batch-check') as HTMLButtonElement,
      stopBatchCheckBtn: document.getElementById('stop-batch-check') as HTMLButtonElement,
      
      progressSection: document.getElementById('progress-section')!,
      progressCurrent: document.getElementById('progress-current')!,
      progressTotal: document.getElementById('progress-total')!,
      progressFill: document.getElementById('progress-fill')!,
      progressPercent: document.getElementById('progress-percent')!,
      completedCount: document.getElementById('completed-count')!,
      failedCount: document.getElementById('failed-count')!,
      estimatedTime: document.getElementById('estimated-time')!,
      currentUrl: document.getElementById('current-url')!,
      
      resultsSection: document.getElementById('results-section')!,
      exportResultsBtn: document.getElementById('export-results') as HTMLButtonElement,
      viewSummaryBtn: document.getElementById('view-summary') as HTMLButtonElement,
      avgScore: document.getElementById('avg-score')!,
      totalCritical: document.getElementById('total-critical')!,
      totalHigh: document.getElementById('total-high')!,
      successRate: document.getElementById('success-rate')!,
      sortResults: document.getElementById('sort-results') as HTMLSelectElement,
      filterResults: document.getElementById('filter-results') as HTMLSelectElement,
      resultsList: document.getElementById('results-list')!,
    };
  }

  private initializeEventListeners(): void {
    // Navigation
    this.elements.backBtn.addEventListener('click', () => {
      this.goBack();
    });

    this.elements.helpBtn.addEventListener('click', () => {
      this.showHelp();
    });

    // Method tabs
    this.elements.methodTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const method = tab.getAttribute('data-method') || 'single';
        this.switchInputMethod(method);
      });
    });

    // URL input
    this.elements.addSingleUrlBtn.addEventListener('click', () => {
      this.addSingleURL();
    });

    this.elements.singleUrlInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.addSingleURL();
      }
    });

    this.elements.addBulkUrlsBtn.addEventListener('click', () => {
      this.addBulkURLs();
    });

    this.elements.importSitemapBtn.addEventListener('click', () => {
      this.importFromSitemap();
    });

    // URL list management
    this.elements.selectAllUrls.addEventListener('change', () => {
      this.toggleSelectAll();
    });

    this.elements.clearAllUrlsBtn.addEventListener('click', () => {
      this.clearAllURLs();
    });

    this.elements.removeSelectedBtn.addEventListener('click', () => {
      this.removeSelectedURLs();
    });

    // Batch controls
    this.elements.startBatchCheckBtn.addEventListener('click', () => {
      this.startBatchCheck();
    });

    this.elements.pauseBatchCheckBtn.addEventListener('click', () => {
      this.pauseBatchCheck();
    });

    this.elements.stopBatchCheckBtn.addEventListener('click', () => {
      this.stopBatchCheck();
    });

    // Results
    this.elements.exportResultsBtn.addEventListener('click', () => {
      this.exportResults();
    });

    this.elements.viewSummaryBtn.addEventListener('click', () => {
      this.viewSummary();
    });

    this.elements.sortResults.addEventListener('change', () => {
      this.sortResults();
    });

    this.elements.filterResults.addEventListener('change', () => {
      this.filterResults();
    });
  }

  private switchInputMethod(method: string): void {
    this.currentMethod = method;

    // Update tabs
    this.elements.methodTabs.forEach(tab => {
      if (tab.getAttribute('data-method') === method) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });

    // Update input methods
    this.elements.inputMethods.forEach(inputMethod => {
      if (inputMethod.getAttribute('data-method') === method) {
        inputMethod.classList.add('active');
      } else {
        inputMethod.classList.remove('active');
      }
    });
  }

  private addSingleURL(): void {
    const url = this.elements.singleUrlInput.value.trim();
    if (!url) return;

    if (!this.isValidURL(url)) {
      alert('请输入有效的URL');
      return;
    }

    if (this.urls.some(u => u.url === url)) {
      alert('该URL已存在');
      return;
    }

    this.urls.push({
      id: this.generateId(),
      url: url,
      status: 'pending'
    });

    this.elements.singleUrlInput.value = '';
    this.updateUI();
  }

  private addBulkURLs(): void {
    const text = this.elements.bulkUrlInput.value.trim();
    if (!text) return;

    const urls = text.split('\n')
      .map(line => line.trim())
      .filter(line => line && this.isValidURL(line))
      .filter(url => !this.urls.some(u => u.url === url));

    if (urls.length === 0) {
      alert('没有找到有效的URL');
      return;
    }

    urls.forEach(url => {
      this.urls.push({
        id: this.generateId(),
        url: url,
        status: 'pending'
      });
    });

    this.elements.bulkUrlInput.value = '';
    this.updateUI();
    alert(`成功添加 ${urls.length} 个URL`);
  }

  private async importFromSitemap(): Promise<void> {
    const sitemapUrl = this.elements.sitemapUrlInput.value.trim();
    if (!sitemapUrl) return;

    if (!this.isValidURL(sitemapUrl)) {
      alert('请输入有效的sitemap URL');
      return;
    }

    this.elements.importSitemapBtn.disabled = true;
    this.elements.importSitemapBtn.textContent = '导入中...';

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'importSitemap',
        sitemapUrl: sitemapUrl
      });

      if (response.error) {
        throw new Error(response.error);
      }

      const newUrls = response.urls.filter((url: string) => 
        !this.urls.some(u => u.url === url)
      );

      newUrls.forEach((url: string) => {
        this.urls.push({
          id: this.generateId(),
          url: url,
          status: 'pending'
        });
      });

      this.elements.sitemapUrlInput.value = '';
      this.updateUI();
      alert(`从sitemap导入了 ${newUrls.length} 个URL`);
    } catch (error) {
      console.error('Failed to import sitemap:', error);
      alert(`导入失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      this.elements.importSitemapBtn.disabled = false;
      this.elements.importSitemapBtn.textContent = '导入';
    }
  }

  private async startBatchCheck(): Promise<void> {
    if (this.urls.length === 0) {
      alert('请先添加要检查的URL');
      return;
    }

    const pendingUrls = this.urls.filter(u => u.status === 'pending');
    if (pendingUrls.length === 0) {
      alert('没有待检查的URL');
      return;
    }

    this.isRunning = true;
    this.isPaused = false;
    this.progress = {
      total: pendingUrls.length,
      completed: 0,
      failed: 0,
      current: 0,
      startTime: new Date()
    };

    this.updateControlButtons();
    this.showProgressSection();

    const concurrentLimit = parseInt(this.elements.concurrentLimit.value);
    const delay = parseInt(this.elements.delayBetween.value);

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startBatchCheck',
        urls: pendingUrls.map(u => u.url),
        options: {
          concurrentLimit,
          delay
        }
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Start monitoring progress
      this.monitorBatchProgress();
    } catch (error) {
      console.error('Failed to start batch check:', error);
      alert(`启动批量检查失败: ${error instanceof Error ? error.message : '未知错误'}`);
      this.stopBatchCheck();
    }
  }

  private async pauseBatchCheck(): Promise<void> {
    this.isPaused = !this.isPaused;
    
    await chrome.runtime.sendMessage({
      action: this.isPaused ? 'pauseBatchCheck' : 'resumeBatchCheck'
    });

    this.updateControlButtons();
  }

  private async stopBatchCheck(): Promise<void> {
    this.isRunning = false;
    this.isPaused = false;

    await chrome.runtime.sendMessage({
      action: 'stopBatchCheck'
    });

    this.updateControlButtons();
    this.hideProgressSection();
  }

  private monitorBatchProgress(): void {
    const checkProgress = async () => {
      if (!this.isRunning) return;

      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getBatchProgress'
        });

        if (response.progress) {
          this.updateProgress(response.progress);
        }

        if (response.completed) {
          this.batchResults = response.results;
          this.completeBatchCheck();
        } else if (this.isRunning) {
          setTimeout(checkProgress, 1000);
        }
      } catch (error) {
        console.error('Failed to get batch progress:', error);
        setTimeout(checkProgress, 2000);
      }
    };

    checkProgress();
  }

  private updateProgress(progressData: any): void {
    if (!this.progress) return;

    this.progress.completed = progressData.completed;
    this.progress.failed = progressData.failed;
    this.progress.current = progressData.current;

    // Update progress display
    this.elements.progressCurrent.textContent = this.progress.completed.toString();
    this.elements.progressTotal.textContent = this.progress.total.toString();
    
    const percentage = Math.round((this.progress.completed / this.progress.total) * 100);
    this.elements.progressFill.style.width = `${percentage}%`;
    this.elements.progressPercent.textContent = `${percentage}%`;
    
    this.elements.completedCount.textContent = this.progress.completed.toString();
    this.elements.failedCount.textContent = this.progress.failed.toString();
    
    if (progressData.currentUrl) {
      this.elements.currentUrl.textContent = progressData.currentUrl;
    }

    // Calculate estimated time
    if (this.progress.completed > 0) {
      const elapsed = Date.now() - this.progress.startTime.getTime();
      const avgTimePerUrl = elapsed / this.progress.completed;
      const remaining = this.progress.total - this.progress.completed;
      const estimatedMs = remaining * avgTimePerUrl;
      
      this.elements.estimatedTime.textContent = this.formatDuration(estimatedMs);
    }

    // Update URL statuses
    if (progressData.urlStatuses) {
      this.updateURLStatuses(progressData.urlStatuses);
    }
  }

  private updateURLStatuses(statuses: Record<string, any>): void {
    Object.entries(statuses).forEach(([url, status]) => {
      const urlItem = this.urls.find(u => u.url === url);
      if (urlItem) {
        urlItem.status = status.status;
        if (status.result) {
          urlItem.result = status.result;
        }
        if (status.error) {
          urlItem.error = status.error;
        }
      }
    });

    this.renderURLList();
  }

  private completeBatchCheck(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.updateControlButtons();
    this.hideProgressSection();
    this.showResultsSection();
  }

  private showProgressSection(): void {
    this.elements.progressSection.classList.remove('hidden');
  }

  private hideProgressSection(): void {
    this.elements.progressSection.classList.add('hidden');
  }

  private showResultsSection(): void {
    if (!this.batchResults) return;

    this.elements.resultsSection.classList.remove('hidden');
    this.updateResultsSummary();
    this.renderResultsList();
  }

  private updateResultsSummary(): void {
    if (!this.batchResults) return;

    const summary = this.batchResults.summary;
    
    this.elements.avgScore.textContent = Math.round(summary.averageScore).toString();
    this.elements.totalCritical.textContent = summary.criticalIssues.toString();
    this.elements.totalHigh.textContent = summary.highPriorityIssues.toString();
    
    const successRate = Math.round((summary.completedPages / summary.totalPages) * 100);
    this.elements.successRate.textContent = `${successRate}%`;
  }

  private renderResultsList(): void {
    if (!this.batchResults) return;

    this.elements.resultsList.innerHTML = '';

    this.batchResults.results.forEach(result => {
      const resultElement = this.createResultElement(result);
      this.elements.resultsList.appendChild(resultElement);
    });
  }

  private createResultElement(result: SEOReport): HTMLElement {
    const element = document.createElement('div');
    element.className = 'result-item';

    const criticalIssues = result.issues.filter(i => i.severity === 'critical').length;
    const highIssues = result.issues.filter(i => i.severity === 'high').length;
    const totalIssues = result.issues.length;

    const scoreClass = result.score.overall >= 80 ? '' : 
                      result.score.overall >= 60 ? 'warning' : 'danger';

    element.innerHTML = `
      <div class="result-header">
        <a href="${result.url}" class="result-url" target="_blank">${result.url}</a>
        <div class="result-score ${scoreClass}">${result.score.overall}</div>
      </div>
      <div class="result-details">
        <div class="result-issues">
          <div class="issue-count critical">
            <span>🔴</span>
            <span>${criticalIssues}</span>
          </div>
          <div class="issue-count high">
            <span>🟡</span>
            <span>${highIssues}</span>
          </div>
          <div class="issue-count total">
            <span>📊</span>
            <span>${totalIssues}</span>
          </div>
        </div>
        <div class="result-actions">
          <button class="btn btn-primary view-details" data-url="${result.url}">查看详情</button>
        </div>
      </div>
    `;

    // Add event listener for view details
    const viewDetailsBtn = element.querySelector('.view-details') as HTMLButtonElement;
    viewDetailsBtn.addEventListener('click', () => {
      this.viewResultDetails(result);
    });

    return element;
  }

  private updateControlButtons(): void {
    if (this.isRunning) {
      this.elements.startBatchCheckBtn.classList.add('hidden');
      this.elements.pauseBatchCheckBtn.classList.remove('hidden');
      this.elements.stopBatchCheckBtn.classList.remove('hidden');
      
      this.elements.pauseBatchCheckBtn.innerHTML = this.isPaused ? 
        '<span class="btn-text">继续检查</span><span class="btn-icon">▶️</span>' :
        '<span class="btn-text">暂停检查</span><span class="btn-icon">⏸️</span>';
    } else {
      this.elements.startBatchCheckBtn.classList.remove('hidden');
      this.elements.pauseBatchCheckBtn.classList.add('hidden');
      this.elements.stopBatchCheckBtn.classList.add('hidden');
    }
  }

  private updateUI(): void {
    // Update URL count
    this.elements.urlCount.textContent = this.urls.length.toString();

    // Update start button state
    this.elements.startBatchCheckBtn.disabled = this.urls.length === 0;

    // Update remove selected button
    const selectedCount = this.getSelectedURLs().length;
    this.elements.removeSelectedBtn.disabled = selectedCount === 0;

    // Show/hide URL list
    if (this.urls.length === 0) {
      this.elements.emptyList.classList.remove('hidden');
      this.elements.urlList.classList.add('hidden');
    } else {
      this.elements.emptyList.classList.add('hidden');
      this.elements.urlList.classList.remove('hidden');
      this.renderURLList();
    }
  }

  private renderURLList(): void {
    this.elements.urlItems.innerHTML = '';

    this.urls.forEach(url => {
      const urlElement = this.createURLElement(url);
      this.elements.urlItems.appendChild(urlElement);
    });
  }

  private createURLElement(url: BatchCheckURL): HTMLElement {
    const element = document.createElement('div');
    element.className = 'url-item';
    element.setAttribute('data-id', url.id);

    element.innerHTML = `
      <label class="checkbox-container">
        <input type="checkbox" class="url-checkbox">
        <span class="checkmark"></span>
      </label>
      <div class="url-text">${url.url}</div>
      <div class="url-status ${url.status}">${this.getStatusText(url.status)}</div>
      <div class="url-actions">
        <button class="action-btn remove" data-id="${url.id}">删除</button>
      </div>
    `;

    // Add event listeners
    const checkbox = element.querySelector('.url-checkbox') as HTMLInputElement;
    checkbox.addEventListener('change', () => {
      this.updateRemoveSelectedButton();
    });

    const removeBtn = element.querySelector('.remove') as HTMLButtonElement;
    removeBtn.addEventListener('click', () => {
      this.removeURL(url.id);
    });

    return element;
  }

  private getStatusText(status: string): string {
    const statusMap: Record<string, string> = {
      pending: '待检查',
      checking: '检查中',
      completed: '已完成',
      failed: '失败'
    };
    return statusMap[status] || status;
  }

  private removeURL(id: string): void {
    this.urls = this.urls.filter(u => u.id !== id);
    this.updateUI();
  }

  private clearAllURLs(): void {
    if (this.urls.length === 0) return;
    
    if (confirm('确定要清空所有URL吗？')) {
      this.urls = [];
      this.updateUI();
    }
  }

  private removeSelectedURLs(): void {
    const selectedIds = this.getSelectedURLs().map(u => u.id);
    if (selectedIds.length === 0) return;

    if (confirm(`确定要删除选中的 ${selectedIds.length} 个URL吗？`)) {
      this.urls = this.urls.filter(u => !selectedIds.includes(u.id));
      this.updateUI();
    }
  }

  private getSelectedURLs(): BatchCheckURL[] {
    const checkboxes = document.querySelectorAll('.url-checkbox:checked') as NodeListOf<HTMLInputElement>;
    const selectedIds: string[] = [];
    
    checkboxes.forEach(checkbox => {
      const urlItem = checkbox.closest('.url-item');
      if (urlItem) {
        const id = urlItem.getAttribute('data-id');
        if (id) selectedIds.push(id);
      }
    });

    return this.urls.filter(u => selectedIds.includes(u.id));
  }

  private toggleSelectAll(): void {
    const checkboxes = document.querySelectorAll('.url-checkbox') as NodeListOf<HTMLInputElement>;
    const isChecked = this.elements.selectAllUrls.checked;
    
    checkboxes.forEach(checkbox => {
      checkbox.checked = isChecked;
    });

    this.updateRemoveSelectedButton();
  }

  private updateRemoveSelectedButton(): void {
    const selectedCount = this.getSelectedURLs().length;
    this.elements.removeSelectedBtn.disabled = selectedCount === 0;
  }

  private sortResults(): void {
    // Implementation for sorting results
    console.log('Sort results:', this.elements.sortResults.value);
  }

  private filterResults(): void {
    // Implementation for filtering results
    console.log('Filter results:', this.elements.filterResults.value);
  }

  private exportResults(): void {
    if (!this.batchResults) return;

    chrome.runtime.sendMessage({
      action: 'exportBatchResults',
      results: this.batchResults
    });
  }

  private viewSummary(): void {
    if (!this.batchResults) return;

    // Show detailed summary modal or page
    console.log('View summary:', this.batchResults.summary);
  }

  private viewResultDetails(result: SEOReport): void {
    // Open detailed report for specific result
    chrome.runtime.sendMessage({
      action: 'openDetailedReport',
      reportId: result.id
    });
  }

  private goBack(): void {
    // Return to main popup
    window.close();
  }

  private showHelp(): void {
    // Show help information
    alert('批量SEO检查帮助:\n\n1. 添加要检查的URL\n2. 设置并发数量和间隔时间\n3. 点击开始批量检查\n4. 查看检查结果和导出报告');
  }

  private isValidURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}小时${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  }
}

// Initialize batch check UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new BatchCheckUI();
});