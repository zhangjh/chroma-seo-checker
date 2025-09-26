// SEO Checker Background Service Worker

// Import enhanced rules engine and AI optimizer
importScripts('enhanced-seo-rules.js');
importScripts('ai-content-optimizer.js');

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
      // Silent fail for storage errors
    }
  }

  async getAllReports() {
    try {
      const result = await chrome.storage.local.get('seo_reports');
      return result['seo_reports'] || [];
    } catch (error) {
      return [];
    }
  }

  async getReportByUrl(url) {
    try {
      const reports = await this.getAllReports();
      return reports.find(report => report.url === url) || null;
    } catch (error) {
      return null;
    }
  }
}

// Simple background service
class SimpleBackgroundService {
  constructor() {
    this.storageManager = new SimpleStorageManager();
    this.analysisStatus = new Map();
    this.aiOptimizer = new AIContentOptimizer();
    this.initializeMessageHandlers();
  }

  initializeMessageHandlers() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
        
        case 'getLatestReport':
          await this.handleGetLatestReport(message, sendResponse);
          break;
        
        case 'generateAISuggestions':
          await this.handleGenerateAISuggestions(message, sendResponse);
          break;
        
        case 'getAIProgress':
          await this.handleGetAIProgress(message, sendResponse);
          break;
        
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      sendResponse({ error: error.message || 'Unknown error' });
    }
  }

  async handleGetPageAnalysis(message, sendResponse) {
    try {
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('Missing tab ID');
      }

      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        throw new Error('Cannot get page URL');
      }

      const report = await this.storageManager.getReportByUrl(tab.url);
      sendResponse({ report: report });
    } catch (error) {
      sendResponse({
        error: error.message || 'Failed to get page analysis'
      });
    }
  }

  async handleAnalyzeCurrentPage(message, sendResponse) {
    try {
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('Missing tab ID');
      }

      // Check if tab exists and is valid
      try {
        const tab = await chrome.tabs.get(tabId);
        
        if (!tab.url || (!tab.url.startsWith('http://') && !tab.url.startsWith('https://'))) {
          throw new Error('Current page is not a valid webpage, SEO analysis only supports HTTP/HTTPS pages');
        }
      } catch (tabError) {
        throw new Error('Cannot access current tab');
      }

      // Set analysis status to running
      this.analysisStatus.set(tabId, {
        status: 'running',
        startTime: Date.now()
      });

      try {
        // Trigger content script analysis
        await chrome.tabs.sendMessage(tabId, { type: 'START_ANALYSIS' });
      } catch (contentError) {
        this.analysisStatus.set(tabId, {
          status: 'failed',
          startTime: Date.now()
        });
        throw new Error('Cannot communicate with page content script, please refresh the page and try again');
      }

      sendResponse({ success: true, message: 'Analysis started' });
    } catch (error) {
      const { tabId } = message;
      if (tabId) {
        this.analysisStatus.set(tabId, {
          status: 'failed',
          startTime: Date.now()
        });
      }
      sendResponse({
        error: error.message || 'Failed to start analysis'
      });
    }
  }

  async handleGetAnalysisStatus(message, sendResponse) {
    try {
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('Missing tab ID');
      }

      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        throw new Error('Cannot get page URL');
      }

      // Check current analysis status
      const currentStatus = this.analysisStatus.get(tabId);

      if (currentStatus) {
        if (currentStatus.status === 'running') {
          sendResponse({
            completed: false,
            running: true,
            message: 'Analysis in progress...',
            progress: currentStatus.progress
          });
          return;
        } else if (currentStatus.status === 'failed') {
          sendResponse({
            completed: false,
            error: 'Analysis failed, please retry'
          });
          return;
        } else if (currentStatus.status === 'completed') {
          const report = await this.storageManager.getReportByUrl(tab.url);
          if (report) {
            sendResponse({
              completed: true,
              report: report
            });
            return;
          }
        }
      }

      const report = await this.storageManager.getReportByUrl(tab.url);
      
      // Check if analysis was completed recently (within last 5 minutes)
      const isRecent = report && (Date.now() - new Date(report.timestamp).getTime()) < 5 * 60 * 1000;
      
      if (isRecent) {
        this.analysisStatus.set(tabId, {
          status: 'completed',
          startTime: Date.now()
        });
      }

      sendResponse({
        completed: !!report && isRecent,
        report: report
      });
    } catch (error) {
      sendResponse({
        error: error.message || 'Failed to get analysis status'
      });
    }
  }

  async handleAnalysisComplete(message, sender, sendResponse) {
    try {
      const analysis = message.data;
      if (!analysis) {
        throw new Error('No analysis data provided');
      }

      const tabId = sender.tab?.id;

      if (tabId) {
        // Update status to completed
        this.analysisStatus.set(tabId, {
          status: 'completed',
          startTime: Date.now()
        });
      }

      // Convert analysis to SEO report
      const report = this.convertAnalysisToReport(analysis);
      
      // Save report to storage
      await this.storageManager.saveReport(report);
      
      sendResponse({ success: true });
    } catch (error) {
      const tabId = sender.tab?.id;
      if (tabId) {
        this.analysisStatus.set(tabId, {
          status: 'failed',
          startTime: Date.now()
        });
      }
      sendResponse({ error: error.message || 'Unknown error' });
    }
  }

  async handleAnalysisProgress(message, sender, sendResponse) {
    try {
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
      sendResponse({ error: error.message || 'Unknown error' });
    }
  }

  async handleOpenDetailedReport(message, sendResponse) {
    try {
      // Store the URL for the detailed report to access
      if (message.url) {
        await chrome.storage.local.set({ 'current_report_url': message.url });
      }
      
      // Create or focus detailed report tab
      const url = chrome.runtime.getURL('popup/detailed-report.html');
      
      // Check if detailed report tab already exists
      const tabs = await chrome.tabs.query({ url: url });
      
      if (tabs.length > 0) {
        // Focus existing tab and reload it to get fresh data
        await chrome.tabs.update(tabs[0].id, { active: true });
        await chrome.tabs.reload(tabs[0].id);
        await chrome.windows.update(tabs[0].windowId, { focused: true });
      } else {
        // Create new tab
        await chrome.tabs.create({ url: url });
      }

      sendResponse({ success: true });
    } catch (error) {
      sendResponse({
        error: error.message || 'Failed to open detailed report'
      });
    }
  }

  async handleGetLatestReport(message, sendResponse) {
    try {
      // First try to get the URL from storage (set when opening detailed report)
      const result = await chrome.storage.local.get('current_report_url');
      const targetUrl = result.current_report_url;
      
      if (targetUrl) {
        // Get report for specific URL
        const report = await this.storageManager.getReportByUrl(targetUrl);
        if (report) {
          sendResponse({ report: report });
          return;
        }
      }
      
      // Fallback: Get all reports and return the most recent one
      const reports = await this.storageManager.getAllReports();
      
      if (reports.length === 0) {
        sendResponse({
          report: null,
          error: 'No analysis reports found, please run SEO analysis first'
        });
        return;
      }

      // Return the most recent report (first in array)
      const latestReport = reports[0];
      sendResponse({ report: latestReport });
    } catch (error) {
      sendResponse({
        error: error.message || 'Failed to get latest report'
      });
    }
  }

  async handleGenerateAISuggestions(message, sendResponse) {
    try {
      const { tabId, forceRefresh = false } = message;
      
      if (!tabId) {
        throw new Error('Missing tab ID');
      }

      // Get current tab URL
      const tab = await chrome.tabs.get(tabId);
      if (!tab.url) {
        throw new Error('Cannot get page URL');
      }

      // Get existing report
      const report = await this.storageManager.getReportByUrl(tab.url);
      if (!report) {
        throw new Error('Please run SEO analysis first, then generate AI suggestions');
      }

      // Set up progress callback to communicate with popup
      this.aiOptimizer.setProgressCallback((progressInfo) => {
        // Store progress info for the tab
        this.analysisStatus.set(tabId, {
          type: 'ai_progress',
          ...progressInfo,
          timestamp: Date.now()
        });
        
        // Try to send progress to popup if it's listening
        try {
          chrome.runtime.sendMessage({
            type: 'AI_PROGRESS_UPDATE',
            tabId: tabId,
            progress: progressInfo
          }).catch(() => {
            // Popup might not be open, ignore error
          });
        } catch (e) {
          // Ignore messaging errors
        }
      });

      // Get the original analysis data from storage or reconstruct it
      console.log('[Background] Getting analysis data...');
      const analysisData = await this.getAnalysisDataForReport(report);
      console.log('[Background] Analysis data retrieved');

      // Generate AI optimizations based on SEO issues
      console.log('[Background] Starting AI optimization suggestions, SEO issues count:', report.issues?.length || 0);
      if (forceRefresh) {
        console.log('[Background] Force refresh requested - bypassing cache');
      }
      const optimizations = await this.aiOptimizer.generateContentOptimizations(analysisData, report.issues, tabId, forceRefresh);
      console.log('[Background] AI optimization suggestions completed');

      // Clear progress callback
      this.aiOptimizer.setProgressCallback(null);
      
      // Update report with AI suggestions
      report.suggestions = optimizations;
      report.aiGeneratedAt = new Date().toISOString();
      
      // Save updated report
      await this.storageManager.saveReport(report);

      sendResponse({
        success: true,
        suggestions: optimizations
      });
    } catch (error) {
      // Clear progress callback on error
      this.aiOptimizer.setProgressCallback(null);

      sendResponse({
        error: error.message || 'Failed to generate AI suggestions'
      });
    }
  }

  async handleGetAIProgress(message, sendResponse) {
    try {
      const { tabId } = message;
      
      if (!tabId) {
        throw new Error('Missing tab ID');
      }

      const progressInfo = this.analysisStatus.get(tabId);
      
      if (progressInfo && progressInfo.type === 'ai_progress') {
        sendResponse({
          success: true,
          progress: {
            type: progressInfo.type,
            message: progressInfo.message,
            progress: progressInfo.progress
          }
        });
      } else {
        sendResponse({
          success: true,
          progress: null
        });
      }
    } catch (error) {
      sendResponse({
        error: error.message || 'Failed to get AI progress'
      });
    }
  }

  async getAnalysisDataForReport(report) {
    // Reconstruct analysis data from report
    // This is a simplified version - in a real implementation, 
    // you might want to store the original analysis data
    
    const reconstructedData = {
      url: report.url,
      timestamp: report.timestamp,
      metaTags: {
        title: report.technicalResults?.metaTags?.title || '',
        description: report.technicalResults?.metaTags?.description || ''
      },
      headings: {
        h1: report.technicalResults?.headingStructure?.h1Content || [],
        h2: report.technicalResults?.headingStructure?.h2Content || [],
        h3: report.technicalResults?.headingStructure?.h3Content || []
      },
      content: {
        wordCount: report.contentResults?.wordCount || 0,
        readabilityScore: report.contentResults?.readabilityScore || 0,
        keywordDensity: report.contentResults?.keywordDensity || {},
        contentStructure: report.contentResults?.contentStructure || {}
      },
      images: {
        totalImages: report.performanceResults?.imageOptimization?.totalImages || 0,
        imagesWithoutAlt: report.performanceResults?.imageOptimization?.imagesWithoutAlt || 0
      },
      links: {
        internalLinks: report.technicalResults?.internalLinks?.internalLinksCount || 0,
        externalLinks: report.technicalResults?.internalLinks?.externalLinksCount || 0
      }
    };
    
    console.log('[Background] Reconstructed analysis data:', {
      title: reconstructedData.metaTags.title,
      description: reconstructedData.metaTags.description,
      h1: reconstructedData.headings.h1
    });
    
    return reconstructedData;
  }

  convertAnalysisToReport(analysis) {
    try {
      // Use enhanced scoring algorithm
      const enhancedRules = new EnhancedSEORules();
      const score = enhancedRules.calculateEnhancedScore(analysis);
      const issues = enhancedRules.generateDetailedIssues(analysis);

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
            title: analysis.metaTags?.title || '',
            titleLength: analysis.metaTags?.title?.length || 0,
            hasDescription: !!analysis.metaTags?.description,
            description: analysis.metaTags?.description || '',
            descriptionLength: analysis.metaTags?.description?.length || 0,
            hasKeywords: !!analysis.metaTags?.keywords,
            hasOpenGraph: Object.keys(analysis.metaTags?.ogTags || {}).length > 0,
            hasTwitterCards: Object.keys(analysis.metaTags?.twitterTags || {}).length > 0
          },
          headingStructure: {
            hasH1: (analysis.headings?.h1?.length || 0) > 0,
            h1Count: analysis.headings?.h1?.length || 0,
            h1Content: analysis.headings?.h1 || [],
            h2Content: analysis.headings?.h2 || [],
            h3Content: analysis.headings?.h3 || [],
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
    } catch (error) {
      console.error('[Background] Error converting analysis to report:', error);
      throw error;
    }
  }



  generateReportId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }


}

// Initialize the background service
new SimpleBackgroundService();