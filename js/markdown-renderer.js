/**
 * Lightweight Markdown Renderer for SEO Checker
 * Supports basic markdown syntax for AI suggestions
 */

class MarkdownRenderer {
  constructor() {
    this.rules = {
      // Headers
      h1: /^# (.+)$/gm,
      h2: /^## (.+)$/gm,
      h3: /^### (.+)$/gm,
      h4: /^#### (.+)$/gm,
      h5: /^##### (.+)$/gm,
      h6: /^###### (.+)$/gm,
      
      // Text formatting
      bold: /\*\*(.*?)\*\*/g,
      italic: /\*(.*?)\*/g,
      code: /`([^`]+)`/g,
      
      // Lists
      unorderedList: /^[\s]*[-*+]\s+(.+)$/gm,
      orderedList: /^[\s]*\d+\.\s+(.+)$/gm,
      
      // Links
      link: /\[([^\]]+)\]\(([^)]+)\)/g,
      
      // Line breaks
      lineBreak: /\n\n/g,
      singleBreak: /\n/g,
      
      // Code blocks
      codeBlock: /```([\s\S]*?)```/g,
      
      // Blockquotes
      blockquote: /^> (.+)$/gm,
      
      // Horizontal rules
      hr: /^---$/gm
    };
  }

  /**
   * Convert markdown text to HTML
   * @param {string} markdown - The markdown text to convert
   * @returns {string} - The converted HTML
   */
  render(markdown) {
    if (!markdown || typeof markdown !== 'string') {
      return '';
    }

    let html = markdown;

    // Process code blocks first to avoid interference
    html = html.replace(this.rules.codeBlock, (match, code) => {
      return `<pre><code>${this.escapeHtml(code.trim())}</code></pre>`;
    });

    // Process headers
    html = html.replace(this.rules.h6, '<h6>$1</h6>');
    html = html.replace(this.rules.h5, '<h5>$1</h5>');
    html = html.replace(this.rules.h4, '<h4>$1</h4>');
    html = html.replace(this.rules.h3, '<h3>$1</h3>');
    html = html.replace(this.rules.h2, '<h2>$1</h2>');
    html = html.replace(this.rules.h1, '<h1>$1</h1>');

    // Process text formatting
    html = html.replace(this.rules.bold, '<strong>$1</strong>');
    html = html.replace(this.rules.italic, '<em>$1</em>');
    html = html.replace(this.rules.code, '<code>$1</code>');

    // Process links
    html = html.replace(this.rules.link, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Process blockquotes
    html = html.replace(this.rules.blockquote, '<blockquote>$1</blockquote>');

    // Process horizontal rules
    html = html.replace(this.rules.hr, '<hr>');

    // Process lists
    html = this.processLists(html);

    // Process line breaks
    html = html.replace(this.rules.lineBreak, '</p><p>');
    html = html.replace(this.rules.singleBreak, '<br>');

    // Wrap in paragraphs if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p>${html}</p>`;
    }

    return html;
  }

  /**
   * Process unordered and ordered lists
   * @param {string} html - The HTML string to process
   * @returns {string} - The processed HTML with lists
   */
  processLists(html) {
    // Process unordered lists
    const unorderedMatches = html.match(/^[\s]*[-*+]\s+.+$/gm);
    if (unorderedMatches) {
      const listItems = unorderedMatches.map(item => {
        const content = item.replace(/^[\s]*[-*+]\s+/, '');
        return `<li>${content}</li>`;
      }).join('');
      
      // Replace the original list items with the formatted list
      let listHtml = html;
      unorderedMatches.forEach(item => {
        listHtml = listHtml.replace(item, '');
      });
      listHtml = listHtml.replace(/\n\n/g, `</ul>\n\n<ul>${listItems}\n`);
      
      // Wrap in ul tags
      if (listItems) {
        listHtml = listHtml.replace(/(<ul>[\s\S]*?<\/ul>)/g, (match) => {
          if (!match.includes('<li>')) {
            return `<ul>${listItems}</ul>`;
          }
          return match;
        });
        
        // If no ul tags were added, add them
        if (!listHtml.includes('<ul>') && listItems) {
          listHtml = listHtml + `<ul>${listItems}</ul>`;
        }
      }
      
      html = listHtml;
    }

    // Process ordered lists
    const orderedMatches = html.match(/^[\s]*\d+\.\s+.+$/gm);
    if (orderedMatches) {
      const listItems = orderedMatches.map(item => {
        const content = item.replace(/^[\s]*\d+\.\s+/, '');
        return `<li>${content}</li>`;
      }).join('');
      
      // Replace the original list items with the formatted list
      let listHtml = html;
      orderedMatches.forEach(item => {
        listHtml = listHtml.replace(item, '');
      });
      
      // Wrap in ol tags
      if (listItems) {
        listHtml = listHtml + `<ol>${listItems}</ol>`;
      }
      
      html = listHtml;
    }

    return html;
  }

  /**
   * Escape HTML characters to prevent XSS
   * @param {string} text - The text to escape
   * @returns {string} - The escaped text
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render markdown with custom CSS classes for styling
   * @param {string} markdown - The markdown text
   * @param {string} containerClass - CSS class for the container
   * @returns {string} - HTML with custom classes
   */
  renderWithClasses(markdown, containerClass = 'markdown-content') {
    const html = this.render(markdown);
    return `<div class="${containerClass}">${html}</div>`;
  }

  /**
   * Check if text contains markdown syntax
   * @param {string} text - The text to check
   * @returns {boolean} - True if markdown syntax is detected
   */
  hasMarkdownSyntax(text) {
    if (!text || typeof text !== 'string') {
      return false;
    }

    // Check for common markdown patterns
    const patterns = [
      /^#{1,6}\s+/m,     // Headers
      /\*\*.*?\*\*/,     // Bold
      /\*.*?\*/,         // Italic
      /`.*?`/,           // Inline code
      /```[\s\S]*?```/,  // Code blocks
      /^\s*[-*+]\s+/m,   // Unordered lists
      /^\s*\d+\.\s+/m,   // Ordered lists
      /\[.*?\]\(.*?\)/,  // Links
      /^>\s+/m           // Blockquotes
    ];

    return patterns.some(pattern => pattern.test(text));
  }
}

// Export for use in other scripts
window.MarkdownRenderer = MarkdownRenderer;