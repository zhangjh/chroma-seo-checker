/**
 * HeadingStructureAnalyzer - 标题结构分析器
 * 分析H1-H6标签层次结构
 * 检查标题的SEO最佳实践
 */
export class HeadingStructureAnalyzer {
    constructor(document) {
        this.document = document;
    }
    /**
     * 分析页面标题结构
     */
    analyzeHeadingStructure() {
        const headings = this.extractAllHeadings();
        const hierarchy = this.buildHeadingHierarchy();
        return {
            h1: headings.h1,
            h2: headings.h2,
            h3: headings.h3,
            h4: headings.h4,
            h5: headings.h5,
            h6: headings.h6,
            hierarchy: hierarchy
        };
    }
    /**
     * 提取所有标题元素的文本内容
     */
    extractAllHeadings() {
        const headings = {
            h1: this.extractHeadingsByLevel('h1'),
            h2: this.extractHeadingsByLevel('h2'),
            h3: this.extractHeadingsByLevel('h3'),
            h4: this.extractHeadingsByLevel('h4'),
            h5: this.extractHeadingsByLevel('h5'),
            h6: this.extractHeadingsByLevel('h6')
        };
        return headings;
    }
    /**
     * 根据标题级别提取标题文本
     */
    extractHeadingsByLevel(level) {
        const elements = this.document.querySelectorAll(level);
        const headings = [];
        elements.forEach((element) => {
            const text = element.textContent?.trim();
            if (text) {
                headings.push(text);
            }
        });
        return headings;
    }
    /**
     * 构建标题层次结构
     */
    buildHeadingHierarchy() {
        const allHeadings = this.document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const hierarchy = [];
        allHeadings.forEach((element, index) => {
            const level = parseInt(element.tagName.charAt(1));
            const text = element.textContent?.trim() || '';
            const cssSelector = this.generateCSSSelector(element, index);
            hierarchy.push({
                level: level,
                text: text,
                element: cssSelector
            });
        });
        return hierarchy;
    }
    /**
     * 生成元素的CSS选择器
     */
    generateCSSSelector(element, index) {
        const tagName = element.tagName.toLowerCase();
        // 如果有ID，使用ID选择器
        if (element.id) {
            return `#${element.id}`;
        }
        // 如果有class，使用class选择器
        if (element.className) {
            const classes = element.className.split(' ').filter(cls => cls.trim());
            if (classes.length > 0) {
                return `.${classes.join('.')}`;
            }
        }
        // 使用标签名和nth-child选择器
        return `${tagName}:nth-child(${index + 1})`;
    }
    /**
     * 验证标题结构的SEO最佳实践
     */
    validateHeadingStructure(structure) {
        const issues = [];
        const recommendations = [];
        // 检查H1标签
        if (structure.h1.length === 0) {
            issues.push('页面缺少H1标签');
            recommendations.push('添加一个H1标签作为页面主标题');
        }
        else if (structure.h1.length > 1) {
            issues.push('页面有多个H1标签');
            recommendations.push('每个页面应该只有一个H1标签');
        }
        // 检查标题层次结构
        const hierarchyIssues = this.validateHierarchy(structure.hierarchy);
        issues.push(...hierarchyIssues.issues);
        recommendations.push(...hierarchyIssues.recommendations);
        // 检查标题长度
        const lengthIssues = this.validateHeadingLengths(structure);
        issues.push(...lengthIssues.issues);
        recommendations.push(...lengthIssues.recommendations);
        // 检查标题内容质量
        const contentIssues = this.validateHeadingContent(structure);
        issues.push(...contentIssues.issues);
        recommendations.push(...contentIssues.recommendations);
        return {
            isValid: issues.length === 0,
            issues,
            recommendations
        };
    }
    /**
     * 验证标题层次结构的逻辑性
     */
    validateHierarchy(hierarchy) {
        const issues = [];
        const recommendations = [];
        if (hierarchy.length === 0) {
            return { issues, recommendations };
        }
        let previousLevel = 0;
        let hasSkippedLevel = false;
        hierarchy.forEach((heading, index) => {
            // 检查是否跳过了标题级别
            if (previousLevel > 0 && heading.level > previousLevel + 1) {
                hasSkippedLevel = true;
                issues.push(`标题层次跳跃：从H${previousLevel}直接跳到H${heading.level}`);
            }
            previousLevel = heading.level;
        });
        if (hasSkippedLevel) {
            recommendations.push('保持标题层次的连续性，不要跳过标题级别');
        }
        // 检查第一个标题是否为H1
        if (hierarchy[0].level !== 1) {
            issues.push('页面第一个标题不是H1');
            recommendations.push('页面应该以H1标题开始');
        }
        return { issues, recommendations };
    }
    /**
     * 验证标题长度
     */
    validateHeadingLengths(structure) {
        const issues = [];
        const recommendations = [];
        // 检查H1长度
        structure.h1.forEach((h1Text) => {
            if (h1Text.length < 10) {
                issues.push('H1标题过短');
                recommendations.push('H1标题建议在10-70个字符之间');
            }
            else if (h1Text.length > 70) {
                issues.push('H1标题过长');
                recommendations.push('H1标题建议在10-70个字符之间');
            }
        });
        // 检查其他标题长度
        const allHeadings = [
            ...structure.h2,
            ...structure.h3,
            ...structure.h4,
            ...structure.h5,
            ...structure.h6
        ];
        allHeadings.forEach((headingText) => {
            if (headingText.length > 100) {
                issues.push('标题过长');
                recommendations.push('标题长度建议控制在100个字符以内');
            }
        });
        return { issues, recommendations };
    }
    /**
     * 验证标题内容质量
     */
    validateHeadingContent(structure) {
        const issues = [];
        const recommendations = [];
        const allHeadings = [
            ...structure.h1,
            ...structure.h2,
            ...structure.h3,
            ...structure.h4,
            ...structure.h5,
            ...structure.h6
        ];
        // 检查重复标题
        const headingCounts = new Map();
        allHeadings.forEach((heading) => {
            const count = headingCounts.get(heading) || 0;
            headingCounts.set(heading, count + 1);
        });
        headingCounts.forEach((count, heading) => {
            if (count > 1) {
                issues.push(`重复的标题内容: "${heading}"`);
                recommendations.push('避免使用重复的标题内容，每个标题应该是唯一的');
            }
        });
        // 检查空标题
        allHeadings.forEach((heading) => {
            if (!heading.trim()) {
                issues.push('存在空标题');
                recommendations.push('所有标题都应该包含有意义的文本内容');
            }
        });
        // 检查标题是否过于简单
        allHeadings.forEach((heading) => {
            if (heading.length < 3) {
                issues.push('标题内容过于简单');
                recommendations.push('标题应该提供有意义的描述信息');
            }
        });
        return { issues, recommendations };
    }
    /**
     * 获取标题结构统计信息
     */
    getHeadingStatistics(structure) {
        const allHeadings = [
            ...structure.h1,
            ...structure.h2,
            ...structure.h3,
            ...structure.h4,
            ...structure.h5,
            ...structure.h6
        ];
        const distribution = {
            h1: structure.h1.length,
            h2: structure.h2.length,
            h3: structure.h3.length,
            h4: structure.h4.length,
            h5: structure.h5.length,
            h6: structure.h6.length
        };
        const lengths = allHeadings.map(h => h.length);
        const averageLength = lengths.length > 0 ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
        let longestHeading = '';
        let shortestHeading = '';
        if (allHeadings.length > 0) {
            longestHeading = allHeadings.reduce((a, b) => a.length > b.length ? a : b);
            shortestHeading = allHeadings.reduce((a, b) => a.length < b.length ? a : b);
        }
        return {
            totalHeadings: allHeadings.length,
            headingDistribution: distribution,
            averageLength: Math.round(averageLength * 100) / 100,
            longestHeading,
            shortestHeading
        };
    }
}
