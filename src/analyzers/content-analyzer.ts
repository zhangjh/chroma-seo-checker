/**
 * ContentAnalyzer - 内容分析器
 * 计算字数、可读性、关键词密度
 * 分析链接（内链、外链统计）
 */

import { ContentAnalysis, LinkInfo, LinkAnalysis } from '../../types/analysis';

export class ContentAnalyzer {
  private document: Document;
  private currentUrl: string;

  constructor(document: Document, currentUrl: string = '') {
    this.document = document;
    this.currentUrl = currentUrl;
  }

  /**
   * 分析页面内容
   */
  public analyzeContent(): ContentAnalysis {
    const textContent = this.extractTextContent();
    const htmlContent = this.document.documentElement.outerHTML || '';
    
    return {
      wordCount: this.calculateWordCount(textContent),
      readabilityScore: this.calculateReadabilityScore(textContent),
      keywordDensity: this.calculateKeywordDensity(textContent),
      internalLinks: this.countInternalLinks(),
      externalLinks: this.countExternalLinks(),
      textToHtmlRatio: this.calculateTextToHtmlRatio(textContent, htmlContent),
      language: this.detectLanguage(),
      paragraphCount: this.countParagraphs(),
      listCount: this.countLists(),
      textLength: textContent.length,
      htmlLength: htmlContent.length
    };
  }

  /**
   * 提取页面的纯文本内容
   */
  private extractTextContent(): string {
    // 移除script和style标签
    const clone = this.document.cloneNode(true) as Document;
    const scripts = clone.querySelectorAll('script, style, noscript');
    scripts.forEach(element => element.remove());

    // 获取body的文本内容
    const body = clone.querySelector('body');
    return body?.textContent?.trim() || '';
  }

  /**
   * 计算字数
   */
  private calculateWordCount(text: string): number {
    if (!text.trim()) return 0;

    // 处理中文和英文混合文本
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    const englishWords = text.match(/[a-zA-Z]+/g) || [];
    
    // 中文字符数 + 英文单词数
    return chineseChars.length + englishWords.length;
  }

  /**
   * 计算可读性评分（简化版Flesch Reading Ease）
   */
  private calculateReadabilityScore(text: string): number {
    if (!text.trim()) return 0;

    const sentences = this.countSentences(text);
    const words = this.calculateWordCount(text);
    const syllables = this.estimateSyllables(text);

    if (sentences === 0 || words === 0) return 0;

    // 简化的可读性公式
    const avgWordsPerSentence = words / sentences;
    const avgSyllablesPerWord = syllables / words;

    // 调整后的公式，适合中英文混合内容
    const score = 206.835 - (1.015 * avgWordsPerSentence) - (84.6 * avgSyllablesPerWord);
    
    // 确保分数在0-100之间
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * 计算句子数量
   */
  private countSentences(text: string): number {
    // 匹配中英文句子结束符号
    const sentences = text.match(/[.!?。！？]+/g) || [];
    return Math.max(1, sentences.length);
  }

  /**
   * 估算音节数（简化版）
   */
  private estimateSyllables(text: string): number {
    const words = text.match(/[a-zA-Z]+/g) || [];
    let syllables = 0;

    words.forEach(word => {
      // 简单的音节估算：元音字母组合
      const vowelMatches = word.toLowerCase().match(/[aeiouy]+/g) || [];
      syllables += Math.max(1, vowelMatches.length);
    });

    // 中文字符按1个音节计算
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    syllables += chineseChars.length;

    return syllables;
  }

  /**
   * 计算关键词密度
   */
  private calculateKeywordDensity(text: string): Record<string, number> {
    if (!text.trim()) return {};

    const words = this.extractWords(text);
    const totalWords = words.length;
    const wordCounts = new Map<string, number>();

    // 统计词频
    words.forEach(word => {
      const count = wordCounts.get(word) || 0;
      wordCounts.set(word, count + 1);
    });

    // 计算密度（只返回出现次数大于1的词）
    const density: Record<string, number> = {};
    wordCounts.forEach((count, word) => {
      if (count > 1 && word.length > 2) {
        density[word] = Math.round((count / totalWords) * 10000) / 100; // 保留两位小数
      }
    });

    // 按密度排序，只返回前20个
    const sortedEntries = Object.entries(density)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20);

    return Object.fromEntries(sortedEntries);
  }

  /**
   * 提取文本中的单词
   */
  private extractWords(text: string): string[] {
    // 转换为小写并提取单词
    const cleanText = text.toLowerCase()
      .replace(/[^\u4e00-\u9fff\w\s]/g, ' ') // 保留中文、字母、数字和空格
      .replace(/\s+/g, ' ')
      .trim();

    // 分离中文字符和英文单词
    const words: string[] = [];
    
    // 提取英文单词
    const englishWords = cleanText.match(/[a-z]+/g) || [];
    words.push(...englishWords);

    // 提取中文字符（作为单个词处理）
    const chineseChars = cleanText.match(/[\u4e00-\u9fff]/g) || [];
    words.push(...chineseChars);

    // 过滤停用词和短词
    return words.filter(word => word.length > 1 && !this.isStopWord(word));
  }

