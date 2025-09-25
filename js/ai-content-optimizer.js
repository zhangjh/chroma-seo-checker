// AI Content Optimizer
// 基于Gemini Nano的AI内容优化服务

class AIContentOptimizer {
    constructor() {
        this.session = null;
        this.progressCallback = null;
    }

    setProgressCallback(callback) {
        this.progressCallback = callback;
    }

    async ensureSession() {
        if (!this.session) {
            await this.createSession();
        }
        return this.session;
    }

    async createSession() {
        try {
            console.log('[AI Optimizer] 开始创建Gemini Nano会话');

            // 检查Gemini Nano是否可用
            console.log('[AI Optimizer] 检查Gemini Nano可用性...');
            let availability = await LanguageModel.availability();
            console.log('[AI Optimizer] Gemini Nano状态:', availability);

            // 处理模型下载情况
            if (availability === 'downloadable') {
                console.log('[AI Optimizer] 模型需要下载，开始下载过程...');

                // 通知开始下载
                if (this.progressCallback) {
                    this.progressCallback({
                        type: 'download_start',
                        message: '正在下载Gemini Nano模型...',
                        progress: 0
                    });
                }

                // 创建临时会话以触发下载并监听进度
                try {
                    const tempSession = await LanguageModel.create({
                        monitor: (m) => {
                            m.addEventListener('downloadprogress', (e) => {
                                const progress = Math.round(e.loaded * 100);
                                console.log(`[AI Optimizer] 模型下载进度: ${progress}%`);

                                // 通知下载进度
                                if (this.progressCallback) {
                                    this.progressCallback({
                                        type: 'download_progress',
                                        message: `正在下载Gemini Nano模型... ${progress}%`,
                                        progress: progress
                                    });
                                }
                            });
                        }
                    });

                    console.log('[AI Optimizer] 模型下载已开始，等待完成...');

                    // 通知下载完成，等待状态确认
                    if (this.progressCallback) {
                        this.progressCallback({
                            type: 'download_complete',
                            message: '模型下载完成，正在初始化...',
                            progress: 100
                        });
                    }

                    // 等待下载完成，持续检查状态直到可用
                    let downloadComplete = false;
                    while (!downloadComplete) {
                        await new Promise(resolve => setTimeout(resolve, 1000)); // 每秒检查一次
                        availability = await LanguageModel.availability();

                        if (availability === 'available') {
                            downloadComplete = true;
                            console.log('[AI Optimizer] 模型状态确认为可用！');

                            // 通知初始化完成
                            if (this.progressCallback) {
                                this.progressCallback({
                                    type: 'ready',
                                    message: 'Gemini Nano已准备就绪',
                                    progress: 100
                                });
                            }
                        }
                    }

                    // 清理临时会话
                    if (tempSession) {
                        try {
                            tempSession.destroy();
                        } catch (e) {
                            console.warn('[AI Optimizer] 清理临时会话失败:', e);
                        }
                    }
                } catch (downloadError) {
                    console.error('[AI Optimizer] 模型下载失败:', downloadError);
                    throw new Error(`模型下载失败: ${downloadError.message}。请检查网络连接并重试。`);
                }
            } else if (availability !== 'available') {
                const errorMessages = {
                    'not-available': 'Gemini Nano不可用。请确保使用Chrome 127+版本并启用Prompt API功能：chrome://flags/#prompt-api-for-gemini-nano',
                    'after-download': '模型下载后需要重启浏览器才能使用',
                    'no': 'Gemini Nano功能未启用'
                };

                const message = errorMessages[availability] || `Gemini Nano状态异常: ${availability}`;
                throw new Error(message);
            }

            // 创建真正的AI会话
            console.log('[AI Optimizer] 开始创建AI会话...');
            this.session = await LanguageModel.create({
                initialPrompts: [
                    {
                        role: 'system',
                        content: 'You are an SEO expert assistant. Provide specific, actionable SEO optimization suggestions in Chinese. Always respond with valid JSON format when requested.'
                    }
                ]
            });

            console.log('[AI Optimizer] Gemini Nano session created successfully');
            return this.session;
        } catch (error) {
            console.error('[AI Optimizer] Failed to create Gemini Nano session:', error);
            throw new Error(`无法创建Gemini Nano会话: ${error.message}`);
        }
    }

    async destroySession() {
        if (this.session) {
            try {
                this.session.destroy();
                this.session = null;
                console.log('[AI Optimizer] Gemini Nano session destroyed');
            } catch (error) {
                console.warn('[AI Optimizer] Failed to destroy session:', error);
            }
        }
    }

