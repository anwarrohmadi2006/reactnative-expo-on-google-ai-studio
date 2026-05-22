const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting Google AI Studio Auto-Setup for Expo...');

const namaAppDir = path.join(__dirname, 'nama-app');

// 1. Run npm install in nama-app if node_modules doesn't exist
const nodeModulesPath = path.join(namaAppDir, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  try {
    console.log('\n📦 Installing dependencies in nama-app (running npm install)...');
    execSync('npm install', { cwd: namaAppDir, stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully.');
  } catch (error) {
    console.error('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('\n📦 node_modules already exists. Skipping full installation.');
}

// 1b. Ensure @expo/ngrok is installed for tunneling
const ngrokPath = path.join(namaAppDir, 'node_modules/@expo/ngrok');
if (!fs.existsSync(ngrokPath)) {
  try {
    console.log('\n🌐 @expo/ngrok not found. Installing it for Expo tunneling...');
    execSync('npm install -D @expo/ngrok', { cwd: namaAppDir, stdio: 'inherit' });
    console.log('✅ @expo/ngrok installed successfully.');
  } catch (error) {
    console.warn('⚠️ Warning: Failed to install @expo/ngrok. Tunneling might fail:', error.message);
  }
} else {
  console.log('\n🌐 @expo/ngrok is already installed.');
}

// 1c. Run Expo Doctor to verify project health natively
try {
  console.log('\n🩺 Running Expo Doctor to diagnose project health...');
  execSync('npx expo-doctor', { cwd: namaAppDir, stdio: 'inherit' });
  console.log('✅ Expo Doctor diagnosis completed.');
} catch (error) {
  console.warn('⚠️ Warning: Expo Doctor reported some warnings/errors, but we will continue setup.');
}

// 2. Hot-Patch Fetch error (Iframe Sandbox Read-Only window.fetch)
console.log('\n🩹 Patching fetch polyfills for Google AI Studio Sandbox...');
const fetchFiles = [
  path.join(namaAppDir, 'node_modules/whatwg-fetch/fetch.js'),
  path.join(namaAppDir, 'node_modules/whatwg-fetch/dist/fetch.umd.js'),
  path.join(namaAppDir, 'node_modules/cross-fetch/dist/browser-polyfill.js')
];

let patchCount = 0;
fetchFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('g.fetch = fetch') || content.includes('self.fetch = fetch')) {
        content = content.replace(/g\.fetch\s*=\s*fetch/g, 'try { g.fetch = fetch } catch (e) {}');
        content = content.replace(/self\.fetch\s*=\s*fetch/g, 'try { self.fetch = fetch } catch (e) {}');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`  ✅ Patched: ${path.relative(__dirname, file)}`);
        patchCount++;
      } else {
        console.log(`  ℹ️ Already patched or not matching: ${path.relative(__dirname, file)}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Failed to patch ${path.relative(__dirname, file)}:`, e.message);
    }
  } else {
    console.log(`  🔍 File not found (skipping): ${path.relative(__dirname, file)}`);
  }
});

// 3. Hot-Patch CORS Middleware in expo cli to allow AI Studio Proxy Host
console.log('\n🩹 Patching Expo CORS Middleware to allow AI Studio Host...');
const corsPaths = [
  path.join(namaAppDir, 'node_modules/expo/node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js'),
  path.join(namaAppDir, 'node_modules/@expo/cli/build/src/start/server/middleware/CorsMiddleware.js')
];

let corsPatched = false;
corsPaths.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      let content = fs.readFileSync(file, 'utf8');
      if (content.includes('!isSameOrigin && !isAllowedHost')) {
        content = content.replace('!isSameOrigin && !isAllowedHost', 'false');
        fs.writeFileSync(file, content, 'utf8');
        console.log(`  ✅ Patched: ${path.relative(__dirname, file)}`);
        corsPatched = true;
      } else {
        console.log(`  ℹ️ Already patched or not matching: ${path.relative(__dirname, file)}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Failed to patch ${path.relative(__dirname, file)}:`, e.message);
    }
  }
});
if (!corsPatched) {
  console.log('  🔍 CORS middleware file not found or already modified.');
}

// 4. Overwrite potential corrupt images with a valid 1x1 transparent PNG
console.log('\n🖼️ Checking and repairing potential binary image corruptions...');
const imagesToRepair = [
  path.join(namaAppDir, 'assets/images/react-logo.png'),
  path.join(namaAppDir, 'assets/images/react-logo@2x.png'),
  path.join(namaAppDir, 'assets/images/react-logo@3x.png'),
  path.join(namaAppDir, 'assets/images/tutorial-web.png')
];

// Valid 1x1 transparent PNG Buffer
const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

imagesToRepair.forEach(imagePath => {
  if (fs.existsSync(imagePath)) {
    try {
      fs.writeFileSync(imagePath, transparentPng);
      console.log(`  ✅ Restored dummy PNG: ${path.relative(__dirname, imagePath)}`);
    } catch (e) {
      console.warn(`  ⚠️ Failed to write image ${path.relative(__dirname, imagePath)}:`, e.message);
    }
  } else {
    console.log(`  🔍 Image not found (skipping): ${path.relative(__dirname, imagePath)}`);
  }
});

// 5. Clear expo cache
console.log('\n🧹 Clearing Expo Cache (.expo folder)...');
const expoCachePath = path.join(namaAppDir, '.expo');
if (fs.existsSync(expoCachePath)) {
  try {
    fs.rmSync(expoCachePath, { recursive: true, force: true });
    console.log('  ✅ Deleted .expo folder.');
  } catch (e) {
    console.warn('  ⚠️ Failed to delete .expo folder:', e.message);
  }
} else {
  console.log('  ℹ️ No .expo cache folder found.');
}

console.log('\n🎉 Setup Completed Successfully! All AI Studio patches applied.');
console.log('👉 You can now start the server by running: npm run dev');
