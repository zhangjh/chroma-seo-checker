// Enhanced SEO Rules Engine - With Debug Logging
class EnhancedSEORules {
  constructor() {
    this.rules = this.initializeRules();
    this.weights = this.initializeWeights();
  }

  initializeWeights() {
    return {
      technical: 0.45,
      content: 0.35,
      performance: 0.20
    };
  }

  initializeRules() {
    return {
      technical: [
        {
          id: 'title_exists',
          name: '页面标题缺失',
          weight: 15,
          check: (analysis) => !!analysis.metaTags?.title,
          severity: 'critical'
        },
        {
          id: 'title_length',
          name: '标题长度不合适',
          weight: 10,
          check: (analysis) => {
            const title = analysis.metaTags?.title || '';
            return title.length >= 30 && title.length <= 60;
          },
          severity: 'high'
        },
        {
          id: 'meta_description_exists',
          name: 'Meta描述缺失',
          weight: 12,
          check: (analysis) => !!analysis.metaTags?.description,
          severity: 'critical'
        },
        {
          id: 'h1_exists',
          name: 'H1标题缺失',
          weight: 12,
          check: (analysis) => (analysis.headings?.h1?.length || 0) > 0,
          severity: 'critical'
        },
        {
          id: 'images_alt',
          name: '图片缺少Alt属性',
          weight: 8,
          check: (analysis) => {
            const total = analysis.images?.totalImages || 0;
            const withoutAlt = analysis.images?.imagesWithoutAlt || 0;
            return total === 0 || withoutAlt === 0;
          },
          severity: 'medium'
        },
        {
          id: 'meta_description_length',
          name: 'Meta描述长度不合适',
          weight: 8,
          check: (analysis) => {
            const desc = analysis.metaTags?.description || '';
            return desc.length >= 120 && desc.length <= 160;
          },
          severity: 'high'
        },
        {
          id: 'h1_unique',
          name: 'H1标题不唯一',
          weight: 8,
          check: (analysis) => (analysis.headings?.h1?.length || 0) === 1,
          severity: 'high'
        },
        {
          id: 'canonical_url',
          name: '缺少Canonical标签',
          weight: 5,
          check: (analysis) => !!analysis.metaTags?.canonical,
          severity: 'medium'
        },
        {
          id: 'mobile_friendly',
          name: '移动端不友好',
          weight: 6,
          check: (analysis) => !!analysis.metaTags?.viewport,
          severity: 'high'
        },
        {
          id: 'open_graph',
          name: '缺少Open Graph标签',
          weight: 6,
          check: (analysis) => Object.keys(analysis.metaTags?.ogTags || {}).length > 0,
          severity: 'medium'
        },
        {
          id: 'robots_meta',
          name: '缺少Robots Meta标签',
          weight: 4,
          check: (analysis) => !!analysis.metaTags?.robots,
          severity: 'low'
        },
        {
          id: 'lang_attribute',
          name: 'HTML缺少lang属性',
          weight: 4,
          check: (analysis) => !!analysis.technical?.hasLang,
          severity: 'medium'
        }
      ],
      content: [
        {
          id: 'content_length',
          name: '内容长度不足',
          weight: 20,
          check: (analysis) => (analysis.content?.wordCount || 0) >= 300,
          severity: 'high'
        },
        {
          id: 'text_html_ratio',
          name: '文本HTML比例过低',
          weight: 12,
          check: (analysis) => (analysis.content?.textToHtmlRatio || 0) >= 15,
          severity: 'medium'
        },
        {
          id: 'internal_links',
          name: '内链数量不足',
          weight: 10,
          check: (analysis) => (analysis.content?.internalLinks || 0) >= 3,
          severity: 'medium'
        },
        {
          id: 'heading_structure',
          name: '标题结构不合理',
          weight: 8,
          check: (analysis) => {
            const h1Count = analysis.headings?.h1?.length || 0;
            const h2Count = analysis.headings?.h2?.length || 0;
            return h1Count === 1 && h2Count >= 1;
          },
          severity: 'medium'
        },
        {
          id: 'external_links',
          name: '外链数量不合理',
          weight: 8,
          check: (analysis) => {
            const externalLinks = analysis.content?.externalLinks || 0;
            return externalLinks >= 1 && externalLinks <= 5;
          },
          severity: 'medium'
        },
        {
          id: 'keyword_density',
          name: '关键词密度异常',
          weight: 10,
          check: (analysis) => {
            const density = analysis.content?.keywordDensity || {};
            const maxDensity = Math.max(...Object.values(density), 0);
            return maxDensity <= 5;
          },
          severity: 'medium'
        }
      ],
      performance: [
        {
          id: 'page_size',
          name: '页面大小过大',
          weight: 25,
          check: (analysis) => (analysis.performance?.pageSize || 0) < 2000000,
          severity: 'medium'
        },
        {
          id: 'load_time',
          name: '页面加载时间过长',
          weight: 30,
          check: (analysis) => (analysis.performance?.loadTime || 0) < 3, // 3秒
          severity: 'high'
        },
        {
          id: 'https_usage',
          name: '未使用HTTPS',
          weight: 15,
          check: (analysis) => analysis.url?.startsWith('https://'),
          severity: 'high'
        },
        {
          id: 'image_optimization',
          name: '图片优化不足',
          weight: 20,
          check: (analysis) => {
            const total = analysis.images?.totalImages || 0;
            const withoutAlt = analysis.images?.imagesWithoutAlt || 0;
            return total === 0 || (withoutAlt / total) < 0.1;
          },
          severity: 'medium'
        }
      ]
    };
  }

