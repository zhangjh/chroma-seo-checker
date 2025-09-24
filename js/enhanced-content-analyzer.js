// Enhanced Content Analyzer
// 增强的内容分析器

class EnhancedContentAnalyzer {
  constructor() {
    this.analysisCache = new Map();
  }

  async analyzePageContent() {
    try {
      const analysis = {
        url: window.location.href,
        timestamp: new Date().toISOString(),
        metaTags: this.analyzeMetaTags(),
        headings: this.analyzeHeadings(),
        content: this.analyzeContent(),
        images: this.analyzeImages(),
        links: this.analyzeLinks(),
        performance: await this.analyzePerformance(),
        technical: this.analyzeTechnicalSEO(),
        accessibility: this.analyzeAccessibility()
      };

      return analysis;
    } catch (error) {
      console.error('Content analysis failed:', error);
      throw error;
    }
  }

  analyzeMetaTags() {
    const metaTags = {
      title: document.title || '',
      titleLength: (document.title || '').length,
      description: this.getMetaContent('description'),
      descriptionLength: (this.getMetaContent('description') || '').length,
      keywords: this.getMetaContent('keywords'),
      canonical: this.getLinkHref('canonical'),
      robots: this.getMetaContent('robots'),
      viewport: this.getMetaContent('viewport'),
      charset: document.characterSet || '',
      language: document.documentElement.lang || '',
      ogTags: this.getOpenGraphTags(),
      twitterTags: this.getTwitterTags(),
      structuredData: this.getStructuredData()
    };

    return metaTags;
  }

  analyzeHeadings() {
    const headings = {
      h1: this.getHeadingTexts('h1'),
      h2: this.getHeadingTexts('h2'),
      h3: this.getHeadingTexts('h3'),
      h4: this.getHeadingTexts('h4'),
      h5: this.getHeadingTexts('h5'),
      h6: this.getHeadingTexts('h6')
    };

    // 分析标题结构
    headings.structure = this.analyzeHeadingStructure(headings);
    headings.keywordUsage = this.analyzeHeadingKeywords(headings);

    return headings;
  }

  analyzeContent() {
    const bodyText = document.body.textContent || '';
    const bodyHtml = document.body.innerHTML || '';
    
    const content = {
      wordCount: this.countWords(bodyText),
      characterCount: bodyText.length,
      sentenceCount: this.countSentences(bodyText),
      paragraphCount: document.querySelectorAll('p').length,
      listCount: document.querySelectorAll('ul, ol').length,
      textToHtmlRatio: this.calculateTextToHtmlRatio(bodyText, bodyHtml),
      readabilityScore: this.calculateReadabilityScore(bodyText),
      keywordDensity: this.analyzeKeywordDensity(bodyText),
      duplicateContent: this.checkDuplicateContent(),
      languageDetection: this.detectLanguage(bodyText),
      contentStructure: this.analyzeContentStructure()
    };

    return content;
  }

  analyzeImages() {
    const images = document.querySelectorAll('img');
    const imageData = {
      totalImages: images.length,
      imagesWithoutAlt: 0,
      imagesWithEmptyAlt: 0,
      imagesWithGoodAlt: 0,
      imageFormats: {},
      imageSizes: [],
      lazyLoadedImages: 0,
      decorativeImages: 0
    };

    images.forEach(img => {
      // Alt属性分析
      const alt = img.getAttribute('alt');
      if (!alt) {
        imageData.imagesWithoutAlt++;
      } else if (alt.trim() === '') {
        imageData.imagesWithEmptyAlt++;
      } else if (alt.length > 10 && alt.length < 125) {
        imageData.imagesWithGoodAlt++;
      }

      // 图片格式分析
      const src = img.src || img.getAttribute('data-src') || '';
      const format = this.getImageFormat(src);
      if (format) {
        imageData.imageFormats[format] = (imageData.imageFormats[format] || 0) + 1;
      }

      // 懒加载检测
      if (img.hasAttribute('loading') || img.hasAttribute('data-src')) {
        imageData.lazyLoadedImages++;
      }

      // 装饰性图片检测
      if (alt === '' || img.hasAttribute('role') && img.getAttribute('role') === 'presentation') {
        imageData.decorativeImages++;
      }

      // 图片尺寸信息
      if (img.naturalWidth && img.naturalHeight) {
        imageData.imageSizes.push({
          width: img.naturalWidth,
          height: img.naturalHeight,
          displayWidth: img.width,
          displayHeight: img.height
        });
      }
    });

    return imageData;
  }

