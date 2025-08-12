const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const unzipper = require('unzipper');

const BUTLER_VERSION = 'LATEST';
const BUTLER_PLATFORM = 'windows-amd64';
const BUTLER_URL = `https://broth.itch.zone/butler/${BUTLER_PLATFORM}/${BUTLER_VERSION}/archive/default`;
const TOOLS_DIR = path.join(__dirname, '..', 'tools');
const BUTLER_DIR = path.join(TOOLS_DIR, 'butler');
const BUTLER_EXE = path.join(BUTLER_DIR, 'butler.exe');

async function downloadFileWithPowerShell(url, dest) {
    console.log('⬇️  Downloading Butler...');
    
    // Use PowerShell to download, which handles redirects automatically
    const command = `powershell -Command "Invoke-WebRequest -Uri '${url}' -OutFile '${dest}' -UseBasicParsing"`;
    
    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        console.error('Failed to download with PowerShell:', error.message);
        return false;
    }
}

async function downloadFileWithCurl(url, dest) {
    console.log('⬇️  Downloading Butler with curl...');
    
    // Use curl to download, which handles redirects automatically
    const command = `curl -L -o "${dest}" "${url}"`;
    
    try {
        execSync(command, { stdio: 'inherit' });
        return true;
    } catch (error) {
        console.error('Failed to download with curl:', error.message);
        return false;
    }
}

async function extractZip(zipPath, destDir) {
    return new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
            .pipe(unzipper.Extract({ path: destDir }))
            .on('close', resolve)
            .on('error', reject);
    });
}

async function setupButler() {
    // Check if butler already exists
    if (fs.existsSync(BUTLER_EXE)) {
        try {
            const version = execSync(`"${BUTLER_EXE}" -V`, { encoding: 'utf8' });
            console.log(`✅ Butler already installed: ${version.trim()}`);
            return;
        } catch (error) {
            console.log('⚠️  Butler found but not working, reinstalling...');
        }
    }

    console.log('📦 Setting up Butler for itch.io uploads...');
    
    // Create directories
    if (!fs.existsSync(TOOLS_DIR)) {
        fs.mkdirSync(TOOLS_DIR, { recursive: true });
    }
    if (!fs.existsSync(BUTLER_DIR)) {
        fs.mkdirSync(BUTLER_DIR, { recursive: true });
    }

    // Download butler
    const zipPath = path.join(TOOLS_DIR, 'butler.zip');
    
    try {
        // Try PowerShell first (Windows), then curl
        let downloaded = await downloadFileWithPowerShell(BUTLER_URL, zipPath);
        
        if (!downloaded) {
            downloaded = await downloadFileWithCurl(BUTLER_URL, zipPath);
        }
        
        if (!downloaded) {
            throw new Error('Failed to download butler with both PowerShell and curl');
        }
        
        console.log('✅ Download complete');
        
        // Verify the downloaded file is a zip
        const fileSize = fs.statSync(zipPath).size;
        if (fileSize < 1000) {
            throw new Error('Downloaded file is too small, might be an error page');
        }
        
        // Extract butler
        console.log('📂 Extracting Butler...');
        await extractZip(zipPath, BUTLER_DIR);
        console.log('✅ Extraction complete');
        
        // Clean up zip file
        fs.unlinkSync(zipPath);
        
        // Verify installation
        const version = execSync(`"${BUTLER_EXE}" -V`, { encoding: 'utf8' });
        console.log(`✅ Butler installed successfully: ${version.trim()}`);
        console.log(`📍 Location: ${BUTLER_EXE}`);
        
    } catch (error) {
        console.error('❌ Failed to setup Butler:', error.message);
        
        // Clean up on failure
        if (fs.existsSync(zipPath)) {
            fs.unlinkSync(zipPath);
        }
        
        console.log('\n📝 Manual installation instructions:');
        console.log('1. Download butler from: https://itch.io/tools/butler');
        console.log('2. Extract butler.exe to: ' + BUTLER_DIR);
        console.log('3. Run "npm run upload:itch" again');
        
        process.exit(1);
    }
}

// Run setup if called directly
if (require.main === module) {
    setupButler();
}

module.exports = { setupButler, BUTLER_EXE };