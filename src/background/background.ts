// Background service worker entry point
import { ExportManager } from '../reports/export-manager';
import { StorageManager } from './storage-manager';
import { AIService } from './ai-service';
import { SEOReport, AISuggestions } from '../../types/seo';
import { ContentAnalyzer } from '../content/content-analyzer';

class BackgroundService {
  private exportManager: ExportManager;
  private storageManager: StorageManager;
  private aiService: AIService;
  private analysisStatus: Map<number, { 
    status: 'pending' | 'running' | 'completed' | 'failed', 
    startTime: number,
    progress?: { step: number; message: string; progress: number }
  }> = new Map();

  constructor() {
    console.log('SEO Checker Background: Initializing BackgroundService...');
    this.exportManager = new ExportManager();
    this.storageManager = new StorageManager();
    this.aiService = AIService.getInstance();
    this.initializeMessageHandlers();
    console.log('SEO Checker Background: BackgroundService initialized successfully');
  }

  private initializeMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep the message channel open for async responses
    });
  }

  private async handleMessage(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
    console.log('SEO Checker Background: Received message:', message);
    try {
      // Handle content script messages (using 'type' field)
      if (message.type) {
        switch (message.type) {
          case 'ANALYSIS_COMPLETE':
            await this.handleAnalysisComplete(message, sender, sendResponse);
            break;
          
          case 'CONTENT_READY':
            await this.handleContentReady(message, sender, sendResponse);
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
          
        case 'exportReport':
          await this.handleExportReport(message, sendResponse);
          break;
        
        case 'openDetailedReport':
          await this.handleOpenDetailedReport(message, sendResponse);
          break;
        
        case 'getCurrentReport':
          await this.handleGetCurrentReport(message, sendResponse);
          break;
        
        case 'generateAISuggestions':
          await this.handleGenerateAISuggestions(message, sendResponse);
          break;
        
        case 'applySuggestion':
          await this.handleApplySuggestion(message, sendResponse);
          break;
        
        case 'submitSuggestionFeedback':
          await this.handleSubmitSuggestionFeedback(message, sendResponse);
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
        
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Background service error:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleExportReport(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const { format = 'pdf', sanitize = true } = message;
      
      // Get current tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url) {
        throw new Error('无法获取当前页面URL');
      }

      // Get the current report from storage
      const report = await this.getCurrentPageReport(tab.url);
      if (!report) {
        throw new Error('未找到当前页面的SEO报告，请先运行分析');
      }

      // Export the report
      if (format === 'pdf') {
        await this.exportManager.exportPDFReport(report, {}, sanitize);
      } else if (format === 'json') {
        await this.exportManager.exportJSONReport(report, {}, sanitize);
      } else {
        throw new Error('不支持的导出格式');
      }

      sendResponse({ success: true, message: '报告导出成功' });
    } catch (error) {
      console.error('Export error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '导出失败' 
      });
    }
  }

  private async handleOpenDetailedReport(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      // Create or focus detailed report tab
      const url = chrome.runtime.getURL('dist/popup/detailed-report.html');
      
      // Check if detailed report tab already exists
      const tabs = await chrome.tabs.query({ url: url });
      
      if (tabs.length > 0) {
        // Focus existing tab
        await chrome.tabs.update(tabs[0].id!, { active: true });
        await chrome.windows.update(tabs[0].windowId!, { focused: true });
      } else {
        // Create new tab
        await chrome.tabs.create({ url: url });
      }

      sendResponse({ success: true });
    } catch (error) {
      console.error('Open detailed report error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '打开详细报告失败' 
      });
    }
  }

  private async handleGetCurrentReport(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url) {
        throw new Error('无法获取当前页面URL');
      }

      const report = await this.getCurrentPageReport(tab.url);
      sendResponse({ report });
    } catch (error) {
      console.error('Get current report error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '获取报告失败' 
      });
    }
  }

  private async handleGenerateAISuggestions(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('缺少标签页ID');
      }

      // Get current page analysis
      const analysis = await this.getCurrentPageAnalysis(tabId);
      if (!analysis) {
        throw new Error('未找到页面分析数据，请先运行SEO分析');
      }

      // Generate AI suggestions
      const suggestions = await this.aiService.generateContentSuggestions(analysis);
      
      // Save suggestions to the report
      await this.saveSuggestionsToReport(analysis.url, suggestions);

      sendResponse({ success: true, suggestions });
    } catch (error) {
      console.error('Generate AI suggestions error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '生成AI建议失败' 
      });
    }
  }

  private async handleApplySuggestion(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const { tabId, suggestionType, suggestionText } = message;
      
      if (!tabId || !suggestionType || !suggestionText) {
        throw new Error('缺少必要参数');
      }

      // Apply suggestion based on type
      let success = false;
      
      switch (suggestionType) {
        case 'title-optimization':
          success = await this.applyTitleSuggestion(tabId, suggestionText);
          break;
        case 'meta-description':
          success = await this.applyMetaDescriptionSuggestion(tabId, suggestionText);
          break;
        default:
          throw new Error(`不支持自动应用的建议类型: ${suggestionType}`);
      }

      if (success) {
        sendResponse({ success: true, message: '建议应用成功' });
      } else {
        throw new Error('应用建议失败');
      }
    } catch (error) {
      console.error('Apply suggestion error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '应用建议失败' 
      });
    }
  }

  private async handleSubmitSuggestionFeedback(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const { suggestionIndex, feedback } = message;
      
      // Store feedback for analytics (could be expanded to send to analytics service)
      console.log(`Suggestion feedback: index=${suggestionIndex}, feedback=${feedback}`);
      
      // For now, just acknowledge the feedback
      sendResponse({ success: true });
    } catch (error) {
      console.error('Submit suggestion feedback error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '提交反馈失败' 
      });
    }
  }

  private async handleGetPageAnalysis(message: any, sendResponse: (response?: any) => void): Promise<void> {
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

      const report = await this.getCurrentPageReport(tab.url);
      sendResponse({ report });
    } catch (error) {
      console.error('Get page analysis error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '获取页面分析失败' 
      });
    }
  }

  private async handleAnalyzeCurrentPage(message: any, sendResponse: (response?: any) => void): Promise<void> {
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
        error: error instanceof Error ? error.message : '启动分析失败' 
      });
    }
  }

  private async handleGetAnalysisStatus(message: any, sendResponse: (response?: any) => void): Promise<void> {
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

      const report = await this.getCurrentPageReport(tab.url);
      
      // Check if analysis was completed recently (within last 5 minutes)
      const isRecent = report && (Date.now() - report.timestamp.getTime()) < 5 * 60 * 1000;
      
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
        error: error instanceof Error ? error.message : '获取分析状态失败' 
      });
    }
  }

  private async getCurrentPageAnalysis(tabId: number): Promise<any> {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        throw new Error('无法获取页面URL');
      }

      const report = await this.getCurrentPageReport(tab.url);
      if (!report) {
        return null;
      }

      // Return the page analysis data from the report
      return {
        url: report.url,
        title: '', // Will be extracted from actual page analysis
        metaTags: report.technicalResults?.metaTags || {},
        headings: report.technicalResults?.headingStructure || {},
        content: report.contentResults || {},
        images: report.performanceResults?.imageOptimization || {},
        performance: report.performanceResults || {},
        timestamp: report.timestamp
      };
    } catch (error) {
      console.error('Error getting current page analysis:', error);
      return null;
    }
  }

  private async saveSuggestionsToReport(url: string, suggestions: AISuggestions): Promise<void> {
    try {
      const report = await this.getCurrentPageReport(url);
      if (report) {
        report.suggestions = suggestions;
        await this.storageManager.saveReport(report);
      }
    } catch (error) {
      console.error('Error saving suggestions to report:', error);
    }
  }

  private async applyTitleSuggestion(tabId: number, newTitle: string): Promise<boolean> {
    try {
      // Send message to content script to update title
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'updateTitle',
        title: newTitle
      });
      
      return response?.success || false;
    } catch (error) {
      console.error('Error applying title suggestion:', error);
      return false;
    }
  }

  private async applyMetaDescriptionSuggestion(tabId: number, newDescription: string): Promise<boolean> {
    try {
      // Send message to content script to update meta description
      const response = await chrome.tabs.sendMessage(tabId, {
        action: 'updateMetaDescription',
        description: newDescription
      });
      
      return response?.success || false;
    } catch (error) {
      console.error('Error applying meta description suggestion:', error);
      return false;
    }
  }

  private async handleAnalysisComplete(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
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
      const report = await this.convertAnalysisToReport(analysis, sender.tab);
      
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
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleContentReady(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log('Content script ready:', message.data);
      sendResponse({ success: true });
    } catch (error) {
      console.error('Error handling content ready:', error);
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async handleAnalysisProgress(
    message: any, 
    sender: chrome.runtime.MessageSender, 
    sendResponse: (response?: any) => void
  ): Promise<void> {
    try {
      console.log('SEO Checker Background: Analysis progress:', message.data);
      
      // 存储进度信息，以便popup可以获取
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
      sendResponse({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  private async convertAnalysisToReport(analysis: any, tab?: chrome.tabs.Tab): Promise<SEOReport> {
    // Import SEO engine to calculate scores
    const { SEORuleEngine } = await import('../engine/seo-rule-engine');
    const ruleEngine = new SEORuleEngine();
    
    // Calculate SEO scores and issues
    const results = ruleEngine.evaluateAnalysis(analysis);
    
    const report: SEOReport = {
      id: this.generateReportId(),
      url: analysis.url,
      timestamp: new Date(analysis.timestamp),
      score: results.score,
      issues: results.issues,
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
          headingHierarchy: true, // TODO: implement proper hierarchy check
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
          internalLinksCount: analysis.content?.internalLinks?.length || 0,
          externalLinksCount: analysis.content?.externalLinks?.length || 0,
          brokenLinksCount: 0, // TODO: implement broken link detection
          noFollowLinksCount: 0 // TODO: implement nofollow detection
        },
        canonicalUrl: {
          hasCanonical: !!analysis.metaTags?.canonical,
          canonicalUrl: analysis.metaTags?.canonical || undefined,
          isValid: true // TODO: implement canonical validation
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
          hasDuplicateTitle: false, // TODO: implement duplicate detection
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
          oversizedImages: analysis.images?.oversizedImages || 0,
          unoptimizedFormats: analysis.images?.unoptimizedFormats || 0
        },
        coreWebVitals: {
          lcp: analysis.performance?.lcp || 0,
          fid: analysis.performance?.fid || 0,
          cls: analysis.performance?.cls || 0
        }
      }
    };

    return report;
  }

  private generateReportId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private async getCurrentPageReport(url: string): Promise<SEOReport | null> {
    try {
      // Get reports from storage
      const reports = await this.storageManager.getAllReports();
      
      // Find the most recent report for this URL
      const urlReports = reports.filter((report: SEOReport) => report.url === url);
      if (urlReports.length === 0) {
        return null;
      }

      // Return the most recent report
      return urlReports.sort((a: SEOReport, b: SEOReport) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    } catch (error) {
      console.error('Error getting current page report:', error);
      return null;
    }
  }
}

// Initialize the background service
console.log('SEO Checker Background: Service worker starting...');
new BackgroundService();
console.log('SEO Checker Background: Service worker initialized');