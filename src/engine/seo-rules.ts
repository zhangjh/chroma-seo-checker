// SEO Rules Engine - Defines and implements SEO checking rules

import { PageAnalysis } from '../../types/analysis';
import { SEOIssue } from '../../types/seo';

// Base SEO Rule interface
export interface SEORule {
  id: string;
  name: string;
  category: 'technical' | 'content' | 'performance';
  weight: number; // 0-1, importance weight for scoring
  check(analysis: PageAnalysis): RuleResult;
}

// Rule execution result
export interface RuleResult {
  passed: boolean;
  score: number; // 0-100
  message: string;
  recommendation?: string;
  element?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Technical SEO Rules
export class TitleTagRule implements SEORule {
  id = 'title-tag';
  name = 'Title Tag Optimization';
  category = 'technical' as const;
  weight = 0.15;

  check(analysis: PageAnalysis): RuleResult {
    const title = analysis.metaTags.title;
    
    if (!title) {
      return {
        passed: false,
        score: 0,
        message: 'Missing title tag',
        recommendation: 'Add a descriptive title tag to your page',
        element: 'head > title',
        severity: 'critical'
      };
    }

    if (title.length < 10) {
      return {
        passed: false,
        score: 30,
        message: 'Title tag is too short',
        recommendation: 'Title should be at least 10 characters long',
        element: 'head > title',
        severity: 'high'
      };
    }

    if (title.length > 60) {
      return {
        passed: false,
        score: 70,
        message: 'Title tag is too long',
        recommendation: 'Keep title under 60 characters for better display in search results',
        element: 'head > title',
        severity: 'medium'
      };
    }

    return {
      passed: true,
      score: 100,
      message: 'Title tag is properly optimized',
      severity: 'low'
    };
  }
}

export class MetaDescriptionRule implements SEORule {
  id = 'meta-description';
  name = 'Meta Description Optimization';
  category = 'technical' as const;
  weight = 0.12;

  check(analysis: PageAnalysis): RuleResult {
    const description = analysis.metaTags.description;
    
    if (!description) {
      return {
        passed: false,
        score: 0,
        message: 'Missing meta description',
        recommendation: 'Add a compelling meta description to improve click-through rates',
        element: 'head > meta[name="description"]',
        severity: 'high'
      };
    }

    if (description.length < 50) {
      return {
        passed: false,
        score: 40,
        message: 'Meta description is too short',
        recommendation: 'Meta description should be at least 50 characters long',
        element: 'head > meta[name="description"]',
        severity: 'medium'
      };
    }

    if (description.length > 160) {
      return {
        passed: false,
        score: 70,
        message: 'Meta description is too long',
        recommendation: 'Keep meta description under 160 characters to avoid truncation',
        element: 'head > meta[name="description"]',
        severity: 'medium'
      };
    }

    return {
      passed: true,
      score: 100,
      message: 'Meta description is properly optimized',
      severity: 'low'
    };
  }
}

export class HeadingStructureRule implements SEORule {
  id = 'heading-structure';
  name = 'Heading Structure';
  category = 'technical' as const;
  weight = 0.10;

  check(analysis: PageAnalysis): RuleResult {
    const headings = analysis.headings;
    
    if (headings.h1.length === 0) {
      return {
        passed: false,
        score: 0,
        message: 'Missing H1 tag',
        recommendation: 'Add exactly one H1 tag to define the main topic of the page',
        element: 'h1',
        severity: 'critical'
      };
    }

    if (headings.h1.length > 1) {
      return {
        passed: false,
        score: 60,
        message: 'Multiple H1 tags found',
        recommendation: 'Use only one H1 tag per page for better SEO',
        element: 'h1',
        severity: 'medium'
      };
    }

    // Check for proper hierarchy
    const hasH2 = headings.h2.length > 0;
    const hasH3 = headings.h3.length > 0;
    const hasH4 = headings.h4.length > 0;

    if (hasH3 && !hasH2) {
      return {
        passed: false,
        score: 70,
        message: 'Improper heading hierarchy',
        recommendation: 'Use H2 tags before H3 tags to maintain proper hierarchy',
        element: 'h2, h3',
        severity: 'medium'
      };
    }

    if (hasH4 && !hasH3) {
      return {
        passed: false,
        score: 80,
        message: 'Improper heading hierarchy',
        recommendation: 'Use H3 tags before H4 tags to maintain proper hierarchy',
        element: 'h3, h4',
        severity: 'low'
      };
    }

    return {
      passed: true,
      score: 100,
      message: 'Heading structure is properly organized',
      severity: 'low'
    };
  }
}

export class CanonicalUrlRule implements SEORule {
  id = 'canonical-url';
  name = 'Canonical URL';
  category = 'technical' as const;
  weight = 0.08;

