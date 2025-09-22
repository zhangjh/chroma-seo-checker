// SEO Scoring Algorithm - Calculates overall and category-specific SEO scores

import { PageAnalysis } from '../../types/analysis';
import { SEOScore, SEOIssue } from '../../types/seo';
import { SEORuleRegistry, RuleResult } from './seo-rules';

export interface CategoryScores {
  technical: CategoryScore;
  content: CategoryScore;
  performance: CategoryScore;
}

export interface CategoryScore {
  score: number;
  maxScore: number;
  weight: number;
  results: RuleResult[];
}

export interface ScoringOptions {
  penaltyMultiplier?: number; // Multiplier for critical issues
  bonusThreshold?: number; // Score threshold for bonus points
  bonusMultiplier?: number; // Bonus multiplier for excellent scores
}

export class SEOScoringAlgorithm {
  private ruleRegistry: SEORuleRegistry;
  private options: ScoringOptions;

  constructor(ruleRegistry?: SEORuleRegistry, options?: ScoringOptions) {
    this.ruleRegistry = ruleRegistry || new SEORuleRegistry();
    this.options = {
      penaltyMultiplier: 0.8, // 20% penalty for critical issues
      bonusThreshold: 90,     // Bonus for scores above 90
      bonusMultiplier: 1.1,   // 10% bonus
      ...options
    };
  }

  /**
   * Calculate comprehensive SEO score for a page analysis
   */
  calculateSEOScore(analysis: PageAnalysis): SEOScore {
    const categoryScores = this.calculateCategoryScores(analysis);
    const overallScore = this.calculateOverallScore(categoryScores);

    return {
      overall: Math.round(overallScore),
      technical: Math.round(categoryScores.technical.score),
      content: Math.round(categoryScores.content.score),
      performance: Math.round(categoryScores.performance.score),
      timestamp: new Date()
    };
  }

  /**
   * Calculate scores for each SEO category
   */
  calculateCategoryScores(analysis: PageAnalysis): CategoryScores {
    const categories = ['technical', 'content', 'performance'] as const;
    const categoryScores = {} as CategoryScores;

    for (const category of categories) {
      const rules = this.ruleRegistry.getRulesByCategory(category);
      const results: RuleResult[] = [];
      let totalScore = 0;
      let totalWeight = 0;

      for (const rule of rules) {
        const result = rule.check(analysis);
        results.push(result);
        
        // Apply penalty for critical issues
        let adjustedScore = result.score;
        if (result.severity === 'critical' && !result.passed) {
          adjustedScore *= this.options.penaltyMultiplier!;
        }

        totalScore += adjustedScore * rule.weight;
        totalWeight += rule.weight;
      }

      // Calculate weighted average
      let categoryScore = totalWeight > 0 ? totalScore / totalWeight : 0;

      // Apply bonus for excellent performance
      if (categoryScore >= this.options.bonusThreshold!) {
        categoryScore *= this.options.bonusMultiplier!;
      }

      // Ensure score doesn't exceed 100
      categoryScore = Math.min(categoryScore, 100);

      categoryScores[category] = {
        score: categoryScore,
        maxScore: 100,
        weight: totalWeight,
        results
      };
    }

    return categoryScores;
  }

  /**
   * Calculate overall SEO score from category scores
   */
  calculateOverallScore(categoryScores: CategoryScores): number {
    // Define category importance weights
    const categoryWeights = {
      technical: 0.4,   // Technical SEO is most important
      content: 0.35,    // Content quality is very important
      performance: 0.25 // Performance is important but less critical
    };

    const weightedScore = 
      (categoryScores.technical.score * categoryWeights.technical) +
      (categoryScores.content.score * categoryWeights.content) +
      (categoryScores.performance.score * categoryWeights.performance);

    return Math.min(weightedScore, 100);
  }

  /**
   * Generate SEO issues from rule results
   */
  generateSEOIssues(categoryScores: CategoryScores): SEOIssue[] {
    const issues: SEOIssue[] = [];
    let issueCounter = 1;

    for (const [category, categoryScore] of Object.entries(categoryScores)) {
      for (const result of categoryScore.results) {
        if (!result.passed) {
          issues.push({
            id: `issue-${issueCounter++}`,
            category: category as 'technical' | 'content' | 'performance',
            severity: result.severity,
            title: result.message,
            description: result.message,
            recommendation: result.recommendation || 'No specific recommendation available',
            element: result.element
          });
        }
      }
    }

    // Sort issues by severity (critical first)
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    issues.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return issues;
  }

  /**
   * Get performance grade based on score
   */
  getPerformanceGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Get score interpretation
   */
  getScoreInterpretation(score: number): string {
    if (score >= 90) return 'Excellent SEO optimization';
    if (score >= 80) return 'Good SEO with minor improvements needed';
    if (score >= 70) return 'Decent SEO with some issues to address';
    if (score >= 60) return 'Poor SEO requiring significant improvements';
    return 'Critical SEO issues requiring immediate attention';
  }

  /**
   * Calculate improvement potential
   */
  calculateImprovementPotential(categoryScores: CategoryScores): {
    category: string;
    currentScore: number;
    potentialScore: number;
    impact: number;
  }[] {
    const improvements = [];

    for (const [category, categoryScore] of Object.entries(categoryScores)) {
      // Calculate potential score if all failed rules were fixed
      let potentialScore = 0;
      let totalWeight = 0;

      for (const result of categoryScore.results) {
        const rule = this.ruleRegistry.getRulesByCategory(category as any)
          .find(r => r.name === result.message.split(' ')[0]); // Simple matching
        
        if (rule) {
          potentialScore += 100 * rule.weight; // Assume perfect score if fixed
          totalWeight += rule.weight;
        }
      }

      if (totalWeight > 0) {
        potentialScore = potentialScore / totalWeight;
        const impact = potentialScore - categoryScore.score;

        if (impact > 5) { // Only include significant improvements
          improvements.push({
            category,
            currentScore: categoryScore.score,
            potentialScore: Math.min(potentialScore, 100),
            impact
          });
        }
      }
    }

    // Sort by impact (highest first)
    improvements.sort((a, b) => b.impact - a.impact);
    return improvements;
  }

  /**
   * Generate score summary statistics
   */
  generateScoreSummary(analysis: PageAnalysis): {
    score: SEOScore;
    grade: string;
    interpretation: string;
    categoryScores: CategoryScores;
    issues: SEOIssue[];
    improvements: any[];
    totalIssues: number;
    criticalIssues: number;
  } {
    const categoryScores = this.calculateCategoryScores(analysis);
    const score = this.calculateSEOScore(analysis);
    const issues = this.generateSEOIssues(categoryScores);
    const improvements = this.calculateImprovementPotential(categoryScores);

    return {
      score,
      grade: this.getPerformanceGrade(score.overall),
      interpretation: this.getScoreInterpretation(score.overall),
      categoryScores,
      issues,
      improvements,
      totalIssues: issues.length,
      criticalIssues: issues.filter(issue => issue.severity === 'critical').length
    };
  }
}