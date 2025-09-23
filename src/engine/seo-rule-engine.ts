// SEO Rule Engine - Main orchestrator for SEO analysis and scoring

import { PageAnalysis } from '../../types/analysis';
import { 
  SEOReport, 
  SEOScore, 
  SEOIssue, 
  TechnicalSEOResult, 
  ContentQualityResult, 
  PerformanceResult,
  AISuggestions 
} from '../../types/seo';
import { SEORuleRegistry, RuleResult } from './seo-rules';
import { SEOScoringAlgorithm, CategoryScores } from './scoring-algorithm';

export interface SEORuleEngineOptions {
  enableAISuggestions?: boolean;
  customRules?: any[];
  scoringOptions?: any;
}

export class SEORuleEngine {
  private ruleRegistry: SEORuleRegistry;
  private scoringAlgorithm: SEOScoringAlgorithm;
  private options: SEORuleEngineOptions;

  constructor(options: SEORuleEngineOptions = {}) {
    this.options = {
      enableAISuggestions: true,
      ...options
    };

    this.ruleRegistry = new SEORuleRegistry();
    this.scoringAlgorithm = new SEOScoringAlgorithm(
      this.ruleRegistry, 
      options.scoringOptions
    );

    // Register custom rules if provided
    if (options.customRules) {
      options.customRules.forEach(rule => this.ruleRegistry.registerRule(rule));
    }
  }

  /**
   * Evaluate analysis and return scores and issues
   */
  evaluateAnalysis(analysis: PageAnalysis): { score: SEOScore; issues: SEOIssue[] } {
    const categoryScores = this.scoringAlgorithm.calculateCategoryScores(analysis);
    const score = this.scoringAlgorithm.calculateSEOScore(analysis);
    const issues = this.scoringAlgorithm.generateSEOIssues(categoryScores);

    return { score, issues };
  }

  /**
   * Perform comprehensive SEO analysis on a page
   */
  async analyzePage(analysis: PageAnalysis, aiSuggestions?: AISuggestions): Promise<SEOReport> {
    // Generate unique report ID
    const reportId = this.generateReportId(analysis.url);

    // Calculate scores and get detailed results
    const categoryScores = this.scoringAlgorithm.calculateCategoryScores(analysis);
    const score = this.scoringAlgorithm.calculateSEOScore(analysis);
    const issues = this.scoringAlgorithm.generateSEOIssues(categoryScores);

    // Generate detailed results for each category
    const technicalResults = this.generateTechnicalResults(analysis, categoryScores.technical);
    const contentResults = this.generateContentResults(analysis, categoryScores.content);
    const performanceResults = this.generatePerformanceResults(analysis, categoryScores.performance);

    // Create comprehensive SEO report
    const report: SEOReport = {
      id: reportId,
      url: analysis.url,
      timestamp: new Date(),
      score,
      issues,
      suggestions: aiSuggestions || this.generateBasicSuggestions(analysis, issues),
      technicalResults,
      contentResults,
      performanceResults
    };

    return report;
  }