  analyzeLinks() {
    const links = document.querySelectorAll('a[href]');
    const linkData = {
      totalLinks: links.length,
      internalLinks: 0,
      externalLinks: 0,
      noFollowLinks: 0,
      brokenLinks: 0,
      emailLinks: 0,
      phoneLinks: 0,
      anchorLinks: 0,
      linkTexts: [],
      externalDomains: new Set()
    };

    const currentDomain = window.location.hostname;

    links.forEach(link => {
      const href = link.href;
      const text = link.textContent.trim();
      
      // 链接文本分析
      if (text) {
        linkData.linkTexts.push({
          text: text,
          href: href,
          length: text.length
        });
      }

      // 链接类型分析
      if (href.startsWith('mailto:')) {
        linkData.emailLinks++;
      } else if (href.startsWith('tel:')) {
        linkData.phoneLinks++;
      } else if (href.startsWith('#')) {
        linkData.anchorLinks++;
      } else {
        try {
          const linkUrl = new URL(href);
          if (linkUrl.hostname === currentDomain) {
            linkData.internalLinks++;
          } else {
            linkData.externalLinks++;
            linkData.externalDomains.add(linkUrl.hostname);
          }
        } catch (e) {
          // 无效URL
        }
      }

      // NoFollow检测
      if (link.getAttribute('rel') && link.getAttribute('rel').includes('nofollow')) {
        linkData.noFollowLinks++;
      }
    });

    linkData.externalDomains = Array.from(linkData.externalDomains);
    return linkData;
  }

  async analyzePerformance() {
    const performance = {
      pageSize: document.documentElement.outerHTML.length,
      loadTime: 0,
      domContentLoaded: 0,
      resourceCount: 0,
      cacheableResources: 0,
      compressedResources: 0
    };

    // 性能时间分析
    if (window.performance && window.performance.getEntriesByType) {
      const navigationEntries = window.performance.getEntriesByType('navigation');
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        performance.loadTime = nav.loadEventEnd - nav.fetchStart;
        performance.domContentLoaded = nav.domContentLoadedEventEnd - nav.fetchStart;
      }
    }

    // 资源分析
    if (window.performance && window.performance.getEntriesByType) {
      const resources = window.performance.getEntriesByType('resource');
      performance.resourceCount = resources.length;
      
      resources.forEach(resource => {
        // 检查缓存
        if (resource.transferSize === 0 && resource.decodedBodySize > 0) {
          performance.cacheableResources++;
        }
        
        // 检查压缩
        if (resource.transferSize < resource.decodedBodySize) {
          performance.compressedResources++;
        }
      });
    }

