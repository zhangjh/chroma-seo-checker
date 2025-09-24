// Page Highlighter - 在页面上直接标记SEO问题
class PageHighlighter {
  constructor() {
    this.highlightedElements = [];
    this.overlayId = 'seo-checker-overlay';
  }

  // 高亮显示问题元素
  highlightIssues(issues) {
    this.clearHighlights();
    
    issues.forEach((issue, index) => {
      // 使用原始索引，如果没有则使用当前索引
      const issueIndex = issue.originalIndex !== undefined ? issue.originalIndex : index;
      
      if (issue.selector) {
        this.highlightElementsBySelector(issue.selector, issue.severity, issueIndex, issue.title);
      } else {
        // 对于没有selector的问题，也要添加到highlightedElements中
        this.highlightedElements.push({
          element: null,
          issueIndex: issueIndex,
          title: issue.title,
          targetElement: null,
          isNotFound: true,
          notification: null
        });
      }
    });
  }

  // 根据选择器高亮元素
  highlightElementsBySelector(selector, severity, issueIndex, title) {
    try {
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        // 如果没找到元素，显示一个通知
        this.showNotFoundNotification(title, selector, issueIndex);
      } else {
        elements.forEach((element, elementIndex) => {
          this.addHighlight(element, severity, issueIndex, elementIndex, title);
        });
      }
    } catch (e) {
      this.showNotFoundNotification(title, selector, issueIndex);
    }
  }

  // 显示未找到元素的通知
  showNotFoundNotification(title, selector, issueIndex) {
    // 先移除现有的同类通知
    const existingNotifications = document.querySelectorAll('.seo-not-found-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    const notification = document.createElement('div');
    notification.className = 'seo-not-found-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ff6b6b;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      font-family: Arial, sans-serif;
      z-index: 1000000;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      max-width: 300px;
      cursor: pointer;
      animation: slideInRight 0.3s ease-out;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div>
          <div style="font-weight: bold; margin-bottom: 4px;">⚠️ 元素缺失</div>
          <div style="font-size: 12px; opacity: 0.9;">${title}</div>
          <div style="font-size: 11px; opacity: 0.7; margin-top: 4px;">这正是需要修复的问题</div>
        </div>
        <div style="font-size: 16px; line-height: 1; margin-left: 8px;" onclick="this.parentElement.parentElement.remove()">×</div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // 点击通知关闭
    notification.addEventListener('click', () => {
      notification.remove();
    });
    
    // 5秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
    
    // 存储到highlightedElements中，使用正确的issueIndex
    this.highlightedElements.push({
      element: null,
      issueIndex: issueIndex,
      title: title,
      targetElement: null,
      isNotFound: true,
      notification: notification
    });
  }

  // 为单个元素添加高亮
  addHighlight(element, severity, issueIndex, elementIndex, title) {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    const highlight = document.createElement('div');
    highlight.className = `seo-highlight seo-${severity}`;
    highlight.style.cssText = `
      position: absolute;
      top: ${rect.top + scrollTop}px;
      left: ${rect.left + scrollLeft}px;
      width: ${rect.width}px;
      height: ${rect.height}px;
      border: 3px solid ${this.getSeverityColor(severity)};
      background: ${this.getSeverityColor(severity)}20;
      pointer-events: none;
      z-index: 999999;
      box-sizing: border-box;
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 12px rgba(0, 0, 0, 0.4);
    `;

    // 添加问题标签
    const label = document.createElement('div');
    label.className = 'seo-highlight-label';
    label.textContent = `${issueIndex + 1}`;
    label.style.cssText = `
      position: absolute;
      top: -8px;
      left: -8px;
      width: 20px;
      height: 20px;
      background: ${this.getSeverityColor(severity)};
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: bold;
      font-family: Arial, sans-serif;
    `;

    highlight.appendChild(label);
    document.body.appendChild(highlight);
    this.highlightedElements.push({
      element: highlight,
      issueIndex: issueIndex,
      title: title,
      targetElement: element
    });

    // 添加点击事件显示详情
    label.style.pointerEvents = 'auto';
    label.style.cursor = 'pointer';
    label.addEventListener('click', () => {
      this.showIssueTooltip(highlight, title, element);
    });
  }

  // 显示问题提示
  showIssueTooltip(highlight, title, element) {
    // 移除现有提示
    const existingTooltip = document.querySelector('.seo-tooltip');
    if (existingTooltip) {
      existingTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'seo-tooltip';
    tooltip.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
        <div class="seo-tooltip-title">${title}</div>
        <div style="cursor: pointer; color: #ccc; font-size: 16px; line-height: 1; margin-left: 8px;" onclick="this.parentElement.parentElement.remove()">×</div>
      </div>
      <div class="seo-tooltip-element">${element.tagName.toLowerCase()}</div>
      <div class="seo-tooltip-text">${element.textContent?.substring(0, 100) || '无文本内容'}...</div>
    `;
    
    tooltip.style.cssText = `
      position: fixed;
      background: #333;
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 13px;
      font-family: Arial, sans-serif;
      max-width: 280px;
      z-index: 1000000;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.1);
    `;

    document.body.appendChild(tooltip);

    // 获取高亮元素在视口中的位置
    const rect = highlight.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // 计算最佳位置
    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left;
    
    // 如果上方空间不够，显示在下方
    if (top < 10) {
      top = rect.bottom + 10;
    }
    
    // 如果右侧空间不够，调整到左侧
    if (left + tooltipRect.width > window.innerWidth - 10) {
      left = window.innerWidth - tooltipRect.width - 10;
    }
    
    // 确保不超出左边界
    if (left < 10) {
      left = 10;
    }
    
    // 确保不超出下边界
    if (top + tooltipRect.height > window.innerHeight - 10) {
      top = window.innerHeight - tooltipRect.height - 10;
    }

    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';

    // 5秒后自动移除
    setTimeout(() => {
      if (tooltip.parentNode) {
        tooltip.remove();
      }
    }, 5000);
  }

  // 获取严重程度对应的颜色
  getSeverityColor(severity) {
    const colors = {
      critical: '#dc3545',
      high: '#fd7e14', 
      medium: '#ffc107',
      low: '#28a745'
    };
    return colors[severity] || '#6c757d';
  }

  // 清除所有高亮
  clearHighlights() {
    this.highlightedElements.forEach(item => {
      if (item.element && item.element.parentNode) {
        item.element.parentNode.removeChild(item.element);
      }
    });
    this.highlightedElements = [];

    // 清除提示
    const tooltips = document.querySelectorAll('.seo-tooltip');
    tooltips.forEach(tooltip => tooltip.remove());
    
    // 清除未找到通知
    const notifications = document.querySelectorAll('.seo-not-found-notification');
    notifications.forEach(notification => notification.remove());
  }

  // 滚动到指定问题
  scrollToIssue(issueIndex) {
    // 查找匹配的高亮项
    const highlightItem = this.highlightedElements.find(item => item.issueIndex === issueIndex);
    
    if (highlightItem) {
      if (highlightItem.element) {
        highlightItem.element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // 显示问题详情
        setTimeout(() => {
          this.showIssueTooltip(highlightItem.element, highlightItem.title, highlightItem.targetElement);
        }, 500);
      } else if (highlightItem.isNotFound) {
        // 对于元素缺失的问题，重新显示通知
        this.showNotFoundNotification(highlightItem.title, '', issueIndex);
      } else {
        this.showScrollNotification(issueIndex);
      }
    } else {
      // 降级方案：使用数组索引
      const fallbackItem = this.highlightedElements[issueIndex];
      if (fallbackItem) {
        if (fallbackItem.element) {
          fallbackItem.element.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          setTimeout(() => {
            this.showIssueTooltip(fallbackItem.element, fallbackItem.title, fallbackItem.targetElement);
          }, 500);
        } else {
          this.showNotFoundNotification(fallbackItem.title, '', issueIndex);
        }
      } else {
        this.showScrollNotification(issueIndex);
      }
    }
  }

  // 显示滚动通知
  showScrollNotification(issueIndex) {
    const notification = document.createElement('div');
    notification.className = 'seo-scroll-notification';
    notification.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #007bff;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-family: Arial, sans-serif;
      z-index: 1000001;
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
      text-align: center;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 4px;">问题 #${issueIndex + 1}</div>
      <div style="font-size: 12px;">该问题对应的页面元素不存在或无法定位</div>
    `;
    
    document.body.appendChild(notification);
    
    // 2秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 2000);
  }

  // 添加CSS样式
  injectStyles() {
    if (document.querySelector('#seo-checker-styles')) return;

    const style = document.createElement('style');
    style.id = 'seo-checker-styles';
    style.textContent = `
      @keyframes seo-flash {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }
      
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .seo-highlight {
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.8), 0 0 8px rgba(0, 0, 0, 0.3) !important;
      }
      
      .seo-tooltip-title {
        font-weight: bold;
        margin-bottom: 6px;
        color: #fff;
        font-size: 14px;
      }
      
      .seo-tooltip-element {
        color: #ffc107;
        font-family: 'Courier New', monospace;
        margin-bottom: 6px;
        font-size: 12px;
        background: rgba(255, 193, 7, 0.1);
        padding: 2px 6px;
        border-radius: 3px;
        display: inline-block;
      }
      
      .seo-tooltip-text {
        font-size: 12px;
        opacity: 0.9;
        line-height: 1.4;
        color: #e0e0e0;
      }
    `;
    document.head.appendChild(style);
  }
}

// 导出
if (typeof window !== 'undefined') {
  window.PageHighlighter = PageHighlighter;
}