    async generateContentOptimizations(analysis, seoIssues = []) {
        try {
            console.log('[AI Optimizer] 开始生成内容优化建议');
            console.log('[AI Optimizer] SEO问题数量:', seoIssues.length);
            console.log('[AI Optimizer] SEO问题列表:', seoIssues.map(issue => issue.title || issue.id));

            const session = await this.ensureSession();
            console.log('[AI Optimizer] AI会话已准备就绪');

            // 根据SEO检查结果决定生成哪些建议
            const optimizations = {};

            // 检查是否有标题相关问题
            const titleIssues = seoIssues.filter(issue =>
                issue.type === 'title' ||
                issue.title.includes('标题') ||
                issue.title.includes('Title') ||
                issue.id === 'missing-title' ||
                issue.id === 'title-length'
            );

            if (titleIssues.length > 0) {
                console.log('[AI Optimizer] 发现标题问题，开始生成标题优化建议');
                optimizations.titleOptimization = await this.optimizeTitle(analysis, session, titleIssues);
                console.log('[AI Optimizer] 标题优化建议生成完成');
            }

            // 检查是否有Meta描述相关问题
            const metaIssues = seoIssues.filter(issue =>
                issue.type === 'meta' ||
                issue.title.includes('描述') ||
                issue.title.includes('Description') ||
                issue.id === 'missing-description' ||
                issue.id === 'description-length'
            );

            if (metaIssues.length > 0) {
                console.log('[AI Optimizer] 发现Meta描述问题，开始生成描述优化建议');
                optimizations.metaDescriptionSuggestion = await this.optimizeMetaDescription(analysis, session, metaIssues);
                console.log('[AI Optimizer] Meta描述优化建议生成完成');
            }

            // 检查是否有内容相关问题
            const contentIssues = seoIssues.filter(issue =>
                issue.type === 'content' ||
                issue.title.includes('内容') ||
                issue.title.includes('Content') ||
                issue.title.includes('可读性') ||
                issue.title.includes('字数') ||
                issue.id === 'content-length' ||
                issue.id === 'readability'
            );

            if (contentIssues.length > 0) {
                console.log('[AI Optimizer] 发现内容问题，开始生成内容改进建议');
                optimizations.contentImprovements = await this.generateContentImprovements(analysis, session, contentIssues);
                console.log('[AI Optimizer] 内容改进建议生成完成');
            }

            // 检查是否有关键词相关问题
            const keywordIssues = seoIssues.filter(issue =>
                issue.type === 'keyword' ||
                issue.title.includes('关键词') ||
                issue.title.includes('Keyword') ||
                issue.id === 'keyword-density'
            );

            if (keywordIssues.length > 0) {
                console.log('[AI Optimizer] 开始生成关键词建议');
                // 如果有其他优化建议，也提供关键词建议
                optimizations.keywordSuggestions = await this.generateKeywordSuggestions(analysis, session, keywordIssues);
                console.log('[AI Optimizer] 关键词建议生成完成');
            }

            // 检查是否有结构相关问题
            const structureIssues = seoIssues.filter(issue =>
                issue.type === 'structure' ||
                issue.type === 'heading' ||
                issue.type === 'image' ||
                issue.title.includes('结构') ||
                issue.title.includes('标题') ||
                issue.title.includes('图片') ||
                issue.title.includes('Alt') ||
                issue.id === 'heading-structure' ||
                issue.id === 'missing-alt' ||
                issue.id === 'h1-missing'
            );

            if (structureIssues.length > 0) {
                console.log('[AI Optimizer] 发现结构问题，开始生成结构优化建议');
                optimizations.structureRecommendations = await this.generateStructureRecommendations(analysis, session, structureIssues);
                console.log('[AI Optimizer] 结构优化建议生成完成');
            }

            // 如果没有发现任何问题，返回一个总结
            if (Object.keys(optimizations).length === 0) {
                console.log('[AI Optimizer] 没有发现SEO问题，生成总结信息');
                optimizations.summary = {
                    message: '🎉 恭喜！您的页面SEO状况良好，暂时没有发现需要AI优化的问题。',
                    suggestions: [
                        '继续保持当前的SEO最佳实践',
                        '定期检查页面内容的更新和优化',
                        '关注搜索引擎算法的变化和新的SEO趋势'
                    ]
                };
            }

            console.log('[AI Optimizer] 所有优化建议生成完成，返回结果');
            console.log('[AI Optimizer] 生成的建议类型:', Object.keys(optimizations));
            return optimizations;
        } catch (error) {
            console.error('[AI Optimizer] Failed to generate optimizations:', error);
            throw error;
        }
    }

