// SEO Checker Popup Script - English Only Version

// Simple UI controller
class SimplePopupUI {
  constructor() {
    this.elements = this.getUIElements();
    this.markdownRenderer = new MarkdownRenderer();
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
      refreshSuggestionsBtn: document.getElementById('refresh-suggestions'),
      detailedReportBtn: document.getElementById('detailed-report-btn')
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

    // Refresh suggestions button
    if (this.elements.refreshSuggestionsBtn) {
      this.elements.refreshSuggestionsBtn.addEventListener('click', () => {
        this.generateAISuggestions(true); // 强制刷新
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
        if (progress) {
          this.updateSuggestionsStatus(progress.message, 'loading');
          console.log('[Popup] Received AI progress update:', progress);
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
        throw new Error('Background script is not responding, please reload the extension');
      }

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

      if (!tab.id) {
        throw new Error('Cannot get current tab');
      }

      // Check if the current page is a valid web page
      if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
        throw new Error('Current page is not a valid webpage, SEO analysis only supports HTTP/HTTPS pages');
      }

      // Request analysis from background script
      let response;
      try {
        response = await chrome.runtime.sendMessage({
          action: 'getPageAnalysis',
          tabId: tab.id
        });
      } catch (messageError) {
        throw new Error('Cannot communicate with background script, please reload the extension');
      }

      if (!response) {
        throw new Error('Background script is not responding, please reload the extension');
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
          this.displaySuggestions = response.report.suggestions;
        }
      } else {
        // No cached analysis, trigger new analysis
        this.triggerNewAnalysis(tab.id);
      }
    } catch (error) {
      this.showError(error instanceof Error ? error.message : 'Failed to load analysis results');
    }
  }

