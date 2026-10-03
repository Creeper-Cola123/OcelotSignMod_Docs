/**
 * build.js — Cache-busting build script for GitHub Pages deployment.
 *
 * This script:
 * 1. Adds version query parameters to all CSS, JS, and image references
 * 2. Injects an inline script to force fresh content on every page load
 *
 * This ensures users always see the latest version after updates.
 *
 * Usage:
 *   node build.js              # adds date-based version
 *   node build.js --git        # uses git commit hash (requires git)
 *   node build.js --dry         # preview changes without writing
 *   node build.js --fresh       # force refresh (adds timestamp)
 *
 * After running, commit and push the updated HTML files.
 */

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Parse arguments
const isDry    = process.argv.includes('--dry');
const useGit   = process.argv.includes('--git');
const forceFresh = process.argv.includes('--fresh');

// Generate version string
let version;
if (forceFresh) {
  version = Date.now().toString();
  console.log('Using timestamp-based version for forced refresh');
} else if (useGit) {
  try {
    version = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    console.log(`Using git commit hash: ${version}`);
  } catch (e) {
    console.warn('Git not available, falling back to date-based version');
    version = getDateVersion();
  }
} else {
  version = getDateVersion();
  console.log(`Using date-based version: ${version}`);
}

function getDateVersion() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = String(now.getMonth() + 1).padStart(2, '0');
  const dd   = String(now.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

// Inline script to force fresh content on every page load
// This ensures users always see the latest version after updates
const FORCE_FRESH_SCRIPT = `
(function() {
  // Force browser to check for new version of this page
  if (!window.__pageLoaded) {
    window.__pageLoaded = true;
    // Add a cache-busting parameter to ensure fresh load
    var noCache = 'nocache=' + Date.now();
    if (location.search.indexOf('nocache') === -1) {
      var sep = location.search ? '&' : '?';
      // Use replaceState to update URL without reload, but force fetch
      if ('caches' in window) {
        // Modern approach: clear service worker cache if exists
        navigator.serviceWorker && navigator.serviceWorker.getRegistrations().then(function(regs) {
          regs.forEach(function(reg) { reg.unregister(); });
        });
      }
      // Force reload with cache-busting (only on first load)
      if (sessionStorage.getItem('__freshLoaded') !== '1') {
        sessionStorage.setItem('__freshLoaded', '1');
        location.replace(location.href + sep + noCache);
      }
    }
  }
})();
`;

// File extensions that need cache busting
const RESOURCE_EXTENSIONS = ['.css', '.js', '.webp', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'];

// Directories to scan for HTML files
const HTML_DIRS = [
  path.join(__dirname),
  path.join(__dirname, 'en'),
  path.join(__dirname, 'guide'),
  path.join(__dirname, 'components'),
];

// Find all HTML files recursively
function findHtmlFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules, .git, dist, build directories
      if (!['node_modules', '.git', 'dist', 'build'].includes(entry.name)) {
        files.push(...findHtmlFiles(fullPath));
      }
    } else if (entry.name.endsWith('.html') || entry.name.endsWith('.htm')) {
      files.push(fullPath);
    }
  }
  return files;
}

// Check if a URL needs cache busting
function needsCacheBust(url) {
  // Skip external URLs and anchor-only links
  if (!url || url.startsWith('http://') || url.startsWith('https://') || 
      url.startsWith('//') || url.startsWith('mailto:') || url.startsWith('#')) {
    return false;
  }

  // Check if it references a local resource that needs cache busting
  const ext = path.extname(url.split('?')[0]).toLowerCase();
  return RESOURCE_EXTENSIONS.includes(ext);
}

// Add version query parameter to a URL
function addVersion(url) {
  const [pathPart, queryPart] = url.split('?');
  const separator = queryPart ? '&' : '?';
  return `${pathPart}${separator}v=${version}`;
}

// Process HTML file content
function processHtml(content) {
  let result = content;

  // 1. Add version parameter to resource references
  const attrPattern = /(href|src)="([^"]+)"/gi;
  result = result.replace(attrPattern, (match, attr, url) => {
    if (!needsCacheBust(url)) return match;
    if (url.includes('?v=') || url.includes('&v=')) return match;
    const newUrl = addVersion(url);
    return `${attr}="${newUrl}"`;
  });

  // 2. Inject inline script to force fresh content (only if not already present)
  if (!result.includes('__pageLoaded')) {
    // Inject the script right after <head> tag
    const headClosePattern = /<head([^>]*)>/i;
    if (headClosePattern.test(result)) {
      result = result.replace(headClosePattern, (match, attrs) => {
        return `${match}\n<script>${FORCE_FRESH_SCRIPT}<\/script>`;
      });
    }
  }

  return result;
}

// Find all HTML files
const htmlFiles = [];
for (const dir of HTML_DIRS) {
  htmlFiles.push(...findHtmlFiles(dir));
}

// Remove duplicates
const uniqueFiles = [...new Set(htmlFiles)];

console.log(`\nFound ${uniqueFiles.length} HTML files to process\n`);

let processed = 0;
let changed = 0;

for (const file of uniqueFiles) {
  const content = fs.readFileSync(file, 'utf8');
  const processedContent = processHtml(content);

  if (content !== processedContent) {
    changed++;
    console.log(`  ${path.relative(__dirname, file)}`);

    if (!isDry) {
      fs.writeFileSync(file, processedContent, 'utf8');
    }
  }
  processed++;
}

console.log(`\n${isDry ? '[DRY RUN] Would change' : 'Changed'} ${changed} of ${processed} files`);
console.log(`Version parameter: ?v=${version}`);
console.log(`\nForce-fresh script: ${forceFresh ? 'ENABLED' : 'enabled (date-based)'}\n`);

if (isDry) {
  console.log('Run without --dry to apply changes:\n  node build.js\n');
}