    async optimizeTitle(analysis, session, titleIssues = []) {
        const currentTitle = analysis.metaTags?.title || '';
        const headings = analysis.headings || {};
        const content = analysis.content || {};

        const issueDescriptions = titleIssues.map(issue => issue.description || issue.title).join('; ');
        const hasLengthIssue = titleIssues.some(issue => issue.id === 'title-length' || issue.title.includes('Length'));
        const isMissing = titleIssues.some(issue => issue.id === 'missing-title' || issue.title.includes('Missing'));

        if (!currentTitle || isMissing) {
            const topKeywords = this.extractTopKeywords(content.keywordDensity || {});
            const h1Text = headings.h1?.[0] || '';
            
            const prompt = `Generate an SEO-optimized title for the following webpage:

SEO Issues: ${issueDescriptions}
H1 Title: "${h1Text}"
Main Keywords: ${topKeywords.slice(0, 5).join(', ')}
Page Word Count: ${content.wordCount || 0} words

Requirements:
1. Length 30-60 characters
2. Include main keywords
3. Be descriptive and attractive
4. Address detected SEO issues

Please respond in English.

Please respond in JSON format:
{
  "suggestion": "suggested title",
  "reason": "explanation of how it addresses SEO issues",
  "keywords": ["included keywords"]
}`;

            const response = await session.prompt(prompt);
            const aiResult = this.parseAIResponse(response);

            if (aiResult && aiResult.suggestion) {
                return {
                    suggestion: aiResult.suggestion,
                    reason: aiResult.reason || 'AI-generated title suggestion',
                    keywords: aiResult.keywords || topKeywords.slice(0, 5),
                    improvements: [
                        'Create descriptive title based on main page content',
                        'Include main keywords, control length to 30-60 characters',
                        'Ensure title is unique and attractive'
                    ]
                };
            }
        }

        // Optimize existing title
        const topKeywords = this.extractTopKeywords(content.keywordDensity || {});
        const h1Text = headings.h1?.[0] || '';
        
        const prompt = `Optimize the following webpage title based on SEO analysis results:

Detected Issues: ${issueDescriptions}
Current Title: "${currentTitle}"
Title Length: ${currentTitle.length} characters
H1 Title: "${h1Text}"
Main Keywords: ${topKeywords.slice(0, 5).join(', ')}
Page Word Count: ${content.wordCount || 0} words
Length Issue: ${hasLengthIssue ? 'Yes' : 'No'}

Please provide optimization suggestions for the detected issues:
1. Analyze specific problems with the current title
2. Provide an optimized title that solves these problems (30-60 characters)
3. Explain how to solve each detected issue
4. Recommend keywords (maximum 5)

Please respond in English.

Please respond in JSON format:
{
  "analysis": "analysis of detected issues",
  "optimizedTitle": "optimized title that solves the problems",
  "improvements": ["how to solve problem 1", "how to solve problem 2"],
  "keywords": ["keyword1", "keyword2"]
}`;

        console.log('[AI Optimizer] Sending title optimization prompt to Gemini Nano...');
        const response = await session.prompt(prompt);
        console.log('[AI Optimizer] Received title optimization response:', response.substring(0, 200) + '...');
        const aiResult = this.parseAIResponse(response);

        if (aiResult) {
            return {
                current: currentTitle,
                suggestion: aiResult.optimizedTitle || aiResult.suggestion || 'Current title is already good',
                reason: aiResult.analysis || 'AI analysis-based optimization suggestion',
                improvements: aiResult.improvements || [],
                keywords: aiResult.keywords || topKeywords.slice(0, 5),
                length: {
                    current: currentTitle.length,
                    optimal: '30-60 characters',
                    status: currentTitle.length >= 30 && currentTitle.length <= 60 ? 'good' : 'needs-improvement'
                }
            };
        }

        throw new Error('AI failed to generate valid title optimization suggestions');
    }

