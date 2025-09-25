// SEO Checker Content Script

// 初始化页面高亮器
let pageHighlighter = null;

// 计算关键词密度的辅助方法
function calculateKeywordDensity(text) {
  // 处理中文和英文混合内容
  const cleanText = text.toLowerCase().replace(/[^\u4e00-\u9fff\w\s]/g, ' ');

  // 提取中文词汇（2-4个字符的中文词组）
  const chineseWords = cleanText.match(/[\u4e00-\u9fff]{2,4}/g) || [];

  // 提取英文单词
  const englishWords = cleanText.match(/\b[a-z]{3,}\b/g) || [];

  // 合并所有词汇
  const allWords = [...chineseWords, ...englishWords];
  const wordCount = allWords.length;
  const wordFreq = {};

  allWords.forEach(word => {
    if (word.length >= 2) { // 中文至少2个字符，英文至少3个字符
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  const density = {};
  Object.keys(wordFreq).forEach(word => {
    const freq = wordFreq[word];
    if (freq >= 2) { // 只考虑出现2次以上的词
      density[word] = Math.round((freq / wordCount) * 100 * 100) / 100; // 保留2位小数
    }
  });

  console.log('[Content] Keyword density calculation:', {
    totalWords: wordCount,
    chineseWords: chineseWords.length,
    englishWords: englishWords.length,
    topKeywords: Object.keys(density).slice(0, 10)
  });

  return density;
}

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

      if (message.type === 'GET_CURRENT_PAGE_CONTENT') {
        try {
          // 获取当前页面的真实内容
          const bodyText = document.body.textContent || '';
          const keywordDensity = calculateKeywordDensity(bodyText);

          // 获取meta keywords
          const metaKeywords = document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '';
          const keywordsArray = metaKeywords ? metaKeywords.split(',').map(k => k.trim()).filter(k => k.length > 0) : [];

          const currentContent = {
            title: document.title || '',
            description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
            keywords: metaKeywords,
            keywordsArray: keywordsArray,
            h1: Array.from(document.querySelectorAll('h1')).map(h => h.textContent.trim()).filter(text => text.length > 0),
            h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent.trim()).filter(text => text.length > 0),
            h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent.trim()).filter(text => text.length > 0),
            wordCount: bodyText.trim().split(/\s+/).filter(word => word.length > 0).length,
            keywordDensity: keywordDensity
          };

          console.log('[Content] Calculated keyword density:', Object.keys(keywordDensity).slice(0, 10));

          console.log('[Content] Providing real page content:', {
            title: currentContent.title,
            description: currentContent.description,
            h1Count: currentContent.h1.length,
            wordCount: currentContent.wordCount
          });

          sendResponse({ success: true, data: currentContent });
        } catch (error) {
          console.error('[Content] Failed to get current page content:', error);
          sendResponse({ success: false, error: error.message });
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



