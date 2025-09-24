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