  /**
   * Check technical SEO aspects
   */
  checkTechnicalSEO(analysis: PageAnalysis): TechnicalSEOResult {
    const technicalRules = this.ruleRegistry.getRulesByCategory('technical');
    const results: RuleResult[] = [];

    for (const rule of technicalRules) {
      results.push(rule.check(analysis));
    }

    return {
      metaTags: {
        hasTitle: !!analysis.metaTags.title,
        titleLength: analysis.metaTags.title?.length || 0,
        hasDescription: !!analysis.metaTags.description,
        descriptionLength: analysis.metaTags.description?.length || 0,
        hasKeywords: !!analysis.metaTags.keywords,
        hasOpenGraph: Object.keys(analysis.metaTags.ogTags).length > 0,
        hasTwitterCards: Object.keys(analysis.metaTags.twitterTags).length > 0
      },
      headingStructure: {
        hasH1: analysis.headings.h1.length > 0,
        h1Count: analysis.headings.h1.length,
        headingHierarchy: this.checkHeadingHierarchy(analysis.headings),
        headingDistribution: {
          h1: analysis.headings.h1.length,
          h2: analysis.headings.h2.length,
          h3: analysis.headings.h3.length,
          h4: analysis.headings.h4.length,
          h5: analysis.headings.h5.length,
          h6: analysis.headings.h6.length
        }
      },
      internalLinks: {
        internalLinksCount: analysis.content.internalLinks,
        externalLinksCount: analysis.content.externalLinks,
        brokenLinksCount: 0, // Would need additional analysis
        noFollowLinksCount: 0 // Would need additional analysis
      },
      canonicalUrl: {
        hasCanonical: !!analysis.metaTags.canonical,
        canonicalUrl: analysis.metaTags.canonical,
        isValid: this.validateCanonicalUrl(analysis.metaTags.canonical, analysis.url)
      },
      robotsTxt: {
        hasRobotsMeta: !!analysis.metaTags.robots,
        robotsDirectives: analysis.metaTags.robots ? analysis.metaTags.robots.split(',').map(d => d.trim()) : [],
        isIndexable: !analysis.metaTags.robots?.includes('noindex')
      }
    };
  }

  /**
   * Check content quality aspects
   */
  checkContentQuality(analysis: PageAnalysis): ContentQualityResult {
    const contentRules = this.ruleRegistry.getRulesByCategory('content');
    const results: RuleResult[] = [];

    for (const rule of contentRules) {
      results.push(rule.check(analysis));
    }

    return {
      wordCount: analysis.content.wordCount,
      readabilityScore: analysis.content.readabilityScore,
      keywordDensity: analysis.content.keywordDensity,
      contentStructure: {
        hasParagraphs: analysis.content.paragraphCount > 0,
        hasLists: analysis.content.listCount > 0,
        hasImages: analysis.images.totalImages > 0,
        textToHtmlRatio: analysis.content.textToHtmlRatio
      },
      duplicateContent: {
        hasDuplicateTitle: false, // Would need cross-page analysis
        hasDuplicateDescription: false, // Would need cross-page analysis
        duplicateContentPercentage: 0 // Would need additional analysis
      }
    };
  }

  /**
   * Check performance aspects
   */
  checkPerformance(analysis: PageAnalysis): PerformanceResult {
    const performanceRules = this.ruleRegistry.getRulesByCategory('performance');
    const results: RuleResult[] = [];

    for (const rule of performanceRules) {
      results.push(rule.check(analysis));
    }

    return {
      pageSize: analysis.performance.pageSize,
      loadTime: analysis.performance.loadTime,
      imageOptimization: {
        totalImages: analysis.images.totalImages,
        imagesWithoutAlt: analysis.images.imagesWithoutAlt,
        oversizedImages: analysis.images.largeImages.length,
        unoptimizedFormats: this.countUnoptimizedImageFormats(analysis.images.imageFormats)
      },
      coreWebVitals: {
        lcp: analysis.performance.largestContentfulPaint,
        fid: analysis.performance.firstInputDelay,
        cls: analysis.performance.cumulativeLayoutShift
      }
    };
  }

  /**
   * Calculate overall SEO score
   */
  calculateOverallScore(results: {
    technical: TechnicalSEOResult;
    content: ContentQualityResult;
    performance: PerformanceResult;
  }): number {
    // This would use the scoring algorithm with the actual results
    // For now, return a placeholder implementation
    return 75; // Placeholder
  }

  /**
   * Get all available SEO rules
   */
  getAvailableRules() {
    return this.ruleRegistry.getAllRules();
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: 'technical' | 'content' | 'performance') {
    return this.ruleRegistry.getRulesByCategory(category);
  }

  /**
   * Add custom SEO rule
   */
  addCustomRule(rule: any) {
    this.ruleRegistry.registerRule(rule);
  }

