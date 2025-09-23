// Simple background service worker without modules
console.log('SEO Checker Background: Service worker starting...');

// Simple storage manager
class SimpleStorageManager {
  async saveReport(report) {
    try {
      const reports = await this.getAllReports();
      const filteredReports = reports.filter(r => r.url !== report.url);
      filteredReports.unshift(report);
      const trimmedReports = filteredReports.slice(0, 100);
      
      await chrome.storage.local.set({
        'seo_reports': trimmedReports
      });
    } catch (error) {
      console.error('Failed to save SEO report:', error);
    }
  }

  async getAllReports() {
    try {
      const result = await chrome.storage.local.get('seo_reports');
      return result['seo_reports'] || [];
    } catch (error) {
      console.error('Failed to retrieve SEO reports:', error);
      return [];
    }
  }

  async getReportByUrl(url) {
    try {
      const reports = await this.getAllReports();
      return reports.find(report => report.url === url) || null;
    } catch (error) {
      console.error('Failed to retrieve SEO report:', error);
      return null;
    }
  }
}

// Simple background service
class SimpleBackgroundService {
  constructor() {
    console.log('SEO Checker Background: Initializing BackgroundService...');
    this.storageManager = new SimpleStorageManager();
    this.analysisStatus = new Map();
    this.initializeMessageHandlers();
    console.log('SEO Checker Background: BackgroundService initialized successfully');
  }

  initializeMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('SEO Checker Background: Received message:', message);
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      // Handle content script messages (using 'type' field)
      if (message.type) {
        switch (message.type) {
          case 'ANALYSIS_COMPLETE':
            await this.handleAnalysisComplete(message, sender, sendResponse);
            break;
          
          case 'CONTENT_READY':
            console.log('SEO Checker Background: Content script ready:', message.data);
            sendResponse({ success: true });
            break;
          
          case 'ANALYSIS_PROGRESS':
            await this.handleAnalysisProgress(message, sender, sendResponse);
            break;
          
          default:
            sendResponse({ error: 'Unknown message type' });
        }
        return;
      }

