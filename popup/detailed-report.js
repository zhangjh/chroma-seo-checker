// Detailed Report Script

class DetailedReportUI {
  constructor() {
    this.elements = this.getUIElements();
    this.initializeEventListeners();
    this.loadReport();
  }

  getUIElements() {
    return {
      loading: document.getElementById('loading'),
      error: document.getElementById('error'),
      errorMessage: document.getElementById('error-message'),
      reportContent: document.getElementById('report-content'),
      
      // Header elements
      reportUrl: document.getElementById('report-url'),
      
      // Score elements
      overallScore: document.getElementById('overall-score'),
      technicalScore: document.getElementById('technical-score'),
      contentScore: document.getElementById('content-score'),
      performanceScore: document.getElementById('performance-score'),
      technicalFill: document.getElementById('technical-fill'),
      contentFill: document.getElementById('content-fill'),
      performanceFill: document.getElementById('performance-fill'),
      
      // Issues elements
      criticalCount: document.getElementById('critical-count'),
      highCount: document.getElementById('high-count'),
      mediumCount: document.getElementById('medium-count'),
      lowCount: document.getElementById('low-count'),
      issuesList: document.getElementById('issues-list'),
      
      // Technical analysis elements
      metaAnalysis: document.getElementById('meta-analysis'),
      headingAnalysis: document.getElementById('heading-analysis'),
      linksAnalysis: document.getElementById('links-analysis'),
      imagesAnalysis: document.getElementById('images-analysis'),
      
      // Content analysis elements
      contentStats: document.getElementById('content-stats'),
      readabilityAnalysis: document.getElementById('readability-analysis'),
      
      // Performance analysis elements
      pagePerformance: document.getElementById('page-performance'),
      
      // AI suggestions elements
      aiSuggestionsContent: document.getElementById('ai-suggestions-content'),
      aiSuggestionsLoading: document.getElementById('ai-suggestions-loading'),
      aiSuggestionsList: document.getElementById('ai-suggestions-list'),
      
      // Action buttons
      retryBtn: document.getElementById('retry-btn'),
      backBtn: document.getElementById('back-btn'),
      exportBtn: document.getElementById('export-btn')
    };
  }

