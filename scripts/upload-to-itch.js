const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { setupButler, BUTLER_EXE } = require('./setup-butler');

// Load environment variables
require('dotenv').config();

async function uploadToItch() {
    console.log('🚀 Starting itch.io upload process...\n');
    
    // Check for required environment variables
    const requiredVars = ['ITCH_USER', 'ITCH_GAME', 'BUTLER_API_KEY', 'ITCH_CHANNEL'];
    const missing = requiredVars.filter(v => !process.env[v]);
    
    if (missing.length > 0) {
        console.error('❌ Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
        console.error('\n📝 Please copy .env.example to .env and fill in your values');
        process.exit(1);
    }
    
    // Ensure butler is installed
    await setupButler();
    
    // Read addon.json to get version
    const addonJsonPath = path.join(__dirname, '..', 'src', 'addon.json');
    const addonJson = JSON.parse(fs.readFileSync(addonJsonPath, 'utf8'));
    const version = addonJson.version;
    const name = addonJson.name;
    
    // Check if the addon file exists
    const addonFileName = `rendera-control-${version}.c3addon`;
    const addonPath = path.join(__dirname, '..', 'dist', addonFileName);
    
    if (!fs.existsSync(addonPath)) {
        console.error(`❌ Addon file not found: ${addonFileName}`);
        console.error('   Run "npm run package" first to build the addon');
        process.exit(1);
    }
    
    // Prepare butler push command
    const target = `${process.env.ITCH_USER}/${process.env.ITCH_GAME}:${process.env.ITCH_CHANNEL}`;
    
    console.log(`📦 Uploading: ${name} v${version}`);
    console.log(`📍 Target: ${target}`);
    console.log(`📄 File: ${addonFileName}`);
    console.log(`📊 Size: ${(fs.statSync(addonPath).size / 1024).toFixed(2)} KB\n`);
    
    try {
        // Set the API key as environment variable for butler
        const env = { ...process.env, BUTLER_API_KEY: process.env.BUTLER_API_KEY };
        
        // Execute butler push
        console.log('⬆️  Pushing to itch.io...');
        const output = execSync(
            `"${BUTLER_EXE}" push "${addonPath}" "${target}" --userversion ${version}`,
            { 
                encoding: 'utf8',
                env: env,
                stdio: 'pipe'
            }
        );
        
        // Parse and display butler output
        const lines = output.split('\n').filter(line => line.trim());
        lines.forEach(line => {
            if (line.includes('✓') || line.includes('success')) {
                console.log(`✅ ${line}`);
            } else if (line.includes('→') || line.includes('Pushing')) {
                console.log(`📤 ${line}`);
            } else if (line.trim()) {
                console.log(`   ${line}`);
            }
        });
        
        console.log('\n✅ Upload successful!');
        console.log(`🎮 View your game at: https://${process.env.ITCH_USER}.itch.io/${process.env.ITCH_GAME}`);
        
    } catch (error) {
        console.error('\n❌ Upload failed!');
        
        if (error.message.includes('invalid target')) {
            console.error('   Check that ITCH_USER and ITCH_GAME match your itch.io project');
        } else if (error.message.includes('authentication') || error.message.includes('401')) {
            console.error('   Check that your BUTLER_API_KEY is valid');
            console.error('   Get your API key from: https://itch.io/user/settings/api-keys');
        } else {
            console.error('   Error:', error.message);
        }
        
        process.exit(1);
    }
}

// Run upload if called directly
if (require.main === module) {
    uploadToItch().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

module.exports = { uploadToItch };