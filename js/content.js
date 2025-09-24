// SEO Checker Content Script

// 初始化页面高亮器
let pageHighlighter = null;

// Set up message listener immediately
if (typeof chrome !== 'undefined' && chrome.runtime) {
  try {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.type === 'PING') {
        sendResponse({ success: true, message: 'Content script ready' });
        return true;
      }
      
      if (message.type === 'START_ANALYSIS') {
        // Perform analysis and send result
        setTimeout(async () => {
          try {
            // Use enhanced analyzer
            const analyzer = new EnhancedContentAnalyzer();
            const analysis = await analyzer.analyzePageContent();
            
            // Send analysis to background
            await chrome.runtime.sendMessage({
              type: 'ANALYSIS_COMPLETE',
              data: analysis
            });
            
          } catch (error) {
            console.error('[Content] Analysis failed:', error);
          }
        }, 1000);
        
        sendResponse({ success: true, message: 'Analysis started' });
        return true;
      }
      
      if (message.type === 'HIGHLIGHT_ISSUES') {
        try {
          if (!pageHighlighter) {
            pageHighlighter = new PageHighlighter();
            pageHighlighter.injectStyles();
          }
          
          pageHighlighter.highlightIssues(message.issues);
          sendResponse({ success: true });
        } catch (error) {
          console.error('[Content] Failed to highlight issues:', error);
          sendResponse({ success: true }); // 静默失败，不影响主功能
        }
        return true;
      }
      
      if (message.type === 'CLEAR_HIGHLIGHTS') {
        try {
          if (pageHighlighter) {
            pageHighlighter.clearHighlights();
          }
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: true });
        }
        return true;
      }
      
      if (message.type === 'SCROLL_TO_ISSUE') {
        try {
          if (pageHighlighter) {
            pageHighlighter.scrollToIssue(message.issueIndex);
          }
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: true });
        }
        return true;
      }
      
      sendResponse({ error: 'Unknown message type: ' + message.type });
      return true;
    });
    
    // Try to notify background
    setTimeout(() => {
      chrome.runtime.sendMessage({
        type: 'CONTENT_READY',
        data: { url: window.location.href }
      }).catch(() => {
        // Silent fail for background communication errors
      });
    }, 500);
    
  } catch (error) {
    // Silent fail for setup errors
  }
}



