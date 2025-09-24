// AI Content Optimizer
// 基于Gemini Nano的AI内容优化服务

class AIContentOptimizer {
    constructor() {
        this.session = null;
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
            const availability = await LanguageModel.availability();
            console.log('[AI Optimizer] Gemini Nano状态:', availability);

            if (availability !== 'available') {
                throw new Error(`Gemini Nano不可用。状态: ${availability || 'unknown'}。请确保使用Chrome 127+版本并启用Prompt API功能：chrome://flags/#prompt-api-for-gemini-nano`);
            }

            // 创建AI会话
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

            if (keywordIssues.length > 0 || Object.keys(optimizations).length > 0) {
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

        // 分析具体的标题问题
        const issueDescriptions = titleIssues.map(issue => issue.description || issue.title).join('；');
        const hasLengthIssue = titleIssues.some(issue => issue.id === 'title-length' || issue.title.includes('长度'));
        const isMissing = titleIssues.some(issue => issue.id === 'missing-title' || issue.title.includes('缺少'));

        if (!currentTitle || isMissing) {
            const topKeywords = this.extractTopKeywords(content.keywordDensity || {});
            const h1Text = headings.h1?.[0] || '';

            const prompt = `为以下网页生成SEO优化的标题：

SEO问题: ${issueDescriptions}
H1标题: "${h1Text}"
主要关键词: ${topKeywords.slice(0, 5).join(', ')}
页面字数: ${content.wordCount || 0} 字

要求：
1. 长度30-60字符
2. 包含主要关键词
3. 具有描述性和吸引力
4. 解决检测到的SEO问题

请用JSON格式回复：
{
  "suggestion": "建议的标题",
  "reason": "生成说明，说明如何解决SEO问题",
  "keywords": ["包含的关键词"]
}`;

            const response = await session.prompt(prompt);
            const aiResult = this.parseAIResponse(response);

            if (aiResult && aiResult.suggestion) {
                return {
                    suggestion: aiResult.suggestion,
                    reason: aiResult.reason || '基于AI生成的标题建议',
                    keywords: aiResult.keywords || topKeywords.slice(0, 5),
                    examples: [
                        '基于页面主要内容创建描述性标题',
                        '包含主要关键词，长度控制在30-60字符',
                        '确保标题独特且吸引人'
                    ]
                };
            }
        }

        // 优化现有标题
        const topKeywords = this.extractTopKeywords(content.keywordDensity || {});
        const h1Text = headings.h1?.[0] || '';

        const prompt = `基于SEO检查结果优化以下网页标题：

检测到的问题: ${issueDescriptions}
当前标题: "${currentTitle}"
标题长度: ${currentTitle.length} 字符
H1标题: "${h1Text}"
主要关键词: ${topKeywords.slice(0, 5).join(', ')}
页面字数: ${content.wordCount || 0} 字
长度问题: ${hasLengthIssue ? '是' : '否'}

请针对检测到的具体问题提供优化建议：
1. 分析当前标题存在的具体问题
2. 提供解决这些问题的优化标题（30-60字符）
3. 说明如何解决每个检测到的问题
4. 推荐关键词（最多5个）

请用JSON格式回复：
{
  "analysis": "针对检测问题的分析",
  "optimizedTitle": "解决问题的优化标题",
  "improvements": ["如何解决问题1", "如何解决问题2"],
  "keywords": ["关键词1", "关键词2"]
}`;

        console.log('[AI Optimizer] 发送标题优化提示到Gemini Nano...');
        const response = await session.prompt(prompt);
        console.log('[AI Optimizer] 收到标题优化响应:', response.substring(0, 200) + '...');
        const aiResult = this.parseAIResponse(response);

        if (aiResult) {
            return {
                current: currentTitle,
                suggestion: aiResult.optimizedTitle || currentTitle,
                reason: aiResult.analysis || '基于AI分析的优化建议',
                improvements: aiResult.improvements || [],
                keywords: aiResult.keywords || topKeywords.slice(0, 5),
                length: {
                    current: currentTitle.length,
                    optimal: '30-60字符',
                    status: currentTitle.length >= 30 && currentTitle.length <= 60 ? 'good' : 'needs-improvement'
                }
            };
        }

        throw new Error('AI未能生成有效的标题优化建议');
    }

    async optimizeMetaDescription(analysis, session, metaIssues = []) {
        const currentDescription = analysis.metaTags?.description || '';
        const content = analysis.content || {};
        const title = analysis.metaTags?.title || '';

        // 分析具体的Meta描述问题
        const issueDescriptions = metaIssues.map(issue => issue.description || issue.title).join('；');
        const hasLengthIssue = metaIssues.some(issue => issue.id === 'description-length' || issue.title.includes('长度'));
        const isMissing = metaIssues.some(issue => issue.id === 'missing-description' || issue.title.includes('缺少'));

        if (!currentDescription || isMissing) {
            const topKeywords = this.extractTopKeywords(content.keywordDensity || {});
            const h1Text = analysis.headings?.h1?.[0] || '';

            const prompt = `为以下网页生成SEO优化的Meta描述：

SEO问题: ${issueDescriptions}
页面标题: "${title}"
H1标题: "${h1Text}"
主要关键词: ${topKeywords.slice(0, 5).join(', ')}
页面字数: ${content.wordCount || 0} 字

要求：
1. 长度120-160字符
2. 包含主要关键词
3. 准确描述页面内容
4. 吸引用户点击
5. 解决检测到的SEO问题

请用JSON格式回复：
{
  "description": "优化的Meta描述",
  "analysis": "生成说明，说明如何解决SEO问题",
  "keywords": ["包含的关键词"]
}`;

            const response = await session.prompt(prompt);
            const aiResult = this.parseAIResponse(response);

            if (aiResult && aiResult.description) {
                return {
                    suggestion: aiResult.description,
                    reason: aiResult.analysis || '基于AI生成的Meta描述',
                    guidelines: [
                        '长度控制在120-160字符',
                        '包含主要关键词',
                        '提供页面内容的准确摘要',
                        '使用吸引人的语言鼓励点击'
                    ]
                };
            }
        }

        // 优化现有描述
        const topKeywords = this.extractTopKeywords(content.keywordDensity || {});

        const prompt = `基于SEO检查结果优化以下网页的Meta描述：

检测到的问题: ${issueDescriptions}
当前描述: "${currentDescription}"
描述长度: ${currentDescription.length} 字符
页面标题: "${title}"
主要关键词: ${topKeywords.slice(0, 5).join(', ')}
长度问题: ${hasLengthIssue ? '是' : '否'}

请针对检测到的具体问题提供优化建议：
1. 分析当前描述存在的具体问题
2. 提供解决这些问题的优化描述（120-160字符）
3. 说明如何解决每个检测到的问题

请用JSON格式回复：
{
  "analysis": "针对检测问题的分析",
  "optimizedDescription": "解决问题的优化描述",
  "improvements": ["如何解决问题1", "如何解决问题2"]
}`;

        const response = await session.prompt(prompt);
        const aiResult = this.parseAIResponse(response);

        if (aiResult) {
            return {
                current: currentDescription,
                suggestion: aiResult.optimizedDescription || currentDescription,
                reason: aiResult.analysis || '基于AI分析的优化建议',
                improvements: aiResult.improvements || [],
                keywords: topKeywords.slice(0, 5),
                length: {
                    current: currentDescription.length,
                    optimal: '120-160字符',
                    status: currentDescription.length >= 120 && currentDescription.length <= 160 ? 'good' : 'needs-improvement'
                }
            };
        }

        throw new Error('AI未能生成有效的Meta描述优化建议');
    }

    async generateContentImprovements(analysis, session, contentIssues = []) {
        const content = analysis.content || {};
        const headings = analysis.headings || {};
        const topKeywords = this.extractTopKeywords(content.keywordDensity || {});

        // 分析具体的内容问题
        const issueDescriptions = contentIssues.map(issue => `${issue.title}: ${issue.description || ''}`).join('；');

        const prompt = `基于SEO检查结果提供内容改进建议：

检测到的问题: ${issueDescriptions}

内容统计:
- 字数: ${content.wordCount || 0}
- 可读性评分: ${content.readabilityScore || 0}/100
- H1标题数量: ${headings.h1?.length || 0}
- H2标题数量: ${headings.h2?.length || 0}
- 主要关键词: ${topKeywords.slice(0, 5).join(', ')}

请针对检测到的具体问题提供改进建议：
1. 分析每个检测到的问题
2. 提供解决方案和具体步骤
3. 按优先级排序建议

请用JSON格式回复：
{
  "improvements": [
    {
      "type": "检测到的问题类型",
      "priority": "critical/high/medium/low",
      "title": "针对具体问题的改进标题",
      "description": "如何解决检测到的问题",
      "suggestions": ["具体解决步骤1", "具体解决步骤2"]
    }
  ]
}`;

        const response = await session.prompt(prompt);
        const aiResult = this.parseAIResponse(response);

        if (aiResult && aiResult.improvements) {
            return aiResult.improvements;
        }

        throw new Error('AI未能生成有效的内容改进建议');
    }

    async generateKeywordSuggestions(analysis, session, keywordIssues = []) {
        const content = analysis.content || {};
        const title = analysis.metaTags?.title || '';
        const headings = analysis.headings || {};
        const existingKeywords = this.extractTopKeywords(content.keywordDensity || {});
        const h1Text = headings.h1?.[0] || '';

        // 分析关键词相关问题
        const issueDescriptions = keywordIssues.length > 0
            ? keywordIssues.map(issue => `${issue.title}: ${issue.description || ''}`).join('；')
            : '基于其他SEO问题提供关键词优化建议';

        const prompt = `基于SEO检查结果提供关键词优化建议：

相关问题: ${issueDescriptions}
页面标题: "${title}"
H1标题: "${h1Text}"
当前关键词: ${existingKeywords.slice(0, 5).join(', ')}
内容字数: ${content.wordCount || 0}

请提供四类关键词建议来改善SEO表现：
1. 主要关键词（3-5个，基于内容分析和SEO问题）
2. 次要关键词（3-5个，从标题提取和优化）
3. 长尾关键词（5-8个，包含疑问式、方法类，解决用户搜索意图）
4. 语义相关词（5-8个，相关概念词汇，提升内容相关性）

请用JSON格式回复：
{
  "primary": [{"keyword": "关键词", "suggestion": "如何使用来解决SEO问题"}],
  "secondary": [{"keyword": "关键词", "suggestion": "使用建议"}],
  "longTail": [{"keyword": "长尾关键词", "suggestion": "使用建议"}],
  "semantic": [{"keyword": "相关词", "suggestion": "使用建议"}]
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

        throw new Error('AI未能生成有效的关键词建议');
    }

    async generateStructureRecommendations(analysis, session, structureIssues = []) {
        const headings = analysis.headings || {};
        const content = analysis.content || {};
        const images = analysis.images || {};

        // 分析具体的结构问题
        const issueDescriptions = structureIssues.map(issue => `${issue.title}: ${issue.description || ''}`).join('；');

        const prompt = `基于SEO检查结果提供结构优化建议：

检测到的问题: ${issueDescriptions}

当前结构状况:
- H1数量: ${headings.h1?.length || 0}
- H2数量: ${headings.h2?.length || 0}
- H3数量: ${headings.h3?.length || 0}
- 总字数: ${content.wordCount || 0}
- 图片数量: ${images.totalImages || 0}
- 缺少Alt属性的图片: ${images.imagesWithoutAlt || 0}
- 内部链接: ${analysis.links?.internalLinks || 0}

请针对检测到的具体问题提供结构优化建议：
1. 分析每个检测到的结构问题
2. 提供具体的解决方案
3. 给出详细的实施步骤
4. 按优先级排序

请用JSON格式回复：
{
  "recommendations": [
    {
      "type": "检测到的问题类型",
      "priority": "critical/high/medium/low",
      "title": "针对具体问题的解决方案",
      "description": "如何解决检测到的结构问题",
      "implementation": ["具体实施步骤1", "具体实施步骤2"]
    }
  ]
}`;

        const response = await session.prompt(prompt);
        const aiResult = this.parseAIResponse(response);

        if (aiResult && aiResult.recommendations) {
            return aiResult.recommendations;
        }

        throw new Error('AI未能生成有效的结构优化建议');
    }

    // 辅助方法
    parseAIResponse(response) {
        try {
            // 尝试解析JSON响应
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }

            // 如果不是JSON格式，尝试解析结构化文本
            const lines = response.split('\n').filter(line => line.trim());
            const result = {};

            for (const line of lines) {
                if (line.includes('优化后的标题') || line.includes('建议标题')) {
                    const titleMatch = line.match(/[:：]\s*[""]?([^"""]+)[""]?/);
                    if (titleMatch) result.optimizedTitle = titleMatch[1].trim();
                }
                if (line.includes('分析') || line.includes('问题')) {
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

// 导出AI内容优化器
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIContentOptimizer;
} else if (typeof window !== 'undefined') {
    window.AIContentOptimizer = AIContentOptimizer;
}