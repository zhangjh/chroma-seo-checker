// SEO Checker Popup Script

// Simple UI controller
class SimplePopupUI {
  constructor() {
    this.elements = this.getUIElements();
    this.currentFilter = 'all';
    this.initializeEventListeners();
    this.initializeMessageListener();
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

  }

  initializeMessageListener() {
    // Listen for progress updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'AI_PROGRESS_UPDATE') {
        const progress = message.progress;
        
        // Update the UI with progress information
        if (progress) {
          this.updateSuggestionsStatus(progress.message, 'loading');
          console.log('[Popup] 收到AI进度更新:', progress);
        }
        
        sendResponse({ received: true });
      }
    });
  }

  initializeUI() {
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }

  async loadCurrentPageAnalysis() {
    try {
      // Test if background script is responsive
      try {
        await chrome.runtime.sendMessage({ action: 'ping' });
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
    // 为每个问题添加原始索引
    this.currentIssues.forEach((issue, index) => {
      issue.originalIndex = index;
    });
    this.filterIssues(this.currentFilter);

    // 自动在页面上高亮显示问题
    this.highlightIssuesOnPage(issues);
  }

  async highlightIssuesOnPage(issues) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'HIGHLIGHT_ISSUES',
          issues: issues
        });
      }
    } catch (error) {
      // 静默失败，不影响主功能
    }
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

    issues.forEach((issue, displayIndex) => {
      const issueElement = document.createElement('div');
      issueElement.className = 'issue-item';

      // 使用预先设置的原始索引
      const originalIndex = issue.originalIndex !== undefined ? issue.originalIndex : displayIndex;

      // 构建详细的问题信息
      const locationInfo = issue.location ? `<span class="issue-location">位置: ${issue.location}</span>` : '';
      const currentValueInfo = issue.currentValue ? `<div class="issue-current">当前: ${issue.currentValue}</div>` : '';
      const expectedValueInfo = issue.expectedValue ? `<div class="issue-expected">建议: ${issue.expectedValue}</div>` : '';
      const impactInfo = issue.impact ? `<div class="issue-impact">影响: ${issue.impact}</div>` : '';



      issueElement.innerHTML = `
        <div class="issue-header">
          <span class="severity-badge ${issue.severity}">${this.getSeverityText(issue.severity)}</span>
          <span class="issue-title">${issue.title}</span>
          <div class="issue-actions">
            <button class="locate-btn" title="在页面上定位" data-issue-id="${issue.id}" data-original-index="${originalIndex}">🎯</button>
            <span class="issue-expand">▼</span>
          </div>
        </div>
        <div class="issue-summary">
          <div class="issue-description">${issue.description}</div>
          ${locationInfo}
        </div>
        <div class="issue-details hidden">
          ${currentValueInfo}
          ${expectedValueInfo}
          ${impactInfo}
          <div class="issue-recommendation">
            <strong>解决方案:</strong>
            <div class="recommendation-content">${issue.recommendation}</div>
          </div>
        </div>
      `;

      // 添加展开/收起功能
      const header = issueElement.querySelector('.issue-header');
      const details = issueElement.querySelector('.issue-details');
      const expandIcon = issueElement.querySelector('.issue-expand');

      header.addEventListener('click', () => {
        const isExpanded = !details.classList.contains('hidden');
        if (isExpanded) {
          details.classList.add('hidden');
          expandIcon.textContent = '▼';
          issueElement.classList.remove('expanded');
        } else {
          details.classList.remove('hidden');
          expandIcon.textContent = '▲';
          issueElement.classList.add('expanded');
        }
      });



      // 添加定位功能
      const locateBtn = issueElement.querySelector('.locate-btn');
      if (locateBtn) {
        locateBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const originalIdx = parseInt(locateBtn.getAttribute('data-original-index'));

          try {
            await this.locateIssueOnPage(originalIdx);
            locateBtn.textContent = '✅';
          } catch (error) {
            locateBtn.textContent = '❌';
          }

          setTimeout(() => {
            locateBtn.textContent = '🎯';
          }, 2000);
        });
      }

      this.elements.issuesList.appendChild(issueElement);
    });
  }

  displaySuggestions(suggestions) {
    if (suggestions) {
      this.displayAISuggestions(suggestions);
    }
  }

  displayAISuggestions(suggestions) {
    if (!this.elements.suggestionsList) return;

    // Clear existing suggestions
    this.elements.suggestionsList.innerHTML = '';
    
    // Hide no-suggestions message
    if (this.elements.noSuggestions) {
      this.elements.noSuggestions.style.display = 'none';
    }

    // Check if there's a summary (no issues found)
    if (suggestions.summary) {
      this.createSummarySection(suggestions.summary);
      return;
    }

    // Create suggestions sections only for detected issues
    if (suggestions.titleOptimization) {
      this.createTitleOptimizationSection(suggestions.titleOptimization);
    }
    if (suggestions.metaDescriptionSuggestion) {
      this.createMetaDescriptionSection(suggestions.metaDescriptionSuggestion);
    }
    if (suggestions.contentImprovements) {
      this.createContentImprovementsSection(suggestions.contentImprovements);
    }
    if (suggestions.keywordSuggestions) {
      this.createKeywordSuggestionsSection(suggestions.keywordSuggestions);
    }
    if (suggestions.structureRecommendations) {
      this.createStructureRecommendationsSection(suggestions.structureRecommendations);
    }
  }

  createTitleOptimizationSection(titleOpt) {
    if (!titleOpt) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';
    
    const hasImprovement = titleOpt.suggestion && titleOpt.suggestion !== '当前标题已经很好';
    
    section.innerHTML = `
      <div class="suggestion-header">
        <h4>📝 标题优化建议</h4>
        <span class="suggestion-status ${titleOpt.length?.status || 'unknown'}">${this.getStatusText(titleOpt.length?.status)}</span>
      </div>
      <div class="suggestion-content">
        ${titleOpt.current ? `
        <div class="current-content">
          <strong>当前标题:</strong>
          <div class="content-box">${titleOpt.current}</div>
          <small>长度: ${titleOpt.length?.current || titleOpt.current.length} 字符</small>
        </div>` : ''}
        
        ${hasImprovement ? `
        <div class="suggested-content">
          <strong>优化建议:</strong>
          <div class="content-box suggested">${titleOpt.suggestion}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${titleOpt.suggestion.replace(/'/g, "\\'")}')">复制</button>
        </div>` : ''}
        
        <div class="suggestion-reason">
          <strong>分析:</strong> ${titleOpt.reason}
        </div>
        
        ${titleOpt.improvements && titleOpt.improvements.length > 0 ? `
        <div class="improvement-tips">
          <strong>改进要点:</strong>
          <ul>
            ${titleOpt.improvements.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>` : ''}
        
        ${titleOpt.keywords && titleOpt.keywords.length > 0 ? `
        <div class="keyword-suggestions">
          <strong>推荐关键词:</strong>
          <div class="keyword-tags">
            ${titleOpt.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  createMetaDescriptionSection(metaOpt) {
    if (!metaOpt) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';
    
    const hasImprovement = metaOpt.suggestion && metaOpt.suggestion !== '当前描述已经很好';
    
    section.innerHTML = `
      <div class="suggestion-header">
        <h4>📄 Meta描述优化</h4>
        <span class="suggestion-status ${metaOpt.length?.status || 'unknown'}">${this.getStatusText(metaOpt.length?.status)}</span>
      </div>
      <div class="suggestion-content">
        ${metaOpt.current ? `
        <div class="current-content">
          <strong>当前描述:</strong>
          <div class="content-box">${metaOpt.current}</div>
          <small>长度: ${metaOpt.length?.current || metaOpt.current.length} 字符</small>
        </div>` : ''}
        
        ${hasImprovement ? `
        <div class="suggested-content">
          <strong>优化建议:</strong>
          <div class="content-box suggested">${metaOpt.suggestion}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${metaOpt.suggestion.replace(/'/g, "\\'")}')">复制</button>
        </div>` : ''}
        
        ${metaOpt.template ? `
        <div class="suggested-content">
          <strong>建议模板:</strong>
          <div class="content-box suggested">${metaOpt.template}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${metaOpt.template.replace(/'/g, "\\'")}')">复制</button>
        </div>` : ''}
        
        <div class="suggestion-reason">
          <strong>分析:</strong> ${metaOpt.reason}
        </div>
        
        ${metaOpt.guidelines && metaOpt.guidelines.length > 0 ? `
        <div class="improvement-tips">
          <strong>编写指南:</strong>
          <ul>
            ${metaOpt.guidelines.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  createContentImprovementsSection(improvements) {
    if (!improvements || improvements.length === 0) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';
    
    section.innerHTML = `
      <div class="suggestion-header">
        <h4>✨ 内容改进建议</h4>
        <span class="suggestion-count">${improvements.length} 项建议</span>
      </div>
      <div class="suggestion-content">
        ${improvements.map(improvement => `
          <div class="improvement-item ${improvement.priority}">
            <div class="improvement-header">
              <span class="priority-badge ${improvement.priority}">${this.getPriorityText(improvement.priority)}</span>
              <strong>${improvement.title}</strong>
            </div>
            <div class="improvement-description">${improvement.description}</div>
            ${improvement.suggestions && improvement.suggestions.length > 0 ? `
            <div class="improvement-suggestions">
              <strong>具体建议:</strong>
              <ul>
                ${improvement.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
              </ul>
            </div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  createKeywordSuggestionsSection(keywords) {
    if (!keywords || Object.keys(keywords).every(key => keywords[key].length === 0)) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';
    
    section.innerHTML = `
      <div class="suggestion-header">
        <h4>🔍 关键词建议</h4>
      </div>
      <div class="suggestion-content">
        ${keywords.primary && keywords.primary.length > 0 ? `
        <div class="keyword-category">
          <strong>主要关键词:</strong>
          <div class="keyword-list">
            ${keywords.primary.map(kw => `
              <div class="keyword-item">
                <span class="keyword">${kw.keyword}</span>
                <small>${kw.suggestion}</small>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
        
        ${keywords.secondary && keywords.secondary.length > 0 ? `
        <div class="keyword-category">
          <strong>次要关键词:</strong>
          <div class="keyword-list">
            ${keywords.secondary.map(kw => `
              <div class="keyword-item">
                <span class="keyword">${kw.keyword}</span>
                <small>${kw.suggestion}</small>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
        
        ${keywords.longTail && keywords.longTail.length > 0 ? `
        <div class="keyword-category">
          <strong>长尾关键词:</strong>
          <div class="keyword-tags">
            ${keywords.longTail.map(kw => `<span class="keyword-tag" title="${kw.suggestion}">${kw.keyword}</span>`).join('')}
          </div>
        </div>` : ''}
        
        ${keywords.semantic && keywords.semantic.length > 0 ? `
        <div class="keyword-category">
          <strong>语义相关词:</strong>
          <div class="keyword-tags">
            ${keywords.semantic.map(kw => `<span class="keyword-tag" title="${kw.suggestion}">${kw.keyword}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  createStructureRecommendationsSection(recommendations) {
    if (!recommendations || recommendations.length === 0) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';
    
    section.innerHTML = `
      <div class="suggestion-header">
        <h4>🏗️ 结构优化建议</h4>
        <span class="suggestion-count">${recommendations.length} 项建议</span>
      </div>
      <div class="suggestion-content">
        ${recommendations.map(rec => `
          <div class="recommendation-item ${rec.priority}">
            <div class="recommendation-header">
              <span class="priority-badge ${rec.priority}">${this.getPriorityText(rec.priority)}</span>
              <strong>${rec.title}</strong>
            </div>
            <div class="recommendation-description">${rec.description}</div>
            ${rec.implementation && rec.implementation.length > 0 ? `
            <div class="implementation-steps">
              <strong>实施步骤:</strong>
              <ol>
                ${rec.implementation.map(step => `<li>${step}</li>`).join('')}
              </ol>
            </div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  showSuggestionsLoading(show) {
    if (this.elements.suggestionsLoading) {
      this.elements.suggestionsLoading.style.display = show ? 'flex' : 'none';
    }
  }

  updateSuggestionsStatus(message, type = 'info') {
    if (this.elements.suggestionsStatus && this.elements.suggestionsStatusText) {
      this.elements.suggestionsStatus.classList.remove('hidden');
      this.elements.suggestionsStatusText.textContent = message;
      
      // Update status icon based on type
      const statusIcon = this.elements.suggestionsStatus.querySelector('.status-icon');
      if (statusIcon) {
        switch (type) {
          case 'loading':
            statusIcon.textContent = '⏳';
            break;
          case 'success':
            statusIcon.textContent = '✅';
            break;
          case 'error':
            statusIcon.textContent = '❌';
            break;
          default:
            statusIcon.textContent = 'ℹ️';
        }
      }
    }
  }

  hideSuggestionsStatus() {
    if (this.elements.suggestionsStatus) {
      this.elements.suggestionsStatus.classList.add('hidden');
    }
  }

  getStatusText(status) {
    const statusMap = {
      'good': '✅ 良好',
      'needs-improvement': '⚠️ 需改进',
      'unknown': '❓ 未知'
    };
    return statusMap[status] || '❓ 未知';
  }

  createSummarySection(summary) {
    const section = document.createElement('div');
    section.className = 'suggestion-section summary-section';
    
    section.innerHTML = `
      <div class="suggestion-header">
        <h4>🎉 SEO状况良好</h4>
      </div>
      <div class="suggestion-content">
        <div class="summary-message">
          ${summary.message}
        </div>
        ${summary.suggestions && summary.suggestions.length > 0 ? `
        <div class="summary-suggestions">
          <strong>持续优化建议:</strong>
          <ul>
            ${summary.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  getPriorityText(priority) {
    const priorityMap = {
      'critical': '严重',
      'high': '高',
      'medium': '中',
      'low': '低'
    };
    return priorityMap[priority] || priority;
  }

  async generateAISuggestions() {
    try {
      console.log('[Popup] 开始生成AI建议');
      // Show loading state
      this.showSuggestionsLoading(true);
      this.updateSuggestionsStatus('正在生成AI建议...', 'loading');

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('无法获取当前标签页');
      }
      console.log('[Popup] 当前标签页ID:', tab.id);

      // Start monitoring AI progress
      const progressMonitor = this.startAIProgressMonitoring(tab.id);

      try {
        // Request AI suggestions from background with timeout
        console.log('[Popup] 向background发送AI建议请求...');
        const response = await Promise.race([
          chrome.runtime.sendMessage({
            action: 'generateAISuggestions',
            tabId: tab.id
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI建议生成超时（60秒），请检查Gemini Nano是否正常工作')), 60000)
          )
        ]);
        console.log('[Popup] 收到background响应:', response);

        if (response.error) {
          throw new Error(response.error);
        }

        // Display the suggestions
        this.displayAISuggestions(response.suggestions);
        this.updateSuggestionsStatus('AI建议生成完成', 'success');
        
        // Hide status after 2 seconds
        setTimeout(() => {
          this.hideSuggestionsStatus();
        }, 2000);

      } finally {
        // Stop progress monitoring
        if (progressMonitor) {
          clearInterval(progressMonitor);
        }
      }

    } catch (error) {
      this.updateSuggestionsStatus(error.message, 'error');
      console.error('Failed to generate AI suggestions:', error);
    } finally {
      this.showSuggestionsLoading(false);
    }
  }

  startAIProgressMonitoring(tabId) {
    let lastProgressType = null;
    
    const progressInterval = setInterval(async () => {
      try {
        const response = await chrome.runtime.sendMessage({
          action: 'getAIProgress',
          tabId: tabId
        });

        if (response.success && response.progress) {
          const progress = response.progress;
          
          // Only update if progress type changed or it's a download progress update
          if (progress.type !== lastProgressType || progress.type === 'download_progress') {
            this.updateSuggestionsStatus(progress.message, 'loading');
            lastProgressType = progress.type;
            
            // Log progress for debugging
            console.log('[Popup] AI进度更新:', progress);
          }
          
          // If ready, we can stop monitoring soon
          if (progress.type === 'ready') {
            setTimeout(() => {
              clearInterval(progressInterval);
            }, 1000);
          }
        }
      } catch (error) {
        // Ignore errors during progress monitoring
        console.warn('[Popup] 进度监控错误:', error);
      }
    }, 1000); // Check every second

    return progressInterval;
  }

  refreshAnalysis() {
    this.showLoading();
    this.loadCurrentPageAnalysis();
  }



  async openDetailedReport() {
    try {
      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      chrome.runtime.sendMessage({ 
        action: 'openDetailedReport',
        url: tab.url 
      });
    } catch (error) {
      console.error('Failed to open detailed report:', error);
    }
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



  async locateIssueOnPage(issueIndex) {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: 'SCROLL_TO_ISSUE',
          issueIndex: issueIndex
        });
      }
    } catch (error) {
      // 静默失败
    }
  }


}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new SimplePopupUI();
  popup.initializeUI();
});