const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// Read addon.json to get version
const addonJsonPath = path.join(__dirname, '..', 'src', 'addon.json');
const addonJson = JSON.parse(fs.readFileSync(addonJsonPath, 'utf8'));
const version = addonJson.version;

// Create output filename with version
const outputFileName = `rendera-control-${version}.c3addon`;
const outputPath = path.join(__dirname, '..', 'dist', outputFileName);

// Ensure dist directory exists
const distDir = path.join(__dirname, '..', 'dist');
if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
}

// Create a file to stream archive data to
const output = fs.createWriteStream(outputPath);
const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
});

// Listen for archive events
output.on('close', function() {
    console.log(`✅ Created ${outputFileName} (${archive.pointer()} bytes)`);
});

archive.on('error', function(err) {
    throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Add files from src directory
const srcDir = path.join(__dirname, '..', 'src');

// Read file-list from addon.json to know what files to include
const fileList = addonJson['file-list'];

// Add each file from the file-list
fileList.forEach(file => {
    const filePath = path.join(srcDir, file);
    if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file });
        console.log(`  Adding: ${file}`);
    } else {
        console.warn(`  ⚠️  File not found: ${file}`);
    }
});

// Finalize the archive
archive.finalize();