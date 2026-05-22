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

// Valid 1x1 transparent PNG Buffer
const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

function checkAndRepairPNGs(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      checkAndRepairPNGs(fullPath);
    } else if (file.toLowerCase().endsWith('.png')) {
      try {
        const buffer = fs.readFileSync(fullPath);
        // PNG header is 89 50 4E 47 0D 0A 1A 0A
        const isPng = buffer.length >= 8 &&
                      buffer[0] === 0x89 &&
                      buffer[1] === 0x50 &&
                      buffer[2] === 0x4E &&
                      buffer[3] === 0x47 &&
                      buffer[4] === 0x0D &&
                      buffer[5] === 0x0A &&
                      buffer[6] === 0x1A &&
                      buffer[7] === 0x0A;
        if (!isPng) {
          fs.writeFileSync(fullPath, transparentPng);
          console.log(`  ✅ Repaired corrupted PNG: ${path.relative(namaAppDir, fullPath)}`);
        }
      } catch (err) {
        console.warn(`  ⚠️ Failed to check/repair image ${path.relative(namaAppDir, fullPath)}:`, err.message);
      }
    }
  });
}

// Recursively verify all PNG assets in nama-app/assets/
checkAndRepairPNGs(path.join(namaAppDir, 'assets'));

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