      // Handle popup messages (using 'action' field)
      switch (message.action) {
        case 'ping':
          console.log('SEO Checker Background: Responding to ping');
          sendResponse({ success: true, message: 'Background script is ready' });
          break;
          
        case 'getPageAnalysis':
          await this.handleGetPageAnalysis(message, sendResponse);
          break;
        
        case 'analyzeCurrentPage':
          await this.handleAnalyzeCurrentPage(message, sendResponse);
          break;
        
        case 'getAnalysisStatus':
          await this.handleGetAnalysisStatus(message, sendResponse);
          break;
        
        case 'openDetailedReport':
          await this.handleOpenDetailedReport(message, sendResponse);
          break;
        
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('SEO Checker Background: Message handling error:', error);
      sendResponse({ error: error.message || 'Unknown error' });
    }
  }

  async handleGetPageAnalysis(message, sendResponse) {
    try {
      console.log('SEO Checker Background: Handling getPageAnalysis request');
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('缺少标签页ID');
      }

      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        throw new Error('无法获取页面URL');
      }

      const report = await this.storageManager.getReportByUrl(tab.url);
      console.log('SEO Checker Background: Found report:', !!report);
      
      sendResponse({ report: report });
    } catch (error) {
      console.error('SEO Checker Background: Get page analysis error:', error);
      sendResponse({ 
        error: error.message || '获取页面分析失败' 
      });
    }
  }

  async handleAnalyzeCurrentPage(message, sendResponse) {
    try {
      console.log('SEO Checker Background: Handling analyze current page request');
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('缺少标签页ID');
      }

      // Check if tab exists and is valid
      try {
        const tab = await chrome.tabs.get(tabId);
        console.log('SEO Checker Background: Tab info:', tab);
        
        if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
          throw new Error('当前页面不是有效的网页，SEO分析仅支持HTTP/HTTPS页面');
        }
      } catch (tabError) {
        console.error('SEO Checker Background: Tab error:', tabError);
        throw new Error('无法访问当前标签页');
      }

      // Set analysis status to running
      this.analysisStatus.set(tabId, { status: 'running', startTime: Date.now() });

      console.log('SEO Checker Background: Sending START_ANALYSIS message to content script, tabId:', tabId);
      
      try {
        // Trigger content script analysis
        const contentResponse = await chrome.tabs.sendMessage(tabId, { type: 'START_ANALYSIS' });
        console.log('SEO Checker Background: Content script response:', contentResponse);
      } catch (contentError) {
        console.error('SEO Checker Background: Content script error:', contentError);
        this.analysisStatus.set(tabId, { status: 'failed', startTime: Date.now() });
        throw new Error('无法与页面内容脚本通信，请刷新页面后重试');
      }
      
      console.log('SEO Checker Background: Analysis message sent successfully');
      sendResponse({ success: true, message: '分析已开始' });
    } catch (error) {
      console.error('SEO Checker Background: Analyze current page error:', error);
      const { tabId } = message;
      if (tabId) {
        this.analysisStatus.set(tabId, { status: 'failed', startTime: Date.now() });
      }
      sendResponse({ 
        error: error.message || '启动分析失败' 
      });
    }
  }

  async handleGetAnalysisStatus(message, sendResponse) {
    try {
      console.log('SEO Checker Background: Getting analysis status');
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('缺少标签页ID');
      }

      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        throw new Error('无法获取页面URL');
      }

      // Check current analysis status
      const currentStatus = this.analysisStatus.get(tabId);
      console.log('SEO Checker Background: Current analysis status for tab', tabId, ':', currentStatus);

      if (currentStatus) {
        if (currentStatus.status === 'running') {
          // Check if analysis has been running too long (more than 2 minutes)
          const runningTime = Date.now() - currentStatus.startTime;
          if (runningTime > 2 * 60 * 1000) {
            console.log('SEO Checker Background: Analysis timeout detected');
            this.analysisStatus.set(tabId, { status: 'failed', startTime: Date.now() });
            sendResponse({ 
              completed: false,
              error: '分析超时，请重试'
            });
            return;
          }
          
          sendResponse({ 
            completed: false,
            running: true,
            message: '分析正在进行中...',
            progress: currentStatus.progress
          });
          return;
        } else if (currentStatus.status === 'failed') {
          sendResponse({ 
            completed: false,
            error: '分析失败，请重试'
          });
          return;
        }
      }

      const report = await this.storageManager.getReportByUrl(tab.url);
      
      // Check if analysis was completed recently (within last 5 minutes)
      const isRecent = report && (Date.now() - new Date(report.timestamp).getTime()) < 5 * 60 * 1000;
      
      if (isRecent) {
        this.analysisStatus.set(tabId, { status: 'completed', startTime: Date.now() });
      }
      
      console.log('SEO Checker Background: Analysis status response - completed:', !!report && isRecent);
      sendResponse({ 
        completed: !!report && isRecent,
        report: report 
      });
    } catch (error) {
      console.error('SEO Checker Background: Get analysis status error:', error);
      sendResponse({ 
        error: error.message || '获取分析状态失败' 
      });
    }
  }

  async handleAnalysisComplete(message, sender, sendResponse) {
    try {
      console.log('SEO Checker Background: Handling analysis complete');
      const analysis = message.data;
      if (!analysis) {
        throw new Error('No analysis data provided');
      }

      const tabId = sender.tab?.id;
      if (tabId) {
        this.analysisStatus.set(tabId, { status: 'completed', startTime: Date.now() });
      }

      console.log('SEO Checker Background: Converting analysis to report');
      // Convert analysis to SEO report
      const report = this.convertAnalysisToReport(analysis, sender.tab);
      
      console.log('SEO Checker Background: Saving report to storage');
      // Save report to storage
      await this.storageManager.saveReport(report);
      
      console.log('SEO Checker Background: Analysis complete and saved:', report.url);
      sendResponse({ success: true });
    } catch (error) {
      console.error('SEO Checker Background: Error handling analysis complete:', error);
      const tabId = sender.tab?.id;
      if (tabId) {
        this.analysisStatus.set(tabId, { status: 'failed', startTime: Date.now() });
      }
      sendResponse({ error: error.message || 'Unknown error' });
    }
  }

  async handleAnalysisProgress(message, sender, sendResponse) {
    try {
      console.log('SEO Checker Background: Analysis progress:', message.data);
      
      // Store progress information
      const tabId = sender.tab?.id;
      if (tabId) {
        const currentStatus = this.analysisStatus.get(tabId);
        if (currentStatus) {
          this.analysisStatus.set(tabId, {
            ...currentStatus,
            progress: message.data
          });
        }
      }
      
      sendResponse({ success: true });
    } catch (error) {
      console.error('SEO Checker Background: Error handling analysis progress:', error);
      sendResponse({ error: error.message || 'Unknown error' });
    }
  }

  async handleOpenDetailedReport(message, sendResponse) {
    try {
      // Create or focus detailed report tab
      const url = chrome.runtime.getURL('dist/popup/detailed-report.html');
      
      // Check if detailed report tab already exists
      const tabs = await chrome.tabs.query({ url: url });
      
      if (tabs.length > 0) {
        // Focus existing tab
        await chrome.tabs.update(tabs[0].id, { active: true });
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // Create new tab
        await chrome.tabs.create({ url: url });
      }

      sendResponse({ success: true });
    } catch (error) {
      console.error('SEO Checker Background: Open detailed report error:', error);
      sendResponse({ 
        error: error.message || '打开详细报告失败' 
      });
    }
  }

  convertAnalysisToReport(analysis, tab) {
    // Simple scoring algorithm
    const score = this.calculateSimpleScore(analysis);
    const issues = this.generateSimpleIssues(analysis);
    
    const report = {
      id: this.generateReportId(),
      url: analysis.url,
      timestamp: new Date(analysis.timestamp),
      score: score,
      issues: issues,
      suggestions: {
        titleOptimization: '',
        metaDescriptionSuggestion: '',
        contentImprovements: [],
        keywordSuggestions: [],
        structureRecommendations: []
      },
      technicalResults: {
        metaTags: {
          hasTitle: !!analysis.metaTags?.title,
          titleLength: analysis.metaTags?.title?.length || 0,
          hasDescription: !!analysis.metaTags?.description,
          descriptionLength: analysis.metaTags?.description?.length || 0,
          hasKeywords: !!analysis.metaTags?.keywords,
          hasOpenGraph: Object.keys(analysis.metaTags?.ogTags || {}).length > 0,
          hasTwitterCards: Object.keys(analysis.metaTags?.twitterTags || {}).length > 0
        },
        headingStructure: {
          hasH1: (analysis.headings?.h1?.length || 0) > 0,
          h1Count: analysis.headings?.h1?.length || 0,
          headingHierarchy: true,
          headingDistribution: {
            h1: analysis.headings?.h1?.length || 0,
            h2: analysis.headings?.h2?.length || 0,
            h3: analysis.headings?.h3?.length || 0,
            h4: analysis.headings?.h4?.length || 0,
            h5: analysis.headings?.h5?.length || 0,
            h6: analysis.headings?.h6?.length || 0
          }
        },
        internalLinks: {
          internalLinksCount: analysis.content?.internalLinks || 0,
          externalLinksCount: analysis.content?.externalLinks || 0,
          brokenLinksCount: 0,
          noFollowLinksCount: 0
        },
        canonicalUrl: {
          hasCanonical: !!analysis.metaTags?.canonical,
          canonicalUrl: analysis.metaTags?.canonical || undefined,
          isValid: true
        },
        robotsTxt: {
          hasRobotsMeta: !!analysis.metaTags?.robots,
          robotsDirectives: analysis.metaTags?.robots ? [analysis.metaTags.robots] : [],
          isIndexable: !analysis.metaTags?.robots?.includes('noindex')
        }
      },
      contentResults: {
        wordCount: analysis.content?.wordCount || 0,
        readabilityScore: analysis.content?.readabilityScore || 0,
        keywordDensity: analysis.content?.keywordDensity || {},
        contentStructure: {
          hasParagraphs: (analysis.content?.paragraphCount || 0) > 0,
          hasLists: (analysis.content?.listCount || 0) > 0,
          hasImages: (analysis.images?.totalImages || 0) > 0,
          textToHtmlRatio: analysis.content?.textToHtmlRatio || 0
        },
        duplicateContent: {
          hasDuplicateTitle: false,
          hasDuplicateDescription: false,
          duplicateContentPercentage: 0
        }
      },
      performanceResults: {
        pageSize: analysis.performance?.pageSize || 0,
        loadTime: analysis.performance?.loadTime || 0,
        imageOptimization: {
          totalImages: analysis.images?.totalImages || 0,
          imagesWithoutAlt: analysis.images?.imagesWithoutAlt || 0,
          oversizedImages: 0,
          unoptimizedFormats: 0
        },
        coreWebVitals: {
          lcp: 0,
          fid: 0,
          cls: 0
        }
      }
    };

    return report;
  }

  calculateSimpleScore(analysis) {
    let technical = 80;
    let content = 75;
    let performance = 70;

    // Simple scoring logic
    if (!analysis.metaTags?.title) technical -= 20;
    if (!analysis.metaTags?.description) technical -= 15;
    if ((analysis.headings?.h1?.length || 0) === 0) technical -= 10;
    if ((analysis.headings?.h1?.length || 0) > 1) technical -= 5;

    if ((analysis.content?.wordCount || 0) < 300) content -= 20;
    if ((analysis.images?.imagesWithoutAlt || 0) > 0) content -= 10;

    if ((analysis.images?.totalImages || 0) > 20) performance -= 15;
    if ((analysis.performance?.pageSize || 0) > 1000000) performance -= 10;

    const overall = Math.round((technical + content + performance) / 3);

    return {
      overall: Math.max(0, overall),
      technical: Math.max(0, technical),
      content: Math.max(0, content),
      performance: Math.max(0, performance)
    };
  }

  generateSimpleIssues(analysis) {
    const issues = [];

    if (!analysis.metaTags?.title) {
      issues.push({
        title: '缺少页面标题',
        description: '页面没有title标签，这对SEO非常重要',
        severity: 'critical',
        recommendation: '添加描述性的页面标题'
      });
    }

    if (!analysis.metaTags?.description) {
      issues.push({
        title: '缺少Meta描述',
        description: '页面没有meta description，影响搜索结果显示',
        severity: 'high',
        recommendation: '添加150-160字符的meta描述'
      });
    }

    if ((analysis.headings?.h1?.length || 0) === 0) {
      issues.push({
        title: '缺少H1标题',
        description: '页面没有H1标题，影响内容结构',
        severity: 'high',
        recommendation: '添加一个主要的H1标题'
      });
    }

    if ((analysis.images?.imagesWithoutAlt || 0) > 0) {
      issues.push({
        title: '图片缺少Alt属性',
        description: `发现${analysis.images.imagesWithoutAlt}张图片没有alt属性`,
        severity: 'medium',
        recommendation: '为所有图片添加描述性的alt属性'
      });
    }

    return issues;
  }

  generateReportId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

// Initialize the background service
console.log('SEO Checker Background: Creating service instance...');
new SimpleBackgroundService();
console.log('SEO Checker Background: Service worker ready');