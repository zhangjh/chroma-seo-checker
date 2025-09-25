// Enhanced SEO Rules Engine - English Only Version
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
          name: 'Missing Page Title',
          weight: 15,
          check: (analysis) => !!analysis.metaTags?.title,
          severity: 'critical'
        },
        {
          id: 'title_length',
          name: 'Inappropriate Title Length',
          weight: 10,
          check: (analysis) => {
            const title = analysis.metaTags?.title || '';
            return title.length >= 30 && title.length <= 60;
          },
          severity: 'high'
        },
        {
          id: 'meta_description_exists',
          name: 'Missing Meta Description',
          weight: 12,
          check: (analysis) => !!analysis.metaTags?.description,
          severity: 'critical'
        },
        {
          id: 'h1_exists',
          name: 'Missing H1 Title',
          weight: 12,
          check: (analysis) => (analysis.headings?.h1?.length || 0) > 0,
          severity: 'critical'
        },
        {
          id: 'images_alt',
          name: 'Images Missing Alt Attributes',
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
          name: 'Inappropriate Meta Description Length',
          weight: 8,
          check: (analysis) => {
            const desc = analysis.metaTags?.description || '';
            return desc.length >= 120 && desc.length <= 160;
          },
          severity: 'high'
        },
        {
          id: 'h1_unique',
          name: 'Non-unique H1 Title',
          weight: 8,
          check: (analysis) => (analysis.headings?.h1?.length || 0) === 1,
          severity: 'high'
        },
        {
          id: 'canonical_url',
          name: 'Missing Canonical Tag',
          weight: 5,
          check: (analysis) => !!analysis.metaTags?.canonical,
          severity: 'medium'
        },
        {
          id: 'mobile_friendly',
          name: 'Not Mobile Friendly',
          weight: 6,
          check: (analysis) => !!analysis.metaTags?.viewport,
          severity: 'high'
        },
        {
          id: 'open_graph',
          name: 'Missing Open Graph Tags',
          weight: 6,
          check: (analysis) => Object.keys(analysis.metaTags?.ogTags || {}).length > 0,
          severity: 'medium'
        },
        {
          id: 'robots_meta',
          name: 'Missing Robots Meta Tag',
          weight: 4,
          check: (analysis) => !!analysis.metaTags?.robots,
          severity: 'low'
        },
        {
          id: 'lang_attribute',
          name: 'HTML Missing lang Attribute',
          weight: 4,
          check: (analysis) => !!analysis.technical?.hasLang,
          severity: 'medium'
        }
      ],
      content: [
        {
          id: 'content_length',
          name: 'Insufficient Content Length',
          weight: 20,
          check: (analysis) => (analysis.content?.wordCount || 0) >= 300,
          severity: 'high'
        },
        {
          id: 'text_html_ratio',
          name: 'Low Text-to-HTML Ratio',
          weight: 12,
          check: (analysis) => (analysis.content?.textToHtmlRatio || 0) >= 15,
          severity: 'medium'
        },
        {
          id: 'internal_links',
          name: 'Insufficient Internal Links',
          weight: 10,
          check: (analysis) => (analysis.content?.internalLinks || 0) >= 3,
          severity: 'medium'
        },
        {
          id: 'heading_structure',
          name: 'Unreasonable Heading Structure',
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
          name: 'Unreasonable External Links Count',
          weight: 8,
          check: (analysis) => {
            const externalLinks = analysis.content?.externalLinks || 0;
            return externalLinks >= 1 && externalLinks <= 5;
          },
          severity: 'medium'
        },
        {
          id: 'keyword_density',
          name: 'Abnormal Keyword Density',
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
          name: 'Page Size Too Large',
          weight: 25,
          check: (analysis) => (analysis.performance?.pageSize || 0) < 2000000,
          severity: 'medium'
        },
        {
          id: 'load_time',
          name: 'Page Load Time Too Long',
          weight: 30,
          check: (analysis) => (analysis.performance?.loadTime || 0) < 3,
          severity: 'high'
        },
        {
          id: 'https_usage',
          name: 'Not Using HTTPS',
          weight: 15,
          check: (analysis) => analysis.url?.startsWith('https://'),
          severity: 'high'
        },
        {
          id: 'image_optimization',
          name: 'Insufficient Image Optimization',
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
            // Silent skip problematic rules
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
      'title_exists': 'Page is missing title tag',
      'title_length': `Page title length is ${analysis.metaTags?.title?.length || 0} characters`,
      'meta_description_exists': 'Page is missing Meta description tag',
      'meta_description_length': `Meta description length is ${analysis.metaTags?.description?.length || 0} characters`,
      'h1_exists': 'Page is missing H1 main title',
      'h1_unique': `Page has ${analysis.headings?.h1?.length || 0} H1 titles`,
      'canonical_url': 'Page is missing Canonical tag',
      'mobile_friendly': 'Page is not mobile-friendly enough',
      'images_alt': `${analysis.images?.imagesWithoutAlt || 0} images are missing Alt attributes`,
      'content_length': `Page content is only ${analysis.content?.wordCount || 0} words`,
      'text_html_ratio': `Text-to-HTML ratio is only ${analysis.content?.textToHtmlRatio || 0}%`,
      'internal_links': `Page has only ${analysis.content?.internalLinks || 0} internal links`,
      'heading_structure': 'Heading hierarchy structure is unreasonable',
      'page_size': `Page size is ${Math.round((analysis.performance?.pageSize || 0) / 1024)}KB`,
      'load_time': `Page load time is ${Math.round(analysis.performance?.loadTime || 0)} seconds`,
      'https_usage': 'Website is not using HTTPS protocol',
      'image_optimization': 'Image optimization is insufficient',
      'open_graph': 'Page is missing Open Graph tags',
      'robots_meta': 'Page is missing Robots Meta tag',
      'lang_attribute': 'HTML tag is missing lang attribute',
      'external_links': `External links count is ${analysis.content?.externalLinks || 0}`,
      'keyword_density': 'Possible keyword stuffing detected'
    };
    
    return descriptions[ruleId] || 'SEO issue that needs attention';
  }

  getRecommendation(ruleId) {
    const recommendations = {
      'title_exists': 'Add <title> tag: <title>Page Title - Site Name</title>',
      'title_length': 'Adjust title length to 30-60 characters to ensure complete display in search results',
      'meta_description_exists': 'Add Meta description: <meta name="description" content="120-160 character page description">',
      'meta_description_length': 'Adjust Meta description length to 120-160 characters',
      'h1_exists': 'Add H1 title: <h1>Page Main Title</h1>',
      'h1_unique': 'Ensure page has only one H1 title, change others to H2 or H3',
      'canonical_url': 'Add Canonical tag: <link rel="canonical" href="Page URL">',
      'mobile_friendly': 'Add viewport tag: <meta name="viewport" content="width=device-width, initial-scale=1">',
      'images_alt': 'Add Alt attributes to images: <img src="..." alt="Image description">',
      'content_length': 'Increase page content to over 300 words, provide more valuable information',
      'text_html_ratio': 'Increase text content, reduce unnecessary HTML code',
      'internal_links': 'Add 3-5 relevant internal links to boost page authority',
      'heading_structure': 'Establish clear heading hierarchy: H1→H2→H3',
      'page_size': 'Compress images and code, reduce page size to under 2MB',
      'load_time': 'Optimize images, compress code, use CDN to improve loading speed',
      'https_usage': 'Enable SSL certificate, use HTTPS protocol',
      'image_optimization': 'Compress images, use modern formats, add alt attributes',
      'open_graph': 'Add Open Graph tags: <meta property="og:title" content="Page Title">',
      'robots_meta': 'Add robots tag: <meta name="robots" content="index,follow">',
      'lang_attribute': 'Add language attribute to HTML tag: <html lang="en">',
      'external_links': 'Add 1-5 high-quality external links appropriately',
      'keyword_density': 'Reduce keyword repetition, use synonyms and related words'
    };
    
    return recommendations[ruleId] || 'Meets SEO standards';
  }

  getIssueLocation(ruleId) {
    const locations = {
      'title_exists': '<head> section',
      'title_length': '<title> tag',
      'meta_description_exists': '<head> section',
      'h1_exists': 'Page content area',
      'images_alt': 'Page images',
      'content_length': 'Main page content',
      'page_size': 'Entire page'
    };
    
    return locations[ruleId] || 'In page';
  }

  getCurrentValue(ruleId, analysis) {
    const currentValues = {
      'title_exists': 'No title',
      'title_length': `${analysis.metaTags?.title?.length || 0} characters`,
      'meta_description_exists': 'No description',
      'meta_description_length': `${analysis.metaTags?.description?.length || 0} characters`,
      'h1_exists': 'No H1 title',
      'h1_unique': `${analysis.headings?.h1?.length || 0} H1s`,
      'canonical_url': 'No Canonical tag',
      'mobile_friendly': analysis.metaTags?.viewport || 'No viewport setting',
      'images_alt': `${analysis.images?.imagesWithoutAlt || 0} missing Alt`,
      'content_length': `${analysis.content?.wordCount || 0} words`,
      'text_html_ratio': `${analysis.content?.textToHtmlRatio || 0}%`,
      'internal_links': `${analysis.content?.internalLinks || 0} internal links`,
      'heading_structure': 'Heading structure info',
      'page_size': `${Math.round((analysis.performance?.pageSize || 0) / 1024)}KB`,
      'load_time': `${Math.round(analysis.performance?.loadTime || 0)} seconds`,
      'https_usage': 'HTTP protocol',
      'image_optimization': `${analysis.images?.totalImages || 0} images need optimization`,
      'open_graph': 'No OG tags',
      'robots_meta': 'No Robots directive',
      'lang_attribute': 'No lang attribute',
      'external_links': `${analysis.content?.externalLinks || 0} external links`,
      'keyword_density': 'Keyword density info'
    };
    
    return currentValues[ruleId] || 'Unknown';
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
    const expectedValues = {
      'title_exists': '30-60 character title',
      'title_length': '30-60 characters',
      'meta_description_exists': '120-160 character description',
      'h1_exists': '1 H1 title',
      'images_alt': 'All images have Alt',
      'content_length': 'At least 300 words',
      'page_size': 'Less than 2MB'
    };
    
    return expectedValues[ruleId] || 'Meets SEO standards';
  }

  getImpact(ruleId) {
    const impacts = {
      'title_exists': 'Seriously affects search ranking',
      'title_length': 'Affects search result display',
      'meta_description_exists': 'Affects click-through rate',
      'meta_description_length': 'Too long descriptions get truncated, too short ones are not attractive enough',
      'h1_exists': 'Affects content structure',
      'h1_unique': 'Multiple H1s scatter page theme focus',
      'canonical_url': 'May cause duplicate content issues',
      'mobile_friendly': 'Affects mobile user experience and ranking',
      'open_graph': 'Affects social media sharing effectiveness',
      'robots_meta': 'Cannot precisely control search engine behavior',
      'lang_attribute': 'Affects search engine understanding of page language',
      'images_alt': 'Affects accessibility',
      'content_length': 'Affects search ranking',
      'text_html_ratio': 'Affects content quality assessment',
      'internal_links': 'Affects internal site authority transfer',
      'heading_structure': 'Affects content readability and SEO effectiveness',
      'external_links': 'Affects page authority assessment',
      'keyword_density': 'May be penalized by search engines',
      'page_size': 'Affects loading speed',
      'load_time': 'Affects user experience and search ranking',
      'https_usage': 'Affects website security and search ranking',
      'image_optimization': 'Affects page loading speed'
    };
    
    return impacts[ruleId] || 'May affect SEO performance';
  }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedSEORules;
} else if (typeof window !== 'undefined') {
  window.EnhancedSEORules = EnhancedSEORules;
}