// SEO Checker Popup Script

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


  }

  initializeUI() {
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }

  async loadCurrentPageAnalysis() {
    try {
      // Test if background script is responsive
      try {
        const pingResponse = await chrome.runtime.sendMessage({ action: 'ping' });
      } catch (pingError) {
        throw new Error('后台脚本无响应，请重新加载扩展');
      }
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('无法获取当前标签页');
      }

      // Check if the current page is a valid web page
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        throw new Error('当前页面不是有效的网页，SEO分析仅支持HTTP/HTTPS页面');
      }

      // Request analysis from background script
      let response;
      try {
        response = await chrome.runtime.sendMessage({
          action: 'getPageAnalysis',
          tabId: tab.id
        });
      } catch (messageError) {
        throw new Error('无法与后台脚本通信，请重新加载扩展');
      }

      if (!response) {
        throw new Error('后台脚本无响应，请重新加载扩展');
      }

      if (response.error) {
        throw new Error(response.error);
      }

      if (response.report) {
        this.displaySEOScore(response.report.score);
        this.showQuickReport({
          score: response.report.score,
          criticalIssues: response.report.issues.filter(i => i.severity === 'critical').length,
          highPriorityIssues: response.report.issues.filter(i => i.severity === 'high').length,
          totalIssues: response.report.issues.length
        });
        this.displayIssues(response.report.issues);

        if (response.report.suggestions) {
          this.displaySuggestions(response.report.suggestions);
        }
      } else {
        // No cached analysis, trigger new analysis
        this.triggerNewAnalysis(tab.id);
      }
    } catch (error) {
      this.showError(error instanceof Error ? error.message : '加载分析结果失败');
    }
  }

  async triggerNewAnalysis(tabId) {
    try {
      // 显示初始进度
      this.updateProgress({ step: 1, message: '正在启动SEO分析...', progress: 5 });
      
      // 测试content脚本是否可用
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      } catch (contentError) {
        throw new Error('页面内容脚本未加载，请刷新页面后重试');
      }
      
      const response = await chrome.runtime.sendMessage({
        action: 'analyzeCurrentPage',
        tabId: tabId
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Analysis started, wait for completion
      this.waitForAnalysisCompletion(tabId);
    } catch (error) {
      this.showError(error instanceof Error ? error.message : '启动分析失败');
    }
  }

  waitForAnalysisCompletion(tabId) {
    const steps = [
      { step: 1, message: '正在连接到页面...', progress: 10 },
      { step: 2, message: '正在分析页面元数据...', progress: 25 },
      { step: 3, message: '正在分析标题结构...', progress: 45 },
      { step: 4, message: '正在分析页面内容...', progress: 65 },
      { step: 5, message: '正在分析图片和性能...', progress: 85 },
      { step: 6, message: '正在生成分析报告...', progress: 95 }
    ];
    
    let currentStepIndex = 0;
    let checkCount = 0;
    const maxChecks = 15; // 最多检查15次 (30秒)
    
    // 开始显示进度
    this.updateProgress(steps[0]);
    
    const checkInterval = setInterval(async () => {
      try {
        checkCount++;
        
        const response = await chrome.runtime.sendMessage({
          action: 'getAnalysisStatus',
          tabId: tabId
        });

        if (response.completed && response.report) {
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
              totalIssues: response.report.issues.length
            });
            this.displayIssues(response.report.issues);
          }, 500);
        } else if (response.error) {
          clearInterval(checkInterval);
          this.showError(response.error);
        } else if (checkCount >= maxChecks) {
          // 检查次数达到上限，尝试获取缓存的报告
          clearInterval(checkInterval);
          
          try {
            const cachedResponse = await chrome.runtime.sendMessage({
              action: 'getPageAnalysis',
              tabId: tabId
            });
            
            if (cachedResponse.report) {
              this.updateProgress({ step: 6, message: '分析完成！', progress: 100 });
              setTimeout(() => {
                this.displaySEOScore(cachedResponse.report.score);
                this.showQuickReport({
                  score: cachedResponse.report.score,
                  criticalIssues: cachedResponse.report.issues.filter(i => i.severity === 'critical').length,
                  highPriorityIssues: cachedResponse.report.issues.filter(i => i.severity === 'high').length,
                  totalIssues: cachedResponse.report.issues.length
                });
                this.displayIssues(cachedResponse.report.issues);
              }, 500);
            } else {
              this.showError('分析时间较长，请稍后刷新查看结果');
            }
          } catch (error) {
            this.showError('分析时间较长，请稍后刷新查看结果');
          }
        } else {
          // 更新进度显示
          if (response.running) {
            if (response.progress) {
              this.updateProgress(response.progress);
              currentStepIndex = response.progress.step - 1;
            } else if (currentStepIndex < steps.length - 1) {
              if (checkCount % 2 === 0) {
                currentStepIndex++;
                this.updateProgress(steps[currentStepIndex]);
              }
            }
          }
        }
      } catch (error) {
        clearInterval(checkInterval);
        this.showError('检查分析状态失败: ' + error.message);
      }
    }, 2000);
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
    
  }

  displaySEOScore(score) {
    // Update overall score
    if (this.elements.overallScore) {
      this.elements.overallScore.textContent = score.overall.toString();
      this.updateScoreColor(this.elements.overallScore, score.overall);
    }

    // Update breakdown scores with colors
    if (this.elements.technicalScore) {
      this.elements.technicalScore.textContent = score.technical.toString();
      this.updateScoreNumberColor(this.elements.technicalScore, score.technical);
    }
    if (this.elements.contentScore) {
      this.elements.contentScore.textContent = score.content.toString();
      this.updateScoreNumberColor(this.elements.contentScore, score.content);
    }
    if (this.elements.performanceScore) {
      this.elements.performanceScore.textContent = score.performance.toString();
      this.updateScoreNumberColor(this.elements.performanceScore, score.performance);
    }

    // Update progress bars with colors and width
    if (this.elements.technicalFill) {
      const width = Math.max(score.technical, 5);
      this.elements.technicalFill.style.width = `${width}%`;
      this.updateProgressBarColor(this.elements.technicalFill, score.technical);
    }
    if (this.elements.contentFill) {
      const width = Math.max(score.content, 5);
      this.elements.contentFill.style.width = `${width}%`;
      this.updateProgressBarColor(this.elements.contentFill, score.content);
    }
    if (this.elements.performanceFill) {
      const width = Math.max(score.performance, 5);
      this.elements.performanceFill.style.width = `${width}%`;
      this.updateProgressBarColor(this.elements.performanceFill, score.performance);
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
    // TODO: Implement suggestions display
  }

  async generateAISuggestions() {
    // TODO: Implement AI suggestions
  }

  refreshAnalysis() {
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }



  openDetailedReport() {
    chrome.runtime.sendMessage({ action: 'openDetailedReport' });
  }

  showExportOptions() {
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
    // 移除所有颜色类
    element.classList.remove('warning', 'danger', 'excellent', 'good', 'average', 'poor');
    
    // 根据分数添加对应的颜色类
    if (score >= 80) {
      element.classList.add('excellent');
    } else if (score >= 60) {
      element.classList.add('good');
    } else if (score >= 40) {
      element.classList.add('warning'); // 保持原有的warning类
    } else {
      element.classList.add('danger'); // 保持原有的danger类
    }
  }

  updateProgressBarColor(element, score) {
    // 移除所有颜色类
    element.classList.remove('excellent', 'good', 'average', 'poor');
    
    // 根据分数设置颜色类
    let colorClass;
    if (score >= 80) {
      colorClass = 'excellent';
    } else if (score >= 60) {
      colorClass = 'good';
    } else if (score >= 40) {
      colorClass = 'average';
    } else {
      colorClass = 'poor';
    }
    
    element.classList.add(colorClass);
    
    // 设置内联样式作为备用
    const colors = {
      excellent: '#28a745',
      good: '#007bff', 
      average: '#fd7e14',
      poor: '#dc3545'
    };
    
    element.style.setProperty('background-color', colors[colorClass], 'important');
  }

  updateScoreNumberColor(element, score) {
    // 移除所有颜色类
    element.classList.remove('excellent', 'good', 'average', 'poor');
    
    // 根据分数添加对应的颜色类和样式
    if (score >= 80) {
      element.classList.add('excellent');
      element.style.setProperty('color', '#28a745', 'important');
      element.style.setProperty('font-weight', '700', 'important');
    } else if (score >= 60) {
      element.classList.add('good');
      element.style.setProperty('color', '#007bff', 'important');
      element.style.setProperty('font-weight', '600', 'important');
    } else if (score >= 40) {
      element.classList.add('average');
      element.style.setProperty('color', '#fd7e14', 'important');
      element.style.setProperty('font-weight', '600', 'important');
    } else {
      element.classList.add('poor');
      element.style.setProperty('color', '#dc3545', 'important');
      element.style.setProperty('font-weight', '700', 'important');
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


}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new SimplePopupUI();
  popup.initializeUI();
});