  async triggerNewAnalysis(tabId) {
    try {
      // Show initial progress
      this.updateProgress({ step: 1, message: 'Starting SEO analysis...', progress: 5 });

      // Test content script availability
      try {
        await chrome.tabs.sendMessage(tabId, { type: 'PING' });
      } catch (contentError) {
        throw new Error('Page content script not loaded, please refresh the page and try again');
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
      this.showError(error instanceof Error ? error.message : 'Failed to start analysis');
    }
  }

  waitForAnalysisCompletion(tabId) {
    const steps = this.getProgressSteps();

    let currentStepIndex = 0;
    let checkCount = 0;
    const maxChecks = 15; // Maximum 15 checks (30 seconds)

    // Start showing progress
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

          // Show completion status
          this.updateProgress({ step: 6, message: 'Analysis complete!', progress: 100 });

          // Show results after brief delay
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
          // Reached maximum checks, try to get cached report
          clearInterval(checkInterval);

          try {
            const cachedResponse = await chrome.runtime.sendMessage({
              action: 'getPageAnalysis',
              tabId: tabId
            });

            if (cachedResponse.report) {
              this.updateProgress({ step: 6, message: 'Analysis complete!', progress: 100 });
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
              this.showError('Analysis is taking longer, please refresh later to view results');
            }
          } catch (error) {
            this.showError('Analysis is taking longer, please refresh later to view results');
          }
        } else {
          // Update progress display
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
        this.showError('Failed to check analysis status: ' + error.message);
      }
    }, 2000);
  }

  getProgressSteps() {
    return [
      { step: 1, message: 'Connecting to page...', progress: 10 },
      { step: 2, message: 'Analyzing page metadata...', progress: 25 },
      { step: 3, message: 'Analyzing title structure...', progress: 45 },
      { step: 4, message: 'Analyzing page content...', progress: 65 },
      { step: 5, message: 'Analyzing images and performance...', progress: 85 },
      { step: 6, message: 'Generating analysis report...', progress: 95 }
    ];
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
      this.elements.stepCounter.textContent = `Step ${stepInfo.step} of 6`;
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
    // Add original index to each issue
    this.currentIssues.forEach((issue, index) => {
      issue.originalIndex = index;
    });
    this.filterIssues(this.currentFilter);

    // Automatically highlight issues on page
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
      // Silent failure, doesn't affect main functionality
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

      // Use pre-set original index
      const originalIndex = issue.originalIndex !== undefined ? issue.originalIndex : displayIndex;

      // Build detailed issue information
      const locationInfo = issue.location ? `<span class="issue-location">Location: ${issue.location}</span>` : '';
      const currentValueInfo = issue.currentValue ? `<div class="issue-current">Current: ${issue.currentValue}</div>` : '';
      const expectedValueInfo = issue.expectedValue ? `<div class="issue-expected">Suggested: ${issue.expectedValue}</div>` : '';
      const impactInfo = issue.impact ? `<div class="issue-impact">Impact: ${issue.impact}</div>` : '';

      issueElement.innerHTML = `
        <div class="issue-header">
          <span class="severity-badge ${issue.severity}">${this.getSeverityText(issue.severity)}</span>
          <span class="issue-title">${issue.title}</span>
          <div class="issue-actions">
            <button class="locate-btn" title="Locate on page" data-issue-id="${issue.id}" data-original-index="${originalIndex}">🎯</button>
            <span class="issue-expand">▼</span>
          </div>
        </div>
        <div class="issue-summary">
          <div class="issue-description">${this.renderContent(issue.description)}</div>
          ${locationInfo}
        </div>
        <div class="issue-details hidden">
          ${currentValueInfo}
          ${expectedValueInfo}
          ${impactInfo}
          <div class="issue-recommendation">
            <strong>Solution:</strong>
            <div class="recommendation-content">${this.renderContent(issue.recommendation)}</div>
          </div>
        </div>
      `;

      // Add expand/collapse functionality
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

      // Add locate functionality
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

    // Show refresh suggestions button
    if (this.elements.refreshSuggestionsBtn) {
      this.elements.refreshSuggestionsBtn.style.display = 'inline-block';
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

    const goodTitleText = 'Current title is already good';
    const hasImprovement = titleOpt.suggestion && titleOpt.suggestion !== goodTitleText;

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>📝 Title Optimization</h4>
        <span class="suggestion-status ${titleOpt.length?.status || 'unknown'}">${this.getStatusText(titleOpt.length?.status)}</span>
      </div>
      <div class="suggestion-content">
        ${titleOpt.current ? `
        <div class="current-content">
          <strong>Current Title:</strong>
          <div class="content-box">${titleOpt.current}</div>
          <small>Length: ${titleOpt.length?.current || titleOpt.current.length} characters</small>
        </div>` : ''}
        
        ${hasImprovement ? `
        <div class="suggested-content">
          <strong>Optimization Suggestion:</strong>
          <div class="content-box suggested">${titleOpt.suggestion}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${titleOpt.suggestion.replace(/'/g, "\\'")}')">
            Copy
          </button>
        </div>` : ''}
        
        <div class="suggestion-reason">
          <strong>Analysis:</strong> ${this.renderContent(titleOpt.reason)}
        </div>
        
        ${titleOpt.improvements && titleOpt.improvements.length > 0 ? `
        <div class="improvement-tips">
          <strong>Improvement Points:</strong>
          ${titleOpt.improvements.some(tip => this.markdownRenderer.hasMarkdownSyntax(tip)) 
            ? this.renderContent(titleOpt.improvements.map(tip => `• ${tip}`).join('\n'))
            : `<ul>${titleOpt.improvements.map(tip => `<li>${this.renderContent(tip)}</li>`).join('')}</ul>`
          }
        </div>` : ''}
        
        ${titleOpt.keywords && titleOpt.keywords.length > 0 ? `
        <div class="keyword-suggestions">
          <strong>Recommended Keywords:</strong>
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

    const goodDescriptionText = 'Current description is already good';
    const hasImprovement = metaOpt.suggestion && metaOpt.suggestion !== goodDescriptionText;

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>📄 Meta Description Optimization</h4>
        <span class="suggestion-status ${metaOpt.length?.status || 'unknown'}">${this.getStatusText(metaOpt.length?.status)}</span>
      </div>
      <div class="suggestion-content">
        ${metaOpt.current ? `
        <div class="current-content">
          <strong>Current Description:</strong>
          <div class="content-box">${metaOpt.current}</div>
          <small>Length: ${metaOpt.length?.current || metaOpt.current.length} characters</small>
        </div>` : ''}
        
        ${hasImprovement ? `
        <div class="suggested-content">
          <strong>Optimization Suggestion:</strong>
          <div class="content-box suggested">${metaOpt.suggestion}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${metaOpt.suggestion.replace(/'/g, "\\'")}')">
            Copy
          </button>
        </div>` : ''}
        
        ${metaOpt.template ? `
        <div class="suggested-content">
          <strong>Suggested Template:</strong>
          <div class="content-box suggested">${metaOpt.template}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${metaOpt.template.replace(/'/g, "\\'")}')">
            Copy
          </button>
        </div>` : ''}
        
        <div class="suggestion-reason">
          <strong>Analysis:</strong> ${this.renderContent(metaOpt.reason)}
        </div>
        
        ${metaOpt.guidelines && metaOpt.guidelines.length > 0 ? `
        <div class="improvement-tips">
          <strong>Writing Guidelines:</strong>
          ${metaOpt.guidelines.some(tip => this.markdownRenderer.hasMarkdownSyntax(tip)) 
            ? this.renderContent(metaOpt.guidelines.map(tip => `• ${tip}`).join('\n'))
            : `<ul>${metaOpt.guidelines.map(tip => `<li>${this.renderContent(tip)}</li>`).join('')}</ul>`
          }
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
        <h4>✨ Content Improvements</h4>
        <span class="suggestion-count">${improvements.length === 1 ? '1 suggestion' : `${improvements.length} suggestions`}</span>
      </div>
      <div class="suggestion-content">
        ${improvements.map(improvement => `
          <div class="improvement-item ${improvement.priority}">
            <div class="improvement-header">
              <span class="priority-badge ${improvement.priority}">${this.getPriorityText(improvement.priority)}</span>
              <strong>${improvement.title}</strong>
            </div>
            <div class="improvement-description">${this.renderContent(improvement.description)}</div>
            ${improvement.suggestions && improvement.suggestions.length > 0 ? `
            <div class="improvement-suggestions">
              <strong>Specific Suggestions:</strong>
              ${improvement.suggestions.some(suggestion => this.markdownRenderer.hasMarkdownSyntax(suggestion)) 
                ? this.renderContent(improvement.suggestions.map(suggestion => `• ${suggestion}`).join('\n'))
                : `<ul>${improvement.suggestions.map(suggestion => `<li>${this.renderContent(suggestion)}</li>`).join('')}</ul>`
              }
            </div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  createKeywordSuggestionsSection(keywordSuggestions) {
    if (!keywordSuggestions || Object.keys(keywordSuggestions).every(key => keywordSuggestions[key].length === 0)) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>🔍 Keyword Suggestions</h4>
      </div>
      <div class="suggestion-content">
        ${keywordSuggestions.primary && keywordSuggestions.primary.length > 0 ? `
        <div class="keyword-group">
          <strong>Primary Keywords:</strong>
          <div class="keyword-tags">
            ${keywordSuggestions.primary.map(keyword => `<span class="keyword-tag primary">${keyword}</span>`).join('')}
          </div>
        </div>` : ''}
        
        ${keywordSuggestions.secondary && keywordSuggestions.secondary.length > 0 ? `
        <div class="keyword-group">
          <strong>Secondary Keywords:</strong>
          <div class="keyword-tags">
            ${keywordSuggestions.secondary.map(keyword => `<span class="keyword-tag secondary">${keyword}</span>`).join('')}
          </div>
        </div>` : ''}
        
        ${keywordSuggestions.longTail && keywordSuggestions.longTail.length > 0 ? `
        <div class="keyword-group">
          <strong>Long-tail Keywords:</strong>
          <div class="keyword-tags">
            ${keywordSuggestions.longTail.map(keyword => `<span class="keyword-tag long-tail">${keyword}</span>`).join('')}
          </div>
        </div>` : ''}
        
        ${keywordSuggestions.semantic && keywordSuggestions.semantic.length > 0 ? `
        <div class="keyword-group">
          <strong>Semantic Keywords:</strong>
          <div class="keyword-tags">
            ${keywordSuggestions.semantic.map(keyword => `<span class="keyword-tag semantic">${keyword}</span>`).join('')}
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
        <h4>🏗️ Structure Recommendations</h4>
        <span class="suggestion-count">${recommendations.length === 1 ? '1 suggestion' : `${recommendations.length} suggestions`}</span>
      </div>
      <div class="suggestion-content">
        ${recommendations.map(rec => `
          <div class="structure-recommendation">
            <div class="recommendation-header">
              <strong>${rec.title}</strong>
            </div>
            <div class="recommendation-description">${this.renderContent(rec.description)}</div>
            ${rec.steps && rec.steps.length > 0 ? `
            <div class="implementation-steps">
              <strong>Implementation Steps:</strong>
              ${rec.steps.some(step => this.markdownRenderer.hasMarkdownSyntax(step)) 
                ? this.renderContent(rec.steps.map((step, i) => `${i + 1}. ${step}`).join('\n'))
                : `<ol>${rec.steps.map(step => `<li>${this.renderContent(step)}</li>`).join('')}</ol>`
              }
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
    
    // Hide refresh button during loading, but only show it if suggestions are already displayed
    if (this.elements.refreshSuggestionsBtn) {
      if (show) {
        this.elements.refreshSuggestionsBtn.style.display = 'none';
      } else {
        // Only show refresh button if suggestions list has content
        const hasSuggestions = this.elements.suggestionsList && 
                              this.elements.suggestionsList.children.length > 0;
        this.elements.refreshSuggestionsBtn.style.display = hasSuggestions ? 'inline-block' : 'none';
      }
    }
  }

  updateSuggestionsStatus(message, type) {
    if (this.elements.suggestionsStatus) {
      this.elements.suggestionsStatus.classList.remove('hidden');
      this.elements.suggestionsStatus.className = `suggestions-status ${type}`;
    }
    if (this.elements.suggestionsStatusText) {
      this.elements.suggestionsStatusText.textContent = message;
    }

    // Hide status after delay for success/error
    if (type === 'success' || type === 'error') {
      setTimeout(() => {
        if (this.elements.suggestionsStatus) {
          this.elements.suggestionsStatus.classList.add('hidden');
        }
      }, 3000);
    }
  }

  hideSuggestionsStatus() {
    if (this.elements.suggestionsStatus) {
      this.elements.suggestionsStatus.classList.add('hidden');
    }
  }

  /**
   * Render text content with markdown support
   * @param {string} content - The content to render
   * @param {string} fallback - Fallback content if original is empty
   * @returns {string} - Rendered HTML content
   */
  renderContent(content, fallback = '') {
    if (!content) return fallback;
    
    // Check if content contains markdown syntax
    if (this.markdownRenderer.hasMarkdownSyntax(content)) {
      return this.markdownRenderer.renderWithClasses(content, 'markdown-content');
    }
    
    // Return plain text wrapped in a div for consistency
    return `<div class="plain-content">${this.escapeHtml(content)}</div>`;
  }

  /**
   * Escape HTML to prevent XSS
   * @param {string} text - Text to escape
   * @returns {string} - Escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  getStatusText(status) {
    const statusMap = {
      'good': '✅ Good',
      'needs-improvement': '⚠️ Needs Improvement',
      'unknown': '❓ Unknown'
    };
    return statusMap[status] || '❓ Unknown';
  }

  createSummarySection(summary) {
    const section = document.createElement('div');
    section.className = 'suggestion-section summary-section';

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>🎉 SEO Status Good</h4>
      </div>
      <div class="suggestion-content">
        <div class="summary-message">${this.renderContent(summary.message)}</div>
        ${summary.continuousOptimization && summary.continuousOptimization.length > 0 ? `
        <div class="continuous-optimization">
          <strong>Continuous Optimization Suggestions:</strong>
          ${summary.continuousOptimization.some(tip => this.markdownRenderer.hasMarkdownSyntax(tip)) 
            ? this.renderContent(summary.continuousOptimization.map(tip => `• ${tip}`).join('\n'))
            : `<ul>${summary.continuousOptimization.map(tip => `<li>${this.renderContent(tip)}</li>`).join('')}</ul>`
          }
        </div>` : ''}
      </div>
    `;

    this.elements.suggestionsList.appendChild(section);
  }

  getPriorityText(priority) {
    const priorityMap = {
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return priorityMap[priority] || priority;
  }

  async generateAISuggestions(forceRefresh = false) {
    try {
      console.log('[Popup] 开始生成AI建议', forceRefresh ? '(强制刷新)' : '');
      // Show loading state
      this.showSuggestionsLoading(true);
      this.updateSuggestionsStatus(
        forceRefresh ? 'Refreshing AI suggestions...' : 'AI suggestions loading...', 
        'loading'
      );

      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('Cannot get current tab');
      }
      console.log('[Popup] 当前标签页ID:', tab.id);

      // Start monitoring AI progress
      const progressMonitor = this.startAIProgressMonitoring(tab.id);

      try {
        // Request AI suggestions from background
        console.log('[Popup] 向background发送AI建议请求...', forceRefresh ? '(跳过缓存)' : '');
        const response = await chrome.runtime.sendMessage({
          action: 'generateAISuggestions',
          tabId: tab.id,
          forceRefresh: forceRefresh
        });
        console.log('[Popup] 收到background响应:', response);

        if (response.error) {
          throw new Error(response.error);
        }

        // Display the suggestions
        this.displayAISuggestions(response.suggestions);
        this.updateSuggestionsStatus('AI suggestions loaded', 'success');
        
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

  async refreshAnalysis() {
    this.showLoading();
    await this.loadCurrentPageAnalysis();
  }



  async openDetailedReport() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      await chrome.runtime.sendMessage({
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
    this.updateProgress({ step: 0, message: 'Start to analysis...', progress: 0 });
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
    element.classList.remove('excellent', 'good', 'warning', 'danger');
    if (score >= 80) {
      element.classList.add('excellent');
    } else if (score >= 60) {
      element.classList.add('good');
    } else if (score >= 40) {
      element.classList.add('warning');
    } else {
      element.classList.add('danger');
    }
  }

  updateProgressBarColor(element, score) {
    element.classList.remove('excellent', 'good', 'average', 'poor');
    if (score >= 80) {
      element.classList.add('excellent');
    } else if (score >= 60) {
      element.classList.add('good');
    } else if (score >= 40) {
      element.classList.add('average');
    } else {
      element.classList.add('poor');
    }
  }

  updateScoreNumberColor(element, score) {
    element.classList.remove('excellent', 'good', 'average', 'poor');
    if (score >= 80) {
      element.classList.add('excellent');
    } else if (score >= 60) {
      element.classList.add('good');
    } else if (score >= 40) {
      element.classList.add('average');
    } else {
      element.classList.add('poor');
    }
  }

  getSeverityText(severity) {
    const severityMap = {
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
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

// Initialize the popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const popup = new SimplePopupUI();
  popup.initializeUI();
});