  /**
   * Generate performance summary
   */
  generatePerformanceSummary(analysis: PageAnalysis) {
    return this.scoringAlgorithm.generateScoreSummary(analysis);
  }

  // Private helper methods

  private generateReportId(url: string): string {
    const timestamp = Date.now();
    const urlHash = this.simpleHash(url);
    return `seo-report-${urlHash}-${timestamp}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private generateTechnicalResults(
    analysis: PageAnalysis, 
    categoryScore: any
  ): TechnicalSEOResult {
    return this.checkTechnicalSEO(analysis);
  }

  private generateContentResults(
    analysis: PageAnalysis, 
    categoryScore: any
  ): ContentQualityResult {
    return this.checkContentQuality(analysis);
  }

  private generatePerformanceResults(
    analysis: PageAnalysis, 
    categoryScore: any
  ): PerformanceResult {
    return this.checkPerformance(analysis);
  }

  private generateBasicSuggestions(
    analysis: PageAnalysis, 
    issues: SEOIssue[]
  ): AISuggestions {
    // Generate basic suggestions based on detected issues
    const suggestions: AISuggestions = {
      titleOptimization: '',
      metaDescriptionSuggestion: '',
      contentImprovements: [],
      keywordSuggestions: [],
      structureRecommendations: []
    };

    // Title optimization
    if (!analysis.metaTags.title) {
      suggestions.titleOptimization = 'Add a descriptive title tag that includes your main keywords';
    } else if (analysis.metaTags.title.length < 30) {
      suggestions.titleOptimization = 'Expand your title tag to be more descriptive (30-60 characters)';
    } else if (analysis.metaTags.title.length > 60) {
      suggestions.titleOptimization = 'Shorten your title tag to under 60 characters for better display';
    }

    // Meta description
    if (!analysis.metaTags.description) {
      suggestions.metaDescriptionSuggestion = 'Add a compelling meta description to improve click-through rates';
    } else if (analysis.metaTags.description.length < 120) {
      suggestions.metaDescriptionSuggestion = 'Expand your meta description to be more compelling (120-160 characters)';
    }

    // Content improvements
    if (analysis.content.wordCount < 300) {
      suggestions.contentImprovements.push('Increase content length to at least 300 words for better SEO');
    }

    if (analysis.headings.h1.length === 0) {
      suggestions.structureRecommendations.push('Add an H1 tag to define the main topic of your page');
    }

    if (analysis.images.imagesWithoutAlt > 0) {
      suggestions.contentImprovements.push('Add alt text to all images for better accessibility and SEO');
    }

    return suggestions;
  }

  private checkHeadingHierarchy(headings: any): boolean {
    // Check if heading hierarchy is proper (H1 -> H2 -> H3, etc.)
    const hasH1 = headings.h1.length > 0;
    const hasH2 = headings.h2.length > 0;
    const hasH3 = headings.h3.length > 0;
    const hasH4 = headings.h4.length > 0;

    // If there's H3 but no H2, hierarchy is broken
    if (hasH3 && !hasH2) return false;
    
    // If there's H4 but no H3, hierarchy is broken
    if (hasH4 && !hasH3) return false;

    return true;
  }

  private validateCanonicalUrl(canonical: string | undefined, pageUrl: string): boolean {
    if (!canonical) return false;

    try {
      const canonicalUrl = new URL(canonical);
      const currentUrl = new URL(pageUrl);
      
      // Canonical should point to same domain
      return canonicalUrl.hostname === currentUrl.hostname;
    } catch {
      return false;
    }
  }

  private countUnoptimizedImageFormats(imageFormats: Record<string, number>): number {
    // Count images in unoptimized formats (e.g., BMP, uncompressed formats)
    const unoptimizedFormats = ['bmp', 'tiff', 'tif'];
    let count = 0;

    for (const [format, quantity] of Object.entries(imageFormats)) {
      if (unoptimizedFormats.includes(format.toLowerCase())) {
        count += quantity;
      }
    }

    return count;
  }
}