  check(analysis: PageAnalysis): RuleResult {
    const canonical = analysis.metaTags.canonical;
    
    if (!canonical) {
      return {
        passed: false,
        score: 70,
        message: 'Missing canonical URL',
        recommendation: 'Add a canonical URL to prevent duplicate content issues',
        element: 'head > link[rel="canonical"]',
        severity: 'medium'
      };
    }

    try {
      const canonicalUrl = new URL(canonical);
      const pageUrl = new URL(analysis.url);
      
      if (canonicalUrl.hostname !== pageUrl.hostname) {
        return {
          passed: false,
          score: 50,
          message: 'Canonical URL points to different domain',
          recommendation: 'Ensure canonical URL points to the same domain',
          element: 'head > link[rel="canonical"]',
          severity: 'high'
        };
      }
    } catch {
      return {
        passed: false,
        score: 30,
        message: 'Invalid canonical URL format',
        recommendation: 'Ensure canonical URL is a valid, absolute URL',
        element: 'head > link[rel="canonical"]',
        severity: 'high'
      };
    }

    return {
      passed: true,
      score: 100,
      message: 'Canonical URL is properly configured',
      severity: 'low'
    };
  }
}

// Content Quality Rules
export class ContentLengthRule implements SEORule {
  id = 'content-length';
  name = 'Content Length';
  category = 'content' as const;
  weight = 0.12;

  check(analysis: PageAnalysis): RuleResult {
    const wordCount = analysis.content.wordCount;
    
    if (wordCount < 100) {
      return {
        passed: false,
        score: 20,
        message: 'Content is too short',
        recommendation: 'Add more valuable content. Aim for at least 300 words',
        severity: 'high'
      };
    }

    if (wordCount < 300) {
      return {
        passed: false,
        score: 60,
        message: 'Content length is below recommended minimum',
        recommendation: 'Consider adding more detailed content to reach 300+ words',
        severity: 'medium'
      };
    }

    if (wordCount > 2000) {
      return {
        passed: true,
        score: 100,
        message: 'Excellent content length for comprehensive coverage',
        severity: 'low'
      };
    }

    return {
      passed: true,
      score: 85,
      message: 'Good content length',
      severity: 'low'
    };
  }
}

export class KeywordDensityRule implements SEORule {
  id = 'keyword-density';
  name = 'Keyword Density';
  category = 'content' as const;
  weight = 0.08;

  check(analysis: PageAnalysis): RuleResult {
    const keywordDensity = analysis.content.keywordDensity;
    const issues: string[] = [];
    let maxDensity = 0;
    let overOptimizedKeywords: string[] = [];

    for (const [keyword, density] of Object.entries(keywordDensity)) {
      maxDensity = Math.max(maxDensity, density);
      if (density > 0.05) { // 5% threshold
        overOptimizedKeywords.push(keyword);
      }
    }

    if (overOptimizedKeywords.length > 0) {
      return {
        passed: false,
        score: 60,
        message: `High keyword density detected for: ${overOptimizedKeywords.join(', ')}`,
        recommendation: 'Reduce keyword density to under 5% to avoid over-optimization',
        severity: 'medium'
      };
    }

    if (Object.keys(keywordDensity).length === 0) {
      return {
        passed: false,
        score: 40,
        message: 'No target keywords identified',
        recommendation: 'Include relevant keywords naturally in your content',
        severity: 'medium'
      };
    }

    return {
      passed: true,
      score: 100,
      message: 'Keyword density is well balanced',
      severity: 'low'
    };
  }
}

export class InternalLinkingRule implements SEORule {
  id = 'internal-linking';
  name = 'Internal Linking';
  category = 'content' as const;
  weight = 0.06;

  check(analysis: PageAnalysis): RuleResult {
    const internalLinks = analysis.content.internalLinks;
    
    if (internalLinks === 0) {
      return {
        passed: false,
        score: 40,
        message: 'No internal links found',
        recommendation: 'Add internal links to related pages to improve site navigation and SEO',
        severity: 'medium'
      };
    }

    if (internalLinks < 3) {
      return {
        passed: false,
        score: 70,
        message: 'Few internal links',
        recommendation: 'Consider adding more internal links to relevant pages',
        severity: 'low'
      };
    }

    if (internalLinks > 20) {
      return {
        passed: false,
        score: 80,
        message: 'Many internal links',
        recommendation: 'Consider reducing internal links to focus on most important pages',
        severity: 'low'
      };
    }

    return {
      passed: true,
      score: 100,
      message: 'Good internal linking structure',
      severity: 'low'
    };
  }
}

// Performance Rules
export class PageSizeRule implements SEORule {
  id = 'page-size';
  name = 'Page Size';
  category = 'performance' as const;
  weight = 0.10;

