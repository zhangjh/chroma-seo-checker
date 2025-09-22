// Component interfaces for system boundaries

import { PageAnalysis } from './analysis';
import { SEOReport, SEOScore, AISuggestions } from './seo';

// Popup UI Component Interface
export interface PopupController {
  initializeUI(): void;
  displaySEOScore(score: SEOScore): void;
  showQuickReport(report: QuickReport): void;
  handleBatchCheck(): void;
  exportReport(format: 'pdf' | 'json'): void;
}

export interface QuickReport {
  score: SEOScore;
  criticalIssues: number;
  highPriorityIssues: number;
  totalIssues: number;
  lastChecked: Date;
}

// Content Script Component Interface
export interface ContentAnalyzer {
  analyzePage(): Promise<PageAnalysis>;
  extractMetaTags(): MetaTagsData;
  analyzeHeadingStructure(): HeadingStructure;
  analyzeContent(): ContentAnalysis;
  analyzeImages(): ImageAnalysis;
}

// Background Service Worker Interface
export interface BackgroundService {
  processAnalysis(analysis: PageAnalysis): Promise<SEOReport>;
  callAIForContentSuggestions(content: string): Promise<AISuggestions>;
  saveBatchResults(results: BatchResults): Promise<void>;
  generateReport(data: SEOReport): Promise<ReportData>;
}

// SEO Rule Engine Interface
export interface SEORuleEngine {
  checkTechnicalSEO(analysis: PageAnalysis): TechnicalSEOResult;
  checkContentQuality(analysis: PageAnalysis): ContentQualityResult;
  checkPerformance(analysis: PageAnalysis): PerformanceResult;
  calculateOverallScore(results: SEOResults): number;
}

export interface SEORule {
  id: string;
  name: string;
  category: 'technical' | 'content' | 'performance';
  weight: number;
  check(analysis: PageAnalysis): RuleResult;
}

export interface RuleResult {
  passed: boolean;
  score: number;
  message: string;
  recommendation?: string;
  element?: string;
}

export interface SEOResults {
  technical: TechnicalSEOResult;
  content: ContentQualityResult;
  performance: PerformanceResult;
}

// Batch Processing Interfaces
export interface BatchResults {
  id: string;
  urls: string[];
  results: SEOReport[];
  summary: BatchSummary;
  createdAt: Date;
}

export interface BatchSummary {
  totalPages: number;
  averageScore: number;
  criticalIssues: number;
  highPriorityIssues: number;
  completedPages: number;
  failedPages: number;
}

// Report Generation Interface
export interface ReportData {
  format: 'pdf' | 'json';
  content: string | Buffer;
  filename: string;
  size: number;
}

// Storage Interface
export interface StorageManager {
  saveReport(report: SEOReport): Promise<void>;
  getReport(id: string): Promise<SEOReport | null>;
  getAllReports(): Promise<SEOReport[]>;
  deleteReport(id: string): Promise<void>;
  saveBatchResults(results: BatchResults): Promise<void>;
  getBatchResults(id: string): Promise<BatchResults | null>;
}

// Error Handling Interfaces
export interface ErrorHandler {
  handleAIError(error: AIError): void;
  handleAnalysisError(error: AnalysisError): void;
  handleStorageError(error: StorageError): void;
  logError(error: Error, context: string): void;
}

export interface AIError extends Error {
  type: 'network' | 'quota' | 'timeout' | 'api';
  retryable: boolean;
}

export interface AnalysisError extends Error {
  type: 'permission' | 'parsing' | 'timeout';
  url: string;
}

export interface StorageError extends Error {
  type: 'quota' | 'corruption' | 'permission';
}

// Import types from other files to avoid circular dependencies
import { MetaTagsData, HeadingStructure, ContentAnalysis, ImageAnalysis } from './analysis';
import { TechnicalSEOResult, ContentQualityResult, PerformanceResult } from './seo';