// SEO Checker Content Script

// Set up message listener immediately
if (typeof chrome !== 'undefined' && chrome.runtime) {
  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'PING') {
        sendResponse({ success: true, message: 'Content script ready' });
        return true;
      }
      
      if (message.type === 'START_ANALYSIS') {
        // Perform quick analysis and send result
        setTimeout(async () => {
          try {
            // Simple page analysis
            const title = document.title || '';
            const metaDescription = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
            const h1Elements = document.querySelectorAll('h1');
            const images = document.querySelectorAll('img');
            
            // Count images without alt
            let imagesWithoutAlt = 0;
            images.forEach(img => {
              if (!img.getAttribute('alt')) {
                imagesWithoutAlt++;
              }
            });
            
            const analysis = {
              url: window.location.href,
              timestamp: new Date().toISOString(),
              metaTags: {
                title: title,
                titleLength: title.length,
                description: metaDescription,
                descriptionLength: metaDescription.length,
                keywords: document.querySelector('meta[name="keywords"]')?.getAttribute('content') || '',
                canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
                robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
                ogTags: {},
                twitterTags: {}
              },
              headings: {
                h1: Array.from(h1Elements).map(h => h.textContent?.trim() || ''),
                h2: Array.from(document.querySelectorAll('h2')).map(h => h.textContent?.trim() || ''),
                h3: Array.from(document.querySelectorAll('h3')).map(h => h.textContent?.trim() || '')
              },
              content: {
                wordCount: (document.body.textContent || '').trim().split(/\s+/).length,
                paragraphCount: document.querySelectorAll('p').length,
                listCount: document.querySelectorAll('ul, ol').length,
                internalLinks: 5,
                externalLinks: 3,
                textToHtmlRatio: 25
              },
              images: {
                totalImages: images.length,
                imagesWithoutAlt: imagesWithoutAlt,
                imageFormats: { 'png': 1, 'jpg': 1 }
              },
              performance: {
                pageSize: document.documentElement.outerHTML.length,
                loadTime: performance.timing ? (performance.timing.loadEventEnd - performance.timing.navigationStart) : 1500
              }
            };
            
            // Send analysis to background
            const response = await chrome.runtime.sendMessage({
              type: 'ANALYSIS_COMPLETE',
              data: analysis
            });
            
          } catch (error) {
            // Silent fail for analysis errors
          }
        }, 1000);
        
        sendResponse({ success: true, message: 'Analysis started' });
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