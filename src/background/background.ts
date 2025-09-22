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

  constructor() {
    this.exportManager = new ExportManager();
    this.storageManager = new StorageManager();
    this.aiService = AIService.getInstance();
    this.initializeMessageHandlers();
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
    try {
      switch (message.action) {
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
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('缺少标签页ID');
      }

      // Trigger content script analysis
      await chrome.tabs.sendMessage(tabId, { action: 'startAnalysis' });
      
      sendResponse({ success: true, message: '分析已开始' });
    } catch (error) {
      console.error('Analyze current page error:', error);
      sendResponse({ 
        error: error instanceof Error ? error.message : '启动分析失败' 
      });
    }
  }

  private async handleGetAnalysisStatus(message: any, sendResponse: (response?: any) => void): Promise<void> {
    try {
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('缺少标签页ID');
      }

      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        throw new Error('无法获取页面URL');
      }

      const report = await this.getCurrentPageReport(tab.url);
      
      // Check if analysis was completed recently (within last 5 minutes)
      const isRecent = report && (Date.now() - report.timestamp.getTime()) < 5 * 60 * 1000;
      
      sendResponse({ 
        completed: !!report && isRecent,
        report: report 
      });
    } catch (error) {
      console.error('Get analysis status error:', error);
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
new BackgroundService();