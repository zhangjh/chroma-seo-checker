import { AISuggestions } from '../../types/seo';
import { AIError } from '../../types/components';
import { PageAnalysis } from '../../types/analysis';

/**
 * AIService class encapsulates Chrome's built-in AI APIs
 * Provides content optimization suggestions using Prompt API
 */
export class AIService {
    private static instance: AIService;
    private promptAPI: any;
    private summarizationAPI: any;
    private languageDetectionAPI: any;
    private maxRetries = 3;
    private retryDelay = 1000; // 1 second

    private constructor() {
        this.initializeAPIs();
    }

    /**
     * Set APIs manually (for testing)
     */
    public setAPIs(promptAPI: any, summarizationAPI?: any, languageDetectionAPI?: any): void {
        this.promptAPI = promptAPI;
        this.summarizationAPI = summarizationAPI;
        this.languageDetectionAPI = languageDetectionAPI;
    }

    /**
     * Get singleton instance of AIService
     */
    public static getInstance(): AIService {
        if (!AIService.instance) {
            AIService.instance = new AIService();
        }
        return AIService.instance;
    }

    /**
     * Initialize Chrome's built-in AI APIs
     */
    private async initializeAPIs(): Promise<void> {
        try {
            // Check if Chrome AI APIs are available
            if (typeof window !== 'undefined' && 'ai' in window && 'languageModel' in (window as any).ai) {
                this.promptAPI = (window as any).ai.languageModel;
            }

            if (typeof window !== 'undefined' && 'ai' in window && 'summarizer' in (window as any).ai) {
                this.summarizationAPI = (window as any).ai.summarizer;
            }

            if (typeof window !== 'undefined' && 'ai' in window && 'languageDetector' in (window as any).ai) {
                this.languageDetectionAPI = (window as any).ai.languageDetector;
            }
        } catch (error) {
            console.warn('Chrome AI APIs not available:', error);
        }
    }

    /**
     * Generate content optimization suggestions using AI
     * Implements Requirements 3.1, 3.2, 3.3 for AI-powered SEO optimization
     */
    public async generateContentSuggestions(analysis: PageAnalysis): Promise<AISuggestions> {
        try {
            const suggestions: AISuggestions = {
                titleOptimization: '',
                metaDescriptionSuggestion: '',
                contentImprovements: [],
                keywordSuggestions: [],
                structureRecommendations: []
            };

            // Generate title optimization (Requirement 3.2)
            suggestions.titleOptimization = await this.optimizeTitle(analysis);

            // Generate meta description suggestion (Requirement 3.2)
            suggestions.metaDescriptionSuggestion = await this.generateMetaDescription(analysis);

            // Generate content improvements (Requirement 3.1, 3.3)
            suggestions.contentImprovements = await this.generateContentImprovements(analysis);

            // Generate keyword suggestions (Requirement 3.2)
            suggestions.keywordSuggestions = await this.generateKeywordSuggestions(analysis);

            // Generate structure recommendations (Requirement 3.2)
            suggestions.structureRecommendations = await this.generateStructureRecommendations(analysis);

            return suggestions;
        } catch (error) {
            throw this.createAIError(error as Error, 'Failed to generate content suggestions');
        }
    }

    /**
     * Generate specific content optimization suggestions based on detected issues
     * Implements Requirement 3.3 for specific optimization solutions
     */
    public async generateSpecificOptimizationSuggestions(analysis: PageAnalysis, issueType: string): Promise<string[]> {
        if (!this.promptAPI) {
            return this.getFallbackSpecificSuggestions(analysis, issueType);
        }

        try {
            const prompt = this.buildSpecificOptimizationPrompt(analysis, issueType);
            const response = await this.callPromptAPIWithRetry(prompt);
            return this.parseJSONResponse(response, this.getFallbackSpecificSuggestions(analysis, issueType));
        } catch (error) {
            return this.getFallbackSpecificSuggestions(analysis, issueType);
        }
    }