  calculateEnhancedScore(analysis) {
    const scores = {
      technical: this.calculateCategoryScore(analysis, 'technical'),
      content: this.calculateCategoryScore(analysis, 'content'),
      performance: this.calculateCategoryScore(analysis, 'performance')
    };

    const overall = Math.round(
      scores.technical * this.weights.technical +
      scores.content * this.weights.content +
      scores.performance * this.weights.performance
    );

    return {
      overall: Math.max(0, Math.min(100, overall)),
      technical: Math.max(0, Math.min(100, scores.technical)),
      content: Math.max(0, Math.min(100, scores.content)),
      performance: Math.max(0, Math.min(100, scores.performance))
    };
  }

  calculateCategoryScore(analysis, category) {
    const rules = this.rules[category];
    let totalWeight = 0;
    let achievedWeight = 0;

    rules.forEach(rule => {
      totalWeight += rule.weight;
      if (rule.check(analysis)) {
        achievedWeight += rule.weight;
      }
    });

    return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
  }

  generateDetailedIssues(analysis) {
    try {
      const issues = [];

      Object.keys(this.rules).forEach(category => {
        this.rules[category].forEach(rule => {
          try {
            const passed = rule.check(analysis);
            
            if (!passed) {
              const selector = this.getSelector(rule.id);
              const issue = {
                id: rule.id,
                category: category,
                title: rule.name,
                description: this.getIssueDescription(rule.id, analysis),
                severity: rule.severity,
                recommendation: this.getRecommendation(rule.id),
                weight: rule.weight,
                location: this.getIssueLocation(rule.id),
                currentValue: this.getCurrentValue(rule.id, analysis),
                expectedValue: this.getExpectedValue(rule.id),
                impact: this.getImpact(rule.id),
                selector: selector,
                autoFix: rule.autoFix || false
              };
              
              issues.push(issue);
            }
          } catch (error) {
            // 静默跳过有问题的规则
          }
        });
      });

      const sortedIssues = issues.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        return severityDiff !== 0 ? severityDiff : b.weight - a.weight;
      });

