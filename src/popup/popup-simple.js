// Simple popup script without modules
console.log('SEO Checker: Popup script loaded');

// Simple UI controller
class SimplePopupUI {
  constructor() {
    this.elements = this.getUIElements();
    this.currentFilter = 'all';
    this.initializeEventListeners();
  }

  getUIElements() {
    return {
      loading: document.getElementById('loading'),
      error: document.getElementById('error'),
      errorMessage: document.getElementById('error-message'),
      mainContent: document.getElementById('main-content'),
      
      // Progress elements
      loadingMessage: document.getElementById('loading-message'),
      progressFill: document.getElementById('progress-fill'),
      progressText: document.getElementById('progress-text'),
      currentStep: document.getElementById('current-step'),
      stepCounter: document.getElementById('step-counter'),
      
      overallScore: document.getElementById('overall-score'),
      technicalScore: document.getElementById('technical-score'),
      contentScore: document.getElementById('content-score'),
      performanceScore: document.getElementById('performance-score'),
      technicalFill: document.getElementById('technical-fill'),
      contentFill: document.getElementById('content-fill'),
      performanceFill: document.getElementById('performance-fill'),
      
      criticalIssues: document.getElementById('critical-issues'),
      highIssues: document.getElementById('high-issues'),
      totalIssues: document.getElementById('total-issues'),
      lastCheckedTime: document.getElementById('last-checked-time'),
      
      issuesList: document.getElementById('issues-list'),
      noIssues: document.getElementById('no-issues'),
      filterTabs: document.querySelectorAll('.tab-btn'),
      
      suggestionsContent: document.getElementById('suggestions-content'),
      suggestionsStatus: document.getElementById('suggestions-status'),
      suggestionsStatusText: document.getElementById('suggestions-status-text'),
      suggestionsLoading: document.getElementById('suggestions-loading'),
      suggestionsList: document.getElementById('suggestions-list'),
      noSuggestions: document.getElementById('no-suggestions'),
      
      refreshBtn: document.getElementById('refresh-btn'),
      retryBtn: document.getElementById('retry-btn'),
      generateSuggestionsBtn: document.getElementById('generate-suggestions'),
      detailedReportBtn: document.getElementById('detailed-report-btn'),
      exportBtn: document.getElementById('export-btn'),
      testBtn: document.getElementById('test-btn')
    };
  }

