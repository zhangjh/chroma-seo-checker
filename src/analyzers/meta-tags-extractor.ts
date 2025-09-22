/**
 * MetaTagsExtractor - 页面元数据提取器
 * 提取页面的title、description、keywords等元数据
 * 支持Open Graph和Twitter Cards数据提取
 * 解析结构化数据
 */

import { MetaTagsData } from '../../types/analysis';

export class MetaTagsExtractor {
  private document: Document;

  constructor(document: Document) {
    this.document = document;
  }

  /**
   * 提取所有元数据
   */
  public extractMetaTags(): MetaTagsData {
    return {
      title: this.extractTitle(),
      description: this.extractDescription(),
      keywords: this.extractKeywords(),
      robots: this.extractRobots(),
      canonical: this.extractCanonical(),
      viewport: this.extractViewport(),
      charset: this.extractCharset(),
      ogTags: this.extractOpenGraphTags(),
      twitterTags: this.extractTwitterCardTags(),
      structuredData: this.extractStructuredData()
    };
  }

  /**
   * 提取页面标题
   */
  private extractTitle(): string | undefined {
    const titleElement = this.document.querySelector('title');
    return titleElement?.textContent?.trim() || undefined;
  }

  /**
   * 提取页面描述
   */
  private extractDescription(): string | undefined {
    const descriptionMeta = this.document.querySelector('meta[name="description"]') as HTMLMetaElement;
    return descriptionMeta?.content?.trim() || undefined;
  }

  /**
   * 提取关键词
   */
  private extractKeywords(): string | undefined {
    const keywordsMeta = this.document.querySelector('meta[name="keywords"]') as HTMLMetaElement;
    return keywordsMeta?.content?.trim() || undefined;
  }

  /**
   * 提取robots指令
   */
  private extractRobots(): string | undefined {
    const robotsMeta = this.document.querySelector('meta[name="robots"]') as HTMLMetaElement;
    return robotsMeta?.content?.trim() || undefined;
  }

  /**
   * 提取canonical链接
   */
  private extractCanonical(): string | undefined {
    const canonicalLink = this.document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    return canonicalLink?.href || undefined;
  }

  /**
   * 提取viewport设置
   */
  private extractViewport(): string | undefined {
    const viewportMeta = this.document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    return viewportMeta?.content?.trim() || undefined;
  }

  /**
   * 提取字符编码
   */
  private extractCharset(): string | undefined {
    // 检查charset属性
    const charsetMeta = this.document.querySelector('meta[charset]') as HTMLMetaElement;
    if (charsetMeta) {
      const charset = charsetMeta.getAttribute('charset');
      if (charset) {
        return charset;
      }
    }

    // 检查http-equiv方式
    const httpEquivMeta = this.document.querySelector('meta[http-equiv="Content-Type"]') as HTMLMetaElement;
    if (httpEquivMeta?.content) {
      const match = httpEquivMeta.content.match(/charset=([^;]+)/i);
      return match?.[1]?.trim();
    }

    return undefined;
  }

  /**
   * 提取Open Graph标签
   */
  private extractOpenGraphTags(): Record<string, string> {
    const ogTags: Record<string, string> = {};
    const ogMetaTags = this.document.querySelectorAll('meta[property^="og:"]');

    ogMetaTags.forEach((meta) => {
      const metaElement = meta as HTMLMetaElement;
      const property = metaElement.getAttribute('property');
      const content = metaElement.content;

      if (property && content) {
        // 移除 "og:" 前缀
        const key = property.replace('og:', '');
        ogTags[key] = content.trim();
      }
    });

    return ogTags;
  }

  /**
   * 提取Twitter Card标签
   */
  private extractTwitterCardTags(): Record<string, string> {
    const twitterTags: Record<string, string> = {};
    const twitterMetaTags = this.document.querySelectorAll('meta[name^="twitter:"]');

    twitterMetaTags.forEach((meta) => {
      const metaElement = meta as HTMLMetaElement;
      const name = metaElement.getAttribute('name');
      const content = metaElement.content;

      if (name && content) {
        // 移除 "twitter:" 前缀
        const key = name.replace('twitter:', '');
        twitterTags[key] = content.trim();
      }
    });

    return twitterTags;
  }

