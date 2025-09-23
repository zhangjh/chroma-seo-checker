// Build configuration for SEO Checker Extension

module.exports = {
  // Source and output directories
  directories: {
    src: 'src',
    dist: 'dist',
    types: 'types',
    icons: 'icons',
    reports: 'src/reports/templates'
  },

  // Entry points for different parts of the extension
  entries: {
    background: 'src/background/background.ts',
    content: 'src/content/content.ts',
    popup: 'src/popup/popup.ts',
    'detailed-report': 'src/popup/detailed-report.ts'
  },

  // Files to copy during build
  staticFiles: [
    { src: 'src/popup/popup.html', dest: 'dist/popup/popup.html' },
    { src: 'src/popup/popup.css', dest: 'dist/popup/popup.css' },
    { src: 'src/popup/detailed-report.html', dest: 'dist/popup/detailed-report.html' },
    { src: 'src/popup/detailed-report.css', dest: 'dist/popup/detailed-report.css' },
    { src: 'manifest.json', dest: 'dist/manifest.json' }
  ],

  // Environment-specific configurations
  environments: {
    development: {
      tsconfig: 'tsconfig.json',
      sourceMap: true,
      minify: false,
      watch: true,
      manifestSuffix: ' (Dev)'
    },
    production: {
      tsconfig: 'tsconfig.prod.json',
      sourceMap: false,
      minify: true,
      watch: false,
      manifestSuffix: ''
    }
  },

  // Watch configuration
  watch: {
    patterns: ['src/**/*', 'manifest.json', 'types/**/*'],
    ignored: ['node_modules/**', 'dist/**', '**/*.test.ts'],
    debounceMs: 300
  },

  // Test configuration
  test: {
    runOnBuild: true,
    coverage: false,
    watchMode: false
  }
};