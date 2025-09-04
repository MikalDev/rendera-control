const express = require('express');
const path = require('path');
const fs = require('fs');

// Allow specifying plugin path via CLI arg or PLUGIN_PATH env; default to current repo root
const pluginPathArg = process.argv[2] || process.env.PLUGIN_PATH || '.';

const fullPluginPath = path.resolve(process.cwd(), pluginPathArg);
if (!fs.existsSync(fullPluginPath)) {
  console.error(`❌ Plugin path not found: ${fullPluginPath}`);
  process.exit(1);
}

// Priority order: dist/ -> src/
let servingPath = fullPluginPath;
let addonJsonPath = path.join(fullPluginPath, 'addon.json');

const distPath = path.join(fullPluginPath, 'dist');
const distAddonPath = path.join(distPath, 'addon.json');

if (fs.existsSync(distAddonPath)) {
  servingPath = distPath;
  addonJsonPath = distAddonPath;
} else {
  const srcPath = path.join(fullPluginPath, 'src');
  const srcAddonPath = path.join(srcPath, 'addon.json');
  if (fs.existsSync(srcAddonPath)) {
    servingPath = srcPath;
    addonJsonPath = srcAddonPath;
  }
}

if (!fs.existsSync(addonJsonPath)) {
  console.error(`❌ addon.json not found in plugin root or its src/dist: ${fullPluginPath}`);
  process.exit(1);
}

let addonJson;
try {
  addonJson = JSON.parse(fs.readFileSync(addonJsonPath, 'utf8'));
} catch (err) {
  console.error(`❌ Failed to read/parse addon.json: ${addonJsonPath}`);
  console.error(err);
  process.exit(1);
}

const pluginName = addonJson.name || path.basename(fullPluginPath);

const app = express();
// Use a different port from the other dev server (original 63442). Choose 63443 by default.
const PORT = parseInt(process.env.PORT, 10) || 63443;

// CORS headers for Construct 3
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Disable caching
app.use((req, res, next) => {
  res.set({
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });
  next();
});

app.use(express.static(servingPath, {
  dotfiles: 'allow',
  extensions: ['json', 'js', 'svg', 'map'],
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.json')) res.setHeader('Content-Type', 'application/json');
    else if (filePath.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    else if (filePath.endsWith('.svg')) res.setHeader('Content-Type', 'image/svg+xml');
  }
}));

// Basic request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

app.listen(PORT, 'localhost', () => {
  console.log(`🚀 ${pluginName} Dev Server (alt) running at:`);
  console.log(`   http://localhost:${PORT}/addon.json`);
  console.log('');
  console.log('📋 Add to Construct 3 (Alt Dev Server):');
  console.log('   1. Enable Developer Mode in C3');
  console.log('   2. Open Addon Manager');
  console.log('   3. Click "Add dev addon..."');
  console.log(`   4. Enter: http://localhost:${PORT}/addon.json`);
  console.log('   5. Restart C3 to load the addon');
  console.log('');
  console.log('💡 Rebuild after changes with: npm run build');
  console.log(`📁 Serving from: ${servingPath}`);
  console.log(`🔌 Plugin: ${pluginName} v${addonJson.version}`);
  console.log(`🧩 Source addon.json: ${addonJsonPath}`);
});

process.on('SIGINT', () => {
  console.log(`\n👋 ${pluginName} Alt Dev Server shutting down...`);
  process.exit(0);
});