    /**
     * Analyze content length and provide optimization suggestions
     * Implements Requirement 3.3 for content length optimization
     */
    public async analyzeContentLength(analysis: PageAnalysis): Promise<string[]> {
        const suggestions: string[] = [];
        const wordCount = analysis.content.wordCount;

        if (!this.promptAPI) {
            return this.getFallbackContentLengthSuggestions(wordCount);
        }

        try {
            const prompt = `
                Analyze this webpage's content length and provide optimization suggestions:
                
                Current word count: ${wordCount}
                Content type: ${this.inferContentType(analysis)}
                Page title: "${analysis.title}"
                
                Provide specific suggestions for optimizing content length for SEO:
                - If too short (under 300 words): suggest ways to expand content
                - If too long (over 2000 words): suggest ways to structure or break up content
                - If optimal: suggest ways to maintain quality
                
                Format as a JSON array of specific, actionable suggestions.
            `;

            const response = await this.callPromptAPIWithRetry(prompt);
            return this.parseJSONResponse(response, this.getFallbackContentLengthSuggestions(wordCount));
        } catch (error) {
            return this.getFallbackContentLengthSuggestions(wordCount);
        }
    }

    /**
     * Optimize page title using AI
     */
    private async optimizeTitle(analysis: PageAnalysis): Promise<string> {
        if (!this.promptAPI) {
            return this.getFallbackTitleSuggestion(analysis);
        }

        try {
            const prompt = `
        Analyze this webpage title and provide an optimized version for SEO:
        
        Current title: "${analysis.title}"
        Page content summary: "${this.getContentSummary(analysis)}"
        
        Please provide an improved title that:
        - Is 50-60 characters long
        - Includes relevant keywords
        - Is compelling and click-worthy
        - Follows SEO best practices
        
        Return only the optimized title, no explanation.
      `;

            return await this.callPromptAPIWithRetry(prompt);
        } catch (error) {
            // Fall back to non-AI suggestion if AI fails
            return this.getFallbackTitleSuggestion(analysis);
        }
    }

    /**
     * Generate meta description using AI
     */
    private async generateMetaDescription(analysis: PageAnalysis): Promise<string> {
        if (!this.promptAPI) {
            return this.getFallbackMetaDescription(analysis);
        }

        try {
            const prompt = `
        Create an SEO-optimized meta description for this webpage:
        
        Title: "${analysis.title}"
        Content summary: "${this.getContentSummary(analysis)}"
        Current meta description: "${analysis.metaTags.description || 'None'}"
        
        Please create a meta description that:
        - Is 150-160 characters long
        - Includes relevant keywords naturally
        - Encourages clicks
        - Accurately describes the page content
        
        Return only the meta description, no explanation.
      `;

            return await this.callPromptAPIWithRetry(prompt);
        } catch (error) {
            // Fall back to non-AI suggestion if AI fails
            return this.getFallbackMetaDescription(analysis);
        }
    }

    /**
     * Generate content improvement suggestions
     */
    private async generateContentImprovements(analysis: PageAnalysis): Promise<string[]> {
        if (!this.promptAPI) {
            return this.getFallbackContentImprovements(analysis);
        }

        try {
            const prompt = `
        Analyze this webpage content and suggest improvements for SEO:
        
        Word count: ${analysis.content.wordCount}
        Readability score: ${analysis.content.readabilityScore}
        Internal links: ${analysis.content.internalLinks}
        External links: ${analysis.content.externalLinks}
        Headings: H1(${analysis.headings.h1.length}), H2(${analysis.headings.h2.length}), H3(${analysis.headings.h3.length})
        
        Provide 3-5 specific, actionable content improvement suggestions.
        Format as a JSON array of strings.
      `;

            const response = await this.callPromptAPIWithRetry(prompt);
            return this.parseJSONResponse(response, this.getFallbackContentImprovements(analysis));
        } catch (error) {
            // Fall back to non-AI suggestions if AI fails
            return this.getFallbackContentImprovements(analysis);
        }
    }

    /**
     * Generate keyword suggestions
     */
    private async generateKeywordSuggestions(analysis: PageAnalysis): Promise<string[]> {
        if (!this.promptAPI) {
            return this.getFallbackKeywordSuggestions(analysis);
        }

        try {
            const prompt = `
        Based on this webpage content, suggest relevant SEO keywords:
        
        Title: "${analysis.title}"
        Content summary: "${this.getContentSummary(analysis)}"
        Current keyword density: ${JSON.stringify(analysis.content.keywordDensity)}
        
        Suggest 5-8 relevant keywords that:
        - Are related to the content
        - Have good search potential
        - Are not over-optimized in the current content
        
        Format as a JSON array of strings.
      `;

            const response = await this.callPromptAPIWithRetry(prompt);
            return this.parseJSONResponse(response, this.getFallbackKeywordSuggestions(analysis));
        } catch (error) {
            // Fall back to non-AI suggestions if AI fails
            return this.getFallbackKeywordSuggestions(analysis);
        }
    }