    async optimizeMetaDescription(analysis, session, metaIssues = []) {
        const currentDescription = analysis.metaTags?.description || '';
        const content = analysis.content || {};
        const title = analysis.metaTags?.title || '';

        const issueDescriptions = metaIssues.map(issue => issue.description || issue.title).join('; ');
        const hasLengthIssue = metaIssues.some(issue => issue.id === 'description-length' || issue.title.includes('Length'));
        const isMissing = metaIssues.some(issue => issue.id === 'missing-description' || issue.title.includes('Missing'));

        if (!currentDescription || isMissing) {
            const topKeywords = this.extractTopKeywords(content.keywordDensity || {});
            const h1Text = analysis.headings?.h1?.[0] || '';
            
            const prompt = `Generate an SEO-optimized Meta description for the following webpage:

SEO Issues: ${issueDescriptions}
Page Title: "${title}"
H1 Title: "${h1Text}"
Main Keywords: ${topKeywords.slice(0, 5).join(', ')}
Page Word Count: ${content.wordCount || 0} words

Requirements:
1. Length 120-160 characters
2. Include main keywords
3. Accurately describe page content
4. Encourage user clicks
5. Address detected SEO issues

Please respond in English.

Please respond in JSON format:
{
  "description": "optimized Meta description",
  "analysis": "explanation of how it addresses SEO issues",
  "keywords": ["included keywords"]
}`;

            const response = await session.prompt(prompt);
            const aiResult = this.parseAIResponse(response);

            if (aiResult && aiResult.description) {
                return {
                    suggestion: aiResult.description,
                    reason: aiResult.analysis || 'AI-generated Meta description',
                    guidelines: [
                        'Control length to 120-160 characters',
                        'Include main keywords',
                        'Provide accurate page content summary',
                        'Use attractive language to encourage clicks'
                    ]
                };
            }
        }

        // Optimize existing description
        const topKeywords = this.extractTopKeywords(content.keywordDensity || {});
        
        const prompt = `Optimize the following webpage's Meta description based on SEO analysis results:

Detected Issues: ${issueDescriptions}
Current Description: "${currentDescription}"
Description Length: ${currentDescription.length} characters
Page Title: "${title}"
Main Keywords: ${topKeywords.slice(0, 5).join(', ')}
Length Issue: ${hasLengthIssue ? 'Yes' : 'No'}

Please provide optimization suggestions for the detected issues:
1. Analyze specific problems with the current description
2. Provide an optimized description that solves these problems (120-160 characters)
3. Explain how to solve each detected issue

Please respond in English.

Please respond in JSON format:
{
  "analysis": "analysis of detected issues",
  "optimizedDescription": "optimized description that solves the problems",
  "improvements": ["how to solve problem 1", "how to solve problem 2"]
}`;

        const response = await session.prompt(prompt);
        const aiResult = this.parseAIResponse(response);

        if (aiResult) {
            return {
                current: currentDescription,
                suggestion: aiResult.optimizedDescription || aiResult.description || 'Current description is already good',
                reason: aiResult.analysis || 'AI analysis-based optimization suggestion',
                improvements: aiResult.improvements || [],
                keywords: topKeywords.slice(0, 5),
                length: {
                    current: currentDescription.length,
                    optimal: '120-160 characters',
                    status: currentDescription.length >= 120 && currentDescription.length <= 160 ? 'good' : 'needs-improvement'
                }
            };
        }

        throw new Error('AI failed to generate valid Meta description optimization suggestions');
    }

    async generateContentImprovements(analysis, session, contentIssues = []) {
        const content = analysis.content || {};
        const headings = analysis.headings || {};
        const topKeywords = this.extractTopKeywords(content.keywordDensity || {});

        const issueDescriptions = contentIssues.map(issue => `${issue.title}: ${issue.description || ''}`).join('; ');
        
        const prompt = `Provide content improvement suggestions based on SEO analysis results:

Detected Issues: ${issueDescriptions}

Content Statistics:
- Word Count: ${content.wordCount || 0}
- Readability Score: ${content.readabilityScore || 0}/100
- H1 Count: ${headings.h1?.length || 0}
- H2 Count: ${headings.h2?.length || 0}
- Main Keywords: ${topKeywords.slice(0, 5).join(', ')}

Please provide improvement suggestions for the detected issues:
1. Analyze each detected issue
2. Provide solutions and specific steps
3. Prioritize suggestions

Please respond in English.

Please respond in JSON format:
{
  "improvements": [
    {
      "type": "detected issue type",
      "priority": "critical/high/medium/low",
      "title": "improvement title for specific issue",
      "description": "how to solve the detected issue",
      "suggestions": ["specific solution step 1", "specific solution step 2"]
    }
  ]
}`;

        const response = await session.prompt(prompt);
        const aiResult = this.parseAIResponse(response);

        if (aiResult && aiResult.improvements) {
            return aiResult.improvements;
        }

        throw new Error('AI failed to generate valid content improvement suggestions');
    }