      return sortedIssues;
    } catch (error) {
      throw error;
    }
  }

  getIssueDescription(ruleId, analysis) {
    const descriptions = {
      'title_exists': '页面缺少title标签',
      'title_length': `页面标题长度为${analysis.metaTags?.titleLength || 0}字符`,
      'meta_description_exists': '页面缺少Meta描述标签',
      'meta_description_length': `Meta描述长度为${analysis.metaTags?.descriptionLength || 0}字符`,
      'h1_exists': '页面缺少H1主标题',
      'h1_unique': `页面有${analysis.headings?.h1?.length || 0}个H1标题`,
      'canonical_url': '页面缺少Canonical标签',
      'mobile_friendly': '页面对移动设备不够友好',
      'images_alt': `${analysis.images?.imagesWithoutAlt || 0}张图片缺少Alt属性`,
      'content_length': `页面内容仅${analysis.content?.wordCount || 0}字`,
      'text_html_ratio': `文本HTML比例仅${analysis.content?.textToHtmlRatio || 0}%`,
      'internal_links': `页面仅有${analysis.content?.internalLinks || 0}个内链`,
      'heading_structure': '标题层次结构不合理',
      'page_size': `页面大小为${Math.round((analysis.performance?.pageSize || 0) / 1024)}KB`,
      'load_time': `页面加载时间${Math.round(analysis.performance?.loadTime || 0)}秒`,
      'https_usage': '网站未使用HTTPS协议',
      'image_optimization': '图片优化不足',
      'open_graph': '页面缺少Open Graph标签',
      'robots_meta': '页面缺少Robots Meta标签',
      'lang_attribute': 'HTML标签缺少lang属性',
      'external_links': `外链数量为${analysis.content?.externalLinks || 0}个`,
      'keyword_density': '检测到可能的关键词堆砌'
    };
    return descriptions[ruleId] || '需要关注的SEO问题';
  }

  getRecommendation(ruleId) {
    const recommendations = {
      'title_exists': '添加<title>标签：<title>页面标题 - 网站名</title>',
      'title_length': '调整标题长度至30-60字符，确保在搜索结果中完整显示',
      'meta_description_exists': '添加Meta描述：<meta name="description" content="120-160字符的页面描述">',
      'meta_description_length': '调整Meta描述长度至120-160字符',
      'h1_exists': '添加H1标题：<h1>页面主标题</h1>',
      'h1_unique': '确保页面只有一个H1标题，其他改为H2或H3',
      'canonical_url': '添加Canonical标签：<link rel="canonical" href="页面URL">',
      'mobile_friendly': '添加viewport标签：<meta name="viewport" content="width=device-width, initial-scale=1">',
      'images_alt': '为图片添加Alt属性：<img src="..." alt="图片描述">',
      'content_length': '增加页面内容至300字以上，提供更多有价值信息',
      'text_html_ratio': '增加文本内容，减少不必要的HTML代码',
      'internal_links': '添加3-5个相关内链，提升页面权重',
      'heading_structure': '建立清晰的标题层次：H1→H2→H3',
      'page_size': '压缩图片和代码，减少页面大小至2MB以下',
      'load_time': '优化图片、压缩代码、使用CDN提升加载速度',
      'https_usage': '启用SSL证书，使用HTTPS协议',
      'image_optimization': '压缩图片、使用现代格式、添加alt属性',
      'open_graph': '添加Open Graph标签：<meta property="og:title" content="页面标题">',
      'robots_meta': '添加robots标签：<meta name="robots" content="index,follow">',
      'lang_attribute': '为HTML标签添加语言属性：<html lang="zh-CN">',
      'external_links': '适量添加1-5个高质量外链',
      'keyword_density': '减少关键词重复，使用同义词和相关词'
    };
    return recommendations[ruleId] || '请参考SEO最佳实践';
  }

  getIssueLocation(ruleId) {
    const locations = {
      'title_exists': '<head>部分',
      'title_length': '<title>标签',
      'meta_description_exists': '<head>部分',
      'h1_exists': '页面内容区域',
      'images_alt': '页面图片',
      'content_length': '页面主要内容',
      'page_size': '整个页面'
    };
    return locations[ruleId] || '页面中';
  }

  getCurrentValue(ruleId, analysis) {
    const values = {
      'title_exists': '无标题',
      'title_length': `${analysis.metaTags?.titleLength || 0}字符`,
      'meta_description_exists': '无描述',
      'meta_description_length': `${analysis.metaTags?.descriptionLength || 0}字符`,
      'h1_exists': '无H1标题',
      'h1_unique': `${analysis.headings?.h1?.length || 0}个H1`,
      'canonical_url': '无Canonical标签',
      'mobile_friendly': analysis.metaTags?.viewport || '无viewport设置',
      'images_alt': `${analysis.images?.imagesWithoutAlt || 0}张缺少Alt`,
      'content_length': `${analysis.content?.wordCount || 0}字`,
      'text_html_ratio': `${analysis.content?.textToHtmlRatio || 0}%`,
      'internal_links': `${analysis.content?.internalLinks || 0}个内链`,
      'heading_structure': this.getHeadingStructureInfo(analysis.headings),
      'page_size': `${Math.round((analysis.performance?.pageSize || 0) / 1024)}KB`,
      'load_time': `${Math.round(analysis.performance?.loadTime || 0)}秒`,
      'https_usage': 'HTTP协议',
      'image_optimization': `${analysis.images?.totalImages || 0}张图片需优化`,
      'open_graph': '无OG标签',
      'robots_meta': '无Robots指令',
      'lang_attribute': '无lang属性',
      'external_links': `${analysis.content?.externalLinks || 0}个外链`,
      'keyword_density': this.getKeywordDensityInfo(analysis)
    };
    return values[ruleId] || '未知';
  }

  getHeadingStructureInfo(headings) {
    if (!headings) return '无标题结构';
    const structure = [];
    ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].forEach(level => {
      const count = headings[level]?.length || 0;
      if (count > 0) {
        structure.push(`${level.toUpperCase()}:${count}个`);
      }
    });
    return structure.join(', ') || '无标题';
  }

  getSelector(ruleId) {
    const selectors = {
      'title_exists': 'head > title',
      'title_length': 'head > title',
      'meta_description_exists': 'meta[name="description"]',
      'meta_description_length': 'meta[name="description"]',
      'h1_exists': 'h1',
      'h1_unique': 'h1',
      'canonical_url': 'link[rel="canonical"]',
      'mobile_friendly': 'meta[name="viewport"]',
      'open_graph': 'meta[property^="og:"]',
      'robots_meta': 'meta[name="robots"]',
      'lang_attribute': 'html[lang]',
      'images_alt': 'img:not([alt]), img[alt=""]',
      'content_length': 'main, article, .content, #content, body',
      'text_html_ratio': 'body',
      'internal_links': 'a[href^="/"]',
      'heading_structure': 'h1, h2, h3',
      'external_links': 'a[href^="http"]',
      'keyword_density': 'body',
      'page_size': 'html',
      'load_time': 'html',
      'https_usage': 'html',
      'image_optimization': 'img'
    };
    
    return selectors[ruleId] || null;
  }

  getExpectedValue(ruleId) {
    const values = {
      'title_exists': '30-60字符标题',
      'title_length': '30-60字符',
      'meta_description_exists': '120-160字符描述',
      'h1_exists': '1个H1标题',
      'images_alt': '所有图片有Alt',
      'content_length': '至少300字',
      'page_size': '小于2MB'
    };
    return values[ruleId] || '符合SEO标准';
  }

  getImpact(ruleId) {
    const impacts = {
      'title_exists': '严重影响搜索排名',
      'title_length': '影响搜索结果显示',
      'meta_description_exists': '影响点击率',
      'meta_description_length': '描述过长会被截断，过短则不够吸引人',
      'h1_exists': '影响内容结构',
      'h1_unique': '多个H1会分散页面主题焦点',
      'canonical_url': '可能出现重复内容问题',
      'mobile_friendly': '影响移动端用户体验和排名',
      'open_graph': '影响社交媒体分享效果',
      'robots_meta': '无法精确控制搜索引擎行为',
      'lang_attribute': '影响搜索引擎理解页面语言',
      'images_alt': '影响可访问性',
      'content_length': '影响搜索排名',
      'text_html_ratio': '影响内容质量评估',
      'internal_links': '影响网站内部权重传递',
      'heading_structure': '影响内容可读性和SEO效果',
      'external_links': '影响页面权威性评估',
      'keyword_density': '可能被搜索引擎降权处理',
      'page_size': '影响加载速度',
      'load_time': '影响用户体验和搜索排名',
      'https_usage': '影响网站安全性和搜索排名',
      'image_optimization': '影响页面加载速度'
    };
    return impacts[ruleId] || '可能影响SEO效果';
  }

  getKeywordDensityInfo(analysis) {
    const density = analysis.content?.keywordDensity || {};
    const entries = Object.entries(density).sort(([,a], [,b]) => b - a);
    const top3 = entries.slice(0, 3).map(([word, freq]) => `${word}:${freq}%`);
    return top3.join(', ') || '无明显关键词';
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedSEORules;
} else if (typeof window !== 'undefined') {
  window.EnhancedSEORules = EnhancedSEORules;
}