  /**
   * 提取结构化数据 (JSON-LD, Microdata, RDFa)
   */
  private extractStructuredData(): any[] {
    const structuredData: any[] = [];

    // 提取JSON-LD数据
    const jsonLdScripts = this.document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach((script) => {
      try {
        const data = JSON.parse(script.textContent || '');
        structuredData.push({
          type: 'json-ld',
          data: data
        });
      } catch (error) {
        console.warn('Invalid JSON-LD data:', error);
      }
    });

    // 提取Microdata (简化版本)
    const microdataElements = this.document.querySelectorAll('[itemscope]');
    microdataElements.forEach((element) => {
      const itemType = element.getAttribute('itemtype');
      if (itemType) {
        const microdataObj = this.extractMicrodataFromElement(element);
        if (Object.keys(microdataObj).length > 0) {
          structuredData.push({
            type: 'microdata',
            itemType: itemType,
            data: microdataObj
          });
        }
      }
    });

    return structuredData;
  }

  /**
   * 从元素中提取Microdata属性
   */
  private extractMicrodataFromElement(element: Element): Record<string, any> {
    const data: Record<string, any> = {};
    
    // 查找具有itemprop属性的子元素
    const itemProps = element.querySelectorAll('[itemprop]');
    itemProps.forEach((propElement) => {
      const propName = propElement.getAttribute('itemprop');
      if (propName) {
        let value: string | null = null;

        // 根据元素类型获取值
        if (propElement.tagName === 'META') {
          value = (propElement as HTMLMetaElement).content;
        } else if (propElement.tagName === 'A') {
          value = (propElement as HTMLAnchorElement).href;
        } else if (propElement.tagName === 'IMG') {
          value = (propElement as HTMLImageElement).src;
        } else {
          value = propElement.textContent?.trim() || null;
        }

        if (value) {
          data[propName] = value;
        }
      }
    });

    return data;
  }

  /**
   * 验证元数据的完整性和质量
   */
  public validateMetaTags(metaTags: MetaTagsData): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 检查必需的元数据
    if (!metaTags.title) {
      issues.push('缺少页面标题');
      recommendations.push('添加 <title> 标签');
    } else {
      if (metaTags.title.length < 30) {
        issues.push('页面标题过短');
        recommendations.push('标题长度建议在30-60个字符之间');
      } else if (metaTags.title.length > 60) {
        issues.push('页面标题过长');
        recommendations.push('标题长度建议在30-60个字符之间');
      }
    }

    if (!metaTags.description) {
      issues.push('缺少页面描述');
      recommendations.push('添加 <meta name="description"> 标签');
    } else {
      if (metaTags.description.length < 120) {
        issues.push('页面描述过短');
        recommendations.push('描述长度建议在120-160个字符之间');
      } else if (metaTags.description.length > 160) {
        issues.push('页面描述过长');
        recommendations.push('描述长度建议在120-160个字符之间');
      }
    }

    if (!metaTags.viewport) {
      issues.push('缺少viewport设置');
      recommendations.push('添加 <meta name="viewport" content="width=device-width, initial-scale=1">');
    }

    if (!metaTags.charset) {
      issues.push('缺少字符编码声明');
      recommendations.push('添加 <meta charset="UTF-8">');
    }

    // 检查Open Graph数据
    if (Object.keys(metaTags.ogTags).length === 0) {
      recommendations.push('考虑添加Open Graph标签以改善社交媒体分享效果');
    }

    // 检查Twitter Card数据
    if (Object.keys(metaTags.twitterTags).length === 0) {
      recommendations.push('考虑添加Twitter Card标签以改善Twitter分享效果');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }
}