  /**
   * 检查是否为停用词
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      // 英文停用词
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
      // 中文停用词
      '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这'
    ]);
    
    return stopWords.has(word);
  }

  /**
   * 统计内链数量
   */
  private countInternalLinks(): number {
    const links = this.document.querySelectorAll('a[href]');
    let internalCount = 0;

    links.forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      if (this.isInternalLink(href)) {
        internalCount++;
      }
    });

    return internalCount;
  }

  /**
   * 统计外链数量
   */
  private countExternalLinks(): number {
    const links = this.document.querySelectorAll('a[href]');
    let externalCount = 0;

    links.forEach(link => {
      const href = (link as HTMLAnchorElement).href;
      if (this.isExternalLink(href)) {
        externalCount++;
      }
    });

    return externalCount;
  }

  /**
   * 分析所有链接
   */
  public analyzeLinkStructure(): LinkAnalysis {
    const links = this.document.querySelectorAll('a[href]');
    const internal: LinkInfo[] = [];
    const external: LinkInfo[] = [];
    const broken: LinkInfo[] = [];
    const noFollow: LinkInfo[] = [];

    links.forEach((link, index) => {
      const anchor = link as HTMLAnchorElement;
      const href = anchor.href;
      const text = anchor.textContent?.trim() || '';
      const rel = anchor.getAttribute('rel') || '';
      const hasNoFollow = rel.includes('nofollow');

      const linkInfo: LinkInfo = {
        href: href,
        text: text,
        isInternal: this.isInternalLink(href),
        isExternal: this.isExternalLink(href),
        hasNoFollow: hasNoFollow,
        element: this.generateLinkSelector(anchor, index)
      };

      if (linkInfo.isInternal) {
        internal.push(linkInfo);
      } else if (linkInfo.isExternal) {
        external.push(linkInfo);
      }

      if (hasNoFollow) {
        noFollow.push(linkInfo);
      }

      // 简单的断链检测（基于href格式）
      if (this.isPotentiallyBroken(href)) {
        broken.push(linkInfo);
      }
    });

    return {
      internal,
      external,
      broken,
      noFollow
    };
  }

  /**
   * 判断是否为内链
   */
  private isInternalLink(href: string): boolean {
    if (!href) return false;
    
    // 相对链接
    if (href.startsWith('/') || href.startsWith('./') || href.startsWith('../')) {
      return true;
    }

    // 锚点链接
    if (href.startsWith('#')) {
      return true;
    }

    // 同域名链接
    if (this.currentUrl) {
      try {
        const currentDomain = new URL(this.currentUrl).hostname;
        const linkDomain = new URL(href).hostname;
        return currentDomain === linkDomain;
      } catch {
        return false;
      }
    }

    return false;
  }

  /**
   * 判断是否为外链
   */
  private isExternalLink(href: string): boolean {
    if (!href) return false;
    
    // 绝对URL且不是内链
    if (href.startsWith('http://') || href.startsWith('https://')) {
      return !this.isInternalLink(href);
    }

    return false;
  }

  /**
   * 检测可能的断链
   */
  private isPotentiallyBroken(href: string): boolean {
    // 简单的断链检测规则
    if (!href || href === '#' || href === 'javascript:void(0)') {
      return true;
    }

    // 检查明显的错误格式
    if (href.includes('localhost') && !this.currentUrl.includes('localhost')) {
      return true;
    }

    return false;
  }

  /**
   * 生成链接的CSS选择器
   */
  private generateLinkSelector(anchor: HTMLAnchorElement, index: number): string {
    if (anchor.id) {
      return `#${anchor.id}`;
    }

    if (anchor.className) {
      const classes = anchor.className.split(' ').filter(cls => cls.trim());
      if (classes.length > 0) {
        return `a.${classes.join('.')}`;
      }
    }

    return `a:nth-child(${index + 1})`;
  }

  /**
   * 计算文本与HTML的比例
   */
  private calculateTextToHtmlRatio(textContent: string, htmlContent: string): number {
    if (htmlContent.length === 0) return 0;
    
    const ratio = (textContent.length / htmlContent.length) * 100;
    return Math.round(ratio * 100) / 100; // 保留两位小数
  }

  /**
   * 检测页面语言
   */
  private detectLanguage(): string {
    // 首先检查html标签的lang属性
    const htmlLang = this.document.documentElement.getAttribute('lang');
    if (htmlLang) {
      return htmlLang;
    }

    // 检查meta标签
    const metaLang = this.document.querySelector('meta[http-equiv="content-language"]') as HTMLMetaElement;
    if (metaLang?.content) {
      return metaLang.content;
    }

    // 简单的语言检测
    const text = this.extractTextContent();
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const totalChars = text.length;

    if (chineseChars / totalChars > 0.3) {
      return 'zh';
    }

    return 'en'; // 默认英文
  }

  /**
   * 统计段落数量
   */
  private countParagraphs(): number {
    return this.document.querySelectorAll('p').length;
  }

  /**
   * 统计列表数量
   */
  private countLists(): number {
    const ul = this.document.querySelectorAll('ul').length;
    const ol = this.document.querySelectorAll('ol').length;
    return ul + ol;
  }
}