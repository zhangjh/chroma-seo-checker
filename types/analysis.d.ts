export interface PageAnalysis {
    url: string;
    title: string;
    metaTags: MetaTagsData;
    headings: HeadingStructure;
    content: ContentAnalysis;
    images: ImageAnalysis;
    performance: PerformanceMetrics;
    timestamp: Date;
}
export interface MetaTagsData {
    title?: string;
    description?: string;
    keywords?: string;
    robots?: string;
    canonical?: string;
    ogTags: Record<string, string>;
    twitterTags: Record<string, string>;
    structuredData: any[];
    viewport?: string;
    charset?: string;
}
export interface HeadingStructure {
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    h6: string[];
    hierarchy: HeadingHierarchy[];
}
export interface HeadingHierarchy {
    level: number;
    text: string;
    element: string;
}
export interface ContentAnalysis {
    wordCount: number;
    readabilityScore: number;
    keywordDensity: Record<string, number>;
    internalLinks: number;
    externalLinks: number;
    textToHtmlRatio: number;
    language: string;
    paragraphCount: number;
    listCount: number;
    textLength: number;
    htmlLength: number;
}
export interface ImageAnalysis {
    totalImages: number;
    imagesWithAlt: number;
    imagesWithoutAlt: number;
    imageFormats: Record<string, number>;
    averageFileSize: number;
    largeImages: ImageInfo[];
    brokenImages: string[];
}
export interface ImageInfo {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    fileSize?: number;
    format?: string;
}
export interface PerformanceMetrics {
    pageSize: number;
    loadTime: number;
    domContentLoaded: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
    cumulativeLayoutShift?: number;
    firstInputDelay?: number;
    resourceCount: ResourceCount;
}
export interface ResourceCount {
    scripts: number;
    stylesheets: number;
    images: number;
    fonts: number;
    total: number;
}
export interface LinkInfo {
    href: string;
    text: string;
    isInternal: boolean;
    isExternal: boolean;
    hasNoFollow: boolean;
    element: string;
}
export interface LinkAnalysis {
    internal: LinkInfo[];
    external: LinkInfo[];
    broken: LinkInfo[];
    noFollow: LinkInfo[];
}
//# sourceMappingURL=analysis.d.ts.map