export interface SEOScore {
    overall: number;
    technical: number;
    content: number;
    performance: number;
    timestamp: Date;
}
export interface SEOIssue {
    id: string;
    category: 'technical' | 'content' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    recommendation: string;
    element?: string;
    aiSuggestion?: string;
}
export interface SEOReport {
    id: string;
    url: string;
    timestamp: Date;
    score: SEOScore;
    issues: SEOIssue[];
    suggestions: AISuggestions;
    technicalResults: TechnicalSEOResult;
    contentResults: ContentQualityResult;
    performanceResults: PerformanceResult;
}
export interface AISuggestions {
    titleOptimization: string;
    metaDescriptionSuggestion: string;
    contentImprovements: string[];
    keywordSuggestions: string[];
    structureRecommendations: string[];
}
export interface TechnicalSEOResult {
    metaTags: MetaTagsResult;
    headingStructure: HeadingStructureResult;
    internalLinks: LinkAnalysisResult;
    canonicalUrl: CanonicalResult;
    robotsTxt: RobotsResult;
}
export interface ContentQualityResult {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: Record<string, number>;
    contentStructure: ContentStructureResult;
    duplicateContent: DuplicateContentResult;
}
export interface PerformanceResult {
    pageSize: number;
    loadTime: number;
    imageOptimization: ImageOptimizationResult;
    coreWebVitals: CoreWebVitalsResult;
}
export interface MetaTagsResult {
    hasTitle: boolean;
    titleLength: number;
    hasDescription: boolean;
    descriptionLength: number;
    hasKeywords: boolean;
    hasOpenGraph: boolean;
    hasTwitterCards: boolean;
}
export interface HeadingStructureResult {
    hasH1: boolean;
    h1Count: number;
    headingHierarchy: boolean;
    headingDistribution: Record<string, number>;
}
export interface LinkAnalysisResult {
    internalLinksCount: number;
    externalLinksCount: number;
    brokenLinksCount: number;
    noFollowLinksCount: number;
}
export interface CanonicalResult {
    hasCanonical: boolean;
    canonicalUrl?: string;
    isValid: boolean;
}
export interface RobotsResult {
    hasRobotsMeta: boolean;
    robotsDirectives: string[];
    isIndexable: boolean;
}
export interface ContentStructureResult {
    hasParagraphs: boolean;
    hasLists: boolean;
    hasImages: boolean;
    textToHtmlRatio: number;
}
export interface DuplicateContentResult {
    hasDuplicateTitle: boolean;
    hasDuplicateDescription: boolean;
    duplicateContentPercentage: number;
}
export interface ImageOptimizationResult {
    totalImages: number;
    imagesWithoutAlt: number;
    oversizedImages: number;
    unoptimizedFormats: number;
}
export interface CoreWebVitalsResult {
    lcp?: number;
    fid?: number;
    cls?: number;
}
//# sourceMappingURL=seo.d.ts.map