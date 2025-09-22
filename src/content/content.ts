/**
 * Content Script Entry Point
 * 初始化页面分析主控制器并设置消息监听
 */

import { ContentAnalyzer } from './content-analyzer';

// 全局ContentAnalyzer实例
let contentAnalyzer: ContentAnalyzer | null = null;

/**
 * 初始化Content Script
 */
function initializeContentScript(): void {
  try {
    // 创建ContentAnalyzer实例
    contentAnalyzer = new ContentAnalyzer();
    
    // 初始化分析器
    contentAnalyzer.initialize();
    
    console.log('SEO Checker Content Script initialized');
  } catch (error) {
    console.error('Failed to initialize SEO Checker Content Script:', error);
  }
}

/**
 * 清理Content Script
 */
function cleanupContentScript(): void {
  if (contentAnalyzer) {
    contentAnalyzer.cleanup();
    contentAnalyzer = null;
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// 页面卸载时清理
window.addEventListener('beforeunload', cleanupContentScript);

// 导出给测试使用
if (typeof window !== 'undefined') {
  (window as any).seoCheckerContentAnalyzer = contentAnalyzer;
}