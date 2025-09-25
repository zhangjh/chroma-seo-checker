// Detailed Report Script - English Only Version

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
        throw new Error('No analysis report found. Please run SEO analysis on a webpage first, then view the detailed report.');
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
        this.updateScoreColor(scoreCircle, score.overall);
      }
    }

    // Breakdown scores
    if (this.elements.technicalScore) {
      this.elements.technicalScore.textContent = score.technical;
      this.updateScoreNumberColor(this.elements.technicalScore, score.technical);
    }
    if (this.elements.contentScore) {
      this.elements.contentScore.textContent = score.content;
      this.updateScoreNumberColor(this.elements.contentScore, score.content);
    }
    if (this.elements.performanceScore) {
      this.elements.performanceScore.textContent = score.performance;
      this.updateScoreNumberColor(this.elements.performanceScore, score.performance);
    }

    // Progress bars
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
      
      // Group issues by severity
      const severityOrder = ['critical', 'high', 'medium', 'low'];
      
      severityOrder.forEach(severity => {
        const severityIssues = issues.filter(i => i.severity === severity);
        if (severityIssues.length > 0) {
          this.renderIssueGroup(severity, severityIssues);
        }
      });
    }
  }

  renderIssueGroup(severity, issues) {
    const groupElement = document.createElement('div');
    groupElement.className = `issue-group ${severity}`;
    
    const severityNames = {
      critical: 'Critical Issues',
      high: 'High Priority Issues',
      medium: 'Medium Issues',
      low: 'Low Priority Issues'
    };

    groupElement.innerHTML = `
      <h4 class="issue-group-title">${severityNames[severity]} (${issues.length})</h4>
      <div class="issue-group-content">
        ${issues.map(issue => this.renderIssueItem(issue)).join('')}
      </div>
    `;

    this.elements.issuesList.appendChild(groupElement);
  }

  renderIssueItem(issue) {
    return `
      <div class="issue-item ${issue.severity}">
        <div class="issue-header">
          <span class="severity-badge ${issue.severity}">${this.getSeverityText(issue.severity)}</span>
          <h5 class="issue-title">${issue.title}</h5>
        </div>
        <div class="issue-content">
          <div class="issue-description">${issue.description}</div>
          
          ${issue.currentValue ? `
          <div class="issue-detail">
            <strong>Current Status:</strong> ${issue.currentValue}
          </div>` : ''}
          
          ${issue.expectedValue ? `
          <div class="issue-detail">
            <strong>Suggested Value:</strong> ${issue.expectedValue}
          </div>` : ''}
          
          ${issue.location ? `
          <div class="issue-detail">
            <strong>Location:</strong> ${issue.location}
          </div>` : ''}
          
          ${issue.impact ? `
          <div class="issue-detail">
            <strong>Impact:</strong> ${issue.impact}
          </div>` : ''}
          
          <div class="issue-recommendation">
            <strong>Solution:</strong>
            <div class="recommendation-content">${issue.recommendation}</div>
          </div>
        </div>
      </div>
    `;
  }

  displayTechnicalAnalysis(technicalResults, performanceResults) {
    if (this.elements.metaAnalysis) {
      this.elements.metaAnalysis.innerHTML = this.renderMetaAnalysis(technicalResults.metaTags);
    }
    
    if (this.elements.headingAnalysis) {
      this.elements.headingAnalysis.innerHTML = this.renderHeadingAnalysis(technicalResults.headingStructure);
    }
    
    if (this.elements.linksAnalysis) {
      this.elements.linksAnalysis.innerHTML = this.renderLinksAnalysis(technicalResults.internalLinks);
    }
    
    if (this.elements.imagesAnalysis && performanceResults.imageOptimization) {
      this.elements.imagesAnalysis.innerHTML = this.renderImagesAnalysis(performanceResults.imageOptimization);
    }
  }

  renderMetaAnalysis(metaTags) {
    return `
      <div class="analysis-section">
        <h4>Meta Tags Analysis</h4>
        <div class="analysis-items">
          <div class="analysis-item">
            <span class="analysis-label">Page Title:</span>
            <span class="analysis-value ${metaTags.hasTitle ? 'good' : 'bad'}">
              ${metaTags.hasTitle ? '✓ Set' : '✗ Missing'}
            </span>
            ${metaTags.titleLength ? `<span class="analysis-detail">${metaTags.titleLength} characters</span>` : ''}
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Meta Description:</span>
            <span class="analysis-value ${metaTags.hasDescription ? 'good' : 'bad'}">
              ${metaTags.hasDescription ? '✓ Set' : '✗ Missing'}
            </span>
            ${metaTags.descriptionLength ? `<span class="analysis-detail">${metaTags.descriptionLength} characters</span>` : ''}
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Open Graph:</span>
            <span class="analysis-value ${metaTags.hasOpenGraph ? 'good' : 'neutral'}">
              ${metaTags.hasOpenGraph ? '✓ Set' : '○ Not Configured'}
            </span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Twitter Cards:</span>
            <span class="analysis-value ${metaTags.hasTwitterCards ? 'good' : 'neutral'}">
              ${metaTags.hasTwitterCards ? '✓ Set' : '○ Not Configured'}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderHeadingAnalysis(headingStructure) {
    return `
      <div class="analysis-section">
        <h4>Heading Structure</h4>
        <div class="analysis-items">
          <div class="analysis-item">
            <span class="analysis-label">H1 Tags:</span>
            <span class="analysis-value ${headingStructure.hasH1 && headingStructure.h1Count === 1 ? 'good' : 'bad'}">
              ${headingStructure.h1Count} count
            </span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">H2 Tags:</span>
            <span class="analysis-value">${headingStructure.headingDistribution?.h2 || 0} count</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">H3 Tags:</span>
            <span class="analysis-value">${headingStructure.headingDistribution?.h3 || 0} count</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Title Hierarchy:</span>
            <span class="analysis-value ${headingStructure.headingHierarchy ? 'good' : 'bad'}">
              ${headingStructure.headingHierarchy ? '✓ Correct' : '⚠ Has Issues'}
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderLinksAnalysis(linksData) {
    return `
      <div class="analysis-section">
        <h4>Links Analysis</h4>
        <div class="analysis-items">
          <div class="analysis-item">
            <span class="analysis-label">Internal Links:</span>
            <span class="analysis-value">${linksData.internalLinksCount} count</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">External Links:</span>
            <span class="analysis-value">${linksData.externalLinksCount} count</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Broken Links:</span>
            <span class="analysis-value ${linksData.brokenLinksCount === 0 ? 'good' : 'bad'}">
              ${linksData.brokenLinksCount} count
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderImagesAnalysis(imageData) {
    return `
      <div class="analysis-section">
        <h4>Image Optimization</h4>
        <div class="analysis-items">
          <div class="analysis-item">
            <span class="analysis-label">Total Images:</span>
            <span class="analysis-value">${imageData.totalImages} images</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Missing Alt Attribute:</span>
            <span class="analysis-value ${imageData.imagesWithoutAlt === 0 ? 'good' : 'bad'}">
              ${imageData.imagesWithoutAlt} images
            </span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Image Optimization:</span>
            <span class="analysis-value ${imageData.unoptimizedFormats === 0 ? 'good' : 'neutral'}">
              ${imageData.unoptimizedFormats || 0} unoptimized
            </span>
          </div>
        </div>
      </div>
    `;
  }

  displayContentAnalysis(contentResults) {
    if (this.elements.contentStats) {
      this.elements.contentStats.innerHTML = this.renderContentStats(contentResults);
    }
    
    if (this.elements.readabilityAnalysis) {
      this.elements.readabilityAnalysis.innerHTML = this.renderReadabilityAnalysis(contentResults);
    }
  }

  renderContentStats(contentResults) {
    return `
      <div class="analysis-section">
        <h4>Content Statistics</h4>
        <div class="analysis-items">
          <div class="analysis-item">
            <span class="analysis-label">Word Count:</span>
            <span class="analysis-value">${contentResults.wordCount} words</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Paragraph Count:</span>
            <span class="analysis-value">${contentResults.contentStructure?.hasParagraphs ? '✓ Has paragraphs' : '✗ No paragraphs'}</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">List Structure:</span>
            <span class="analysis-value">${contentResults.contentStructure?.hasLists ? '✓ Has lists' : '○ No lists'}</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Image Count:</span>
            <span class="analysis-value">${contentResults.contentStructure?.hasImages ? '✓ Has images' : '○ No images'}</span>
          </div>
        </div>
      </div>
    `;
  }

  renderReadabilityAnalysis(contentResults) {
    return `
      <div class="analysis-section">
        <h4>Readability Analysis</h4>
        <div class="analysis-items">
          <div class="analysis-item">
            <span class="analysis-label">Readability Score:</span>
            <span class="analysis-value">${contentResults.readabilityScore || 'No Data'}</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Text/HTML Ratio:</span>
            <span class="analysis-value">${contentResults.contentStructure?.textToHtmlRatio || 0}%</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Duplicate Content:</span>
            <span class="analysis-value ${!contentResults.duplicateContent?.hasDuplicateTitle ? 'good' : 'bad'}">
              ${contentResults.duplicateContent?.duplicateContentPercentage || 0}%
            </span>
          </div>
        </div>
      </div>
    `;
  }

  displayPerformanceAnalysis(performanceResults) {
    if (this.elements.pagePerformance) {
      this.elements.pagePerformance.innerHTML = this.renderPagePerformance(performanceResults);
    }
  }

  renderPagePerformance(performanceResults) {
    return `
      <div class="analysis-section">
        <h4>Page Performance</h4>
        <div class="analysis-items">
          <div class="analysis-item">
            <span class="analysis-label">Page Size:</span>
            <span class="analysis-value">${performanceResults.pageSize ? (performanceResults.pageSize / 1024).toFixed(1) + ' KB' : 'No Data'}</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Load Time:</span>
            <span class="analysis-value">${performanceResults.loadTime ? performanceResults.loadTime.toFixed(2) + ' seconds' : 'No Data'}</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Total Images:</span>
            <span class="analysis-value">${performanceResults.imageOptimization?.totalImages || 0} images</span>
          </div>
          
          <div class="analysis-item">
            <span class="analysis-label">Missing Alt Attribute:</span>
            <span class="analysis-value">${performanceResults.imageOptimization?.imagesWithoutAlt || 0} images</span>
          </div>
        </div>
      </div>
    `;
  }

  displayAISuggestions(suggestions) {
    if (!suggestions) {
      if (this.elements.aiSuggestionsContent) {
        this.elements.aiSuggestionsContent.innerHTML = `
          <div class="no-suggestions">
            <p>AI suggestions not generated yet, please click 'Generate AI Suggestions' button in the extension</p>
          </div>
        `;
      }
      return;
    }

    if (this.elements.aiSuggestionsList) {
      this.elements.aiSuggestionsList.innerHTML = '';

      // Check if there's a summary (no issues found)
      if (suggestions.summary) {
        this.createSummarySection(suggestions.summary);
        return;
      }

      // Create suggestions sections
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
  }

  createSummarySection(summary) {
    const section = document.createElement('div');
    section.className = 'suggestion-section summary-section';

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>🎉 SEO Status Good</h4>
      </div>
      <div class="suggestion-content">
        <div class="summary-message">${summary.message}</div>
        ${summary.continuousOptimization && summary.continuousOptimization.length > 0 ? `
        <div class="continuous-optimization">
          <strong>Continuous Optimization Suggestions:</strong>
          <ul>
            ${summary.continuousOptimization.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createTitleOptimizationSection(titleOpt) {
    if (!titleOpt) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';

    const goodTitleText = 'Current title is already good';
    const hasImprovement = titleOpt.suggestion && titleOpt.suggestion !== goodTitleText;

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>📝 Title Optimization Suggestions</h4>
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
            Copy Suggestion
          </button>
        </div>` : ''}
        
        <div class="suggestion-reason">
          <strong>AI Analysis:</strong> ${titleOpt.reason}
        </div>
        
        ${titleOpt.improvements && titleOpt.improvements.length > 0 ? `
        <div class="improvement-tips">
          <strong>Improvement Points:</strong>
          <ul>
            ${titleOpt.improvements.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
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

    this.elements.aiSuggestionsList.appendChild(section);
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
            Copy Suggestion
          </button>
        </div>` : ''}
        
        ${metaOpt.template ? `
        <div class="suggested-content">
          <strong>Suggested Template:</strong>
          <div class="content-box suggested">${metaOpt.template}</div>
          <button class="copy-btn" onclick="navigator.clipboard.writeText('${metaOpt.template.replace(/'/g, "\\'")}')">
            Copy Suggestion
          </button>
        </div>` : ''}
        
        <div class="suggestion-reason">
          <strong>AI Analysis:</strong> ${metaOpt.reason}
        </div>
        
        ${metaOpt.guidelines && metaOpt.guidelines.length > 0 ? `
        <div class="improvement-tips">
          <strong>Writing Guidelines:</strong>
          <ul>
            ${metaOpt.guidelines.map(tip => `<li>${tip}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createContentImprovementsSection(improvements) {
    if (!improvements || improvements.length === 0) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>✨ Content Improvement Suggestions</h4>
        <span class="suggestion-count">${improvements.length === 1 ? '1 suggestion' : `${improvements.length} suggestions`}</span>
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
              <strong>Specific Suggestions:</strong>
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

  createKeywordSuggestionsSection(keywordSuggestions) {
    if (!keywordSuggestions) return;

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

    this.elements.aiSuggestionsList.appendChild(section);
  }

  createStructureRecommendationsSection(recommendations) {
    if (!recommendations || recommendations.length === 0) return;

    const section = document.createElement('div');
    section.className = 'suggestion-section';

    section.innerHTML = `
      <div class="suggestion-header">
        <h4>🏗️ Structure Optimization Suggestions</h4>
        <span class="suggestion-count">${recommendations.length === 1 ? '1 suggestion' : `${recommendations.length} suggestions`}</span>
      </div>
      <div class="suggestion-content">
        ${recommendations.map(rec => `
          <div class="structure-recommendation">
            <div class="recommendation-header">
              <strong>${rec.title}</strong>
            </div>
            <div class="recommendation-description">${rec.description}</div>
            ${rec.steps && rec.steps.length > 0 ? `
            <div class="implementation-steps">
              <strong>Implementation Steps:</strong>
              <ol>
                ${rec.steps.map(step => `<li>${step}</li>`).join('')}
              </ol>
            </div>` : ''}
          </div>
        `).join('')}
      </div>
    `;

    this.elements.aiSuggestionsList.appendChild(section);
  }

  exportToPDF() {
    // Simple print functionality - browsers handle PDF export
    window.print();
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

  getPriorityText(priority) {
    const priorityMap = {
      'critical': 'Critical',
      'high': 'High',
      'medium': 'Medium',
      'low': 'Low'
    };
    return priorityMap[priority] || priority;
  }

  getStatusText(status) {
    const statusMap = {
      'good': '✅ Good',
      'needs-improvement': '⚠️ Needs Improvement',
      'unknown': '❓ Unknown'
    };
    return statusMap[status] || '❓ Unknown';
  }

  updateScoreColor(element, score) {
    element.classList.remove('score-excellent', 'score-good', 'score-fair', 'score-poor');
    if (score >= 90) {
      element.classList.add('score-excellent');
    } else if (score >= 70) {
      element.classList.add('score-good');
    } else if (score >= 50) {
      element.classList.add('score-fair');
    } else {
      element.classList.add('score-poor');
    }
  }

  updateScoreNumberColor(element, score) {
    element.classList.remove('score-excellent', 'score-good', 'score-fair', 'score-poor');
    if (score >= 90) {
      element.classList.add('score-excellent');
    } else if (score >= 70) {
      element.classList.add('score-good');
    } else if (score >= 50) {
      element.classList.add('score-fair');
    } else {
      element.classList.add('score-poor');
    }
  }

  updateProgressBarColor(element, score) {
    element.classList.remove('progress-excellent', 'progress-good', 'progress-fair', 'progress-poor');
    if (score >= 90) {
      element.classList.add('progress-excellent');
    } else if (score >= 70) {
      element.classList.add('progress-good');
    } else if (score >= 50) {
      element.classList.add('progress-fair');
    } else {
      element.classList.add('progress-poor');
    }
  }

  showLoading() {
    if (this.elements.loading) {
      this.elements.loading.classList.remove('hidden');
    }
    if (this.elements.error) {
      this.elements.error.classList.add('hidden');
    }
    if (this.elements.reportContent) {
      this.elements.reportContent.style.display = 'none';
    }
  }

  showError(message) {
    if (this.elements.loading) {
      this.elements.loading.classList.add('hidden');
    }
    if (this.elements.error) {
      this.elements.error.classList.remove('hidden');
    }
    if (this.elements.errorMessage) {
      this.elements.errorMessage.textContent = message;
    }
    if (this.elements.reportContent) {
      this.elements.reportContent.style.display = 'none';
    }
  }

  showReport() {
    if (this.elements.loading) {
      this.elements.loading.classList.add('hidden');
    }
    if (this.elements.error) {
      this.elements.error.classList.add('hidden');
    }
    if (this.elements.reportContent) {
      this.elements.reportContent.style.display = 'block';
    }
  }
}

// Initialize the detailed report when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DetailedReportUI();
});