  initializeEventListeners() {
    if (this.elements.retryBtn) {
      this.elements.retryBtn.addEventListener('click', () => {
        this.loadReport();
      });
    }

    if (this.elements.backBtn) {
      this.elements.backBtn.addEventListener('click', () => {
        // Close current tab and return to previous page
        chrome.tabs.getCurrent((tab) => {
          if (tab) {
            chrome.tabs.remove(tab.id);
          }
        });
      });
    }

    if (this.elements.printBtn) {
      this.elements.printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    if (this.elements.exportBtn) {
      this.elements.exportBtn.addEventListener('click', () => {
        this.exportToPDF();
      });
    }
  }

  async loadReport() {
    try {
      this.showLoading();
      
      // Get the latest report from storage
      const response = await chrome.runtime.sendMessage({
        action: 'getLatestReport'
      });

      if (response.error) {
        throw new Error(response.error);
      }

      if (!response.report) {
        throw new Error('没有找到分析报告。请先在网页上运行SEO分析，然后再查看详细报告。');
      }

      this.displayReport(response.report);
    } catch (error) {
      this.showError(error.message);
    }
  }

  displayReport(report) {
    // Update header information
    if (this.elements.reportUrl) {
      this.elements.reportUrl.textContent = report.url;
    }

    // Update scores
    this.displayScores(report.score);
    
    // Update issues
    this.displayIssues(report.issues);
    
    // Update technical analysis
    this.displayTechnicalAnalysis(report.technicalResults, report.performanceResults);
    
    // Update content analysis
    this.displayContentAnalysis(report.contentResults);
    
    // Update performance analysis
    this.displayPerformanceAnalysis(report.performanceResults);
    
    // Update AI suggestions
    this.displayAISuggestions(report.suggestions);

    this.showReport();
  }

  displayScores(score) {
    // Overall score
    if (this.elements.overallScore) {
      this.elements.overallScore.textContent = score.overall;
      
      // Update score circle color
      const scoreCircle = document.querySelector('.score-circle');
      if (scoreCircle) {
        const scoreDeg = (score.overall / 100) * 360;
        scoreCircle.style.setProperty('--score-deg', `${scoreDeg}deg`);
        
        // Update color based on score
        let color = '#28a745'; // green
        if (score.overall < 40) color = '#dc3545'; // red
        else if (score.overall < 60) color = '#fd7e14'; // orange
        else if (score.overall < 80) color = '#007bff'; // blue
        
        scoreCircle.style.background = `conic-gradient(${color} 0deg ${scoreDeg}deg, #e9ecef ${scoreDeg}deg 360deg)`;
      }
    }

    // Breakdown scores
    if (this.elements.technicalScore) {
      this.elements.technicalScore.textContent = score.technical;
    }
    if (this.elements.contentScore) {
      this.elements.contentScore.textContent = score.content;
    }
    if (this.elements.performanceScore) {
      this.elements.performanceScore.textContent = score.performance;
    }

    // Progress bars
    if (this.elements.technicalFill) {
      this.elements.technicalFill.style.width = `${Math.max(score.technical, 2)}%`;
    }
    if (this.elements.contentFill) {
      this.elements.contentFill.style.width = `${Math.max(score.content, 2)}%`;
    }
    if (this.elements.performanceFill) {
      this.elements.performanceFill.style.width = `${Math.max(score.performance, 2)}%`;
    }
  }

  displayIssues(issues) {
    // Count issues by severity
    const counts = {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length
    };

    // Update counts
    if (this.elements.criticalCount) this.elements.criticalCount.textContent = counts.critical;
    if (this.elements.highCount) this.elements.highCount.textContent = counts.high;
    if (this.elements.mediumCount) this.elements.mediumCount.textContent = counts.medium;
    if (this.elements.lowCount) this.elements.lowCount.textContent = counts.low;

    // Render issues list
    if (this.elements.issuesList) {
      this.elements.issuesList.innerHTML = '';
      
      // Sort issues by severity
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const sortedIssues = issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
      
      sortedIssues.forEach(issue => {
        const issueCard = this.createIssueCard(issue);
        this.elements.issuesList.appendChild(issueCard);
      });
    }
  }

  createIssueCard(issue) {
    const card = document.createElement('div');
    card.className = `issue-card ${issue.severity}`;
    
    const severityText = {
      critical: '严重',
      high: '高优先级',
      medium: '中等',
      low: '低优先级'
    };

    card.innerHTML = `
      <div class="issue-header">
        <div class="issue-title">${issue.title}</div>
        <div class="issue-severity ${issue.severity}">${severityText[issue.severity]}</div>
      </div>
      <div class="issue-description">${issue.description}</div>
      ${this.createIssueDetails(issue)}
      <div class="issue-recommendation">
        <h4>解决方案</h4>
        <p>${issue.recommendation}</p>
      </div>
    `;
    
    return card;
  }

  createIssueDetails(issue) {
    let details = '<div class="issue-details">';
    
    if (issue.currentValue) {
      details += `
        <div class="issue-detail-item">
          <strong>当前状态:</strong> ${issue.currentValue}
        </div>
      `;
    }
    
    if (issue.expectedValue) {
      details += `
        <div class="issue-detail-item">
          <strong>建议值:</strong> ${issue.expectedValue}
        </div>
      `;
    }
    
    if (issue.impact) {
      details += `
        <div class="issue-detail-item">
          <strong>影响:</strong> ${issue.impact}
        </div>
      `;
    }
    
    if (issue.location) {
      details += `
        <div class="issue-detail-item">
          <strong>位置:</strong> ${issue.location}
        </div>
      `;
    }
    
    details += '</div>';
    return details;
  }

  displayTechnicalAnalysis(technical, performance) {
    // Meta tags analysis
    if (this.elements.metaAnalysis && technical.metaTags) {
      this.elements.metaAnalysis.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">页面标题</span>
          <span class="tech-value ${technical.metaTags.hasTitle ? 'good' : 'error'}">
            ${technical.metaTags.hasTitle ? '✓ 已设置' : '✗ 缺失'}
          </span>
        </div>
        ${technical.metaTags.hasTitle ? `
        <div class="tech-item">
          <span class="tech-label">标题长度</span>
          <span class="tech-value ${this.getTitleLengthStatus(technical.metaTags.titleLength)}">
            ${technical.metaTags.titleLength} 字符
          </span>
        </div>` : ''}
        <div class="tech-item">
          <span class="tech-label">Meta描述</span>
          <span class="tech-value ${technical.metaTags.hasDescription ? 'good' : 'error'}">
            ${technical.metaTags.hasDescription ? '✓ 已设置' : '✗ 缺失'}
          </span>
        </div>
        ${technical.metaTags.hasDescription ? `
        <div class="tech-item">
          <span class="tech-label">描述长度</span>
          <span class="tech-value ${this.getDescriptionLengthStatus(technical.metaTags.descriptionLength)}">
            ${technical.metaTags.descriptionLength} 字符
          </span>
        </div>` : ''}
        <div class="tech-item">
          <span class="tech-label">Open Graph</span>
          <span class="tech-value ${technical.metaTags.hasOpenGraph ? 'good' : 'warning'}">
            ${technical.metaTags.hasOpenGraph ? '✓ 已配置' : '○ 未配置'}
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">Twitter Cards</span>
          <span class="tech-value ${technical.metaTags.hasTwitterCards ? 'good' : 'warning'}">
            ${technical.metaTags.hasTwitterCards ? '✓ 已配置' : '○ 未配置'}
          </span>
        </div>
      `;
    }

    // Heading structure analysis
    if (this.elements.headingAnalysis && technical.headingStructure) {
      const dist = technical.headingStructure.headingDistribution;
      this.elements.headingAnalysis.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">H1标签</span>
          <span class="tech-value ${technical.headingStructure.hasH1 ? 'good' : 'error'}">
            ${technical.headingStructure.h1Count} 个
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">H2标签</span>
          <span class="tech-value">${dist.h2} 个</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">H3标签</span>
          <span class="tech-value">${dist.h3} 个</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">H4标签</span>
          <span class="tech-value">${dist.h4} 个</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">标题层次</span>
          <span class="tech-value ${technical.headingStructure.headingHierarchy ? 'good' : 'warning'}">
            ${technical.headingStructure.headingHierarchy ? '✓ 正确' : '⚠ 有问题'}
          </span>
        </div>
      `;
    }

    // Links analysis
    if (this.elements.linksAnalysis && technical.internalLinks) {
      this.elements.linksAnalysis.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">内部链接</span>
          <span class="tech-value">${technical.internalLinks.internalLinksCount} 个</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">外部链接</span>
          <span class="tech-value">${technical.internalLinks.externalLinksCount} 个</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">损坏链接</span>
          <span class="tech-value ${technical.internalLinks.brokenLinksCount === 0 ? 'good' : 'error'}">
            ${technical.internalLinks.brokenLinksCount} 个
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">Canonical URL</span>
          <span class="tech-value ${technical.canonicalUrl?.hasCanonical ? 'good' : 'warning'}">
            ${technical.canonicalUrl?.hasCanonical ? '✓ 已设置' : '○ 未设置'}
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">Robots指令</span>
          <span class="tech-value ${technical.robotsTxt?.isIndexable ? 'good' : 'warning'}">
            ${technical.robotsTxt?.isIndexable ? '✓ 可索引' : '⚠ 不可索引'}
          </span>
        </div>
      `;
    }

    // Images analysis
    if (this.elements.imagesAnalysis && performance?.imageOptimization) {
      const imageData = performance.imageOptimization;
      this.elements.imagesAnalysis.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">图片总数</span>
          <span class="tech-value">${imageData.totalImages || 0} 张</span>
        </div>
        ${(imageData.totalImages || 0) > 0 ? `
        <div class="tech-item">
          <span class="tech-label">缺少Alt属性</span>
          <span class="tech-value ${(imageData.imagesWithoutAlt || 0) === 0 ? 'good' : 'warning'}">
            ${imageData.imagesWithoutAlt || 0} 张
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">过大图片</span>
          <span class="tech-value ${(imageData.oversizedImages || 0) === 0 ? 'good' : 'warning'}">
            ${imageData.oversizedImages || 0} 张
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">未优化格式</span>
          <span class="tech-value ${(imageData.unoptimizedFormats || 0) === 0 ? 'good' : 'warning'}">
            ${imageData.unoptimizedFormats || 0} 张
          </span>
        </div>` : `
        <div class="tech-item">
          <span class="tech-label">图片分析</span>
          <span class="tech-value warning">页面无图片</span>
        </div>`}
      `;
    } else if (this.elements.imagesAnalysis) {
      // 如果没有图片数据，显示简单信息
      this.elements.imagesAnalysis.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">图片分析</span>
          <span class="tech-value warning">暂无数据</span>
        </div>
      `;
    }
  }

  displayContentAnalysis(content) {
    // Content statistics
    if (this.elements.contentStats && content) {
      this.elements.contentStats.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">字数统计</span>
          <span class="tech-value ${this.getWordCountStatus(content.wordCount)}">${content.wordCount} 字</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">段落数量</span>
          <span class="tech-value">${content.contentStructure?.hasParagraphs ? '✓' : '✗'} 有段落</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">列表结构</span>
          <span class="tech-value">${content.contentStructure?.hasLists ? '✓' : '○'} ${content.contentStructure?.hasLists ? '有列表' : '无列表'}</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">图片数量</span>
          <span class="tech-value">${content.contentStructure?.hasImages ? '✓' : '○'} ${content.contentStructure?.hasImages ? '有图片' : '无图片'}</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">文本/HTML比例</span>
          <span class="tech-value">${Math.round((content.contentStructure?.textToHtmlRatio || 0) * 100)}%</span>
        </div>
      `;
    }

    // Readability analysis
    if (this.elements.readabilityAnalysis && content) {
      this.elements.readabilityAnalysis.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">可读性评分</span>
          <span class="tech-value ${this.getReadabilityStatus(content.readabilityScore)}">${content.readabilityScore}/100</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">重复内容</span>
          <span class="tech-value ${content.duplicateContent?.duplicateContentPercentage === 0 ? 'good' : 'warning'}">
            ${content.duplicateContent?.duplicateContentPercentage || 0}%
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">关键词密度</span>
          <span class="tech-value">
            ${Object.keys(content.keywordDensity || {}).length} 个关键词
          </span>
        </div>
      `;
    }
  }

  displayPerformanceAnalysis(performance) {
    if (this.elements.pagePerformance && performance) {
      this.elements.pagePerformance.innerHTML = `
        <div class="tech-item">
          <span class="tech-label">页面大小</span>
          <span class="tech-value">${this.formatFileSize(performance.pageSize || 0)}</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">加载时间</span>
          <span class="tech-value ${this.getLoadTimeStatus(performance.loadTime)}">${(performance.loadTime || 0).toFixed(2)}s</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">图片总数</span>
          <span class="tech-value">${performance.imageOptimization?.totalImages || 0} 张</span>
        </div>
        <div class="tech-item">
          <span class="tech-label">缺少Alt属性</span>
          <span class="tech-value ${(performance.imageOptimization?.imagesWithoutAlt || 0) === 0 ? 'good' : 'warning'}">
            ${performance.imageOptimization?.imagesWithoutAlt || 0} 张
          </span>
        </div>
        <div class="tech-item">
          <span class="tech-label">图片优化</span>
          <span class="tech-value ${(performance.imageOptimization?.unoptimizedFormats || 0) === 0 ? 'good' : 'warning'}">
            ${performance.imageOptimization?.unoptimizedFormats || 0} 张未优化
          </span>
        </div>
      `;
    }
  }

  // Helper methods for status determination
  getTitleLengthStatus(length) {
    if (length >= 30 && length <= 60) return 'good';
    if (length >= 20 && length <= 70) return 'warning';
    return 'error';
  }

  getDescriptionLengthStatus(length) {
    if (length >= 120 && length <= 160) return 'good';
    if (length >= 100 && length <= 180) return 'warning';
    return 'error';
  }

  getWordCountStatus(count) {
    if (count >= 300) return 'good';
    if (count >= 150) return 'warning';
    return 'error';
  }

  getReadabilityStatus(score) {
    if (score >= 70) return 'good';
    if (score >= 50) return 'warning';
    return 'error';
  }

  getLoadTimeStatus(time) {
    if (time <= 2) return 'good';
    if (time <= 4) return 'warning';
    return 'error';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  displayAISuggestions(suggestions) {
    if (!this.elements.aiSuggestionsList) return;

    // Clear existing content
    this.elements.aiSuggestionsList.innerHTML = '';
    
    // Check if AI suggestions exist and have content
    const hasAISuggestions = suggestions && (
      suggestions.titleOptimization || 
      suggestions.metaDescriptionSuggestion || 
      (suggestions.contentImprovements && suggestions.contentImprovements.length > 0) ||
      suggestions.keywordSuggestions || 
      (suggestions.structureRecommendations && suggestions.structureRecommendations.length > 0) ||
      suggestions.summary
    );
    
    if (!hasAISuggestions) {
      // Show loading/not generated message
      if (this.elements.aiSuggestionsLoading) {
        this.elements.aiSuggestionsLoading.classList.remove('hidden');
      }
      return;
    }

    // Hide loading message
    if (this.elements.aiSuggestionsLoading) {
      this.elements.aiSuggestionsLoading.classList.add('hidden');
    }

    // Check if there's a summary (no issues found)
    if (suggestions.summary) {
      this.createAISummarySection(suggestions.summary);
      return;
    }

    // Create suggestions sections
    if (suggestions.titleOptimization) {
      this.createAITitleSection(suggestions.titleOptimization);
    }
    if (suggestions.metaDescriptionSuggestion) {
      this.createAIMetaSection(suggestions.metaDescriptionSuggestion);
    }
    if (suggestions.contentImprovements && suggestions.contentImprovements.length > 0) {
      this.createAIContentSection(suggestions.contentImprovements);
    }
    if (suggestions.keywordSuggestions) {
      this.createAIKeywordSection(suggestions.keywordSuggestions);
    }
    if (suggestions.structureRecommendations && suggestions.structureRecommendations.length > 0) {
      this.createAIStructureSection(suggestions.structureRecommendations);
    }
  }

  createAISummarySection(summary) {
    const section = document.createElement('div');
    section.className = 'ai-suggestion-card summary-card';
    
    section.innerHTML = `
      <div class="ai-card-header">
        <h3>🎉 SEO状况良好</h3>
      </div>
      <div class="ai-card-content">
        <div class="summary-message">
          ${summary.message}
        </div>
        ${summary.suggestions && summary.suggestions.length > 0 ? `
        <div class="summary-suggestions">
          <h4>持续优化建议:</h4>
          <ul>
            ${summary.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createAITitleSection(titleOpt) {
    if (!titleOpt) return;
    
    const section = document.createElement('div');
    section.className = 'ai-suggestion-card';
    
    const hasImprovement = titleOpt.suggestion && titleOpt.suggestion !== '当前标题已经很好';
    
    section.innerHTML = `
      <div class="ai-card-header">
        <h3>📝 标题优化建议</h3>
        <span class="ai-status ${titleOpt.length?.status || 'unknown'}">${this.getAIStatusText(titleOpt.length?.status)}</span>
      </div>
      <div class="ai-card-content">
        ${titleOpt.current ? `
        <div class="current-content">
          <h4>当前标题:</h4>
          <div class="content-display">${titleOpt.current}</div>
          <small class="content-meta">长度: ${titleOpt.length?.current || titleOpt.current.length} 字符</small>
        </div>` : ''}
        
        ${hasImprovement ? `
        <div class="suggested-content">
          <h4>优化建议:</h4>
          <div class="content-display suggested">${titleOpt.suggestion}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${titleOpt.suggestion.replace(/'/g, "\\'")}')">复制建议</button>
        </div>` : ''}
        
        <div class="ai-analysis">
          <h4>AI分析:</h4>
          <p>${titleOpt.reason}</p>
        </div>
        
        ${titleOpt.improvements && titleOpt.improvements.length > 0 ? `
        <div class="improvement-points">
          <h4>改进要点:</h4>
          <ul>
            ${titleOpt.improvements.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>` : ''}
        
        ${titleOpt.keywords && titleOpt.keywords.length > 0 ? `
        <div class="keyword-recommendations">
          <h4>推荐关键词:</h4>
          <div class="keyword-tags">
            ${titleOpt.keywords.map(keyword => `<span class="keyword-tag">${keyword}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createAIMetaSection(metaOpt) {
    if (!metaOpt) return;
    
    const section = document.createElement('div');
    section.className = 'ai-suggestion-card';
    
    const hasImprovement = metaOpt.suggestion && metaOpt.suggestion !== '当前描述已经很好';
    
    section.innerHTML = `
      <div class="ai-card-header">
        <h3>📄 Meta描述优化</h3>
        <span class="ai-status ${metaOpt.length?.status || 'unknown'}">${this.getAIStatusText(metaOpt.length?.status)}</span>
      </div>
      <div class="ai-card-content">
        ${metaOpt.current ? `
        <div class="current-content">
          <h4>当前描述:</h4>
          <div class="content-display">${metaOpt.current}</div>
          <small class="content-meta">长度: ${metaOpt.length?.current || metaOpt.current.length} 字符</small>
        </div>` : ''}
        
        ${hasImprovement ? `
        <div class="suggested-content">
          <h4>优化建议:</h4>
          <div class="content-display suggested">${metaOpt.suggestion}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${metaOpt.suggestion.replace(/'/g, "\\'")}')">复制建议</button>
        </div>` : ''}
        
        <div class="ai-analysis">
          <h4>AI分析:</h4>
          <p>${metaOpt.reason}</p>
        </div>
        
        ${metaOpt.guidelines && metaOpt.guidelines.length > 0 ? `
        <div class="guidelines">
          <h4>编写指南:</h4>
          <ul>
            ${metaOpt.guidelines.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createAIContentSection(improvements) {
    if (!improvements || !Array.isArray(improvements) || improvements.length === 0) return;
    
    const section = document.createElement('div');
    section.className = 'ai-suggestion-card';
    
    section.innerHTML = `
      <div class="ai-card-header">
        <h3>✨ 内容改进建议</h3>
        <span class="ai-count">${improvements.length} 项建议</span>
      </div>
      <div class="ai-card-content">
        ${improvements.map(improvement => `
          <div class="improvement-item ${improvement.priority}">
            <div class="improvement-header">
              <span class="priority-badge ${improvement.priority}">${this.getAIPriorityText(improvement.priority)}</span>
              <h4>${improvement.title}</h4>
            </div>
            <div class="improvement-description">${improvement.description}</div>
            ${improvement.suggestions && improvement.suggestions.length > 0 ? `
            <div class="improvement-suggestions">
              <h5>具体建议:</h5>
              <ul>
                ${improvement.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
              </ul>
            </div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createAIKeywordSection(keywords) {
    if (!keywords) return;
    
    const section = document.createElement('div');
    section.className = 'ai-suggestion-card';
    
    section.innerHTML = `
      <div class="ai-card-header">
        <h3>🔍 关键词建议</h3>
      </div>
      <div class="ai-card-content">
        ${keywords.primary && keywords.primary.length > 0 ? `
        <div class="keyword-category">
          <h4>主要关键词:</h4>
          <div class="keyword-list">
            ${keywords.primary.map(kw => `
              <div class="keyword-item">
                <span class="keyword">${kw.keyword}</span>
                <small class="keyword-suggestion">${kw.suggestion}</small>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
        
        ${keywords.secondary && keywords.secondary.length > 0 ? `
        <div class="keyword-category">
          <h4>次要关键词:</h4>
          <div class="keyword-list">
            ${keywords.secondary.map(kw => `
              <div class="keyword-item">
                <span class="keyword">${kw.keyword}</span>
                <small class="keyword-suggestion">${kw.suggestion}</small>
              </div>
            `).join('')}
          </div>
        </div>` : ''}
        
        ${keywords.longTail && keywords.longTail.length > 0 ? `
        <div class="keyword-category">
          <h4>长尾关键词:</h4>
          <div class="keyword-tags">
            ${keywords.longTail.map(kw => `<span class="keyword-tag" title="${kw.suggestion}">${kw.keyword}</span>`).join('')}
          </div>
        </div>` : ''}
        
        ${keywords.semantic && keywords.semantic.length > 0 ? `
        <div class="keyword-category">
          <h4>语义相关词:</h4>
          <div class="keyword-tags">
            ${keywords.semantic.map(kw => `<span class="keyword-tag" title="${kw.suggestion}">${kw.keyword}</span>`).join('')}
          </div>
        </div>` : ''}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createAIStructureSection(recommendations) {
    if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) return;
    
    const section = document.createElement('div');
    section.className = 'ai-suggestion-card';
    
    section.innerHTML = `
      <div class="ai-card-header">
        <h3>🏗️ 结构优化建议</h3>
        <span class="ai-count">${recommendations.length} 项建议</span>
      </div>
      <div class="ai-card-content">
        ${recommendations.map(rec => `
          <div class="recommendation-item ${rec.priority}">
            <div class="recommendation-header">
              <span class="priority-badge ${rec.priority}">${this.getAIPriorityText(rec.priority)}</span>
              <h4>${rec.title}</h4>
            </div>
            <div class="recommendation-description">${rec.description}</div>
            ${rec.implementation && rec.implementation.length > 0 ? `
            <div class="implementation-steps">
              <h5>实施步骤:</h5>
              <ol>
                ${rec.implementation.map(step => `<li>${step}</li>`).join('')}
              </ol>
            </div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  getAIStatusText(status) {
    const statusMap = {
      'good': '✅ 良好',
      'needs-improvement': '⚠️ 需改进',
      'unknown': '❓ 未知'
    };
    return statusMap[status] || '❓ 未知';
  }

  getAIPriorityText(priority) {
    const priorityMap = {
      'critical': '🔴 严重',
      'high': '🟠 高',
      'medium': '🟡 中',
      'low': '🟢 低'
    };
    return priorityMap[priority] || '❓ 未知';
  }

  exportToPDF() {
    // Simple PDF export using browser's print functionality
    window.print();
  }

  showLoading() {
    this.elements.loading?.classList.remove('hidden');
    this.elements.error?.classList.add('hidden');
    this.elements.reportContent?.classList.add('hidden');
  }

  showError(message) {
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
    }
    this.elements.loading?.classList.add('hidden');
    this.elements.error?.classList.remove('hidden');
    this.elements.reportContent?.classList.add('hidden');
  }

  showReport() {
    this.elements.loading?.classList.add('hidden');
    this.elements.error?.classList.add('hidden');
    this.elements.reportContent?.classList.remove('hidden');
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DetailedReportUI();
});