    async generateKeywordSuggestions(analysis, session, keywordIssues = []) {
        const content = analysis.content || {};
        const title = analysis.metaTags?.title || '';
        const headings = analysis.headings || {};
        const existingKeywords = this.extractTopKeywords(content.keywordDensity || {});
        const h1Text = headings.h1?.[0] || '';

        const issueDescriptions = keywordIssues.length > 0
            ? keywordIssues.map(issue => `${issue.title}: ${issue.description || ''}`).join('; ')
            : 'Provide keyword optimization suggestions based on other SEO issues';
        
        const prompt = `Provide keyword optimization suggestions based on SEO analysis results:

Related Issues: ${issueDescriptions}
Page Title: "${title}"
H1 Title: "${h1Text}"
Current Keywords: ${existingKeywords.slice(0, 5).join(', ')}
Content Word Count: ${content.wordCount || 0}

Please provide four types of keyword suggestions to improve SEO performance:
1. Primary keywords (3-5, based on content analysis and SEO issues)
2. Secondary keywords (3-5, extracted and optimized from titles)
3. Long-tail keywords (5-8, including question-based and how-to types, addressing user search intent)
4. Semantic keywords (5-8, related concept words, improving content relevance)

Please respond in English.

Please respond in JSON format:
{
  "primary": ["keyword1", "keyword2"],
  "secondary": ["keyword1", "keyword2"],
  "longTail": ["long-tail keyword1", "long-tail keyword2"],
  "semantic": ["related word1", "related word2"]
}`;

        const response = await session.prompt(prompt);
        const aiResult = this.parseAIResponse(response);

        if (aiResult && (aiResult.primary || aiResult.secondary || aiResult.longTail || aiResult.semantic)) {
            return {
                primary: aiResult.primary || [],
                secondary: aiResult.secondary || [],
                longTail: aiResult.longTail || [],
                semantic: aiResult.semantic || []
            };
        }

        throw new Error('AI failed to generate valid keyword suggestions');
    }

    async generateStructureRecommendations(analysis, session, structureIssues = []) {
        const headings = analysis.headings || {};
        const content = analysis.content || {};
        const images = analysis.images || {};

        const issueDescriptions = structureIssues.map(issue => `${issue.title}: ${issue.description || ''}`).join('; ');
        
        const prompt = `Provide structure optimization suggestions based on SEO analysis results:

Detected Issues: ${issueDescriptions}

Current Structure Status:
- H1 Count: ${headings.h1?.length || 0}
- H2 Count: ${headings.h2?.length || 0}
- H3 Count: ${headings.h3?.length || 0}
- Total Word Count: ${content.wordCount || 0}
- Image Count: ${images.totalImages || 0}
- Images Without Alt: ${images.imagesWithoutAlt || 0}
- Internal Links: ${analysis.links?.internalLinks || 0}

Please provide structure optimization suggestions for the detected issues:
1. Analyze each detected structure issue
2. Provide specific solutions
3. Give detailed implementation steps
4. Prioritize by importance

Please respond in English.

Please respond in JSON format:
{
  "recommendations": [
    {
      "type": "detected issue type",
      "priority": "critical/high/medium/low",
      "title": "solution for specific issue",
      "description": "how to solve the detected structure issue",
      "steps": ["specific implementation step 1", "specific implementation step 2"]
    }
  ]
}`;

        const response = await session.prompt(prompt);
        const aiResult = this.parseAIResponse(response);

        if (aiResult && aiResult.recommendations) {
            return aiResult.recommendations;
        }

        throw new Error('AI failed to generate valid structure optimization suggestions');
    }

    // Helper methods
    parseAIResponse(response) {
        try {
            // Try to parse JSON response
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // If not JSON format, try to parse structured text
            const lines = response.split('\n').filter(line => line.trim());
            const result = {};

            for (const line of lines) {
                if (line.includes('optimized title') || line.includes('suggested title')) {
                    const titleMatch = line.match(/[:：]\s*[""]?([^"""]+)[""]?/);
                    if (titleMatch) result.optimizedTitle = titleMatch[1].trim();
                }
                if (line.includes('analysis') || line.includes('issue')) {
                    const analysisMatch = line.match(/[:：]\s*(.+)/);
                    if (analysisMatch) result.analysis = analysisMatch[1].trim();
                }
            }

            return Object.keys(result).length > 0 ? result : null;
        } catch (error) {
            console.warn('[AI Optimizer] Failed to parse AI response:', error);
            return null;
        }
    }

    extractTopKeywords(keywordDensity) {
        return Object.entries(keywordDensity)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10)
            .map(([keyword]) => keyword);
    }
}

// Export AI content optimizer
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIContentOptimizer;
} else if (typeof window !== 'undefined') {
    window.AIContentOptimizer = AIContentOptimizer;
}