  check(analysis: PageAnalysis): RuleResult {
    const pageSize = analysis.performance.pageSize;
    const pageSizeMB = pageSize / (1024 * 1024);
    
    if (pageSizeMB > 5) {
      return {
        passed: false,
        score: 30,
        message: `Page size is very large (${pageSizeMB.toFixed(1)}MB)`,
        recommendation: 'Optimize images, minify CSS/JS, and remove unnecessary resources',
        severity: 'high'
      };
    }

    if (pageSizeMB > 3) {
      return {
        passed: false,
        score: 60,
        message: `Page size is large (${pageSizeMB.toFixed(1)}MB)`,
        recommendation: 'Consider optimizing resources to improve loading speed',
        severity: 'medium'
      };
    }

    if (pageSizeMB > 1.5) {
      return {
        passed: false,
        score: 80,
        message: `Page size is moderate (${pageSizeMB.toFixed(1)}MB)`,
        recommendation: 'Good page size, but there\'s room for optimization',
        severity: 'low'
      };
    }

    return {
      passed: true,
      score: 100,
      message: `Excellent page size (${pageSizeMB.toFixed(1)}MB)`,
      severity: 'low'
    };
  }
}

export class ImageOptimizationRule implements SEORule {
  id = 'image-optimization';
  name = 'Image Optimization';
  category = 'performance' as const;
  weight = 0.08;

  check(analysis: PageAnalysis): RuleResult {
    const images = analysis.images;
    
    if (images.totalImages === 0) {
      return {
        passed: true,
        score: 100,
        message: 'No images to optimize',
        severity: 'low'
      };
    }

    const missingAltPercentage = (images.imagesWithoutAlt / images.totalImages) * 100;
    
    if (missingAltPercentage > 50) {
      return {
        passed: false,
        score: 30,
        message: `${missingAltPercentage.toFixed(0)}% of images missing alt text`,
        recommendation: 'Add descriptive alt text to all images for accessibility and SEO',
        element: 'img[alt=""], img:not([alt])',
        severity: 'high'
      };
    }

    if (missingAltPercentage > 20) {
      return {
        passed: false,
        score: 70,
        message: `${missingAltPercentage.toFixed(0)}% of images missing alt text`,
        recommendation: 'Add alt text to remaining images',
        element: 'img[alt=""], img:not([alt])',
        severity: 'medium'
      };
    }

    if (missingAltPercentage > 0) {
      return {
        passed: false,
        score: 85,
        message: `${missingAltPercentage.toFixed(0)}% of images missing alt text`,
        recommendation: 'Add alt text to all images for best practices',
        element: 'img[alt=""], img:not([alt])',
        severity: 'low'
      };
    }

    return {
      passed: true,
      score: 100,
      message: 'All images have proper alt text',
      severity: 'low'
    };
  }
}

// Rule Registry - Contains all available SEO rules
export class SEORuleRegistry {
  private rules: Map<string, SEORule> = new Map();

  constructor() {
    this.registerDefaultRules();
  }

  private registerDefaultRules(): void {
    const defaultRules = [
      new TitleTagRule(),
      new MetaDescriptionRule(),
      new HeadingStructureRule(),
      new CanonicalUrlRule(),
      new ContentLengthRule(),
      new KeywordDensityRule(),
      new InternalLinkingRule(),
      new PageSizeRule(),
      new ImageOptimizationRule()
    ];

    defaultRules.forEach(rule => this.registerRule(rule));
  }

  registerRule(rule: SEORule): void {
    this.rules.set(rule.id, rule);
  }

  getRule(id: string): SEORule | undefined {
    return this.rules.get(id);
  }

  getAllRules(): SEORule[] {
    return Array.from(this.rules.values());
  }

  getRulesByCategory(category: 'technical' | 'content' | 'performance'): SEORule[] {
    return this.getAllRules().filter(rule => rule.category === category);
  }

  getTotalWeight(): number {
    return this.getAllRules().reduce((total, rule) => total + rule.weight, 0);
  }
}