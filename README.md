# SEO Checker Extension

基于Chrome内置AI的智能SEO检查扩展插件，提供实时SEO分析和优化建议。

## 📖 目录

- [功能特性](#功能特性)
- [安装指南](#安装指南)
- [使用指南](#使用指南)
- [功能详解](#功能详解)
- [故障排除](#故障排除)
- [开发指南](#开发指南)
- [API文档](#api文档)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

## 🚀 功能特性

- 🔍 **实时SEO评分** - 一键获取当前页面的SEO健康度评分（0-100分）
- 🤖 **AI智能建议** - 基于Chrome内置AI的个性化内容优化建议
- 📊 **详细报告** - 全面的SEO检查报告，包含技术SEO、内容质量、性能指标
- 📄 **报告导出** - 支持PDF和JSON格式的报告导出
- ⚡ **轻量高效** - 不影响页面性能，快速分析
- 🎯 **智能缓存** - 避免重复分析，提升用户体验

## 📦 安装指南

### 方式一：从Chrome Web Store安装（推荐）

1. 访问 [Chrome Web Store](https://chrome.google.com/webstore) 
2. 搜索 "SEO Checker"
3. 点击"添加至Chrome"
4. 确认安装

### 方式二：开发者模式安装

1. 下载最新版本的扩展包
2. 解压到本地目录
3. 打开Chrome浏览器，访问 `chrome://extensions/`
4. 开启右上角的"开发者模式"
5. 点击"加载已解压的扩展程序"
6. 选择解压后的扩展目录

### 系统要求

- Chrome 127+ 版本（支持Gemini Nano）
- 启用Prompt API实验功能（chrome://flags/#prompt-api-for-gemini-nano）

## 📚 使用指南

### 快速开始

1. **安装扩展**后，浏览器工具栏会出现SEO Checker图标
2. **访问任意网页**，点击扩展图标
3. **查看SEO评分**，扩展会自动分析当前页面并显示评分
4. **查看详细报告**，点击"详细报告"按钮获取完整分析

### 基本操作

#### 1. 页面SEO检查

```
1. 打开要检查的网页
2. 点击浏览器工具栏中的SEO Checker图标
3. 等待分析完成（通常2-3秒）
4. 查看SEO评分和主要问题概览
```

#### 2. 查看详细报告

```
1. 在弹窗界面点击"详细报告"
2. 查看分类问题：
   - 技术SEO（标题、元描述、结构化数据等）
   - 内容质量（字数、可读性、关键词密度等）
   - 性能指标（页面大小、加载时间等）
3. 点击具体问题查看修复建议
```

#### 3. AI智能建议

```
1. 在弹窗界面点击"生成建议"按钮
2. 等待AI分析完成（几秒钟）
3. 查看个性化的优化建议：
   - 📝 标题优化建议（包含具体的重写建议）
   - 📄 Meta描述优化（提供优化模板）
   - ✨ 内容改进建议（结构和质量提升）
   - 🔍 关键词建议（主要、次要、长尾、语义相关）
   - 🏗️ 结构优化建议（HTML结构改进）
4. 使用"复制"按钮快速应用建议
```



#### 5. 导出报告

```
1. 在详细报告页面点击"导出报告"
2. 选择导出格式：
   - PDF：适合分享和打印
   - JSON：适合程序处理
3. 选择导出内容和隐私选项
4. 下载生成的报告文件
```

## 🔧 功能详解

### SEO评分算法

SEO总分由三个维度组成：

- **技术SEO (40%)**：标题标签、元描述、结构化数据、URL结构等
- **内容质量 (40%)**：内容长度、可读性、关键词密度、标题结构等  
- **性能指标 (20%)**：页面大小、加载时间、图片优化等

### 检查项目详解

#### 技术SEO检查
- ✅ 标题标签存在性和长度（推荐30-60字符）
- ✅ 元描述存在性和长度（推荐120-160字符）
- ✅ H1标签唯一性和存在性
- ✅ 标题层次结构（H1-H6）
- ✅ 图片Alt属性
- ✅ 内链和外链分析
- ✅ 结构化数据检测
- ✅ Open Graph标签
- ✅ Canonical标签

#### 内容质量检查
- ✅ 内容字数统计
- ✅ 可读性评分
- ✅ 关键词密度分析
- ✅ 内容重复度检测
- ✅ 语言检测

#### 性能检查
- ✅ 页面大小分析
- ✅ 图片大小和格式检查
- ✅ CSS和JavaScript资源分析
- ✅ 基础加载时间测量

### AI功能说明

本扩展的AI内容优化功能提供：

#### 🎯 个性化优化建议
- **标题重写**：基于页面内容生成优化后的标题
- **描述生成**：创建吸引人的Meta描述
- **内容改进**：提供具体的内容质量提升建议
- **关键词策略**：推荐主要、长尾和语义相关关键词
- **结构优化**：HTML结构和可访问性改进建议

#### 🔧 技术特性
- **智能分析**：基于页面实际内容进行分析
- **即时生成**：几秒钟内生成个性化建议
- **一键复制**：快速应用优化建议
- **隐私保护**：所有分析在本地进行

#### 📋 使用要求
- Chrome 127+版本（支持Gemini Nano）
- 启用Prompt API实验功能：chrome://flags/#prompt-api-for-gemini-nano
- 首次使用时会自动下载Gemini Nano模型
- 纯AI驱动的优化建议，确保高质量个性化建议

> **详细指南**：查看 [AI优化功能指南](./AI-OPTIMIZATION-GUIDE.md) 了解完整使用说明。

## 🔍 故障排除

### 常见问题

#### 1. 扩展无法加载或显示错误

**问题**：点击扩展图标没有反应或显示错误信息

**解决方案**：
```
1. 检查Chrome版本是否为127+（支持Gemini Nano）
2. 刷新当前页面后重试
3. 重启Chrome浏览器
4. 检查扩展是否已启用（chrome://extensions/）
5. 尝试重新安装扩展
```

#### 2. AI功能不可用

**问题**：显示"AI功能不可用"或相关错误

**解决方案**：
```
1. 访问 chrome://flags/
2. 搜索并启用以下功能：
   - Prompt API for Gemini Nano
   - Summarization API for Gemini Nano
   - Language Detection API
3. 重启Chrome浏览器
4. 等待AI模型下载完成（首次使用需要时间）
```

#### 3. 分析速度慢或超时

**问题**：页面分析时间过长或显示超时

**解决方案**：
```
1. 检查网络连接
2. 尝试刷新页面后重新分析
3. 对于大型页面，等待更长时间
4. 检查页面是否包含大量动态内容
```

#### 4. 扩展无法正常工作

**问题**：扩展分析失败或无响应

**解决方案**：
```
1. 确保所有URL格式正确（包含http://或https://）
2. 检查目标网站是否可访问
3. 减少同时检查的URL数量
4. 检查网络连接稳定性
```

#### 5. 报告导出失败

**问题**：无法生成或下载报告

**解决方案**：
```
1. 检查浏览器下载权限
2. 确保有足够的磁盘空间
3. 尝试不同的导出格式
4. 清除浏览器缓存后重试
```

### 性能优化建议

#### 提升分析速度
- 关闭不必要的浏览器标签页
- 确保网络连接稳定
- 定期清理浏览器缓存
- 避免在页面加载过程中进行分析

#### 减少内存使用
- 及时关闭详细报告页面
- 定期清理分析历史
- 避免频繁刷新分析

### 获取帮助

如果问题仍未解决：

1. **查看控制台错误**：
   - 按F12打开开发者工具
   - 查看Console标签页中的错误信息
   - 截图错误信息以便报告

2. **联系支持**：
   - 发送邮件至：support@seo-checker.com
   - 提交GitHub Issue：[项目地址]
   - 包含Chrome版本、错误截图、重现步骤

## 🛠 开发指南

### 项目结构

```
seo-checker/
├── src/                    # 源代码目录
│   ├── analyzers/          # 分析器模块
│   ├── background/         # Background Service Worker
│   ├── content/           # Content Scripts
│   ├── engine/            # SEO规则引擎
│   ├── popup/             # 用户界面
│   ├── reports/           # 报告生成
│   └── utils/             # 工具函数
├── types/                 # TypeScript类型定义
├── dist/                  # 构建输出目录
├── icons/                 # 扩展图标
├── scripts/               # 构建和工具脚本
├── __tests__/             # 测试文件
├── manifest.json          # 扩展清单文件
├── package.json           # 项目配置
├── tsconfig.json          # TypeScript配置
└── build.js              # 构建脚本
```

### 开发环境设置

```bash
# 1. 克隆项目
git clone <repository-url>
cd seo-checker

# 2. 安装依赖
npm install

# 3. 启动开发模式
npm run dev

# 4. 运行测试
npm test

# 5. 构建生产版本
npm run build:prod
```

### 开发工作流

1. **代码修改**：在`src/`目录下修改源代码
2. **自动构建**：开发模式会自动监听文件变化并重新构建
3. **测试验证**：运行`npm test`确保代码质量
4. **扩展测试**：在Chrome中加载`dist`目录测试功能
5. **代码提交**：使用`npm run pre-commit`进行提交前检查

### 技术栈

- **TypeScript** - 主要开发语言
- **Chrome Extension Manifest V3** - 扩展框架
- **Chrome Built-in AI APIs** - AI功能集成
- **Jest** - 测试框架
- **ESLint** - 代码检查
- **自定义构建系统** - 基于Node.js的构建工具

## 📖 API文档

详细的API文档请参考：[API.md](./docs/API.md)

### 快速API参考

#### 核心分析接口
```typescript
// 页面分析
const analyzer = new ContentAnalyzer();
const analysis = await analyzer.analyzePage();

// SEO规则检查
const ruleEngine = new SEORuleEngine();
const results = ruleEngine.checkAllRules(analysis);

// AI建议生成
const aiService = new AIService();
const suggestions = await aiService.generateContentSuggestions(analysis);
```

更多API详情请查看完整的 [API文档](./docs/API.md)。

### 核心接口

#### SEO分析接口
```typescript
interface SEOAnalyzer {
  analyzePage(): Promise<PageAnalysis>;
  generateReport(): Promise<SEOReport>;
  getAISuggestions(): Promise<AISuggestions>;
}
```

#### 报告生成接口
```typescript
interface ReportGenerator {
  generatePDFReport(data: SEOReport): Promise<Blob>;
  generateJSONReport(data: SEOReport): Promise<string>;
  exportReport(format: 'pdf' | 'json'): Promise<void>;
}
```

## 🤝 贡献指南

我们欢迎社区贡献！请参考：[CONTRIBUTING.md](./docs/CONTRIBUTING.md)

### 文档中心

完整的文档请访问：[文档中心](./docs/README.md)

- 📚 [用户指南](./README.md) - 完整使用说明
- 🔧 [在线帮助](./docs/HELP.md) - 故障排除和高级功能
- 💻 [API文档](./docs/API.md) - 开发者接口文档
- 🤝 [贡献指南](./docs/CONTRIBUTING.md) - 参与项目开发
- 🛠 [构建文档](./BUILD.md) - 构建系统说明

### 快速贡献

1. **Fork项目**并创建功能分支
2. **编写代码**并添加相应测试
3. **运行测试**确保所有测试通过
4. **提交PR**并描述修改内容

### 贡献类型

- 🐛 Bug修复
- ✨ 新功能开发
- 📚 文档改进
- 🎨 UI/UX优化
- ⚡ 性能优化
- 🧪 测试覆盖

## 📄 许可证

MIT License - 详见 [LICENSE](./LICENSE) 文件

## 🙏 致谢

感谢所有贡献者和Chrome团队提供的内置AI功能支持。

---

**版本**: 1.0.0  
**更新时间**: 2024年12月  
**维护者**: SEO Checker Team