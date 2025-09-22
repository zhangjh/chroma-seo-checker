// Data validation utilities for SEO data models

import { 
  SEOReport, 
  SEOIssue, 
  SEOScore, 
  AISuggestions,
  TechnicalSEOResult,
  ContentQualityResult,
  PerformanceResult
} from '../../types/seo';
import { 
  PageAnalysis, 
  MetaTagsData, 
  HeadingStructure, 
  ContentAnalysis, 
  ImageAnalysis,
  PerformanceMetrics
} from '../../types/analysis';

// Validation result interface
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// SEO Score validation
export function validateSEOScore(score: SEOScore): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check score ranges (0-100)
  if (score.overall < 0 || score.overall > 100) {
    errors.push('Overall score must be between 0 and 100');
  }
  if (score.technical < 0 || score.technical > 100) {
    errors.push('Technical score must be between 0 and 100');
  }
  if (score.content < 0 || score.content > 100) {
    errors.push('Content score must be between 0 and 100');
  }
  if (score.performance < 0 || score.performance > 100) {
    errors.push('Performance score must be between 0 and 100');
  }

  // Check timestamp
  if (!score.timestamp || !(score.timestamp instanceof Date)) {
    errors.push('Valid timestamp is required');
  } else if (score.timestamp > new Date()) {
    warnings.push('Timestamp is in the future');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// SEO Issue validation
export function validateSEOIssue(issue: SEOIssue): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!issue.id || typeof issue.id !== 'string') {
    errors.push('Issue ID is required and must be a string');
  }
  if (!issue.title || typeof issue.title !== 'string') {
    errors.push('Issue title is required and must be a string');
  }
  if (!issue.description || typeof issue.description !== 'string') {
    errors.push('Issue description is required and must be a string');
  }
  if (!issue.recommendation || typeof issue.recommendation !== 'string') {
    errors.push('Issue recommendation is required and must be a string');
  }

  // Enum validations
  const validCategories = ['technical', 'content', 'performance'];
  if (!validCategories.includes(issue.category)) {
    errors.push(`Issue category must be one of: ${validCategories.join(', ')}`);
  }

  const validSeverities = ['low', 'medium', 'high', 'critical'];
  if (!validSeverities.includes(issue.severity)) {
    errors.push(`Issue severity must be one of: ${validSeverities.join(', ')}`);
  }

  // Optional field validations
  if (issue.element && typeof issue.element !== 'string') {
    errors.push('Element selector must be a string if provided');
  }
  if (issue.aiSuggestion && typeof issue.aiSuggestion !== 'string') {
    errors.push('AI suggestion must be a string if provided');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Page Analysis validation
export function validatePageAnalysis(analysis: PageAnalysis): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!analysis.url || typeof analysis.url !== 'string') {
    errors.push('URL is required and must be a string');
  } else {
    try {
      new URL(analysis.url);
    } catch {
      errors.push('URL must be a valid URL');
    }
  }

  if (!analysis.title || typeof analysis.title !== 'string') {
    errors.push('Title is required and must be a string');
  }

  if (!analysis.timestamp || !(analysis.timestamp instanceof Date)) {
    errors.push('Valid timestamp is required');
  }

  // Validate nested objects
  if (analysis.metaTags) {
    const metaValidation = validateMetaTagsData(analysis.metaTags);
    errors.push(...metaValidation.errors);
    warnings.push(...metaValidation.warnings);
  }

  if (analysis.content) {
    const contentValidation = validateContentAnalysis(analysis.content);
    errors.push(...contentValidation.errors);
    warnings.push(...contentValidation.warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Meta Tags validation
export function validateMetaTagsData(metaTags: MetaTagsData): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check title length
  if (metaTags.title) {
    if (metaTags.title.length > 60) {
      warnings.push('Title is longer than recommended 60 characters');
    }
    if (metaTags.title.length < 10) {
      warnings.push('Title is shorter than recommended 10 characters');
    }
  }

  // Check description length
  if (metaTags.description) {
    if (metaTags.description.length > 160) {
      warnings.push('Meta description is longer than recommended 160 characters');
    }
    if (metaTags.description.length < 50) {
      warnings.push('Meta description is shorter than recommended 50 characters');
    }
  }

  // Validate Open Graph tags
  if (metaTags.ogTags && typeof metaTags.ogTags !== 'object') {
    errors.push('Open Graph tags must be an object');
  }

  // Validate Twitter tags
  if (metaTags.twitterTags && typeof metaTags.twitterTags !== 'object') {
    errors.push('Twitter tags must be an object');
  }

  // Validate structured data
  if (metaTags.structuredData && !Array.isArray(metaTags.structuredData)) {
    errors.push('Structured data must be an array');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Content Analysis validation
export function validateContentAnalysis(content: ContentAnalysis): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate numeric fields
  if (typeof content.wordCount !== 'number' || content.wordCount < 0) {
    errors.push('Word count must be a non-negative number');
  } else if (content.wordCount < 300) {
    warnings.push('Content word count is below recommended 300 words');
  }

  if (typeof content.readabilityScore !== 'number' || content.readabilityScore < 0 || content.readabilityScore > 100) {
    errors.push('Readability score must be a number between 0 and 100');
  }

  if (typeof content.internalLinks !== 'number' || content.internalLinks < 0) {
    errors.push('Internal links count must be a non-negative number');
  }

  if (typeof content.externalLinks !== 'number' || content.externalLinks < 0) {
    errors.push('External links count must be a non-negative number');
  }

  if (typeof content.textToHtmlRatio !== 'number' || content.textToHtmlRatio < 0 || content.textToHtmlRatio > 1) {
    errors.push('Text to HTML ratio must be a number between 0 and 1');
  } else if (content.textToHtmlRatio < 0.15) {
    warnings.push('Text to HTML ratio is below recommended 15%');
  }

  // Validate keyword density
  if (content.keywordDensity && typeof content.keywordDensity !== 'object') {
    errors.push('Keyword density must be an object');
  } else if (content.keywordDensity) {
    for (const [keyword, density] of Object.entries(content.keywordDensity)) {
      if (typeof density !== 'number' || density < 0 || density > 1) {
        errors.push(`Keyword density for "${keyword}" must be a number between 0 and 1`);
      } else if (density > 0.05) {
        warnings.push(`Keyword density for "${keyword}" is above recommended 5%`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// SEO Report validation
export function validateSEOReport(report: SEOReport): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!report.id || typeof report.id !== 'string') {
    errors.push('Report ID is required and must be a string');
  }

  if (!report.url || typeof report.url !== 'string') {
    errors.push('Report URL is required and must be a string');
  } else {
    try {
      new URL(report.url);
    } catch {
      errors.push('Report URL must be a valid URL');
    }
  }

  if (!report.timestamp || !(report.timestamp instanceof Date)) {
    errors.push('Valid timestamp is required');
  }

  // Validate nested objects
  if (report.score) {
    const scoreValidation = validateSEOScore(report.score);
    errors.push(...scoreValidation.errors);
    warnings.push(...scoreValidation.warnings);
  } else {
    errors.push('SEO score is required');
  }

  // Validate issues array
  if (!Array.isArray(report.issues)) {
    errors.push('Issues must be an array');
  } else {
    report.issues.forEach((issue, index) => {
      const issueValidation = validateSEOIssue(issue);
      errors.push(...issueValidation.errors.map(err => `Issue ${index}: ${err}`));
      warnings.push(...issueValidation.warnings.map(warn => `Issue ${index}: ${warn}`));
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// AI Suggestions validation
export function validateAISuggestions(suggestions: AISuggestions): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required string fields
  if (typeof suggestions.titleOptimization !== 'string') {
    errors.push('Title optimization must be a string');
  }
  if (typeof suggestions.metaDescriptionSuggestion !== 'string') {
    errors.push('Meta description suggestion must be a string');
  }

  // Array fields
  if (!Array.isArray(suggestions.contentImprovements)) {
    errors.push('Content improvements must be an array');
  } else {
    suggestions.contentImprovements.forEach((improvement, index) => {
      if (typeof improvement !== 'string') {
        errors.push(`Content improvement ${index} must be a string`);
      }
    });
  }

  if (!Array.isArray(suggestions.keywordSuggestions)) {
    errors.push('Keyword suggestions must be an array');
  } else {
    suggestions.keywordSuggestions.forEach((keyword, index) => {
      if (typeof keyword !== 'string') {
        errors.push(`Keyword suggestion ${index} must be a string`);
      }
    });
  }

  if (!Array.isArray(suggestions.structureRecommendations)) {
    errors.push('Structure recommendations must be an array');
  } else {
    suggestions.structureRecommendations.forEach((recommendation, index) => {
      if (typeof recommendation !== 'string') {
        errors.push(`Structure recommendation ${index} must be a string`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Utility function to validate any SEO data model
export function validateSEOData(data: any, type: string): ValidationResult {
  switch (type) {
    case 'SEOScore':
      return validateSEOScore(data);
    case 'SEOIssue':
      return validateSEOIssue(data);
    case 'SEOReport':
      return validateSEOReport(data);
    case 'PageAnalysis':
      return validatePageAnalysis(data);
    case 'MetaTagsData':
      return validateMetaTagsData(data);
    case 'ContentAnalysis':
      return validateContentAnalysis(data);
    case 'AISuggestions':
      return validateAISuggestions(data);
    default:
      return {
        isValid: false,
        errors: [`Unknown data type: ${type}`],
        warnings: []
      };
  }
}