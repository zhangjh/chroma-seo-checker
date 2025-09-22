import { PageAnalysis } from './analysis';
import { SEOReport, SEOScore, AISuggestions } from './seo';
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
export interface ContentAnalyzer {
    analyzePage(): Promise<PageAnalysis>;
    extractMetaTags(): MetaTagsData;
    analyzeHeadingStructure(): HeadingStructure;
    analyzeContent(): ContentAnalysis;
    analyzeImages(): ImageAnalysis;
}
export interface BackgroundService {
    processAnalysis(analysis: PageAnalysis): Promise<SEOReport>;
    callAIForContentSuggestions(content: string): Promise<AISuggestions>;
    saveBatchResults(results: BatchResults): Promise<void>;
    generateReport(data: SEOReport): Promise<ReportData>;
}
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
export interface ReportData {
    format: 'pdf' | 'json';
    content: string | Buffer;
    filename: string;
    size: number;
}
export interface StorageManager {
    saveReport(report: SEOReport): Promise<void>;
    getReport(id: string): Promise<SEOReport | null>;
    getAllReports(): Promise<SEOReport[]>;
    deleteReport(id: string): Promise<void>;
    saveBatchResults(results: BatchResults): Promise<void>;
    getBatchResults(id: string): Promise<BatchResults | null>;
}
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
import { MetaTagsData, HeadingStructure, ContentAnalysis, ImageAnalysis } from './analysis';
import { TechnicalSEOResult, ContentQualityResult, PerformanceResult } from './seo';
//# sourceMappingURL=components.d.ts.map