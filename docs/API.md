# SEO Checker Extension - API Documentation

## 概述

本文档详细描述了SEO Checker扩展的所有API接口、数据模型和使用方法。

## 目录

- [核心接口](#核心接口)
- [数据模型](#数据模型)
- [分析器API](#分析器api)
- [AI服务API](#ai服务api)
- [存储管理API](#存储管理api)
- [报告生成API](#报告生成api)
- [错误处理](#错误处理)
- [使用示例](#使用示例)

## 核心接口

### ContentAnalyzer

页面内容分析的主要接口。

```typescript
interface ContentAnalyzer {
  /**
   * 分析当前页面的SEO状况
   * @returns Promise<PageAnalysis> 页面分析结果
   */
  analyzePage(): Promise<PageAnalysis>;

  /**
   * 提取页面元数据
   * @returns MetaTagsData 元标签数据
   */
  extractMetaTags(): MetaTagsData;

  /**
   * 分析标题结构
   * @returns HeadingStructure 标题层次结构
   */
  analyzeHeadingStructure(): HeadingStructure;

  /**
   * 分析页面内容质量
   * @returns ContentAnalysis 内容分析结果
   */
  analyzeContent(): ContentAnalysis;

  /**
   * 分析页面图片
   * @returns ImageAnalysis 图片分析结果
   */
  analyzeImages(): ImageAnalysis;

  /**
   * 分析页面性能指标
   * @returns PerformanceMetrics 性能指标
   */
  analyzePerformance(): PerformanceMetrics;
}
```

### SEORuleEngine

SEO规则检查引擎接口。

```typescript
interface SEORuleEngine {
  /**
   * 执行技术SEO检查
   * @param analysis 页面分析数据
   * @returns TechnicalSEOResult 技术SEO检查结果
   */
  checkTechnicalSEO(analysis: PageAnalysis): TechnicalSEOResult;

  /**
   * 执行内容质量检查
   * @param analysis 页面分析数据
   * @returns ContentQualityResult 内容质量检查结果
   */
  checkContentQuality(analysis: PageAnalysis): ContentQualityResult;

  /**
   * 执行性能检查
   * @param analysis 页面分析数据
   * @returns PerformanceResult 性能检查结果
   */
  checkPerformance(analysis: PageAnalysis): PerformanceResult;

  /**
   * 计算总体SEO评分
   * @param results 各项检查结果
   * @returns number 总体评分 (0-100)
   */
  calculateOverallScore(results: SEOResults): number;

  /**
   * 获取所有可用的SEO规则
   * @returns SEORule[] SEO规则列表
   */
  getAllRules(): SEORule[];

  /**
   * 根据ID获取特定规则
   * @param ruleId 规则ID
   * @returns SEORule | null 规则对象或null
   */
  getRule(ruleId: string): SEORule | null;
}
```

### AIService

Chrome内置AI服务接口。

```typescript
interface AIService {
  /**
   * 检查AI功能可用性
   * @returns Promise<boolean> AI是否可用
   */
  isAvailable(): Promise<boolean>;

  /**
   * 生成内容优化建议
   * @param content 页面内容
   * @param context 上下文信息
   * @returns Promise<AISuggestions> AI建议
   */
  generateContentSuggestions(content: string, context: AIContext): Promise<AISuggestions>;

  /**
   * 优化标题建议
   * @param title 当前标题
   * @param content 页面内容
   * @returns Promise<string> 优化后的标题建议
   */
  optimizeTitle(title: string, content: string): Promise<string>;

  /**
   * 生成元描述建议
   * @param content 页面内容
   * @param maxLength 最大长度
   * @returns Promise<string> 元描述建议
   */
  generateMetaDescription(content: string, maxLength?: number): Promise<string>;

  /**
   * 分析关键词密度并提供建议
   * @param content 页面内容
   * @returns Promise<KeywordAnalysis> 关键词分析结果
   */
  analyzeKeywords(content: string): Promise<KeywordAnalysis>;

  /**
   * 检测内容语言
   * @param content 页面内容
   * @returns Promise<string> 语言代码
   */
  detectLanguage(content: string): Promise<string>;
}
```

## 数据模型

### PageAnalysis

页面分析结果的完整数据模型。

```typescript
interface PageAnalysis {
  /** 页面URL */
  url: string;
  /** 页面标题 */
  title: string;
  /** 分析时间戳 */
  timestamp: Date;
  /** 元标签数据 */
  metaTags: MetaTagsData;
  /** 标题结构 */
  headings: HeadingStructure;
  /** 内容分析 */
  content: ContentAnalysis;
  /** 图片分析 */
  images: ImageAnalysis;
  /** 性能指标 */
  performance: PerformanceMetrics;
  /** 页面大小信息 */
  pageSize: PageSizeInfo;
  /** 链接分析 */
  links: LinkAnalysis;
}
```

### SEOReport

完整的SEO检查报告。

```typescript
interface SEOReport {
  /** 报告ID */
  id: string;
  /** 页面URL */
  url: string;
  /** 生成时间 */
  timestamp: Date;
  /** SEO评分 */
  score: SEOScore;
  /** 检查问题列表 */
  issues: SEOIssue[];
  /** AI建议 */
  suggestions: AISuggestions;
  /** 技术SEO结果 */
  technicalResults: TechnicalSEOResult;
  /** 内容质量结果 */
  contentResults: ContentQualityResult;
  /** 性能结果 */
  performanceResults: PerformanceResult;
  /** 原始分析数据 */
  rawAnalysis: PageAnalysis;
}
```

### SEOScore

SEO评分详细信息。

```typescript
interface SEOScore {
  /** 总体评分 (0-100) */
  overall: number;
  /** 技术SEO评分 (0-100) */
  technical: number;
  /** 内容质量评分 (0-100) */
  content: number;
  /** 性能评分 (0-100) */
  performance: number;
  /** 评分等级 */
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  /** 评分详情 */
  breakdown: ScoreBreakdown;
}

interface ScoreBreakdown {
  /** 各项检查的得分 */
  checks: Record<string, number>;
  /** 权重信息 */
  weights: Record<string, number>;
  /** 扣分原因 */
  deductions: ScoreDeduction[];
}
```

### SEOIssue

SEO问题定义。

```typescript
interface SEOIssue {
  /** 问题ID */
  id: string;
  /** 问题类别 */
  category: 'technical' | 'content' | 'performance';
  /** 严重程度 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 问题标题 */
  title: string;
  /** 问题描述 */
  description: string;
  /** 修复建议 */
  recommendation: string;
  /** 相关元素选择器 */
  element?: string;
  /** AI建议 */
  aiSuggestion?: string;
  /** 影响评分 */
  scoreImpact: number;
  /** 修复优先级 */
  priority: number;
  /** 相关规则ID */
  ruleId: string;
}
```

### AISuggestions

AI生成的优化建议。

```typescript
interface AISuggestions {
  /** 标题优化建议 */
  titleOptimization: string;
  /** 元描述建议 */
  metaDescriptionSuggestion: string;
  /** 内容改进建议 */
  contentImprovements: string[];
  /** 关键词建议 */
  keywordSuggestions: string[];
  /** 结构优化建议 */
  structureRecommendations: string[];
  /** 可读性改进建议 */
  readabilityImprovements: string[];
  /** 生成时间 */
  generatedAt: Date;
  /** AI模型版本 */
  modelVersion: string;
}
```

## 分析器API

### MetaTagsExtractor

元标签提取器API。

```typescript
class MetaTagsExtractor {
  /**
   * 提取所有元标签
   * @param document DOM文档对象
   * @returns MetaTagsData 元标签数据
   */
  static extract(document: Document): MetaTagsData;

  /**
   * 提取基础元标签
   * @param document DOM文档对象
   * @returns BasicMetaTags 基础元标签
   */
  static extractBasicTags(document: Document): BasicMetaTags;

  /**
   * 提取Open Graph标签
   * @param document DOM文档对象
   * @returns Record<string, string> OG标签键值对
   */
  static extractOpenGraphTags(document: Document): Record<string, string>;

  /**
   * 提取Twitter Card标签
   * @param document DOM文档对象
   * @returns Record<string, string> Twitter标签键值对
   */
  static extractTwitterTags(document: Document): Record<string, string>;

  /**
   * 提取结构化数据
   * @param document DOM文档对象
   * @returns any[] 结构化数据数组
   */
  static extractStructuredData(document: Document): any[];
}
```

### HeadingStructureAnalyzer

标题结构分析器API。

```typescript
class HeadingStructureAnalyzer {
  /**
   * 分析页面标题结构
   * @param document DOM文档对象
   * @returns HeadingStructure 标题结构
   */
  static analyze(document: Document): HeadingStructure;

  /**
   * 检查标题层次是否正确
   * @param headings 标题列表
   * @returns boolean 层次是否正确
   */
  static validateHierarchy(headings: Heading[]): boolean;

  /**
   * 获取标题大纲
   * @param headings 标题列表
   * @returns HeadingOutline 标题大纲
   */
  static generateOutline(headings: Heading[]): HeadingOutline;
}
```

### ContentAnalyzer

内容分析器API。

```typescript
class ContentAnalyzer {
  /**
   * 分析页面内容
   * @param document DOM文档对象
   * @returns ContentAnalysis 内容分析结果
   */
  static analyze(document: Document): ContentAnalysis;

  /**
   * 计算文本可读性
   * @param text 文本内容
   * @returns number 可读性评分
   */
  static calculateReadability(text: string): number;

  /**
   * 分析关键词密度
   * @param text 文本内容
   * @returns Record<string, number> 关键词密度
   */
  static analyzeKeywordDensity(text: string): Record<string, number>;

  /**
   * 计算文本与HTML比例
   * @param document DOM文档对象
   * @returns number 文本比例
   */
  static calculateTextToHtmlRatio(document: Document): number;

  /**
   * 统计链接数量
   * @param document DOM文档对象
   * @returns LinkStats 链接统计
   */
  static analyzeLinkStats(document: Document): LinkStats;
}
```

### ImageAnalyzer

图片分析器API。

```typescript
class ImageAnalyzer {
  /**
   * 分析页面图片
   * @param document DOM文档对象
   * @returns ImageAnalysis 图片分析结果
   */
  static analyze(document: Document): ImageAnalysis;

  /**
   * 检查图片Alt属性
   * @param images 图片元素列表
   * @returns AltAttributeCheck Alt属性检查结果
   */
  static checkAltAttributes(images: HTMLImageElement[]): AltAttributeCheck;

  /**
   * 分析图片大小
   * @param images 图片元素列表
   * @returns ImageSizeAnalysis 图片大小分析
   */
  static analyzeSizes(images: HTMLImageElement[]): ImageSizeAnalysis;

  /**
   * 检查图片格式
   * @param images 图片元素列表
   * @returns ImageFormatAnalysis 图片格式分析
   */
  static analyzeFormats(images: HTMLImageElement[]): ImageFormatAnalysis;
}
```

## AI服务API

### AIService实现

```typescript
class AIService {
  private promptAPI: any;
  private summarizationAPI: any;
  private languageDetectionAPI: any;

  /**
   * 初始化AI服务
   */
  constructor() {
    this.initializeAPIs();
  }

  /**
   * 初始化Chrome内置AI APIs
   * @private
   */
  private async initializeAPIs(): Promise<void>;

  /**
   * 生成内容优化提示
   * @param content 页面内容
   * @param issues 检测到的问题
   * @returns Promise<string> 优化建议
   */
  async generateOptimizationPrompt(content: string, issues: SEOIssue[]): Promise<string>;

  /**
   * 批量生成建议
   * @param requests 请求列表
   * @returns Promise<AISuggestions[]> 建议列表
   */
  async batchGenerateSuggestions(requests: AIRequest[]): Promise<AISuggestions[]>;

  /**
   * 处理AI API错误
   * @param error 错误对象
   * @returns AIErrorResponse 错误响应
   */
  private handleAIError(error: any): AIErrorResponse;
}
```

## 存储管理API

### StorageManager

数据存储管理接口。

```typescript
class StorageManager {
  /**
   * 保存SEO报告
   * @param report SEO报告
   * @returns Promise<void>
   */
  static async saveReport(report: SEOReport): Promise<void>;

  /**
   * 获取SEO报告
   * @param reportId 报告ID
   * @returns Promise<SEOReport | null> SEO报告或null
   */
  static async getReport(reportId: string): Promise<SEOReport | null>;

  /**
   * 获取所有报告列表
   * @param options 查询选项
   * @returns Promise<SEOReport[]> 报告列表
   */
  static async getAllReports(options?: QueryOptions): Promise<SEOReport[]>;

  /**
   * 删除报告
   * @param reportId 报告ID
   * @returns Promise<boolean> 删除是否成功
   */
  static async deleteReport(reportId: string): Promise<boolean>;

  /**
   * 清理过期数据
   * @param maxAge 最大保存时间（毫秒）
   * @returns Promise<number> 清理的记录数
   */
  static async cleanupExpiredData(maxAge: number): Promise<number>;

  /**
   * 获取存储使用情况
   * @returns Promise<StorageUsage> 存储使用情况
   */
  static async getStorageUsage(): Promise<StorageUsage>;

  /**
   * 导出所有数据
   * @returns Promise<ExportData> 导出的数据
   */
  static async exportAllData(): Promise<ExportData>;

  /**
   * 导入数据
   * @param data 要导入的数据
   * @returns Promise<ImportResult> 导入结果
   */
  static async importData(data: ExportData): Promise<ImportResult>;
}
```

## 报告生成API

### ReportGenerator

报告生成器接口。

```typescript
class ReportGenerator {
  /**
   * 生成PDF报告
   * @param report SEO报告数据
   * @param options 生成选项
   * @returns Promise<Blob> PDF文件Blob
   */
  static async generatePDFReport(report: SEOReport, options?: PDFOptions): Promise<Blob>;

  /**
   * 生成JSON报告
   * @param report SEO报告数据
   * @param options 生成选项
   * @returns Promise<string> JSON字符串
   */
  static async generateJSONReport(report: SEOReport, options?: JSONOptions): Promise<string>;

  /**
   * 生成HTML报告
   * @param report SEO报告数据
   * @param template 模板名称
   * @returns Promise<string> HTML字符串
   */
  static async generateHTMLReport(report: SEOReport, template?: string): Promise<string>;

  /**
   * 生成批量报告汇总
   * @param reports 报告列表
   * @param format 输出格式
   * @returns Promise<Blob | string> 汇总报告
   */
  static async generateBatchSummary(reports: SEOReport[], format: 'pdf' | 'json' | 'csv'): Promise<Blob | string>;
}
```

## 错误处理

### ErrorHandler

统一错误处理接口。

```typescript
class ErrorHandler {
  /**
   * 处理分析错误
   * @param error 错误对象
   * @param context 错误上下文
   * @returns ErrorResponse 错误响应
   */
  static handleAnalysisError(error: Error, context: string): ErrorResponse;

  /**
   * 处理AI服务错误
   * @param error AI错误
   * @returns AIErrorResponse AI错误响应
   */
  static handleAIError(error: AIError): AIErrorResponse;

  /**
   * 处理存储错误
   * @param error 存储错误
   * @returns StorageErrorResponse 存储错误响应
   */
  static handleStorageError(error: StorageError): StorageErrorResponse;

  /**
   * 记录错误日志
   * @param error 错误对象
   * @param level 日志级别
   * @param context 上下文信息
   */
  static logError(error: Error, level: LogLevel, context?: any): void;
}
```

### 错误类型定义

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

interface AIErrorResponse extends ErrorResponse {
  fallbackSuggestion?: string;
  retryAfter?: number;
}

interface StorageErrorResponse extends ErrorResponse {
  storageQuotaExceeded?: boolean;
  suggestedAction?: string;
}

enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}
```

## 使用示例

### 基本页面分析

```typescript
// 分析当前页面
const analyzer = new ContentAnalyzer();
const analysis = await analyzer.analyzePage();

// 运行SEO检查
const ruleEngine = new SEORuleEngine();
const technicalResults = ruleEngine.checkTechnicalSEO(analysis);
const contentResults = ruleEngine.checkContentQuality(analysis);
const performanceResults = ruleEngine.checkPerformance(analysis);

// 计算总分
const overallScore = ruleEngine.calculateOverallScore({
  technical: technicalResults,
  content: contentResults,
  performance: performanceResults
});

console.log(`SEO Score: ${overallScore}/100`);
```

### AI建议生成

```typescript
// 初始化AI服务
const aiService = new AIService();

// 检查AI可用性
if (await aiService.isAvailable()) {
  // 生成内容建议
  const suggestions = await aiService.generateContentSuggestions(
    analysis.content.text,
    { url: analysis.url, title: analysis.title }
  );
  
  console.log('AI Suggestions:', suggestions);
} else {
  console.log('AI功能不可用');
}
```

### 报告生成和导出

```typescript
// 创建完整报告
const report: SEOReport = {
  id: generateId(),
  url: analysis.url,
  timestamp: new Date(),
  score: calculateScore(results),
  issues: extractIssues(results),
  suggestions: await aiService.generateContentSuggestions(analysis.content.text),
  technicalResults,
  contentResults,
  performanceResults,
  rawAnalysis: analysis
};

// 保存报告
await StorageManager.saveReport(report);

// 生成PDF报告
const pdfBlob = await ReportGenerator.generatePDFReport(report);

// 下载报告
const url = URL.createObjectURL(pdfBlob);
const a = document.createElement('a');
a.href = url;
a.download = `seo-report-${report.id}.pdf`;
a.click();
```

### 批量检查

```typescript
// 批量分析多个URL
const urls = ['https://example1.com', 'https://example2.com'];
const batchResults: SEOReport[] = [];

for (const url of urls) {
  try {
    // 这里需要在content script中执行分析
    const analysis = await analyzeURL(url);
    const report = await generateReport(analysis);
    batchResults.push(report);
  } catch (error) {
    console.error(`分析 ${url} 失败:`, error);
  }
}

// 生成批量汇总报告
const summaryReport = await ReportGenerator.generateBatchSummary(batchResults, 'pdf');
```

### 错误处理示例

```typescript
try {
  const analysis = await analyzer.analyzePage();
} catch (error) {
  const errorResponse = ErrorHandler.handleAnalysisError(error, 'page-analysis');
  
  if (errorResponse.error.code === 'NETWORK_ERROR') {
    // 显示网络错误提示
    showErrorMessage('网络连接失败，请检查网络后重试');
  } else if (errorResponse.error.code === 'PERMISSION_DENIED') {
    // 显示权限错误提示
    showErrorMessage('无法访问页面内容，请刷新页面后重试');
  } else {
    // 显示通用错误提示
    showErrorMessage('分析失败，请稍后重试');
  }
}
```

## 版本信息

- **API版本**: 1.0.0
- **最后更新**: 2024年12月
- **兼容性**: Chrome 88+

## 更新日志

### v1.0.0 (2024-12-XX)
- 初始API版本
- 完整的SEO分析功能
- Chrome内置AI集成
- 报告生成和导出功能
- 批量检查支持

---

更多详细信息和最新更新，请访问项目GitHub仓库。