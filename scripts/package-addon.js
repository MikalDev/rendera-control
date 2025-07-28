const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Ensure we're in the project root
const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

// Check if archiver is installed
try {
  require.resolve('archiver');
} catch (e) {
  console.error('Error: archiver package not found.');
  console.error('Please run: npm install --save-dev archiver');
  process.exit(1);
}

// Create output directory if it doesn't exist
const outputDir = path.join(projectRoot, 'dist');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

// Read addon.json to get the addon ID
const addonJson = JSON.parse(fs.readFileSync('src/addon.json', 'utf8'));
const addonId = addonJson.id;
const addonVersion = addonJson.version;

// Output filename
const outputFile = path.join(outputDir, `${addonId}_${addonVersion}.c3addon`);

// Create a file to stream archive data to
const output = fs.createWriteStream(outputFile);
const archive = archiver('zip', {
  zlib: { level: 9 } // Maximum compression
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(`✓ Addon packaged successfully: ${outputFile}`);
  console.log(`  Size: ${(archive.pointer() / 1024).toFixed(2)} KB`);
  console.log('\nTo install in Construct 3:');
  console.log('1. Open Construct 3');
  console.log('2. Menu → View → Addon Manager');
  console.log('3. Install from file → Select the .c3addon file');
});

// Handle warnings
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    console.warn('Warning:', err);
  } else {
    throw err;
  }
});

// Handle errors
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files from src directory
console.log('Packaging addon...');

// Add all files from src directory
archive.directory('src/', false, {
  // Only include necessary files
  filter: (entry) => {
    const ext = path.extname(entry.name);
    // Exclude TypeScript files and other development files
    if (ext === '.ts' || ext === '.map' || entry.name === 'tsconfig.json') {
      return false;
    }
    return true;
  }
});

// Finalize the archive
archive.finalize();