  initializeEventListeners() {
    // Refresh button
    if (this.elements.refreshBtn) {
      this.elements.refreshBtn.addEventListener('click', () => {
        this.refreshAnalysis();
      });
    }

    // Retry button
    if (this.elements.retryBtn) {
      this.elements.retryBtn.addEventListener('click', () => {
        this.refreshAnalysis();
      });
    }

    // Filter tabs
    this.elements.filterTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const filter = tab.getAttribute('data-filter') || 'all';
        this.setActiveFilter(filter);
        this.filterIssues(filter);
      });
    });

    // Generate suggestions button
    if (this.elements.generateSuggestionsBtn) {
      this.elements.generateSuggestionsBtn.addEventListener('click', () => {
        this.generateAISuggestions();
      });
    }

    // Action buttons
    if (this.elements.detailedReportBtn) {
      this.elements.detailedReportBtn.addEventListener('click', () => {
        this.openDetailedReport();
      });
    }

    if (this.elements.exportBtn) {
      this.elements.exportBtn.addEventListener('click', () => {
        this.showExportOptions();
      });
    }

    // Test button for debugging
    if (this.elements.testBtn) {
      this.elements.testBtn.addEventListener('click', () => {
        console.log('SEO Checker: Test button clicked');
        this.createMockAnalysisResult();
      });
    }
  }

  initializeUI() {
    console.log('SEO Checker: Initializing UI');
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }

  async loadCurrentPageAnalysis() {
    try {
      console.log('SEO Checker: Loading current page analysis');
      
      // First test if background script is responsive
      console.log('SEO Checker: Testing background script connection...');
      try {
        const pingResponse = await chrome.runtime.sendMessage({ action: 'ping' });
        console.log('SEO Checker: Background ping response:', pingResponse);
      } catch (pingError) {
        console.error('SEO Checker: Background script not responsive:', pingError);
        throw new Error('后台脚本无响应，请重新加载扩展');
      }
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      console.log('SEO Checker: Current tab:', tab);

      if (!tab.id) {
        throw new Error('无法获取当前标签页');
      }

      // Check if the current page is a valid web page
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        throw new Error('当前页面不是有效的网页，SEO分析仅支持HTTP/HTTPS页面');
      }

      // Request analysis from background script
      console.log('SEO Checker: Requesting analysis from background script');
      let response;
      try {
        response = await chrome.runtime.sendMessage({
          action: 'getPageAnalysis',
          tabId: tab.id
        });
        console.log('SEO Checker: Background response:', response);
      } catch (messageError) {
        console.error('SEO Checker: Failed to send message to background:', messageError);
        throw new Error('无法与后台脚本通信，请重新加载扩展');
      }

      if (!response) {
        console.error('SEO Checker: No response from background script');
        throw new Error('后台脚本无响应，请重新加载扩展');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.report) {
        console.log('SEO Checker: Found cached report, displaying results');
        this.displaySEOScore(response.report.score);
        this.showQuickReport({
          score: response.report.score,
          criticalIssues: response.report.issues.filter(i => i.severity === 'critical').length,
          highPriorityIssues: response.report.issues.filter(i => i.severity === 'high').length,
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
      console.error('SEO Checker: Failed to load analysis:', error);
      this.showError(error instanceof Error ? error.message : '加载分析结果失败');
    }
  }

  async triggerNewAnalysis(tabId) {
    try {
      console.log('SEO Checker: Triggering new analysis for tab:', tabId);
      
      // 显示初始进度
      this.updateProgress({ step: 1, message: '正在启动SEO分析...', progress: 5 });
      
      // 首先测试content脚本是否可用
      console.log('SEO Checker: Testing content script connection...');
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
        console.log('SEO Checker: Content script is responsive');
      } catch (contentError) {
        console.error('SEO Checker: Content script not responsive:', contentError);
        throw new Error('页面内容脚本未加载，请刷新页面后重试');
      }
      
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

  waitForAnalysisCompletion(tabId) {
    let checkCount = 0;
    const maxChecks = 30; // 30 seconds max
    const steps = [
      { step: 1, message: '正在连接到页面...', progress: 10 },
      { step: 2, message: '正在分析页面元数据...', progress: 25 },
      { step: 3, message: '正在分析标题结构...', progress: 45 },
      { step: 4, message: '正在分析页面内容...', progress: 65 },
      { step: 5, message: '正在分析图片和性能...', progress: 85 },
      { step: 6, message: '正在生成分析报告...', progress: 95 }
    ];
    
    let currentStepIndex = 0;
    
    // 开始显示进度
    this.updateProgress(steps[0]);
    
    const checkInterval = setInterval(async () => {
      try {
        checkCount++;
        console.log(`SEO Checker: Checking analysis status (${checkCount}/${maxChecks})`);
        
        // 更新进度显示（模拟进度）
        if (checkCount <= steps.length && currentStepIndex < steps.length - 1) {
          if (checkCount % 3 === 0) { // 每3秒更新一次步骤
            currentStepIndex++;
            this.updateProgress(steps[currentStepIndex]);
          }
        }
        
        const response = await chrome.runtime.sendMessage({
          action: 'getAnalysisStatus',
          tabId: tabId
        });
        
        console.log('SEO Checker: Analysis status response:', response);

        if (response.completed && response.report) {
          console.log('SEO Checker: Analysis completed successfully');
          clearInterval(checkInterval);
          
          // 显示完成状态
          this.updateProgress({ step: 6, message: '分析完成！', progress: 100 });
          
          // 短暂延迟后显示结果
          setTimeout(() => {
            this.displaySEOScore(response.report.score);
            this.showQuickReport({
              score: response.report.score,
              criticalIssues: response.report.issues.filter(i => i.severity === 'critical').length,
              highPriorityIssues: response.report.issues.filter(i => i.severity === 'high').length,
              totalIssues: response.report.issues.length,
              lastChecked: new Date(response.report.timestamp)
            });
            this.displayIssues(response.report.issues);
          }, 500);
        } else if (response.error) {
          console.error('SEO Checker: Analysis failed with error:', response.error);
          clearInterval(checkInterval);
          this.showError(response.error);
        } else if (checkCount >= maxChecks) {
          console.error('SEO Checker: Analysis timed out after', maxChecks, 'checks');
          clearInterval(checkInterval);
          this.showError('分析超时，请重试');
        } else {
          console.log('SEO Checker: Analysis still in progress...');
          
          // 如果分析正在运行，显示相应的消息
          if (response.running) {
            // 如果有真实的进度信息，使用它
            if (response.progress) {
              this.updateProgress(response.progress);
              currentStepIndex = response.progress.step - 1; // 同步步骤索引
            } else if (currentStepIndex < steps.length - 1) {
              // 继续显示当前步骤
            } else {
              // 如果已经到最后一步，显示等待完成
              this.updateProgress({ 
                step: 6, 
                message: '正在完成分析，请稍候...', 
                progress: 90 + (checkCount % 10) 
              });
            }
          }
        }
      } catch (error) {
        console.error('SEO Checker: Error checking analysis status:', error);
        clearInterval(checkInterval);
        this.showError('检查分析状态失败: ' + error.message);
      }
    }, 1000);
  }

  updateProgress(stepInfo) {
    if (this.elements.progressFill) {
      this.elements.progressFill.style.width = `${stepInfo.progress}%`;
    }
    
    if (this.elements.progressText) {
      this.elements.progressText.textContent = `${stepInfo.progress}%`;
    }
    
    if (this.elements.currentStep) {
      this.elements.currentStep.textContent = stepInfo.message;
    }
    
    if (this.elements.stepCounter) {
      this.elements.stepCounter.textContent = `第 ${stepInfo.step} 步，共 6 步`;
    }
    
    console.log(`SEO Checker: Progress updated - Step ${stepInfo.step}: ${stepInfo.message} (${stepInfo.progress}%)`);
  }

  displaySEOScore(score) {
    // Update overall score
    if (this.elements.overallScore) {
      this.elements.overallScore.textContent = score.overall.toString();
      this.updateScoreColor(this.elements.overallScore, score.overall);
    }

    // Update breakdown scores
    if (this.elements.technicalScore) {
      this.elements.technicalScore.textContent = score.technical.toString();
    }
    if (this.elements.contentScore) {
      this.elements.contentScore.textContent = score.content.toString();
    }
    if (this.elements.performanceScore) {
      this.elements.performanceScore.textContent = score.performance.toString();
    }

    // Update progress bars
    if (this.elements.technicalFill) {
      this.elements.technicalFill.style.width = `${score.technical}%`;
    }
    if (this.elements.contentFill) {
      this.elements.contentFill.style.width = `${score.content}%`;
    }
    if (this.elements.performanceFill) {
      this.elements.performanceFill.style.width = `${score.performance}%`;
    }

    this.showMainContent();
  }

  showQuickReport(report) {
    if (this.elements.criticalIssues) {
      this.elements.criticalIssues.textContent = report.criticalIssues.toString();
    }
    if (this.elements.highIssues) {
      this.elements.highIssues.textContent = report.highPriorityIssues.toString();
    }
    if (this.elements.totalIssues) {
      this.elements.totalIssues.textContent = report.totalIssues.toString();
    }
    if (this.elements.lastCheckedTime) {
      this.elements.lastCheckedTime.textContent = this.formatTime(report.lastChecked);
    }
  }

  displayIssues(issues) {
    this.currentIssues = issues;
    this.filterIssues(this.currentFilter);
  }

  filterIssues(filter) {
    let filteredIssues = this.currentIssues || [];

    if (filter !== 'all') {
      filteredIssues = filteredIssues.filter(issue => issue.severity === filter);
    }

    if (filteredIssues.length === 0) {
      if (this.elements.issuesList) {
        this.elements.issuesList.style.display = 'none';
      }
      if (this.elements.noIssues) {
        this.elements.noIssues.classList.remove('hidden');
      }
    } else {
      if (this.elements.issuesList) {
        this.elements.issuesList.style.display = 'block';
      }
      if (this.elements.noIssues) {
        this.elements.noIssues.classList.add('hidden');
      }
      this.renderIssuesList(filteredIssues);
    }
  }

  renderIssuesList(issues) {
    if (!this.elements.issuesList) return;
    
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

  displaySuggestions(suggestions) {
    // Simple suggestions display
    console.log('SEO Checker: Displaying suggestions:', suggestions);
  }

  async generateAISuggestions() {
    console.log('SEO Checker: Generating AI suggestions');
    // TODO: Implement AI suggestions
  }

  refreshAnalysis() {
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }

  // 测试方法：创建模拟的分析结果
  createMockAnalysisResult() {
    console.log('SEO Checker: Creating mock analysis result for testing');
    
    const mockReport = {
      score: {
        overall: 75,
        technical: 80,
        content: 70,
        performance: 75
      },
      issues: [
        {
          title: '缺少Meta描述',
          description: '页面没有Meta描述标签，这会影响搜索引擎结果页面的显示',
          severity: 'high',
          recommendation: '添加一个150-160字符的Meta描述'
        },
        {
          title: '图片缺少Alt属性',
          description: '发现3张图片没有Alt属性',
          severity: 'medium',
          recommendation: '为所有图片添加描述性的Alt属性'
        }
      ],
      timestamp: new Date()
    };

    this.displaySEOScore(mockReport.score);
    this.showQuickReport({
      score: mockReport.score,
      criticalIssues: mockReport.issues.filter(i => i.severity === 'critical').length,
      highPriorityIssues: mockReport.issues.filter(i => i.severity === 'high').length,
      totalIssues: mockReport.issues.length,
      lastChecked: mockReport.timestamp
    });
    this.displayIssues(mockReport.issues);
  }

  openDetailedReport() {
    chrome.runtime.sendMessage({ action: 'openDetailedReport' });
  }

  showExportOptions() {
    console.log('SEO Checker: Show export options');
    // TODO: Implement export options
  }

  setActiveFilter(filter) {
    this.currentFilter = filter;
    this.elements.filterTabs.forEach(tab => {
      if (tab.getAttribute('data-filter') === filter) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  }

  showIssueDetails(issue) {
    console.log('SEO Checker: Issue details:', issue);
    alert(`${issue.title}\n\n${issue.description}\n\n推荐: ${issue.recommendation || '无'}`);
  }

  showLoading() {
    if (this.elements.loading) {
      this.elements.loading.classList.remove('hidden');
    }
    if (this.elements.error) {
      this.elements.error.classList.add('hidden');
    }
    if (this.elements.mainContent) {
      this.elements.mainContent.classList.add('hidden');
    }
    
    // 重置进度显示
    this.updateProgress({ step: 0, message: '准备开始分析...', progress: 0 });
  }

  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
    }
    if (this.elements.loading) {
      this.elements.loading.classList.add('hidden');
    }
    if (this.elements.error) {
      this.elements.error.classList.remove('hidden');
    }
    if (this.elements.mainContent) {
      this.elements.mainContent.classList.add('hidden');
    }
  }

  showMainContent() {
    if (this.elements.loading) {
      this.elements.loading.classList.add('hidden');
    }
    if (this.elements.error) {
      this.elements.error.classList.add('hidden');
    }
    if (this.elements.mainContent) {
      this.elements.mainContent.classList.remove('hidden');
    }
  }

  updateScoreColor(element, score) {
    element.classList.remove('warning', 'danger');
    if (score < 50) {
      element.classList.add('danger');
    } else if (score < 80) {
      element.classList.add('warning');
    }
  }

  getSeverityText(severity) {
    const severityMap = {
      critical: '严重',
      high: '高',
      medium: '中',
      low: '低'
    };
    return severityMap[severity] || severity;
  }

  formatTime(date) {
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
  console.log('SEO Checker: DOM loaded, initializing popup');
  const popup = new SimplePopupUI();
  popup.initializeUI();
});