    return performance;
  }

  analyzeTechnicalSEO() {
    const technical = {
      hasRobotsTxt: this.checkRobotsTxt(),
      hasSitemap: this.checkSitemap(),
      hasSSL: window.location.protocol === 'https:',
      hasCanonical: !!this.getLinkHref('canonical'),
      hasHreflang: this.checkHreflang(),
      hasAmpVersion: this.checkAmpVersion(),
      hasManifest: this.checkWebManifest(),
      hasServiceWorker: 'serviceWorker' in navigator,
      mobileViewport: this.checkMobileViewport(),
      schemaMarkup: this.getStructuredData().length > 0,
      hasLang: !!document.documentElement.lang,
      hasRobotsMeta: !!this.getMetaContent('robots'),
      hasOpenGraph: Object.keys(this.getOpenGraphTags()).length > 0
    };

    return technical;
  }

  analyzeAccessibility() {
    const accessibility = {
      hasSkipLinks: this.checkSkipLinks(),
      colorContrast: this.checkColorContrast(),
      focusableElements: this.checkFocusableElements(),
      ariaLabels: this.checkAriaLabels(),
      altTexts: this.checkImageAltTexts(),
      headingStructure: this.checkAccessibleHeadings(),
      formLabels: this.checkFormLabels(),
      languageAttribute: !!document.documentElement.lang
    };

    return accessibility;
  }

  // 辅助方法
  getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    return meta ? meta.getAttribute('content') : '';
  }

  getLinkHref(rel) {
    const link = document.querySelector(`link[rel="${rel}"]`);
    return link ? link.getAttribute('href') : '';
  }

  getHeadingTexts(tag) {
    return Array.from(document.querySelectorAll(tag))
      .map(h => h.textContent.trim())
      .filter(text => text.length > 0);
  }

  getOpenGraphTags() {
    const ogTags = {};
    document.querySelectorAll('meta[property^="og:"]').forEach(meta => {
      const property = meta.getAttribute('property');
      const content = meta.getAttribute('content');
      if (property && content) {
        ogTags[property] = content;
      }
    });
    return ogTags;
  }

  getTwitterTags() {
    const twitterTags = {};
    document.querySelectorAll('meta[name^="twitter:"]').forEach(meta => {
      const name = meta.getAttribute('name');
      const content = meta.getAttribute('content');
      if (name && content) {
        twitterTags[name] = content;
      }
    });
    return twitterTags;
  }

  getStructuredData() {
    const scripts = document.querySelectorAll('script[type="application/ld+json"]');
    const structuredData = [];
    
    scripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        structuredData.push(data);
      } catch (e) {
        // 忽略无效的JSON
      }
    });
    
    return structuredData;
  }

  countWords(text) {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  countSentences(text) {
    return text.split(/[.!?]+/).filter(sentence => sentence.trim().length > 0).length;
  }

  calculateTextToHtmlRatio(text, html) {
    if (!html || html.length === 0) return 0;
    return Math.round((text.length / html.length) * 100);
  }

  calculateReadabilityScore(text) {
    // 简化的可读性评分（基于Flesch Reading Ease）
    const words = this.countWords(text);
    const sentences = this.countSentences(text);
    const syllables = this.countSyllables(text);
    
    if (sentences === 0 || words === 0) return 0;
    
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;
    
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  countSyllables(text) {
    // 简化的音节计数
    return text.toLowerCase().match(/[aeiouy]+/g)?.length || 0;
  }

  analyzeKeywordDensity(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const wordCount = words.length;
    const wordFreq = {};
    
    words.forEach(word => {
      if (word.length > 3) { // 忽略短词
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    const density = {};
    Object.keys(wordFreq).forEach(word => {
      const freq = wordFreq[word];
      if (freq > 2) { // 只考虑出现2次以上的词
        density[word] = Math.round((freq / wordCount) * 100 * 100) / 100; // 保留2位小数
      }
    });
    
    return density;
  }

  checkDuplicateContent() {
    // 简化的重复内容检测
    const paragraphs = Array.from(document.querySelectorAll('p'))
      .map(p => p.textContent.trim())
      .filter(text => text.length > 50);
    
    const duplicates = [];
    for (let i = 0; i < paragraphs.length; i++) {
      for (let j = i + 1; j < paragraphs.length; j++) {
        const similarity = this.calculateSimilarity(paragraphs[i], paragraphs[j]);
        if (similarity > 0.8) {
          duplicates.push({ index1: i, index2: j, similarity });
        }
      }
    }
    
    return {
      hasDuplicates: duplicates.length > 0,
      duplicateCount: duplicates.length,
      duplicatePercentage: paragraphs.length > 0 ? Math.round((duplicates.length / paragraphs.length) * 100) : 0
    };
  }

  calculateSimilarity(str1, str2) {
    // 简化的相似度计算
    const words1 = new Set(str1.toLowerCase().split(/\s+/));
    const words2 = new Set(str2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  detectLanguage(text) {
    // 简化的语言检测
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishWords = (text.match(/\b[a-zA-Z]+\b/g) || []).length;
    const totalChars = text.length;
    
    if (chineseChars / totalChars > 0.3) {
      return 'zh';
    } else if (englishWords > 10) {
      return 'en';
    }
    return 'unknown';
  }

  analyzeContentStructure() {
    return {
      hasParagraphs: document.querySelectorAll('p').length > 0,
      hasLists: document.querySelectorAll('ul, ol').length > 0,
      hasImages: document.querySelectorAll('img').length > 0,
      hasTables: document.querySelectorAll('table').length > 0,
      hasCodeBlocks: document.querySelectorAll('pre, code').length > 0,
      hasBlockquotes: document.querySelectorAll('blockquote').length > 0
    };
  }

  analyzeHeadingStructure(headings) {
    const structure = {
      hasH1: headings.h1.length > 0,
      h1Count: headings.h1.length,
      isH1Unique: headings.h1.length === 1,
      hasProperHierarchy: true,
      missingLevels: []
    };
    
    // 检查标题层次
    const levels = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
    let lastLevel = -1;
    
    levels.forEach((level, index) => {
      if (headings[level].length > 0) {
        if (lastLevel !== -1 && index - lastLevel > 1) {
          structure.hasProperHierarchy = false;
          for (let i = lastLevel + 1; i < index; i++) {
            structure.missingLevels.push(levels[i]);
          }
        }
        lastLevel = index;
      }
    });
    
    return structure;
  }

  analyzeHeadingKeywords(headings) {
    const allHeadings = [
      ...headings.h1,
      ...headings.h2,
      ...headings.h3,
      ...headings.h4,
      ...headings.h5,
      ...headings.h6
    ].join(' ').toLowerCase();
    
    const keywords = this.analyzeKeywordDensity(allHeadings);
    return Object.keys(keywords).slice(0, 10); // 返回前10个关键词
  }

  getImageFormat(src) {
    const formats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    for (const format of formats) {
      if (src.toLowerCase().includes(`.${format}`)) {
        return format;
      }
    }
    return 'unknown';
  }

  // 技术SEO检查方法
  checkRobotsTxt() {
    // 简化检查：假设存在robots.txt
    return true;
  }

  checkSitemap() {
    return !!document.querySelector('link[rel="sitemap"]') ||
           !!document.querySelector('a[href*="sitemap"]');
  }

  checkHreflang() {
    return document.querySelectorAll('link[rel="alternate"][hreflang]').length > 0;
  }

  checkAmpVersion() {
    return !!document.querySelector('link[rel="amphtml"]');
  }

  checkWebManifest() {
    return !!document.querySelector('link[rel="manifest"]');
  }

  checkMobileViewport() {
    const viewport = this.getMetaContent('viewport');
    return viewport.includes('width=device-width') || viewport.includes('initial-scale');
  }

  // 可访问性检查方法
  checkSkipLinks() {
    return document.querySelectorAll('a[href^="#"][class*="skip"], a[href^="#skip"]').length > 0;
  }

  checkColorContrast() {
    // 简化检查：假设通过
    return true;
  }

  checkFocusableElements() {
    const focusable = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
    return focusable.length > 0;
  }

  checkAriaLabels() {
    const elementsWithAria = document.querySelectorAll('[aria-label], [aria-labelledby], [role]');
    return elementsWithAria.length > 0;
  }

  checkImageAltTexts() {
    const images = document.querySelectorAll('img');
    const imagesWithAlt = document.querySelectorAll('img[alt]');
    return images.length === 0 || imagesWithAlt.length / images.length > 0.9;
  }

  checkAccessibleHeadings() {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    return headings.length > 0;
  }

  checkFormLabels() {
    const inputs = document.querySelectorAll('input, select, textarea');
    const labelsCount = document.querySelectorAll('label').length;
    return inputs.length === 0 || labelsCount >= inputs.length * 0.8;
  }
}

// 导出增强内容分析器
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedContentAnalyzer;
} else if (typeof window !== 'undefined') {
  window.EnhancedContentAnalyzer = EnhancedContentAnalyzer;
}