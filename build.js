// Build script for SEO Checker Extension
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createReadStream, createWriteStream } = require('fs');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

const isDevelopment = process.argv.includes('--dev');
const isRelease = process.argv.includes('--release');

console.log(`Building SEO Checker Extension (${isDevelopment ? 'development' : isRelease ? 'release' : 'production'} mode)...`);

async function copyFile(src, dest) {
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  await pipelineAsync(createReadStream(src), createWriteStream(dest));
}

async function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function build() {
  try {
    if (isRelease) {
      console.log('Creating release package...');

      // Clean up root dist directory if it exists
      if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true, force: true });
        console.log('Cleaned up root dist directory');
      }

      // Create release directory
      const releaseDir = 'release';
      if (fs.existsSync(releaseDir)) {
        fs.rmSync(releaseDir, { recursive: true, force: true });
      }
      fs.mkdirSync(releaseDir);

      // Compile TypeScript directly to release/dist
      console.log('Compiling TypeScript to release/dist...');
      execSync(`npx tsc --outDir ${path.join(releaseDir, 'dist')}`, { stdio: 'inherit' });

      // Copy static files directly to dist directory
      const staticFiles = [
        { src: 'src/popup/popup.html', dest: 'dist/popup/popup.html' },
        { src: 'src/popup/popup.css', dest: 'dist/popup/popup.css' },
        { src: 'src/popup/batch-check.html', dest: 'dist/popup/batch-check.html' },
        { src: 'src/popup/batch-check.css', dest: 'dist/popup/batch-check.css' },
        { src: 'src/popup/detailed-report.html', dest: 'dist/popup/detailed-report.html' }
      ];

      const staticDirectories = [
        { src: 'src/icons', dest: 'dist/icons' },
        { src: 'src/reports/templates', dest: 'dist/reports/templates' }
      ];

      // Copy and modify static files
      for (const file of staticFiles) {
        if (fs.existsSync(file.src)) {
          const destPath = path.join(releaseDir, file.dest);

          // For HTML files, update script paths
          if (file.src.endsWith('.html')) {
            let content = fs.readFileSync(file.src, 'utf8');

            // Update script paths from ../../dist/src/ to ../src/
            // Since HTML files are now in dist/popup/
            // and JS files are in dist/src/popup/
            content = content.replace(/\.\.\/\.\.\/dist\/src\//g, '../src/');

            // Ensure directory exists
            const destDir = path.dirname(destPath);
            if (!fs.existsSync(destDir)) {
              fs.mkdirSync(destDir, { recursive: true });
            }

            fs.writeFileSync(destPath, content);
            console.log(`Updated and copied ${file.src} -> ${file.dest}`);
          } else {
            await copyFile(file.src, destPath);
            console.log(`Copied ${file.src} -> ${file.dest}`);
          }
        }
      }

      // Copy static directories
      for (const dir of staticDirectories) {
        if (fs.existsSync(dir.src)) {
          await copyDirectory(dir.src, path.join(releaseDir, dir.dest));
          console.log(`Copied ${dir.src}/ -> ${dir.dest}/`);
        }
      }

      // Copy and modify manifest.json for release
      if (fs.existsSync('manifest.json')) {
        const manifestContent = fs.readFileSync('manifest.json', 'utf8');
        const manifest = JSON.parse(manifestContent);

        // Update paths to point to dist directory only
        if (manifest.action && manifest.action.default_popup) {
          manifest.action.default_popup = manifest.action.default_popup.replace('src/', 'dist/');
        }

        if (manifest.content_scripts) {
          manifest.content_scripts.forEach(script => {
            if (script.js) {
              script.js = script.js.map(js => js.replace('src/', 'dist/src/'));
            }
          });
        }

        if (manifest.background && manifest.background.service_worker) {
          manifest.background.service_worker = manifest.background.service_worker.replace('src/', 'dist/src/');
        }

        if (manifest.web_accessible_resources) {
          manifest.web_accessible_resources.forEach(resource => {
            if (resource.resources) {
              resource.resources = resource.resources.map(res => res.replace('src/', 'dist/'));
            }
          });
        }

        // Update icon paths
        if (manifest.icons) {
          const updatedIcons = {};
          for (const [size, iconPath] of Object.entries(manifest.icons)) {
            updatedIcons[size] = iconPath.replace('src/', 'dist/');
          }
          manifest.icons = updatedIcons;
        }

        if (manifest.action && manifest.action.default_icon) {
          const updatedActionIcons = {};
          for (const [size, iconPath] of Object.entries(manifest.action.default_icon)) {
            updatedActionIcons[size] = iconPath.replace('src/', 'dist/');
          }
          manifest.action.default_icon = updatedActionIcons;
        }

        // Write modified manifest to release directory
        fs.writeFileSync(path.join(releaseDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
        console.log('Updated and copied manifest.json');
      }

      // Copy README.md
      if (fs.existsSync('README.md')) {
        await copyFile('README.md', path.join(releaseDir, 'README.md'));
        console.log('Copied README.md');
      }

      // Create zip file for Chrome Web Store
      try {
        const archiver = require('archiver');
        const output = fs.createWriteStream('seo-checker-extension-v1.0.0.zip');
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => {
          console.log(`Release package created: seo-checker-extension-v1.0.0.zip (${archive.pointer()} bytes)`);
        });

        archive.on('error', (err) => {
          throw err;
        });

        archive.pipe(output);
        archive.directory(releaseDir, false);
        await archive.finalize();
      } catch (error) {
        console.log('Note: Install archiver package to create zip file: npm install archiver');
        console.log('Release files are available in the "release" directory');
      }
    } else {
      // For development/production builds, use normal dist directory
      // Clean dist directory
      if (fs.existsSync('dist')) {
        fs.rmSync('dist', { recursive: true, force: true });
      }

      // Compile TypeScript
      console.log('Compiling TypeScript...');
      execSync('npx tsc', { stdio: 'inherit' });
    }

    console.log('Build completed successfully!');

    if (!isRelease) {
      console.log('\nTo load the extension in Chrome:');
      console.log('1. Open Chrome and go to chrome://extensions/');
      console.log('2. Enable "Developer mode"');
      console.log('3. Click "Load unpacked" and select this directory');
    } else {
      console.log('\nRelease package ready!');
      console.log('- Upload seo-checker-extension-v1.0.0.zip to Chrome Web Store');
      console.log('- Or use the "release" directory for manual installation');
    }

  } catch (error) {
    console.error('Build failed:', error.message);
    process.exit(1);
  }
}

build();