    /**
     * Generate structure recommendations
     */
    private async generateStructureRecommendations(analysis: PageAnalysis): Promise<string[]> {
        if (!this.promptAPI) {
            return this.getFallbackStructureRecommendations(analysis);
        }

        try {
            const prompt = `
        Analyze the content structure and suggest improvements:
        
        Heading structure: H1(${analysis.headings.h1.length}), H2(${analysis.headings.h2.length}), H3(${analysis.headings.h3.length})
        Paragraph count: ${analysis.content.paragraphCount}
        List count: ${analysis.content.listCount}
        Images: ${analysis.images.totalImages}
        
        Provide 3-5 specific recommendations for improving content structure for SEO.
        Format as a JSON array of strings.
      `;

            const response = await this.callPromptAPIWithRetry(prompt);
            return this.parseJSONResponse(response, this.getFallbackStructureRecommendations(analysis));
        } catch (error) {
            // Fall back to non-AI suggestions if AI fails
            return this.getFallbackStructureRecommendations(analysis);
        }
    }

    /**
     * Call Prompt API with retry mechanism
     */
    private async callPromptAPIWithRetry(prompt: string): Promise<string> {
        let lastError: Error;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const session = await this.promptAPI.create();
                const result = await session.prompt(prompt);
                await session.destroy();
                return result;
            } catch (error) {
                lastError = error as Error;

                // Don't retry for quota or non-retryable errors
                const errorType = this.determineErrorType(lastError);
                if (!this.isRetryableError(errorType)) {
                    break;
                }

                if (attempt < this.maxRetries) {
                    await this.delay(this.retryDelay * attempt);
                }
            }
        }

        throw this.createAIError(lastError!, 'Prompt API failed after retries');
    }

    /**
     * Get content summary for AI prompts
     */
    private getContentSummary(analysis: PageAnalysis): string {
        const summary = `
      Word count: ${analysis.content.wordCount}
      Language: ${analysis.content.language}
      Main headings: ${analysis.headings.h1.join(', ')}
      Key topics: ${Object.keys(analysis.content.keywordDensity).slice(0, 5).join(', ')}
    `.trim();

        return summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
    }

    /**
     * Parse JSON response with fallback
     */
    private parseJSONResponse(response: string, fallback: string[]): string[] {
        try {
            const parsed = JSON.parse(response);
            return Array.isArray(parsed) ? parsed : fallback;
        } catch {
            // Try to extract array-like content from response
            const matches = response.match(/\[.*?\]/s);
            if (matches) {
                try {
                    return JSON.parse(matches[0]);
                } catch {
                    return fallback;
                }
            }
            return fallback;
        }
    }

    /**
     * Create standardized AI error
     */
    private createAIError(originalError: Error, message: string): AIError {
        const error = new Error(message) as AIError;
        error.type = this.determineErrorType(originalError);
        error.retryable = this.isRetryableError(error.type);
        (error as any).cause = originalError;
        return error;
    }

    /**
     * Determine error type from original error
     */
    private determineErrorType(error: Error): AIError['type'] {
        const message = error.message.toLowerCase();

        if (message.includes('network') || message.includes('fetch')) {
            return 'network';
        }
        if (message.includes('quota') || message.includes('limit')) {
            return 'quota';
        }
        if (message.includes('timeout')) {
            return 'timeout';
        }
        return 'api';
    }

    /**
     * Check if error type is retryable
     */
    private isRetryableError(type: AIError['type']): boolean {
        return type === 'network' || type === 'timeout';
    }

    /**
     * Delay utility for retry mechanism
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Fallback methods when AI APIs are not available

    private getFallbackTitleSuggestion(analysis: PageAnalysis): string {
        const currentTitle = analysis.title;
        if (!currentTitle) {
            return "Add a descriptive title (50-60 characters)";
        }

        if (currentTitle.length > 60) {
            return "Consider shortening title to 50-60 characters for better SEO";
        }

        if (currentTitle.length < 30) {
            return "Consider expanding title with relevant keywords (aim for 50-60 characters)";
        }

        return "Title length is good, consider adding relevant keywords if missing";
    }

    private getFallbackMetaDescription(analysis: PageAnalysis): string {
        const currentDesc = analysis.metaTags.description;
        if (!currentDesc) {
            return "Create a compelling meta description (150-160 characters) that summarizes your page content and includes relevant keywords.";
        }

        if (currentDesc.length > 160) {
            return "Shorten meta description to 150-160 characters to prevent truncation in search results.";
        }

        if (currentDesc.length < 120) {
            return "Expand meta description to 150-160 characters to maximize search result visibility.";
        }

        return "Meta description length is good, ensure it includes relevant keywords and compelling call-to-action.";
    }

    private getFallbackContentImprovements(analysis: PageAnalysis): string[] {
        const improvements: string[] = [];

        if (analysis.content.wordCount < 300) {
            improvements.push("Increase content length to at least 300 words for better SEO value");
        }

        if (analysis.headings.h1.length === 0) {
            improvements.push("Add an H1 heading to clearly define the page topic");
        }

        if (analysis.headings.h2.length < 2) {
            improvements.push("Add more H2 subheadings to improve content structure");
        }

        if (analysis.content.internalLinks < 2) {
            improvements.push("Add more internal links to related pages on your site");
        }

        if (analysis.images.imagesWithoutAlt > 0) {
            improvements.push("Add alt text to all images for better accessibility and SEO");
        }

        return improvements.length > 0 ? improvements : ["Content structure looks good, continue creating valuable content"];
    }

    private getFallbackKeywordSuggestions(analysis: PageAnalysis): string[] {
        const keywords: string[] = [];

        // Extract keywords from title
        if (analysis.title) {
            const titleWords = analysis.title.toLowerCase().split(/\s+/).filter(word => word.length > 3);
            keywords.push(...titleWords.slice(0, 3));
        }

        // Extract from headings
        analysis.headings.h1.forEach(h1 => {
            const words = h1.toLowerCase().split(/\s+/).filter(word => word.length > 3);
            keywords.push(...words.slice(0, 2));
        });

        // Add generic suggestions if no keywords found
        if (keywords.length === 0) {
            keywords.push("your-main-topic", "related-keyword", "target-audience");
        }

        return [...new Set(keywords)].slice(0, 8); // Remove duplicates and limit to 8
    }

    private getFallbackStructureRecommendations(analysis: PageAnalysis): string[] {
        const recommendations: string[] = [];

        if (analysis.headings.h1.length > 1) {
            recommendations.push("Use only one H1 tag per page for better SEO hierarchy");
        }

        if (analysis.content.paragraphCount < 3) {
            recommendations.push("Break content into more paragraphs for better readability");
        }

        if (analysis.content.listCount === 0) {
            recommendations.push("Add bullet points or numbered lists to improve content scannability");
        }

        if (analysis.images.totalImages === 0) {
            recommendations.push("Add relevant images to make content more engaging");
        }

        if (analysis.content.textToHtmlRatio < 0.15) {
            recommendations.push("Reduce HTML markup or add more text content to improve text-to-HTML ratio");
        }

        return recommendations.length > 0 ? recommendations : ["Content structure is well-organized"];
    }

    /**
     * Build specific optimization prompt based on issue type
     */
    private buildSpecificOptimizationPrompt(analysis: PageAnalysis, issueType: string): string {
        const baseContext = `
            Page URL: ${analysis.url}
            Title: "${analysis.title}"
            Word count: ${analysis.content.wordCount}
            Meta description: "${analysis.metaTags.description || 'None'}"
        `;

        switch (issueType) {
            case 'title-optimization':
                return `${baseContext}
                    
                    The page title needs optimization. Provide 3-5 specific suggestions for improving the title for SEO:
                    - Consider length (50-60 characters optimal)
                    - Include relevant keywords
                    - Make it compelling for users
                    - Ensure it accurately describes the content
                    
                    Format as a JSON array of specific suggestions.`;

            case 'meta-description':
                return `${baseContext}
                    
                    The meta description needs improvement. Provide 3-5 specific suggestions:
                    - Optimal length (150-160 characters)
                    - Include relevant keywords naturally
                    - Create compelling call-to-action
                    - Accurately summarize page content
                    
                    Format as a JSON array of specific suggestions.`;

            case 'keyword-density':
                return `${baseContext}
                    Current keyword density: ${JSON.stringify(analysis.content.keywordDensity)}
                    
                    Analyze keyword usage and provide optimization suggestions:
                    - Identify over-optimized keywords (>3% density)
                    - Suggest under-utilized relevant keywords
                    - Recommend natural keyword placement
                    
                    Format as a JSON array of specific suggestions.`;

            case 'content-structure':
                return `${baseContext}
                    Headings: H1(${analysis.headings.h1.length}), H2(${analysis.headings.h2.length}), H3(${analysis.headings.h3.length})
                    Paragraphs: ${analysis.content.paragraphCount}
                    Lists: ${analysis.content.listCount}
                    
                    Provide specific suggestions for improving content structure:
                    - Heading hierarchy optimization
                    - Content organization improvements
                    - Readability enhancements
                    
                    Format as a JSON array of specific suggestions.`;

            default:
                return `${baseContext}
                    
                    Provide general SEO optimization suggestions for this page.
                    Format as a JSON array of specific, actionable recommendations.`;
        }
    }

    /**
     * Get fallback suggestions for specific optimization issues
     */
    private getFallbackSpecificSuggestions(analysis: PageAnalysis, issueType: string): string[] {
        switch (issueType) {
            case 'title-optimization':
                return [
                    "Keep title between 50-60 characters for optimal display",
                    "Include primary keyword near the beginning",
                    "Make title compelling and click-worthy",
                    "Ensure title accurately describes page content"
                ];

            case 'meta-description':
                return [
                    "Write meta description between 150-160 characters",
                    "Include relevant keywords naturally",
                    "Add compelling call-to-action",
                    "Summarize page value proposition clearly"
                ];

            case 'keyword-density':
                return [
                    "Maintain keyword density between 1-3% for primary keywords",
                    "Use semantic variations of main keywords",
                    "Include long-tail keyword phrases naturally",
                    "Avoid keyword stuffing in content"
                ];

            case 'content-structure':
                return [
                    "Use single H1 tag for main page topic",
                    "Create logical heading hierarchy (H1 > H2 > H3)",
                    "Break long paragraphs into shorter ones",
                    "Add bullet points for better scannability"
                ];

            default:
                return [
                    "Optimize page title and meta description",
                    "Improve content structure with proper headings",
                    "Add relevant internal and external links",
                    "Ensure content provides value to users"
                ];
        }
    }

    /**
     * Get fallback content length suggestions
     */
    private getFallbackContentLengthSuggestions(wordCount: number): string[] {
        if (wordCount < 300) {
            return [
                "Expand content to at least 300 words for better SEO value",
                "Add more detailed explanations and examples",
                "Include relevant subtopics and related information",
                "Consider adding FAQ section or additional details"
            ];
        } else if (wordCount > 2000) {
            return [
                "Consider breaking long content into multiple pages",
                "Use clear headings to organize lengthy content",
                "Add table of contents for better navigation",
                "Ensure each section provides unique value"
            ];
        } else {
            return [
                "Content length is good for SEO (300-2000 words)",
                "Focus on maintaining content quality and relevance",
                "Ensure content thoroughly covers the topic",
                "Keep content updated and accurate"
            ];
        }
    }

    /**
     * Infer content type based on analysis
     */
    private inferContentType(analysis: PageAnalysis): string {
        const title = analysis.title.toLowerCase();
        const wordCount = analysis.content.wordCount;

        if (title.includes('blog') || title.includes('article') || wordCount > 800) {
            return 'blog/article';
        } else if (title.includes('product') || title.includes('buy') || title.includes('shop')) {
            return 'product/commercial';
        } else if (title.includes('about') || title.includes('contact') || title.includes('service')) {
            return 'informational';
        } else if (wordCount < 300) {
            return 'landing/promotional';
        } else {
            return 'general';
        }
    }
}